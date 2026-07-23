from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..models import AircraftCategory

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


@router.get("/table", response_model=schemas.AircraftTableResponse)
def table(
    q: str = "",
    category: Optional[AircraftCategory] = None,
    sort: Literal["identifier", "type", "category", "manufacturer", "spot_count", "last_date"] = "identifier",
    order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """The Aircraft tab: search+sort+paginate over every aircraft, same shape as All
    Spots, plus the one category quick-filter (commercial/military/GA)."""
    items, total = crud.search_aircraft_table(
        db, q=q, category=category, sort=sort, order=order, page=page, page_size=page_size
    )
    return schemas.AircraftTableResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=schemas.AircraftOut)
def create(payload: schemas.AircraftCreate, db: Session = Depends(get_db)):
    try:
        aircraft = crud.create_aircraft(db, payload)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An aircraft with that reg/serial already exists")
    return schemas.AircraftOut.model_validate(aircraft)


@router.get("/{aircraft_id}", response_model=schemas.AircraftDetailOut)
def read(aircraft_id: int, db: Session = Depends(get_db)):
    aircraft = crud.get_aircraft(db, aircraft_id)
    if aircraft is None:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    return crud.to_aircraft_detail(db, aircraft)


@router.patch("/{aircraft_id}", response_model=schemas.AircraftDetailOut)
def update(aircraft_id: int, update: schemas.AircraftUpdate, db: Session = Depends(get_db)):
    """Full aircraft-record edit, including registration/serial (the "fix the typo
    on this aircraft" path — see schemas.AircraftUpdate and SpotAircraftReassign)."""
    aircraft = crud.get_aircraft(db, aircraft_id)
    if aircraft is None:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    try:
        aircraft = crud.update_aircraft_fields(db, aircraft, update)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Another aircraft already has that registration/serial")
    return crud.to_aircraft_detail(db, aircraft)
