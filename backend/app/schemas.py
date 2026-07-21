import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AircraftOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    registration: str
    type: str
    msn: Optional[str] = None
    line_number: Optional[str] = None
    first_flight: Optional[int] = None


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
    airline: Optional[str] = None
    livery: Optional[str] = None
    notes: Optional[str] = None
    cover_photo_id: Optional[int] = None
    aircraft: AircraftOut
    location: Optional[LocationOut] = None
    photos: list[PhotoOut]
    ledger: list[LedgerEntry] = []

    model_config = ConfigDict(from_attributes=True)


class SpotUpdate(BaseModel):
    airline: Optional[str] = None
    livery: Optional[str] = None
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
