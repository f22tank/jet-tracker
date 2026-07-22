from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from .. import crud, schemas, storage
from ..database import get_db

router = APIRouter(prefix="/api/locations", tags=["locations"])


def _get_location_or_404(db: Session, location_id: int):
    location = crud.get_location(db, location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.get("/search", response_model=list[schemas.LocationSummary])
def search(q: str = "", db: Session = Depends(get_db)):
    """Autocomplete over defined Locations, by name/ICAO/IATA."""
    return [schemas.LocationSummary.model_validate(loc) for loc in crud.search_locations(db, q)]


@router.get("/find", response_model=schemas.LocationSummary | None)
def find(value: str, db: Session = Depends(get_db)):
    """Exact (case-insensitive) name match. Null falls through to 'create new location'."""
    location = crud.find_location_by_name(db, value)
    return schemas.LocationSummary.model_validate(location) if location else None


@router.get("/recent", response_model=list[schemas.LocationRecentCard])
def recent(limit: int = Query(8, ge=1, le=20), db: Session = Depends(get_db)):
    """Home page's 'recent locations' strip — ordered by each location's most
    recent spot, cover photo included when set."""
    locations = crud.get_recent_locations(db, limit)
    return [crud.to_location_card(db, loc) for loc in locations]


@router.get("", response_model=list[schemas.LocationListEntry])
def list_all(db: Session = Depends(get_db)):
    """Flat top-level list of every defined Location with its spot count."""
    return crud.list_locations(db)


@router.post("", response_model=schemas.LocationSummary)
def create(payload: schemas.LocationCreate, db: Session = Depends(get_db)):
    """Find-or-create a Location by ICAO (or name if no ICAO). Used by the tag-time
    'create new location' control, in the tray and on the spotting page."""
    location = crud.find_or_create_location(db, payload)
    return schemas.LocationSummary.model_validate(location)


@router.get("/{location_id}", response_model=schemas.LocationOut)
def read(location_id: int, db: Session = Depends(get_db)):
    location = _get_location_or_404(db, location_id)
    return crud.to_location_out(db, location)


@router.patch("/{location_id}", response_model=schemas.LocationOut)
def update(location_id: int, update: schemas.LocationUpdate, db: Session = Depends(get_db)):
    """Inline editing of name/city/country/icao/iata/lat/lon on the location page."""
    location = _get_location_or_404(db, location_id)
    location = crud.update_location_fields(db, location, update)
    return crud.to_location_out(db, location)


@router.post("/{location_id}/cover-photo", response_model=schemas.LocationOut)
async def upload_cover_photo(location_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Location cover photo upload — always a fresh file the user uploads, never
    a reference to an existing spot photo (see PHOTO_STORAGE_BRIEF). A thumb is
    generated since the full-size cover is also shown small, as a card. Replacing
    an existing cover deletes the old original+thumb rather than orphaning them."""
    location = _get_location_or_404(db, location_id)

    contents = await file.read()
    try:
        storage.assert_jpeg(file.filename, file.content_type)
    except storage.UnsupportedImageType as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    storage.delete_if_local(location.cover_image)
    storage.delete_if_local(location.cover_image_thumbnail)

    file_id = storage.new_id()
    original_rel = storage.asset_rel("locations", location.id, file_id)
    storage.save_jpeg(contents, original_rel)

    thumb_rel = None
    try:
        img = storage.open_image(contents)
        thumb_rel = storage.asset_thumb_rel("locations", location.id, file_id)
        storage.save_thumbnail(img, thumb_rel, size=storage.ASSET_THUMB_SIZE)
    except Exception:
        thumb_rel = None

    location.cover_image = original_rel
    location.cover_image_thumbnail = thumb_rel
    db.commit()
    db.refresh(location)
    return crud.to_location_out(db, location)


@router.delete("/{location_id}/cover-photo", response_model=schemas.LocationOut)
def remove_cover_photo(location_id: int, db: Session = Depends(get_db)):
    location = _get_location_or_404(db, location_id)
    storage.delete_if_local(location.cover_image)
    storage.delete_if_local(location.cover_image_thumbnail)
    location.cover_image = None
    location.cover_image_thumbnail = None
    db.commit()
    db.refresh(location)
    return crud.to_location_out(db, location)
