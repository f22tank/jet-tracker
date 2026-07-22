import os
import time

from sqlalchemy import create_engine, text
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
