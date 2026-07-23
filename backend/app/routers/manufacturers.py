from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import crud, schemas, storage
from ..database import get_db

router = APIRouter(prefix="/api/manufacturers", tags=["manufacturers"])


def _get_manufacturer_or_404(db: Session, manufacturer_id: int):
    manufacturer = crud.get_manufacturer(db, manufacturer_id)
    if manufacturer is None:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    return manufacturer


def _to_summary(manufacturer) -> schemas.ManufacturerSummary:
    return schemas.ManufacturerSummary(
        id=manufacturer.id,
        name=manufacturer.name,
        logo=storage.to_url(manufacturer.logo),
        country=manufacturer.country,
    )


@router.get("", response_model=list[schemas.ManufacturerListEntry])
def list_all(db: Session = Depends(get_db)):
    """The Manufacturers tab: every Manufacturer with its aircraft count."""
    return crud.list_manufacturers(db)


@router.get("/search", response_model=list[schemas.ManufacturerSummary])
def search(q: str = "", db: Session = Depends(get_db)):
    """Autocomplete for the manufacturer picker (aircraft page / spot edit surface) —
    same pattern as operator/location pickers: search existing, create-if-missing
    happens by submitting typed text through AircraftUpdate.manufacturer_name."""
    return [_to_summary(m) for m in crud.search_manufacturers(db, q)]


@router.get("/{manufacturer_id}", response_model=schemas.ManufacturerOut)
def read(manufacturer_id: int, db: Session = Depends(get_db)):
    manufacturer = _get_manufacturer_or_404(db, manufacturer_id)
    return crud.to_manufacturer_out(db, manufacturer)


@router.patch("/{manufacturer_id}", response_model=schemas.ManufacturerOut)
def update(manufacturer_id: int, update: schemas.ManufacturerUpdate, db: Session = Depends(get_db)):
    """Country and the freeform notes/overview are editable on the manufacturer page."""
    manufacturer = _get_manufacturer_or_404(db, manufacturer_id)
    manufacturer = crud.update_manufacturer_fields(db, manufacturer, update)
    return crud.to_manufacturer_out(db, manufacturer)


@router.post("/{manufacturer_id}/logo", response_model=schemas.ManufacturerSummary)
async def upload_logo(manufacturer_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Same mechanism as operator logos — no thumbnail, replacing deletes the old
    file. JPEG or PNG, PNG keeps transparency."""
    manufacturer = _get_manufacturer_or_404(db, manufacturer_id)

    contents = await file.read()
    try:
        storage.assert_asset_image(file.filename, file.content_type)
    except storage.UnsupportedImageType as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    storage.delete_if_local(manufacturer.logo)

    ext = storage.asset_ext(file.filename, file.content_type)
    rel = storage.asset_rel("manufacturers", manufacturer.id, storage.new_id(), ext)
    storage.save_file(contents, rel)

    manufacturer.logo = rel
    db.commit()
    db.refresh(manufacturer)
    return _to_summary(manufacturer)


@router.delete("/{manufacturer_id}/logo", response_model=schemas.ManufacturerSummary)
def remove_logo(manufacturer_id: int, db: Session = Depends(get_db)):
    manufacturer = _get_manufacturer_or_404(db, manufacturer_id)
    storage.delete_if_local(manufacturer.logo)
    manufacturer.logo = None
    db.commit()
    db.refresh(manufacturer)
    return _to_summary(manufacturer)
