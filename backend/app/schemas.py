import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, model_validator

from .models import AircraftCategory, GAConfiguration, GARole, OperatorType


class ManufacturerSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    logo: Optional[str] = None
    country: Optional[str] = None


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

    # ga — free-text, distinct from manufacturer_entity below
    manufacturer: Optional[str] = None
    configuration: Optional[GAConfiguration] = None
    role: Optional[GARole] = None

    # cross-category link to the Manufacturer entity (see models.Aircraft.manufacturer_entity)
    manufacturer_entity: Optional[ManufacturerSummary] = None


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


class AircraftSpotEntry(BaseModel):
    id: int
    date: datetime.date
    location_label: str
    operator_label: Optional[str] = None
    cover_thumbnail: Optional[str] = None


class AircraftStats(BaseModel):
    spot_count: int
    location_count: int
    operator_count: int
    first_date: Optional[datetime.date] = None
    last_date: Optional[datetime.date] = None


class AircraftDetailOut(AircraftOut):
    spots: list[AircraftSpotEntry] = []
    stats: AircraftStats


class AircraftTableRow(BaseModel):
    """One row in the Aircraft tab's full table (search/sort/paginate, like All Spots)."""

    id: int
    identifier: Optional[str] = None
    type: Optional[str] = None
    category: AircraftCategory
    manufacturer_name: Optional[str] = None
    operator_label: Optional[str] = None
    spot_count: int
    last_date: Optional[datetime.date] = None


class AircraftTableResponse(BaseModel):
    items: list[AircraftTableRow]
    total: int
    page: int
    page_size: int


class ManufacturerAircraftEntry(BaseModel):
    id: int
    identifier: Optional[str] = None
    type: Optional[str] = None
    category: AircraftCategory


class ManufacturerSpotEntry(BaseModel):
    id: int
    date: datetime.date
    aircraft_identifier: Optional[str] = None
    aircraft_type: Optional[str] = None
    cover_thumbnail: Optional[str] = None


class ManufacturerStats(BaseModel):
    aircraft_count: int
    spot_count: int
    type_count: int


class ManufacturerListEntry(BaseModel):
    id: int
    name: str
    logo: Optional[str] = None
    country: Optional[str] = None
    aircraft_count: int


class ManufacturerOut(BaseModel):
    id: int
    name: str
    logo: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None
    aircraft: list[ManufacturerAircraftEntry] = []
    recent_spots: list[ManufacturerSpotEntry] = []
    stats: ManufacturerStats


class ManufacturerUpdate(BaseModel):
    country: Optional[str] = None
    notes: Optional[str] = None


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


class PhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    spot_id: Optional[int] = None
    path: str
    thumbnail_path: Optional[str] = None
    original_filename: Optional[str] = None
    camera: Optional[str] = None
    lens: Optional[str] = None
    focal_length: Optional[str] = None
    aperture: Optional[str] = None
    shutter: Optional[str] = None
    iso: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lon: Optional[float] = None
    taken_at: Optional[datetime.datetime] = None


class OperatorSpotEntry(BaseModel):
    id: int
    date: datetime.date
    aircraft_identifier: Optional[str] = None
    aircraft_type: Optional[str] = None
    location_label: str
    cover_thumbnail: Optional[str] = None


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
    bio: Optional[str] = None

    iata: Optional[str] = None
    icao: Optional[str] = None
    callsign: Optional[str] = None
    branch: Optional[str] = None
    tail_code: Optional[str] = None
    home_base: Optional[str] = None

    parent: Optional[OperatorSummary] = None
    children: list[OperatorSummary] = []
    spots: list[OperatorSpotEntry] = []
    recent_photos: list[PhotoOut] = []
    stats: OperatorStats


class OperatorUpdate(BaseModel):
    """Only the bio is editable inline on the operator page — everything else
    (name/iata/etc.) is set at creation time via the tray's tag-new-operator flow."""

    bio: Optional[str] = None


class OperatorListEntry(BaseModel):
    """One row in the Operators tab (Military / Airlines sub-tabs, filtered by type)."""

    id: int
    type: OperatorType
    name: str
    image: Optional[str] = None
    iata: Optional[str] = None
    icao: Optional[str] = None
    branch: Optional[str] = None
    tail_code: Optional[str] = None
    spot_count: int


class LocationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    icao: Optional[str] = None
    iata: Optional[str] = None
    name: str
    city: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class LocationCreate(BaseModel):
    """Find-or-create a Location by ICAO (falling back to name)."""

    icao: Optional[str] = None
    iata: Optional[str] = None
    name: str
    city: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class LocationListEntry(BaseModel):
    id: int
    name: str
    icao: Optional[str] = None
    iata: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    spot_count: int


class LocationSpotEntry(BaseModel):
    id: int
    date: datetime.date
    aircraft_identifier: Optional[str] = None
    aircraft_type: Optional[str] = None
    operator_label: Optional[str] = None
    cover_thumbnail: Optional[str] = None


class LocationStats(BaseModel):
    spot_count: int
    aircraft_count: int
    operator_count: int
    first_date: Optional[datetime.date] = None
    last_date: Optional[datetime.date] = None


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
    cover_image: Optional[str] = None
    cover_image_thumbnail: Optional[str] = None

    spots: list[LocationSpotEntry] = []
    recent_photos: list[PhotoOut] = []
    stats: LocationStats


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    icao: Optional[str] = None
    iata: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class LocationRecentCard(BaseModel):
    """One card in the Home 'recent locations' strip."""

    id: int
    name: str
    icao: Optional[str] = None
    iata: Optional[str] = None
    cover_thumbnail: Optional[str] = None
    spot_count: int


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
    location: Optional[LocationSummary] = None
    spot_lat: Optional[float] = None
    spot_lon: Optional[float] = None
    photos: list[PhotoOut]
    ledger: list[LedgerEntry] = []

    model_config = ConfigDict(from_attributes=True)


class SpotUpdate(BaseModel):
    operator_id: Optional[int] = None
    location_id: Optional[int] = None
    spot_lat: Optional[float] = None
    spot_lon: Optional[float] = None
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
    spot_lat: Optional[float] = None
    spot_lon: Optional[float] = None
    operator_id: Optional[int] = None
    owner: Optional[str] = None  # ga only — stays free-text

    force: bool = False

    @model_validator(mode="after")
    def _require_aircraft(self):
        if not self.aircraft_id and not self.new_aircraft:
            raise ValueError("aircraft_id or new_aircraft is required")
        return self


class GallerySpotCard(BaseModel):
    """One recent-spots carousel card."""

    id: int
    date: datetime.date
    aircraft_identifier: Optional[str] = None
    cover_thumbnail: Optional[str] = None
    operator_name: Optional[str] = None
    operator_image: Optional[str] = None


class GalleryTableRow(BaseModel):
    id: int
    date: datetime.date
    aircraft_identifier: Optional[str] = None
    aircraft_type: Optional[str] = None
    aircraft_category: AircraftCategory
    operator_label: Optional[str] = None
    location_label: str
    cover_thumbnail: Optional[str] = None


class GalleryTableResponse(BaseModel):
    items: list[GalleryTableRow]
    total: int
    page: int
    page_size: int


class MapSpot(BaseModel):
    """One plottable spot — coords already coalesced (defined Location vs raw pin)."""

    id: int
    lat: float
    lon: float
    cover_thumbnail: Optional[str] = None
    aircraft_identifier: Optional[str] = None
    aircraft_type: Optional[str] = None
    aircraft_category: AircraftCategory
    operator_label: Optional[str] = None
    date: datetime.date


class MapFacetOperator(BaseModel):
    id: int
    name: str
    type: OperatorType


class MapFacetLocation(BaseModel):
    id: int
    name: str


class MapFacets(BaseModel):
    aircraft_types: list[str]
    operators: list[MapFacetOperator]
    locations: list[MapFacetLocation]


class HeadlineStats(BaseModel):
    """The four big numbers on Home — see StatsOut for the detailed breakdowns."""

    total_spots: int
    distinct_aircraft: int
    distinct_operators: int
    distinct_locations: int


class CategoryCount(BaseModel):
    category: AircraftCategory
    count: int


class TopEntity(BaseModel):
    id: int
    name: str
    spot_count: int


class YearCount(BaseModel):
    year: int
    count: int


class StatsOut(BaseModel):
    headline: HeadlineStats
    category_counts: list[CategoryCount]
    top_operators: list[TopEntity]
    top_locations: list[TopEntity]
    top_manufacturers: list[TopEntity]
    spots_by_year: list[YearCount]
