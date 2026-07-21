import datetime
import enum

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


class AircraftCategory(str, enum.Enum):
    commercial = "commercial"
    military = "military"
    ga = "ga"


class GAConfiguration(str, enum.Enum):
    single_prop = "single_prop"
    multi_prop = "multi_prop"
    turboprop = "turboprop"
    jet = "jet"
    rotary = "rotary"
    glider = "glider"


class GARole(str, enum.Enum):
    bizjet = "bizjet"
    warbird = "warbird"
    bush_float = "bush_float"
    homebuilt = "homebuilt"
    trainer = "trainer"
    agricultural = "agricultural"


class Aircraft(Base):
    __tablename__ = "aircraft"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(Enum(AircraftCategory, name="aircraft_category"), nullable=False)

    # commercial / ga
    registration = Column(String, nullable=True)
    type = Column(String, nullable=True)
    msn = Column(String, nullable=True)
    line_number = Column(String, nullable=True)
    first_flight = Column(Integer, nullable=True)

    # military
    serial = Column(String, nullable=True)
    variant = Column(String, nullable=True)
    operator = Column(String, nullable=True)
    home_base = Column(String, nullable=True)

    # ga
    manufacturer = Column(String, nullable=True)
    configuration = Column(Enum(GAConfiguration, name="ga_configuration"), nullable=True)
    role = Column(Enum(GARole, name="ga_role"), nullable=True)

    spots = relationship("Spot", back_populates="aircraft", order_by="Spot.date")

    __table_args__ = (
        # Identity is per-category: military aircraft are keyed by serial, everyone else by reg.
        Index("uq_aircraft_registration", "registration", unique=True, postgresql_where=registration.isnot(None)),
        Index("uq_aircraft_serial", "serial", unique=True, postgresql_where=serial.isnot(None)),
    )

    @property
    def identifier(self) -> str | None:
        """The reg-equivalent for whichever category this airframe is."""
        return self.serial if self.category == AircraftCategory.military else self.registration


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    icao = Column(String, nullable=True)
    iata = Column(String, nullable=True)
    name = Column(String, nullable=False)
    city = Column(String, nullable=True)
    country = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)

    spots = relationship("Spot", back_populates="location")


class Spot(Base):
    __tablename__ = "spots"
    __table_args__ = (
        UniqueConstraint("aircraft_id", "date", name="uq_spot_aircraft_date"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    aircraft_id = Column(Integer, ForeignKey("aircraft.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    date = Column(Date, nullable=False)

    # commercial
    airline = Column(String, nullable=True)
    livery = Column(String, nullable=True)
    # military / ga — per-sighting since unit/owner and paint schemes change over time
    unit = Column(String, nullable=True)
    owner = Column(String, nullable=True)
    markings = Column(String, nullable=True)

    notes = Column(Text, nullable=True)

    cover_photo_id = Column(Integer, ForeignKey("photos.id", use_alter=True), nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    aircraft = relationship("Aircraft", back_populates="spots", foreign_keys=[aircraft_id])
    location = relationship("Location", back_populates="spots", foreign_keys=[location_id])
    photos = relationship(
        "Photo",
        back_populates="spot",
        cascade="all, delete-orphan",
        foreign_keys="Photo.spot_id",
    )
    cover_photo = relationship("Photo", foreign_keys=[cover_photo_id], post_update=True)


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    spot_id = Column(Integer, ForeignKey("spots.id"), nullable=True)

    path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=True)
    camera = Column(String, nullable=True)
    lens = Column(String, nullable=True)
    focal_length = Column(String, nullable=True)
    aperture = Column(String, nullable=True)
    shutter = Column(String, nullable=True)
    iso = Column(String, nullable=True)
    gps_lat = Column(Float, nullable=True)
    gps_lon = Column(Float, nullable=True)
    taken_at = Column(DateTime, nullable=True)

    spot = relationship("Spot", back_populates="photos", foreign_keys=[spot_id])
