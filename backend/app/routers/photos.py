import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..exif import extract_exif

router = APIRouter(prefix="/api/photos", tags=["photos"])

PHOTOS_DIR = os.getenv("PHOTOS_DIR", "photos")
THUMB_SIZE = (600, 600)


def _ensure_dir():
    os.makedirs(PHOTOS_DIR, exist_ok=True)


@router.post("/ingest", response_model=list[schemas.PhotoOut])
async def ingest_photos(files: list[UploadFile] = File(...), db: Session = Depends(get_db)):
    """Store each file, parse EXIF, generate a thumbnail, and create a Photo row
    with spot_id=NULL — this is what puts a photo in the tray."""
    _ensure_dir()
    created: list[models.Photo] = []

    for upload in files:
        ext = os.path.splitext(upload.filename or "")[1].lower() or ".jpg"
        file_id = uuid.uuid4().hex
        filename = f"{file_id}{ext}"
        filepath = os.path.join(PHOTOS_DIR, filename)

        contents = await upload.read()
        with open(filepath, "wb") as f:
            f.write(contents)

        exif_data = {}
        thumb_filename = None
        try:
            with Image.open(filepath) as img:
                exif_data = extract_exif(img)
                rgb = img.convert("RGB") if img.mode not in ("RGB", "L") else img
                thumb = rgb.copy()
                thumb.thumbnail(THUMB_SIZE)
                thumb_filename = f"{file_id}_thumb.jpg"
                thumb.save(os.path.join(PHOTOS_DIR, thumb_filename), "JPEG", quality=82)
        except Exception:
            exif_data = {}

        photo = models.Photo(
            spot_id=None,
            path=f"/photos/{filename}",
            thumbnail_path=f"/photos/{thumb_filename}" if thumb_filename else None,
            camera=exif_data.get("camera"),
            lens=exif_data.get("lens"),
            focal_length=exif_data.get("focal_length"),
            aperture=exif_data.get("aperture"),
            shutter=exif_data.get("shutter"),
            iso=exif_data.get("iso"),
            gps_lat=exif_data.get("gps_lat"),
            gps_lon=exif_data.get("gps_lon"),
            taken_at=exif_data.get("taken_at"),
        )
        db.add(photo)
        created.append(photo)

    if not created:
        raise HTTPException(status_code=400, detail="No files provided")

    db.commit()
    for p in created:
        db.refresh(p)
    return [schemas.PhotoOut.model_validate(p) for p in created]


@router.get("/tray", response_model=list[schemas.TrayPhoto])
def list_tray(db: Session = Depends(get_db)):
    photos = crud.get_tray_photos(db)
    return [
        schemas.TrayPhoto(**schemas.PhotoOut.model_validate(p).model_dump(), needs_date=p.taken_at is None)
        for p in photos
    ]


@router.post("/resolve", response_model=schemas.SpotOut)
def resolve_photos(resolve: schemas.PhotoResolve, db: Session = Depends(get_db)):
    """Assign photo_ids to the spot for (aircraft, date), creating the aircraft
    and/or spot as needed. 409s with the conflicting spot if it already has content
    and force is not set — this is the tray's warn-then-merge."""
    try:
        spot, conflict = crud.resolve_photos(db, resolve)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if conflict is not None:
        conflict_out = crud.to_spot_out(db, conflict)
        raise HTTPException(
            status_code=409,
            detail=schemas.SpotConflict(conflicting_spot=conflict_out).model_dump(mode="json"),
        )

    return crud.to_spot_out(db, spot)
