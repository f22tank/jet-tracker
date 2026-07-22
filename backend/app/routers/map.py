import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..models import AircraftCategory

router = APIRouter(prefix="/api/map", tags=["map"])


@router.get("/spots", response_model=list[schemas.MapSpot])
def spots(
    aircraft_id: Optional[int] = None,
    operator_id: Optional[int] = None,
    category: Optional[AircraftCategory] = None,
    aircraft_type: Optional[str] = None,
    date_from: Optional[datetime.date] = None,
    date_to: Optional[datetime.date] = None,
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """The one reusable data feed: {} for the big map, {aircraft_id} for the aircraft
    page, {operator_id} for the operator page — same query, different scope."""
    spot_rows = crud.get_map_spots(
        db,
        aircraft_id=aircraft_id,
        operator_id=operator_id,
        category=category,
        aircraft_type=aircraft_type,
        date_from=date_from,
        date_to=date_to,
        location_id=location_id,
    )
    return [m for m in (crud.to_map_spot(s) for s in spot_rows) if m is not None]


@router.get("/facets", response_model=schemas.MapFacets)
def facets(db: Session = Depends(get_db)):
    return crud.get_map_facets(db)
