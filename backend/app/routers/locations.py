from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("/search", response_model=list[schemas.LocationSummary])
def search(q: str = "", db: Session = Depends(get_db)):
    """Autocomplete over defined Locations, by name/ICAO/IATA."""
    return [schemas.LocationSummary.model_validate(loc) for loc in crud.search_locations(db, q)]


@router.get("/find", response_model=schemas.LocationSummary | None)
def find(value: str, db: Session = Depends(get_db)):
    """Exact (case-insensitive) name match. Null falls through to 'create new location'."""
    location = crud.find_location_by_name(db, value)
    return schemas.LocationSummary.model_validate(location) if location else None


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
    location = crud.get_location(db, location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return crud.to_location_out(db, location)
