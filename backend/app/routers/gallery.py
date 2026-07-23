from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..models import AircraftCategory

router = APIRouter(prefix="/api/gallery", tags=["gallery"])


@router.get("/recent", response_model=list[schemas.GallerySpotCard])
def recent(limit: int = Query(12, ge=1, le=50), db: Session = Depends(get_db)):
    """Carousel feed: spotting-date descending, capped. See crud.get_recent_spots
    for the documented date-vs-created_at lever."""
    spots = crud.get_recent_spots(db, limit)
    return [crud.to_gallery_card(s) for s in spots]


@router.get("/spots", response_model=schemas.GalleryTableResponse)
def spots(
    q: str = "",
    category: Optional[AircraftCategory] = None,
    sort: Literal["date", "created_at", "identifier", "operator", "type"] = "date",
    order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """The table: server-side free-text search + sort + pagination over every spot,
    plus the one category quick-filter (commercial/military/GA)."""
    items, total = crud.search_spots(db, q=q, category=category, sort=sort, order=order, page=page, page_size=page_size)
    return schemas.GalleryTableResponse(
        items=[crud.to_gallery_row(s) for s in items],
        total=total,
        page=page,
        page_size=page_size,
    )
