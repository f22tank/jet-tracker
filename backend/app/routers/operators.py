from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..models import OperatorType

router = APIRouter(prefix="/api/operators", tags=["operators"])


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
    operator = crud.get_operator(db, operator_id)
    if operator is None:
        raise HTTPException(status_code=404, detail="Operator not found")
    return crud.to_operator_out(db, operator)
