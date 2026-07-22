"""Split Aircraft.type ("Airbus A330") into a Manufacturer entity + model-only type
("A330"). Aircraft.type stays a plain string — only the leading manufacturer name is
split out; type is never promoted to an entity.

Matches a known list of manufacturer name prefixes (longest first, case-insensitive)
against each Aircraft.type. A distinct Manufacturer row is created per matched name
(deduped by name), Aircraft.manufacturer_id is pointed at it, and Aircraft.type is
rewritten to the remaining model portion.

Rows where no known manufacturer prefix matches are left alone — manufacturer_id
stays NULL, type is untouched — and printed in a report at the end for manual
cleanup. This migration never guesses at an unrecognized prefix.

Idempotent and re-runnable: only rows with manufacturer_id IS NULL are considered,
and matched Manufacturer names are found-or-created rather than duplicated.

Run with: python -m app.migrate_manufacturers
"""
from .database import Base, SessionLocal, engine, ensure_new_columns
from .models import Aircraft, Manufacturer

Base.metadata.create_all(bind=engine)
ensure_new_columns()

# Longest name first so multi-word manufacturers match before a shorter prefix would
# (e.g. "Lockheed Martin" before a bare "Lockheed"). Not exhaustive — anything not
# listed here is reported as unparsed rather than guessed at.
KNOWN_MANUFACTURERS = sorted(
    [
        "McDonnell Douglas",
        "Lockheed Martin",
        "Northrop Grumman",
        "General Dynamics",
        "North American",
        "de Havilland",
        "BAE Systems",
        "Boeing",
        "Airbus",
        "Embraer",
        "Bombardier",
        "Cessna",
        "Beechcraft",
        "Piper",
        "Cirrus",
        "Mooney",
        "Diamond",
        "Robinson",
        "Bell",
        "Sikorsky",
        "Gulfstream",
        "Learjet",
        "Douglas",
        "Grumman",
        "Convair",
        "Republic",
        "Curtiss",
        "Dassault",
        "Saab",
        "ATR",
        "Fokker",
        "Antonov",
        "Sukhoi",
        "Mikoyan",
        "Tupolev",
        "Ilyushin",
        "Vought",
    ],
    key=len,
    reverse=True,
)


def _match_manufacturer(type_str: str) -> tuple[str, str] | None:
    """(manufacturer_name, remaining_model) if type_str starts with a known
    manufacturer name followed by more text, else None."""
    for name in KNOWN_MANUFACTURERS:
        if type_str.lower().startswith(name.lower() + " "):
            model = type_str[len(name):].strip()
            if model:
                return name, model
    return None


def _find_or_create_manufacturer(db, name: str) -> Manufacturer:
    existing = db.query(Manufacturer).filter(Manufacturer.name == name).first()
    if existing:
        return existing
    manufacturer = Manufacturer(name=name)
    db.add(manufacturer)
    db.flush()
    return manufacturer


def migrate():
    db = SessionLocal()
    try:
        rows = (
            db.query(Aircraft)
            .filter(Aircraft.manufacturer_id.is_(None), Aircraft.type.isnot(None), Aircraft.type != "")
            .all()
        )
        migrated = 0
        unparsed = []
        for aircraft in rows:
            match = _match_manufacturer(aircraft.type)
            if match is None:
                unparsed.append((aircraft.id, aircraft.identifier, aircraft.type))
                continue
            name, model = match
            manufacturer = _find_or_create_manufacturer(db, name)
            aircraft.manufacturer_id = manufacturer.id
            aircraft.type = model
            migrated += 1

        db.commit()
        print(f"Migrated {migrated} aircraft.")
        if unparsed:
            print(f"\n{len(unparsed)} aircraft left unparsed (manufacturer_id NULL, type unchanged) — review manually:")
            for aid, identifier, type_ in unparsed:
                print(f"  aircraft {aid} ({identifier or '?'}): type={type_!r}")
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
