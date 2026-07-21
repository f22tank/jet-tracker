"""Seed demo data for the spotting page, including an empty-photo spot and an
unplaced spot so those UI states are exercised too.

Run with: python -m app.seed
"""
import datetime

from .database import Base, SessionLocal, engine
from .models import Aircraft, Location, Photo, Spot

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()
    try:
        if db.query(Spot).count() > 0:
            print("Already seeded, skipping.")
            return

        aircraft = Aircraft(
            registration="N1234",
            type="Boeing 737-800",
            msn="30123",
            line_number="412",
            first_flight=2001,
        )
        db.add(aircraft)
        db.flush()

        kric = Location(icao="KRIC", iata="RIC", name="Richmond Intl", city="Richmond", country="US")
        kiad = Location(icao="KIAD", iata="IAD", name="Dulles Intl", city="Dulles", country="US")
        kdca = Location(icao="KDCA", iata="DCA", name="Reagan National", city="Arlington", country="US")
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

        db.commit()
        print(f"Seeded spot id={current.id} for N1234.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
