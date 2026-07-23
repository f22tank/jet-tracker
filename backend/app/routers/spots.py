from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/spots", tags=["spots"])


def _get_spot_or_404(db: Session, spot_id: int):
    spot = crud.get_spot(db, spot_id)
    if spot is None:
        raise HTTPException(status_code=404, detail="Spot not found")
    return spot


@router.get("/incomplete", response_model=list[schemas.IncompleteSpotEntry])
def incomplete(db: Session = Depends(get_db)):
    """The Upload tab's 'Needs attention' view — spots missing location,
    manufacturer, type, or aircraft identity. Must stay above /{spot_id} so
    'incomplete' isn't swallowed as a spot_id path param."""
    return crud.get_incomplete_spots(db)


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
    and delete this spot. Used after the client shows the collision dialog from
    PUT /date (source and target necessarily share an aircraft there — the
    collision check is scoped by aircraft_id) or from POST /reassign-aircraft
    (source and target legitimately differ there — that's the whole point of
    "this spot was on the wrong airframe, fold it into the record that's
    already correct"). merge_spots itself never touches aircraft_id, so there's
    nothing to reconcile either way."""
    source = _get_spot_or_404(db, spot_id)
    target = _get_spot_or_404(db, target_spot_id)

    merged = crud.merge_spots(db, source, target)
    return crud.to_spot_out(db, merged)


@router.post("/{spot_id}/reassign-aircraft", response_model=schemas.SpotOut)
def reassign_aircraft(spot_id: int, reassign: schemas.SpotAircraftReassign, db: Session = Depends(get_db)):
    """The "wrong airframe" path for a registration/serial change — see
    schemas.SpotAircraftReassign. 409s with SpotConflict (same shape as PUT
    /date) if the target aircraft already has a spot on this date; confirm
    via the existing POST /{spot_id}/merge/{target_id}."""
    spot = _get_spot_or_404(db, spot_id)
    try:
        updated, conflict = crud.reassign_spot_aircraft(db, spot, reassign)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if conflict is not None:
        conflict_out = crud.to_spot_out(db, conflict)
        raise HTTPException(
            status_code=409,
            detail=schemas.SpotConflict(conflicting_spot=conflict_out).model_dump(mode="json"),
        )

    return crud.to_spot_out(db, updated)


@router.delete("/{spot_id}/photos/{photo_id}", response_model=schemas.SpotOut)
def detach_photo(spot_id: int, photo_id: int, db: Session = Depends(get_db)):
    """Detach a misfiled photo — sends it back to the tray (spot_id=NULL)
    rather than deleting it."""
    spot = _get_spot_or_404(db, spot_id)
    photo = db.query(models.Photo).filter(models.Photo.id == photo_id, models.Photo.spot_id == spot_id).first()
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found on this spot")
    spot = crud.detach_photo_from_spot(db, spot, photo)
    return crud.to_spot_out(db, spot)
