import datetime

from sqlalchemy import func
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
        unit=spot.unit,
        owner=spot.owner,
        markings=spot.markings,
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


def find_or_create_location(db: Session, resolve: schemas.LocationResolve) -> models.Location:
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
        db.commit()
        db.refresh(location)
    return location


def resolve_location(db: Session, spot: models.Spot, resolve: schemas.LocationResolve) -> models.Spot:
    """Find-or-create a Location matching the given ICAO (or name if no ICAO) and attach it."""
    location = find_or_create_location(db, resolve)
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
    if not target.markings and source.markings:
        target.markings = source.markings
    db.delete(source)
    db.commit()
    db.refresh(target)
    return target


# ---- aircraft ----


def find_aircraft_by_identifier(db: Session, value: str) -> models.Aircraft | None:
    """Exact (case-insensitive) match on either reg or serial, across all categories."""
    value = value.strip()
    if not value:
        return None
    return (
        db.query(models.Aircraft)
        .filter(
            (func.lower(models.Aircraft.registration) == value.lower())
            | (func.lower(models.Aircraft.serial) == value.lower())
        )
        .first()
    )


def search_aircraft(db: Session, q: str, limit: int = 8) -> list[models.Aircraft]:
    """Autocomplete: prefix/substring match on reg or serial."""
    q = q.strip()
    if not q:
        return []
    like = f"%{q}%"
    return (
        db.query(models.Aircraft)
        .filter(models.Aircraft.registration.ilike(like) | models.Aircraft.serial.ilike(like))
        .order_by(models.Aircraft.id.desc())
        .limit(limit)
        .all()
    )


def create_aircraft(db: Session, payload: schemas.AircraftCreate) -> models.Aircraft:
    aircraft = models.Aircraft(**payload.model_dump())
    db.add(aircraft)
    db.commit()
    db.refresh(aircraft)
    return aircraft


# ---- tray / photo resolution ----


def get_tray_photos(db: Session) -> list[models.Photo]:
    return (
        db.query(models.Photo)
        .filter(models.Photo.spot_id.is_(None))
        .order_by(models.Photo.id.asc())
        .all()
    )


def _spot_has_content(spot: models.Spot) -> bool:
    if spot.photos:
        return True
    return any(
        [spot.airline, spot.livery, spot.unit, spot.owner, spot.markings, spot.notes, spot.location_id]
    )


def resolve_photos(db: Session, resolve: schemas.PhotoResolve) -> tuple[models.Spot | None, models.Spot | None]:
    """Find-or-create Aircraft (if new_aircraft given), find-or-create Spot(aircraft, date),
    attach photo_ids to it. Returns (spot, None) on success, or (None, conflicting_spot) if the
    target spot already has content and resolve.force is not set."""
    if resolve.new_aircraft:
        aircraft = create_aircraft(db, resolve.new_aircraft)
    else:
        aircraft = db.query(models.Aircraft).filter(models.Aircraft.id == resolve.aircraft_id).first()
        if aircraft is None:
            raise ValueError("aircraft_id not found")

    existing = get_spot_by_aircraft_date(db, aircraft.id, resolve.date)

    if existing is not None and _spot_has_content(existing) and not resolve.force:
        return None, existing

    if existing is not None:
        spot = existing
        if resolve.location_id and not spot.location_id:
            spot.location_id = resolve.location_id
        if resolve.airline and not spot.airline:
            spot.airline = resolve.airline
        if resolve.unit and not spot.unit:
            spot.unit = resolve.unit
        if resolve.owner and not spot.owner:
            spot.owner = resolve.owner
    else:
        spot = models.Spot(
            aircraft_id=aircraft.id,
            date=resolve.date,
            location_id=resolve.location_id,
            airline=resolve.airline,
            unit=resolve.unit,
            owner=resolve.owner,
        )
        db.add(spot)
        db.flush()

    photos = (
        db.query(models.Photo)
        .filter(models.Photo.id.in_(resolve.photo_ids), models.Photo.spot_id.is_(None))
        .all()
    )
    for photo in photos:
        photo.spot_id = spot.id
    if not spot.cover_photo_id and photos:
        spot.cover_photo_id = photos[0].id

    db.commit()
    db.refresh(spot)
    return spot, None
