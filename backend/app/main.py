import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .routers import aircraft, gallery, locations, map as map_router, operators, photos, spots

Base.metadata.create_all(bind=engine)

PHOTOS_DIR = os.getenv("PHOTOS_DIR", "photos")
os.makedirs(PHOTOS_DIR, exist_ok=True)

app = FastAPI(title="Jet Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/photos", StaticFiles(directory=PHOTOS_DIR), name="photos")

app.include_router(spots.router)
app.include_router(photos.router)
app.include_router(aircraft.router)
app.include_router(locations.router)
app.include_router(operators.router)
app.include_router(gallery.router)
app.include_router(map_router.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
