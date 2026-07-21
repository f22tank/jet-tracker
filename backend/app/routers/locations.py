from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.post("", response_model=schemas.LocationOut)
def create(payload: schemas.LocationResolve, db: Session = Depends(get_db)):
    """Find-or-create a Location by ICAO (or name if no ICAO). Used by the tray's
    batch 'fixed location' setting, which isn't scoped to a spot yet."""
    location = crud.find_or_create_location(db, payload)
    return schemas.LocationOut.model_validate(location)
