from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/aircraft", tags=["aircraft"])


@router.get("/search", response_model=list[schemas.AircraftSearchResult])
def search(q: str, db: Session = Depends(get_db)):
    """Autocomplete against previously-seen aircraft, by reg or serial."""
    return crud.search_aircraft(db, q)


@router.get("/find", response_model=schemas.AircraftSearchResult | None)
def find(value: str, db: Session = Depends(get_db)):
    """Exact (case-insensitive) match on reg or serial. Null if it doesn't exist yet —
    the tagging UI should fall through to 'create new aircraft' in that case."""
    aircraft = crud.find_aircraft_by_identifier(db, value)
    return schemas.AircraftSearchResult.model_validate(aircraft) if aircraft else None


@router.post("", response_model=schemas.AircraftOut)
def create(payload: schemas.AircraftCreate, db: Session = Depends(get_db)):
    try:
        aircraft = crud.create_aircraft(db, payload)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An aircraft with that reg/serial already exists")
    return schemas.AircraftOut.model_validate(aircraft)
