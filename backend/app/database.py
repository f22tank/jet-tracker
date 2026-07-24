import os
import time

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./jet_tracker.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
# pool_pre_ping/pool_recycle matter here specifically because the DB is an external
# MariaDB instance reachable over the LAN, not a same-compose-network container —
# connections can go stale (idle timeout, network blip) in ways a local db service
# rarely hits.
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True, pool_recycle=1800)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def wait_for_db(retries: int = 10, delay: float = 3.0) -> None:
    """Retries the initial connection with backoff instead of crashing outright —
    the DB here is an external MariaDB instance (not a same-compose container with
    a healthcheck this app controls), so a container restart, network blip, or the
    api container simply winning the startup race is a real, recoverable case."""
    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except OperationalError:
            if attempt == retries:
                raise
            time.sleep(delay)


# Columns added to tables that may already exist in a deployed DB. `create_all`
# only creates missing tables, never adds columns to existing ones — with no
# Alembic in this project, new nullable columns get an idempotent ALTER here
# instead. Portable across the sqlite (dev) and MariaDB (prod) backends this
# app targets.
_NEW_COLUMNS = {
    "photos": [
        ("original_filename", "VARCHAR(255) NULL"),
        ("rating", "INTEGER NULL"),
    ],
    "locations": [
        ("cover_image", "VARCHAR(500) NULL"),
        ("cover_image_thumbnail", "VARCHAR(500) NULL"),
    ],
    "operators": [("bio", "TEXT NULL")],
    "aircraft": [("manufacturer_id", "INTEGER NULL")],
}


def ensure_new_columns() -> None:
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, columns in _NEW_COLUMNS.items():
            if not inspector.has_table(table):
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            for name, ddl_type in columns:
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl_type}"))
