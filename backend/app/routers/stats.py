from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=schemas.StatsOut)
def stats(db: Session = Depends(get_db)):
    """Full breakdown for the Stats tab. Home reuses just the `headline` subset."""
    return crud.get_stats(db)
