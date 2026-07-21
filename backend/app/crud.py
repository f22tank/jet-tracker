import datetime

from sqlalchemy.orm import Session

from . import models, schemas


def get_spot(db: Session, spot_id: int) -> models.Spot | None:
    return db.query(models.Spot).filter(models.Spot.id == spot_id).first()


def get_spot_by_aircraft_date(
    db: Session, aircraft_id: int, date: datetime.date, exclude_spot_id: int | None = None
) -> models.Spot | None:
    query = db.query(models.Spot).filter(
        models.Spot.aircraft_id == aircraft_id,
        models.Spot.date == date,
    )
    if exclude_spot_id is not None:
        query = query.filter(models.Spot.id != exclude_spot_id)
    return query.first()


def _location_label(spot: models.Spot) -> str:
    if spot.location is None:
        return "Unplaced"
    loc = spot.location
    return f"{loc.name} · {loc.icao}" if loc.icao else loc.name


def build_ledger(db: Session, aircraft_id: int, current_spot_id: int) -> list[schemas.LedgerEntry]:
    spots = (
        db.query(models.Spot)
        .filter(models.Spot.aircraft_id == aircraft_id)
        .order_by(models.Spot.date.desc())
        .all()
    )
    return [
        schemas.LedgerEntry(
            id=s.id,
            date=s.date,
            location_label=_location_label(s),
            photo_count=len(s.photos),
            is_current=(s.id == current_spot_id),
        )
        for s in spots
    ]


def to_spot_out(db: Session, spot: models.Spot) -> schemas.SpotOut:
    return schemas.SpotOut(
        id=spot.id,
        date=spot.date,
        airline=spot.airline,
        livery=spot.livery,
        notes=spot.notes,
        cover_photo_id=spot.cover_photo_id,
        aircraft=schemas.AircraftOut.model_validate(spot.aircraft),
        location=schemas.LocationOut.model_validate(spot.location) if spot.location else None,
        photos=[schemas.PhotoOut.model_validate(p) for p in spot.photos],
        ledger=build_ledger(db, spot.aircraft_id, spot.id),
    )


def update_spot_fields(db: Session, spot: models.Spot, update: schemas.SpotUpdate) -> models.Spot:
    data = update.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(spot, field, value)
    db.commit()
    db.refresh(spot)
    return spot


def update_spot_date(db: Session, spot: models.Spot, new_date: datetime.date) -> models.Spot:
    spot.date = new_date
    db.commit()
    db.refresh(spot)
    return spot


def resolve_location(db: Session, spot: models.Spot, resolve: schemas.LocationResolve) -> models.Spot:
    """Find-or-create a Location matching the given ICAO (or name if no ICAO) and attach it."""
    location = None
    if resolve.icao:
        location = db.query(models.Location).filter(models.Location.icao == resolve.icao).first()
    if location is None:
        location = models.Location(
            icao=resolve.icao,
            iata=resolve.iata,
            name=resolve.name,
            city=resolve.city,
            country=resolve.country,
            lat=resolve.lat,
            lon=resolve.lon,
        )
        db.add(location)
        db.flush()
    spot.location_id = location.id
    db.commit()
    db.refresh(spot)
    return spot


def merge_spots(db: Session, source: models.Spot, target: models.Spot) -> models.Spot:
    """Move source's photos onto target, combine notes, drop source."""
    for photo in list(source.photos):
        source.photos.remove(photo)
        target.photos.append(photo)
    if source.notes:
        target.notes = f"{target.notes}\n\n{source.notes}" if target.notes else source.notes
    if not target.livery and source.livery:
        target.livery = source.livery
    if not target.airline and source.airline:
        target.airline = source.airline
    db.delete(source)
    db.commit()
    db.refresh(target)
    return target
