import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import storage
from .database import Base, engine, ensure_new_columns, wait_for_db
from .routers import (
    aircraft,
    gallery,
    locations,
    manufacturers,
    map as map_router,
    operators,
    photos,
    spots,
    stats,
)

wait_for_db()
Base.metadata.create_all(bind=engine)
ensure_new_columns()

os.makedirs(storage.PHOTOS_DIR, exist_ok=True)

app = FastAPI(title="Jet Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/photos", StaticFiles(directory=storage.PHOTOS_DIR), name="photos")

app.include_router(spots.router)
app.include_router(photos.router)
app.include_router(aircraft.router)
app.include_router(locations.router)
app.include_router(operators.router)
app.include_router(manufacturers.router)
app.include_router(gallery.router)
app.include_router(map_router.router)
app.include_router(stats.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
