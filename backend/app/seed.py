"""Seed demo data for the spotting page, including an empty-photo spot and an
unplaced spot so those UI states are exercised too.

Run with: python -m app.seed
"""
import datetime

from . import migrate_operators
from .database import Base, SessionLocal, engine
from .models import (
    Aircraft,
    AircraftCategory,
    GAConfiguration,
    GARole,
    Location,
    Operator,
    OperatorType,
    Photo,
    Spot,
    UnitDetail,
)

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()
    try:
        if db.query(Spot).count() > 0:
            print("Already seeded, skipping.")
            return

        aircraft = Aircraft(
            category=AircraftCategory.commercial,
            registration="N1234",
            type="Boeing 737-800",
            msn="30123",
            line_number="412",
            first_flight=2001,
        )
        military = Aircraft(
            category=AircraftCategory.military,
            serial="86-0164",
            type="F-16",
            variant="F-16C",
            operator="USAF",
            home_base="Shaw AFB",
        )
        ga = Aircraft(
            category=AircraftCategory.ga,
            registration="N51WB",
            type="P-51 Mustang",
            manufacturer="North American",
            configuration=GAConfiguration.single_prop,
            role=GARole.warbird,
        )
        db.add_all([aircraft, military, ga])
        db.flush()

        kric = Location(icao="KRIC", iata="RIC", name="Richmond Intl", city="Richmond", country="US", lat=37.5052, lon=-77.3197)
        kiad = Location(icao="KIAD", iata="IAD", name="Dulles Intl", city="Dulles", country="US", lat=38.9531, lon=-77.4565)
        kdca = Location(icao="KDCA", iata="DCA", name="Reagan National", city="Arlington", country="US", lat=38.8512, lon=-77.0402)
        db.add_all([kric, kiad, kdca])
        db.flush()

        current = Spot(
            aircraft_id=aircraft.id,
            date=datetime.date(2026, 10, 12),
            location_id=kric.id,
            airline="United Airlines",
        )
        db.add(current)
        db.flush()

        photos = [
            Photo(
                spot_id=current.id,
                path="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80",
                thumbnail_path="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&q=70",
                camera="Canon R7",
                lens="100-500mm",
                focal_length="500mm",
                aperture="f/7.1",
                shutter="1/1000",
                iso="ISO 400",
            ),
            Photo(
                spot_id=current.id,
                path="https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&q=70",
                thumbnail_path="https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&q=70",
                camera="Canon R7",
                lens="100-500mm",
                focal_length="420mm",
                aperture="f/6.3",
                shutter="1/800",
                iso="ISO 400",
            ),
            Photo(
                spot_id=current.id,
                path="https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=500&q=70",
                thumbnail_path="https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=500&q=70",
                camera="Canon R7",
                lens="100-500mm",
                focal_length="300mm",
                aperture="f/5.6",
                shutter="1/1250",
                iso="ISO 320",
            ),
            Photo(
                spot_id=current.id,
                path="https://images.unsplash.com/photo-1544016768-982d1554f0b9?w=500&q=70",
                thumbnail_path="https://images.unsplash.com/photo-1544016768-982d1554f0b9?w=500&q=70",
                camera="Canon R7",
                lens="100-500mm",
                focal_length="500mm",
                aperture="f/8",
                shutter="1/1000",
                iso="ISO 500",
            ),
        ]
        db.add_all(photos)
        db.flush()
        current.cover_photo_id = photos[0].id

        # Second sighting, fully placed, with its own photos.
        second = Spot(
            aircraft_id=aircraft.id,
            date=datetime.date(2026, 8, 15),
            location_id=kiad.id,
            airline="United Airlines",
        )
        db.add(second)

        # Empty-photo spot: exercises the cover-slot placeholder + "add photos" affordance.
        db.add(
            Spot(
                aircraft_id=aircraft.id,
                date=datetime.date(2025, 7, 3),
                location_id=kdca.id,
                airline="United Airlines",
            )
        )

        # Unplaced spot: exercises the "resolve location" state.
        db.add(
            Spot(
                aircraft_id=aircraft.id,
                date=datetime.date(2024, 11, 20),
                location_id=None,
                airline="United Airlines",
            )
        )

        # Military spot: exercises unit/markings + serial/variant/operator/home_base rendering.
        military_spot = Spot(
            aircraft_id=military.id,
            date=datetime.date(2026, 9, 1),
            location_id=kric.id,
            unit="20th Fighter Wing",
            markings="60th Anniversary scheme",
        )
        db.add(military_spot)
        db.flush()
        military_photo = Photo(
            spot_id=military_spot.id,
            path="https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=1200&q=80",
            thumbnail_path="https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=500&q=70",
            camera="Canon R7",
            lens="100-500mm",
            focal_length="500mm",
            aperture="f/6.3",
            shutter="1/2000",
            iso="ISO 200",
        )
        db.add(military_photo)
        db.flush()
        military_spot.cover_photo_id = military_photo.id

        # GA spot: exercises owner/markings + manufacturer/configuration/role rendering.
        db.add(
            Spot(
                aircraft_id=ga.id,
                date=datetime.date(2026, 6, 10),
                location_id=kiad.id,
                owner="Commemorative Air Force",
            )
        )

        # Raw-pin spot: a roadside catch with no defined Location — exercises the
        # map's other coordinate source (Spot.spot_lat/spot_lon) alongside location_id.
        db.add(
            Spot(
                aircraft_id=aircraft.id,
                date=datetime.date(2026, 5, 2),
                spot_lat=38.6926,
                spot_lon=-77.1682,
                airline="United Airlines",
            )
        )

        db.commit()
        print(f"Seeded spot id={current.id} for N1234.")
    finally:
        db.close()

    # Backfill Operator records from the legacy airline/unit strings just seeded above —
    # this exercises the real migration path rather than hand-wiring operator_id.
    migrate_operators.migrate()

    # Demo polish: a parent wing + logo/patch images, so the hierarchy and image
    # display have something to show.
    db = SessionLocal()
    try:
        squadron = db.query(Operator).filter(
            Operator.type == OperatorType.military_unit, Operator.name == "20th Fighter Wing"
        ).first()
        airline = db.query(Operator).filter(
            Operator.type == OperatorType.airline, Operator.name == "United Airlines"
        ).first()

        if squadron and not squadron.parent_operator_id:
            wing = Operator(type=OperatorType.military_unit, name="9th Air Force")
            db.add(wing)
            db.flush()
            db.add(UnitDetail(operator_id=wing.id))
            squadron.parent_operator_id = wing.id
            squadron.image = "https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?w=300&q=70"

        if airline:
            airline.image = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=300&q=70"

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
