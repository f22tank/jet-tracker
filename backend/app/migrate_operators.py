"""Backfill Operator records from existing Spot.airline / Spot.unit strings.

Dedupes by (type, name): one Operator per distinct value, every matching spot's
operator_id points at it. The legacy string columns are left in place as a
fallback — this only needs to run once per environment (it's a no-op on spots
that already have an operator_id).

Run with: python -m app.migrate_operators
"""
from .database import Base, SessionLocal, engine
from .models import Operator, OperatorType, Spot

Base.metadata.create_all(bind=engine)


def _backfill(db, column, operator_type: OperatorType) -> int:
    distinct_names = (
        db.query(column)
        .filter(column.isnot(None), column != "", Spot.operator_id.is_(None))
        .distinct()
        .all()
    )
    migrated = 0
    for (name,) in distinct_names:
        if not name or not name.strip():
            continue
        name = name.strip()
        operator = db.query(Operator).filter(Operator.type == operator_type, Operator.name == name).first()
        if operator is None:
            operator = Operator(type=operator_type, name=name)
            db.add(operator)
            db.flush()
            if operator_type == OperatorType.airline:
                from .models import AirlineDetail

                db.add(AirlineDetail(operator_id=operator.id))
            else:
                from .models import UnitDetail

                db.add(UnitDetail(operator_id=operator.id))

        updated = (
            db.query(Spot)
            .filter(column == name, Spot.operator_id.is_(None))
            .update({Spot.operator_id: operator.id}, synchronize_session=False)
        )
        migrated += updated
    return migrated


def migrate():
    db = SessionLocal()
    try:
        airlines_migrated = _backfill(db, Spot.airline, OperatorType.airline)
        units_migrated = _backfill(db, Spot.unit, OperatorType.military_unit)
        db.commit()
        print(f"Migrated {airlines_migrated} spot(s) to airline operators.")
        print(f"Migrated {units_migrated} spot(s) to unit operators.")
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
