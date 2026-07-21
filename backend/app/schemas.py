import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, model_validator

from .models import AircraftCategory, GAConfiguration, GARole, OperatorType


class AircraftOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: AircraftCategory
    identifier: Optional[str] = None

    # commercial / ga
    registration: Optional[str] = None
    type: Optional[str] = None
    msn: Optional[str] = None
    line_number: Optional[str] = None
    first_flight: Optional[int] = None

    # military
    serial: Optional[str] = None
    variant: Optional[str] = None
    operator: Optional[str] = None
    home_base: Optional[str] = None

    # ga
    manufacturer: Optional[str] = None
    configuration: Optional[GAConfiguration] = None
    role: Optional[GARole] = None


class AircraftCreate(BaseModel):
    category: AircraftCategory

    registration: Optional[str] = None
    type: Optional[str] = None
    msn: Optional[str] = None
    line_number: Optional[str] = None
    first_flight: Optional[int] = None

    serial: Optional[str] = None
    variant: Optional[str] = None
    operator: Optional[str] = None
    home_base: Optional[str] = None

    manufacturer: Optional[str] = None
    configuration: Optional[GAConfiguration] = None
    role: Optional[GARole] = None

    @model_validator(mode="after")
    def _require_identifier(self):
        if self.category == AircraftCategory.military:
            if not self.serial:
                raise ValueError("serial is required for military aircraft")
        elif not self.registration:
            raise ValueError("registration is required for commercial/ga aircraft")
        return self


class AircraftSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: AircraftCategory
    identifier: Optional[str] = None
    type: Optional[str] = None
    manufacturer: Optional[str] = None
    variant: Optional[str] = None


class OperatorSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: OperatorType
    name: str
    image: Optional[str] = None

    # airline
    iata: Optional[str] = None
    icao: Optional[str] = None
    callsign: Optional[str] = None
    # military_unit
    branch: Optional[str] = None
    tail_code: Optional[str] = None
    home_base: Optional[str] = None


class OperatorCreate(BaseModel):
    type: OperatorType
    name: str
    image: Optional[str] = None
    notes: Optional[str] = None
    parent_operator_id: Optional[int] = None

    iata: Optional[str] = None
    icao: Optional[str] = None
    callsign: Optional[str] = None

    branch: Optional[str] = None
    tail_code: Optional[str] = None
    home_base: Optional[str] = None


class OperatorSpotEntry(BaseModel):
    id: int
    date: datetime.date
    aircraft_identifier: Optional[str] = None
    aircraft_type: Optional[str] = None
    location_label: str


class OperatorStats(BaseModel):
    spot_count: int
    aircraft_count: int
    first_date: Optional[datetime.date] = None
    last_date: Optional[datetime.date] = None


class OperatorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: OperatorType
    name: str
    image: Optional[str] = None
    notes: Optional[str] = None

    iata: Optional[str] = None
    icao: Optional[str] = None
    callsign: Optional[str] = None
    branch: Optional[str] = None
    tail_code: Optional[str] = None
    home_base: Optional[str] = None

    parent: Optional[OperatorSummary] = None
    children: list[OperatorSummary] = []
    spots: list[OperatorSpotEntry] = []
    stats: OperatorStats


class LocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    icao: Optional[str] = None
    iata: Optional[str] = None
    name: str
    city: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class PhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    spot_id: Optional[int] = None
    path: str
    thumbnail_path: Optional[str] = None
    camera: Optional[str] = None
    lens: Optional[str] = None
    focal_length: Optional[str] = None
    aperture: Optional[str] = None
    shutter: Optional[str] = None
    iso: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lon: Optional[float] = None
    taken_at: Optional[datetime.datetime] = None


class LedgerEntry(BaseModel):
    id: int
    date: datetime.date
    location_label: str
    photo_count: int
    is_current: bool


class SpotOut(BaseModel):
    id: int
    date: datetime.date
    # legacy fallback strings — superseded by `operator` below, kept for unmigrated data
    airline: Optional[str] = None
    unit: Optional[str] = None

    livery: Optional[str] = None
    owner: Optional[str] = None
    markings: Optional[str] = None
    notes: Optional[str] = None
    cover_photo_id: Optional[int] = None
    aircraft: AircraftOut
    operator: Optional[OperatorSummary] = None
    location: Optional[LocationOut] = None
    photos: list[PhotoOut]
    ledger: list[LedgerEntry] = []

    model_config = ConfigDict(from_attributes=True)


class SpotUpdate(BaseModel):
    operator_id: Optional[int] = None
    livery: Optional[str] = None
    owner: Optional[str] = None
    markings: Optional[str] = None
    notes: Optional[str] = None
    cover_photo_id: Optional[int] = None


class SpotDateUpdate(BaseModel):
    date: datetime.date


class SpotConflict(BaseModel):
    detail: str = "A spot for this aircraft already exists on that date."
    conflicting_spot: SpotOut


class LocationResolve(BaseModel):
    """Find-or-create a Location by ICAO (falling back to name) and attach it to a spot."""

    icao: Optional[str] = None
    iata: Optional[str] = None
    name: str
    city: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class TrayPhoto(PhotoOut):
    needs_date: bool = False


class PhotoResolve(BaseModel):
    """Resolve a batch of tray photos into a spot: find-or-create Aircraft (if new_aircraft
    given) or use aircraft_id, find-or-create Spot(aircraft, date), attach photos.
    If the target spot already has content, this 409s (SpotConflict) unless force=True."""

    photo_ids: list[int]
    date: datetime.date
    aircraft_id: Optional[int] = None
    new_aircraft: Optional[AircraftCreate] = None

    location_id: Optional[int] = None
    operator_id: Optional[int] = None
    owner: Optional[str] = None  # ga only — stays free-text

    force: bool = False

    @model_validator(mode="after")
    def _require_aircraft(self):
        if not self.aircraft_id and not self.new_aircraft:
            raise ValueError("aircraft_id or new_aircraft is required")
        return self
