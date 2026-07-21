from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/spots", tags=["spots"])


def _get_spot_or_404(db: Session, spot_id: int):
    spot = crud.get_spot(db, spot_id)
    if spot is None:
        raise HTTPException(status_code=404, detail="Spot not found")
    return spot


@router.get("/{spot_id}", response_model=schemas.SpotOut)
def read_spot(spot_id: int, db: Session = Depends(get_db)):
    spot = _get_spot_or_404(db, spot_id)
    return crud.to_spot_out(db, spot)


@router.patch("/{spot_id}", response_model=schemas.SpotOut)
def patch_spot(spot_id: int, update: schemas.SpotUpdate, db: Session = Depends(get_db)):
    spot = _get_spot_or_404(db, spot_id)
    spot = crud.update_spot_fields(db, spot, update)
    return crud.to_spot_out(db, spot)


@router.put("/{spot_id}/date", response_model=schemas.SpotOut)
def update_date(spot_id: int, update: schemas.SpotDateUpdate, db: Session = Depends(get_db)):
    """Set this spot's date. 409s with the conflicting spot if the
    aircraft already has a spot on that date (UNIQUE(aircraft, date))."""
    spot = _get_spot_or_404(db, spot_id)

    conflict = crud.get_spot_by_aircraft_date(
        db, spot.aircraft_id, update.date, exclude_spot_id=spot.id
    )
    if conflict is not None:
        conflict_out = crud.to_spot_out(db, conflict)
        raise HTTPException(
            status_code=409,
            detail=schemas.SpotConflict(conflicting_spot=conflict_out).model_dump(mode="json"),
        )

    spot = crud.update_spot_date(db, spot, update.date)
    return crud.to_spot_out(db, spot)


@router.post("/{spot_id}/merge/{target_spot_id}", response_model=schemas.SpotOut)
def merge_spot(spot_id: int, target_spot_id: int, db: Session = Depends(get_db)):
    """Confirm a merge-warn: fold this spot's photos/notes into target_spot_id
    and delete this spot. Used after the client shows the collision dialog
    from PUT /date and the user opts to merge instead of picking another date."""
    source = _get_spot_or_404(db, spot_id)
    target = _get_spot_or_404(db, target_spot_id)

    if source.aircraft_id != target.aircraft_id:
        raise HTTPException(status_code=400, detail="Spots belong to different aircraft")

    merged = crud.merge_spots(db, source, target)
    return crud.to_spot_out(db, merged)


@router.put("/{spot_id}/location", response_model=schemas.SpotOut)
def set_location(spot_id: int, resolve: schemas.LocationResolve, db: Session = Depends(get_db)):
    """Resolve an unplaced spot's location (find-or-create by ICAO)."""
    spot = _get_spot_or_404(db, spot_id)
    spot = crud.resolve_location(db, spot, resolve)
    return crud.to_spot_out(db, spot)
