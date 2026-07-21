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
    if spot.location is not None:
        loc = spot.location
        return f"{loc.name} · {loc.icao}" if loc.icao else loc.name
    if spot.spot_lat is not None and spot.spot_lon is not None:
        return f"{spot.spot_lat:.3f}, {spot.spot_lon:.3f}"
    return "Unplaced"


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
        unit=spot.unit,
        livery=spot.livery,
        owner=spot.owner,
        markings=spot.markings,
        notes=spot.notes,
        cover_photo_id=spot.cover_photo_id,
        aircraft=schemas.AircraftOut.model_validate(spot.aircraft),
        operator=to_operator_summary(spot.operator) if spot.operator else None,
        location=schemas.LocationSummary.model_validate(spot.location) if spot.location else None,
        spot_lat=spot.spot_lat,
        spot_lon=spot.spot_lon,
        photos=[schemas.PhotoOut.model_validate(p) for p in spot.photos],
        ledger=build_ledger(db, spot.aircraft_id, spot.id),
    )


def update_spot_fields(db: Session, spot: models.Spot, update: schemas.SpotUpdate) -> models.Spot:
    """A defined Location and a raw pin are mutually exclusive on a Spot: setting
    one clears the other (never both — see LOCATION_ENTITY_BRIEF)."""
    data = update.model_dump(exclude_unset=True)
    if "location_id" in data and data["location_id"] is not None:
        data["spot_lat"] = None
        data["spot_lon"] = None
    elif ("spot_lat" in data or "spot_lon" in data) and (data.get("spot_lat") is not None or data.get("spot_lon") is not None):
        data["location_id"] = None
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


def find_or_create_location(db: Session, resolve: schemas.LocationCreate) -> models.Location:
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


def get_location(db: Session, location_id: int) -> models.Location | None:
    return db.query(models.Location).filter(models.Location.id == location_id).first()


def find_location_by_name(db: Session, name: str) -> models.Location | None:
    return db.query(models.Location).filter(func.lower(models.Location.name) == name.strip().lower()).first()


def search_locations(db: Session, q: str, limit: int = 8) -> list[models.Location]:
    q = q.strip()
    query = db.query(models.Location)
    if q:
        like = f"%{q}%"
        query = query.filter(
            models.Location.name.ilike(like) | models.Location.icao.ilike(like) | models.Location.iata.ilike(like)
        )
    return query.order_by(models.Location.name).limit(limit).all()


def list_locations(db: Session) -> list[schemas.LocationListEntry]:
    """Flat list of every defined Location with its spot count — one-off raw pins
    have no Location record and never appear here."""
    locations = db.query(models.Location).order_by(models.Location.name).all()
    counts = dict(
        db.query(models.Spot.location_id, func.count(models.Spot.id))
        .filter(models.Spot.location_id.isnot(None))
        .group_by(models.Spot.location_id)
        .all()
    )
    return [
        schemas.LocationListEntry(
            id=loc.id,
            name=loc.name,
            icao=loc.icao,
            iata=loc.iata,
            city=loc.city,
            country=loc.country,
            spot_count=counts.get(loc.id, 0),
        )
        for loc in locations
    ]


def to_location_out(db: Session, location: models.Location) -> schemas.LocationOut:
    spots = (
        db.query(models.Spot)
        .filter(models.Spot.location_id == location.id)
        .order_by(models.Spot.date.desc())
        .all()
    )
    spot_entries = [
        schemas.LocationSpotEntry(
            id=s.id,
            date=s.date,
            aircraft_identifier=s.aircraft.identifier,
            aircraft_type=s.aircraft.type,
            operator_label=s.operator.name if s.operator else (s.airline or s.unit),
        )
        for s in spots
    ]
    dates = [s.date for s in spots]
    stats = schemas.LocationStats(
        spot_count=len(spots),
        aircraft_count=len({s.aircraft_id for s in spots}),
        operator_count=len({s.operator_id for s in spots if s.operator_id}),
        first_date=min(dates) if dates else None,
        last_date=max(dates) if dates else None,
    )
    return schemas.LocationOut(
        id=location.id,
        icao=location.icao,
        iata=location.iata,
        name=location.name,
        city=location.city,
        country=location.country,
        lat=location.lat,
        lon=location.lon,
        spots=spot_entries,
        stats=stats,
    )


def merge_spots(db: Session, source: models.Spot, target: models.Spot) -> models.Spot:
    """Move source's photos onto target, combine notes, drop source."""
    for photo in list(source.photos):
        source.photos.remove(photo)
        target.photos.append(photo)
    if source.notes:
        target.notes = f"{target.notes}\n\n{source.notes}" if target.notes else source.notes
    if not target.livery and source.livery:
        target.livery = source.livery
    if not target.operator_id and source.operator_id:
        target.operator_id = source.operator_id
    if not target.location_id and target.spot_lat is None and source.location_id:
        target.location_id = source.location_id
    elif not target.location_id and target.spot_lat is None and source.spot_lat is not None:
        target.spot_lat = source.spot_lat
        target.spot_lon = source.spot_lon
    if not target.airline and source.airline:
        target.airline = source.airline
    if not target.unit and source.unit:
        target.unit = source.unit
    if not target.markings and source.markings:
        target.markings = source.markings
    db.delete(source)
    db.commit()
    db.refresh(target)
    return target


# ---- operators ----


def _operator_detail_fields(operator: models.Operator) -> dict:
    if operator.type == models.OperatorType.airline and operator.airline_detail:
        d = operator.airline_detail
        return {"iata": d.iata, "icao": d.icao, "callsign": d.callsign}
    if operator.type == models.OperatorType.military_unit and operator.unit_detail:
        d = operator.unit_detail
        return {"branch": d.branch, "tail_code": d.tail_code, "home_base": d.home_base}
    return {}


def to_operator_summary(operator: models.Operator) -> schemas.OperatorSummary:
    return schemas.OperatorSummary(
        id=operator.id,
        type=operator.type,
        name=operator.name,
        image=operator.image,
        **_operator_detail_fields(operator),
    )


def get_operator(db: Session, operator_id: int) -> models.Operator | None:
    return db.query(models.Operator).filter(models.Operator.id == operator_id).first()


def find_operator_by_name(db: Session, type_: models.OperatorType, name: str) -> models.Operator | None:
    return (
        db.query(models.Operator)
        .filter(models.Operator.type == type_, func.lower(models.Operator.name) == name.strip().lower())
        .first()
    )


def search_operators(db: Session, type_: models.OperatorType, q: str, limit: int = 8) -> list[models.Operator]:
    q = q.strip()
    query = db.query(models.Operator).filter(models.Operator.type == type_)
    if q:
        query = query.filter(models.Operator.name.ilike(f"%{q}%"))
    return query.order_by(models.Operator.name).limit(limit).all()


def create_operator(db: Session, payload: schemas.OperatorCreate) -> models.Operator:
    operator = models.Operator(
        type=payload.type,
        name=payload.name,
        image=payload.image,
        notes=payload.notes,
        parent_operator_id=payload.parent_operator_id,
    )
    db.add(operator)
    db.flush()

    if payload.type == models.OperatorType.airline:
        db.add(
            models.AirlineDetail(
                operator_id=operator.id, iata=payload.iata, icao=payload.icao, callsign=payload.callsign
            )
        )
    else:
        db.add(
            models.UnitDetail(
                operator_id=operator.id,
                branch=payload.branch,
                tail_code=payload.tail_code,
                home_base=payload.home_base,
            )
        )
    db.commit()
    db.refresh(operator)
    return operator


def find_or_create_operator(db: Session, payload: schemas.OperatorCreate) -> models.Operator:
    existing = find_operator_by_name(db, payload.type, payload.name)
    if existing:
        return existing
    return create_operator(db, payload)


def to_operator_out(db: Session, operator: models.Operator) -> schemas.OperatorOut:
    spots = (
        db.query(models.Spot)
        .filter(models.Spot.operator_id == operator.id)
        .order_by(models.Spot.date.desc())
        .all()
    )
    spot_entries = [
        schemas.OperatorSpotEntry(
            id=s.id,
            date=s.date,
            aircraft_identifier=s.aircraft.identifier,
            aircraft_type=s.aircraft.type,
            location_label=_location_label(s),
        )
        for s in spots
    ]
    dates = [s.date for s in spots]
    stats = schemas.OperatorStats(
        spot_count=len(spots),
        aircraft_count=len({s.aircraft_id for s in spots}),
        first_date=min(dates) if dates else None,
        last_date=max(dates) if dates else None,
    )

    detail = _operator_detail_fields(operator)
    return schemas.OperatorOut(
        id=operator.id,
        type=operator.type,
        name=operator.name,
        image=operator.image,
        notes=operator.notes,
        parent=to_operator_summary(operator.parent) if operator.parent else None,
        children=[to_operator_summary(c) for c in operator.children],
        spots=spot_entries,
        stats=stats,
        **detail,
    )


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
        [
            spot.operator_id,
            spot.airline,
            spot.unit,
            spot.livery,
            spot.owner,
            spot.markings,
            spot.notes,
            spot.location_id,
            spot.spot_lat,
        ]
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

    # Defined location and raw pin are mutually exclusive — location_id wins if both given.
    location_id = resolve.location_id
    spot_lat = resolve.spot_lat if not location_id else None
    spot_lon = resolve.spot_lon if not location_id else None

    if existing is not None:
        spot = existing
        if location_id and not spot.location_id:
            spot.location_id = location_id
            spot.spot_lat = None
            spot.spot_lon = None
        elif spot_lat is not None and not spot.location_id and spot.spot_lat is None:
            spot.spot_lat = spot_lat
            spot.spot_lon = spot_lon
        if resolve.operator_id and not spot.operator_id:
            spot.operator_id = resolve.operator_id
        if resolve.owner and not spot.owner:
            spot.owner = resolve.owner
    else:
        spot = models.Spot(
            aircraft_id=aircraft.id,
            date=resolve.date,
            location_id=location_id,
            spot_lat=spot_lat,
            spot_lon=spot_lon,
            operator_id=resolve.operator_id,
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


# ---- gallery (home page: recent carousel + searchable/sortable/paginated table) ----


def _spot_cover_thumbnail(spot: models.Spot) -> str | None:
    if spot.cover_photo:
        return spot.cover_photo.thumbnail_path or spot.cover_photo.path
    return None


def _operator_label_for(spot: models.Spot) -> str | None:
    if spot.operator:
        return spot.operator.name
    return spot.airline or spot.unit


def get_recent_spots(db: Session, limit: int = 12) -> list[models.Spot]:
    """Recent = spotting date desc (Spot.date) — "what have I been catching lately,"
    not "what have I recently logged." A backfilled old catch won't surface here even
    if added today; it still shows in the table below. LEVER: to surface freshly-added
    backfills instead, swap this order_by to models.Spot.created_at.desc()."""
    return (
        db.query(models.Spot)
        .order_by(models.Spot.date.desc(), models.Spot.id.desc())
        .limit(limit)
        .all()
    )


def to_gallery_card(spot: models.Spot) -> schemas.GallerySpotCard:
    return schemas.GallerySpotCard(
        id=spot.id,
        date=spot.date,
        aircraft_identifier=spot.aircraft.identifier,
        cover_thumbnail=_spot_cover_thumbnail(spot),
        operator_name=_operator_label_for(spot),
        operator_image=spot.operator.image if spot.operator else None,
    )


def search_spots(
    db: Session, q: str = "", sort: str = "date", order: str = "desc", page: int = 1, page_size: int = 25
) -> tuple[list[models.Spot], int]:
    """Server-side search + sort + pagination over the full spot set. Search is a
    single free-text box across reg/serial, operator, aircraft type, location, notes —
    no faceted filters this version (deliberate, see HOME_GALLERY_BRIEF)."""
    identifier_expr = func.coalesce(models.Aircraft.registration, models.Aircraft.serial)
    operator_name_expr = func.coalesce(models.Operator.name, models.Spot.airline, models.Spot.unit)

    query = (
        db.query(models.Spot)
        .join(models.Aircraft, models.Spot.aircraft_id == models.Aircraft.id)
        .outerjoin(models.Operator, models.Spot.operator_id == models.Operator.id)
        .outerjoin(models.Location, models.Spot.location_id == models.Location.id)
    )

    q = q.strip()
    if q:
        like = f"%{q}%"
        query = query.filter(
            models.Aircraft.registration.ilike(like)
            | models.Aircraft.serial.ilike(like)
            | models.Aircraft.type.ilike(like)
            | models.Operator.name.ilike(like)
            | models.Spot.airline.ilike(like)
            | models.Spot.unit.ilike(like)
            | models.Location.name.ilike(like)
            | models.Location.icao.ilike(like)
            | models.Location.iata.ilike(like)
            | models.Spot.notes.ilike(like)
        )

    total = query.count()

    sort_map = {
        "date": models.Spot.date,
        "created_at": models.Spot.created_at,
        "identifier": identifier_expr,
        "operator": operator_name_expr,
        "type": models.Aircraft.type,
    }
    sort_col = sort_map.get(sort, models.Spot.date)
    direction = sort_col.asc() if order == "asc" else sort_col.desc()

    items = (
        query.order_by(direction, models.Spot.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def to_gallery_row(spot: models.Spot) -> schemas.GalleryTableRow:
    return schemas.GalleryTableRow(
        id=spot.id,
        date=spot.date,
        aircraft_identifier=spot.aircraft.identifier,
        aircraft_type=spot.aircraft.type,
        aircraft_category=spot.aircraft.category,
        operator_label=_operator_label_for(spot),
        location_label=_location_label(spot),
        cover_thumbnail=_spot_cover_thumbnail(spot),
    )
