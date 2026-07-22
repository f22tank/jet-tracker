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
    registration = Column(String(20), nullable=True)
    type = Column(String(100), nullable=True)
    msn = Column(String(50), nullable=True)
    line_number = Column(String(50), nullable=True)
    first_flight = Column(Integer, nullable=True)

    # military
    serial = Column(String(20), nullable=True)
    variant = Column(String(50), nullable=True)
    operator = Column(String(100), nullable=True)
    home_base = Column(String(100), nullable=True)

    # ga — free-text, distinct from manufacturer_id below (GA one-offs aren't worth
    # forcing through the Manufacturer entity; left as-is, not touched by that migration)
    manufacturer = Column(String(100), nullable=True)
    configuration = Column(Enum(GAConfiguration, name="ga_configuration"), nullable=True)
    role = Column(Enum(GARole, name="ga_role"), nullable=True)

    # cross-category link to the Manufacturer entity, populated by migrate_manufacturers
    # (parsed from `type`) — named manufacturer_entity to avoid colliding with the GA
    # free-text `manufacturer` column above.
    manufacturer_id = Column(Integer, ForeignKey("manufacturers.id"), nullable=True)

    spots = relationship("Spot", back_populates="aircraft", order_by="Spot.date")
    manufacturer_entity = relationship("Manufacturer", back_populates="aircraft")

    __table_args__ = (
        # Identity is per-category: military aircraft are keyed by serial, everyone else by reg.
        Index("uq_aircraft_registration", "registration", unique=True, postgresql_where=registration.isnot(None)),
        Index("uq_aircraft_serial", "serial", unique=True, postgresql_where=serial.isnot(None)),
    )

    @property
    def identifier(self) -> str | None:
        """The reg-equivalent for whichever category this airframe is."""
        return self.serial if self.category == AircraftCategory.military else self.registration


class OperatorType(str, enum.Enum):
    airline = "airline"
    military_unit = "military_unit"


class Operator(Base):
    __tablename__ = "operators"
    __table_args__ = (UniqueConstraint("type", "name", name="uq_operator_type_name"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(Enum(OperatorType, name="operator_type"), nullable=False)
    name = Column(String(255), nullable=False)
    image = Column(String(500), nullable=True)
    parent_operator_id = Column(Integer, ForeignKey("operators.id"), nullable=True)
    notes = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)

    parent = relationship("Operator", remote_side=[id], back_populates="children")
    children = relationship("Operator", back_populates="parent")

    airline_detail = relationship(
        "AirlineDetail", back_populates="operator", uselist=False, cascade="all, delete-orphan"
    )
    unit_detail = relationship(
        "UnitDetail", back_populates="operator", uselist=False, cascade="all, delete-orphan"
    )
    spots = relationship("Spot", back_populates="operator")


class AirlineDetail(Base):
    __tablename__ = "airline_details"

    operator_id = Column(Integer, ForeignKey("operators.id"), primary_key=True)
    iata = Column(String(10), nullable=True)
    icao = Column(String(10), nullable=True)
    callsign = Column(String(100), nullable=True)

    operator = relationship("Operator", back_populates="airline_detail")


class UnitDetail(Base):
    __tablename__ = "unit_details"

    operator_id = Column(Integer, ForeignKey("operators.id"), primary_key=True)
    branch = Column(String(100), nullable=True)
    tail_code = Column(String(10), nullable=True)
    home_base = Column(String(100), nullable=True)

    operator = relationship("Operator", back_populates="unit_detail")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    icao = Column(String(10), nullable=True)
    iata = Column(String(10), nullable=True)
    name = Column(String(255), nullable=False)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    cover_image = Column(String(500), nullable=True)
    cover_image_thumbnail = Column(String(500), nullable=True)

    spots = relationship("Spot", back_populates="location")


class Spot(Base):
    __tablename__ = "spots"
    __table_args__ = (
        UniqueConstraint("aircraft_id", "date", name="uq_spot_aircraft_date"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    aircraft_id = Column(Integer, ForeignKey("aircraft.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    # Raw one-off pin — mutually exclusive with location_id (enforced in crud, not the DB:
    # exactly one of "defined place" / "raw pin" / "unplaced" applies at a time).
    spot_lat = Column(Float, nullable=True)
    spot_lon = Column(Float, nullable=True)
    operator_id = Column(Integer, ForeignKey("operators.id"), nullable=True)
    date = Column(Date, nullable=False)

    # Legacy free-text fallback, kept for one release post-migration — superseded by
    # operator_id for commercial (airline) / military (unit). Not written by new code paths.
    airline = Column(String(255), nullable=True)
    unit = Column(String(255), nullable=True)

    livery = Column(String(255), nullable=True)
    # ga — stays free-text per brief (one-offs, not worth an Operator record)
    owner = Column(String(255), nullable=True)
    markings = Column(String(255), nullable=True)

    notes = Column(Text, nullable=True)

    cover_photo_id = Column(Integer, ForeignKey("photos.id", use_alter=True), nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    aircraft = relationship("Aircraft", back_populates="spots", foreign_keys=[aircraft_id])
    location = relationship("Location", back_populates="spots", foreign_keys=[location_id])
    operator = relationship("Operator", back_populates="spots", foreign_keys=[operator_id])
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

    path = Column(String(500), nullable=False)
    thumbnail_path = Column(String(500), nullable=True)
    original_filename = Column(String(255), nullable=True)
    camera = Column(String(100), nullable=True)
    lens = Column(String(100), nullable=True)
    focal_length = Column(String(20), nullable=True)
    aperture = Column(String(20), nullable=True)
    shutter = Column(String(20), nullable=True)
    iso = Column(String(20), nullable=True)
    gps_lat = Column(Float, nullable=True)
    gps_lon = Column(Float, nullable=True)
    taken_at = Column(DateTime, nullable=True)

    spot = relationship("Spot", back_populates="photos", foreign_keys=[spot_id])


class Manufacturer(Base):
    __tablename__ = "manufacturers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    logo = Column(String(500), nullable=True)
    country = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    aircraft = relationship("Aircraft", back_populates="manufacturer_entity")
