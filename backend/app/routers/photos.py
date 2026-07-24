import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import crud, models, schemas, storage
from ..database import get_db
from ..exif import extract_exif

router = APIRouter(prefix="/api/photos", tags=["photos"])


@router.post("/ingest", response_model=list[schemas.PhotoOut])
async def ingest_photos(files: list[UploadFile] = File(...), db: Session = Depends(get_db)):
    """Store each file, parse EXIF, generate a thumbnail, and create a Photo row
    with spot_id=NULL — this is what puts a photo in the tray.

    Tray photos have no spot date yet, so the original/thumb pair is sharded by
    taken_at (falling back to today if EXIF has none) and left there — a photo's
    shard never moves when it's later assigned to a spot."""
    created: list[models.Photo] = []

    for upload in files:
        contents = await upload.read()
        try:
            storage.assert_jpeg(upload.filename, upload.content_type)
        except storage.UnsupportedImageType as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        file_id = storage.new_id()

        exif_data = {}
        img = None
        try:
            img = storage.open_image(contents)
            exif_data = extract_exif(img)
        except Exception:
            exif_data = {}

        shard_date = exif_data.get("taken_at").date() if exif_data.get("taken_at") else datetime.date.today()

        original_rel = storage.original_rel(shard_date, file_id)
        storage.save_file(contents, original_rel)

        thumb_rel = None
        if img is not None:
            try:
                thumb_rel = storage.thumb_rel(shard_date, file_id)
                storage.save_thumbnail(img, thumb_rel)
            except Exception:
                thumb_rel = None

        photo = models.Photo(
            spot_id=None,
            path=original_rel,
            thumbnail_path=thumb_rel,
            original_filename=upload.filename,
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
    return [crud.to_photo_out(p) for p in created]


@router.get("/tray", response_model=list[schemas.TrayPhoto])
def list_tray(db: Session = Depends(get_db)):
    photos = crud.get_tray_photos(db)
    return [
        schemas.TrayPhoto(**crud.to_photo_out(p).model_dump(), needs_date=p.taken_at is None)
        for p in photos
    ]


@router.patch("/{photo_id}", response_model=schemas.PhotoOut)
def update_photo(photo_id: int, update: schemas.PhotoUpdate, db: Session = Depends(get_db)):
    """Rating only for now — storage and editing, no dependent sorting/filtering yet."""
    photo = db.get(models.Photo, photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")
    photo = crud.update_photo(db, photo, update)
    return crud.to_photo_out(photo)


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
