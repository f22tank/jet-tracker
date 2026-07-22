from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import crud, schemas, storage
from ..database import get_db
from ..models import OperatorType

router = APIRouter(prefix="/api/operators", tags=["operators"])


def _get_operator_or_404(db: Session, operator_id: int):
    operator = crud.get_operator(db, operator_id)
    if operator is None:
        raise HTTPException(status_code=404, detail="Operator not found")
    return operator


@router.get("/search", response_model=list[schemas.OperatorSummary])
def search(type: OperatorType, q: str = "", db: Session = Depends(get_db)):
    """Autocomplete over existing Operators, filtered by type (airline vs military_unit) —
    the aircraft category tells the caller which type to pass."""
    operators = crud.search_operators(db, type, q)
    return [crud.to_operator_summary(o) for o in operators]


@router.get("/find", response_model=schemas.OperatorSummary | None)
def find(type: OperatorType, value: str, db: Session = Depends(get_db)):
    """Exact (case-insensitive) name match within a type. Null falls through to
    'create new operator' in the tagging UI."""
    operator = crud.find_operator_by_name(db, type, value)
    return crud.to_operator_summary(operator) if operator else None


@router.get("", response_model=list[schemas.OperatorListEntry])
def list_all(type: OperatorType, db: Session = Depends(get_db)):
    """The Operators tab: Military/Airlines sub-tabs are just this endpoint scoped by type."""
    return crud.list_operators(db, type)


@router.post("", response_model=schemas.OperatorSummary)
def create(payload: schemas.OperatorCreate, db: Session = Depends(get_db)):
    try:
        operator = crud.create_operator(db, payload)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An operator with that name already exists")
    return crud.to_operator_summary(operator)


@router.get("/{operator_id}", response_model=schemas.OperatorOut)
def read(operator_id: int, db: Session = Depends(get_db)):
    operator = _get_operator_or_404(db, operator_id)
    return crud.to_operator_out(db, operator)


@router.patch("/{operator_id}", response_model=schemas.OperatorOut)
def update(operator_id: int, update: schemas.OperatorUpdate, db: Session = Depends(get_db)):
    """Only the bio is editable here — see schemas.OperatorUpdate."""
    operator = _get_operator_or_404(db, operator_id)
    operator = crud.update_operator_fields(db, operator, update)
    return crud.to_operator_out(db, operator)


@router.post("/{operator_id}/logo", response_model=schemas.OperatorSummary)
async def upload_logo(operator_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Airline logo / unit patch upload — always a fresh file, never a reference
    to an existing spot photo. No thumbnail: logos are already small and shown
    at modest size (see PHOTO_STORAGE_BRIEF). Replacing an existing logo deletes
    the old file rather than orphaning it."""
    operator = _get_operator_or_404(db, operator_id)

    contents = await file.read()
    try:
        storage.assert_jpeg(file.filename, file.content_type)
    except storage.UnsupportedImageType as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    storage.delete_if_local(operator.image)

    rel = storage.asset_rel("operators", operator.id, storage.new_id())
    storage.save_jpeg(contents, rel)

    operator.image = rel
    db.commit()
    db.refresh(operator)
    return crud.to_operator_summary(operator)


@router.delete("/{operator_id}/logo", response_model=schemas.OperatorSummary)
def remove_logo(operator_id: int, db: Session = Depends(get_db)):
    operator = _get_operator_or_404(db, operator_id)
    storage.delete_if_local(operator.image)
    operator.image = None
    db.commit()
    db.refresh(operator)
    return crud.to_operator_summary(operator)
