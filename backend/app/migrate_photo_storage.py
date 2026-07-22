"""Reorganize flat photo storage into the date-sharded originals/thumbs trees,
and relocate any already-uploaded operator logos into assets/operators/<id>/.

Shard date for a photo is Photo.spot_id -> Spot.date; for tray photos
(spot_id IS NULL) it falls back to Photo.taken_at, then the original file's
mtime, then today (documented per-row in the printed report).

Idempotent and re-runnable: rows already pointing at originals/, thumbs/,
assets/, or an absolute http(s) URL (seed data) are skipped, and a missing
file is reported rather than aborting the run.

Run with:
    python -m app.migrate_photo_storage           # moves files
    python -m app.migrate_photo_storage --copy     # copies, for verify-before-delete
"""
import argparse
import datetime
import os
import shutil

from . import storage
from .database import Base, SessionLocal, engine, ensure_new_columns
from .models import Operator, Photo

Base.metadata.create_all(bind=engine)
ensure_new_columns()


def _already_migrated(rel: str | None) -> bool:
    if not rel:
        return True
    if rel.startswith(("http://", "https://")):
        return True
    return rel.startswith((f"{storage.ORIGINALS}/", f"{storage.THUMBS}/", f"{storage.ASSETS}/"))


def _strip_legacy_prefix(rel: str) -> str:
    """The old flat-layout ingest wrote DB values as "/photos/<name>" —
    strip that serving prefix down to the bare on-disk relative path."""
    if rel.startswith("/photos/"):
        return rel[len("/photos/"):]
    return rel.lstrip("/")


def _uuid_from_rel(rel: str) -> str:
    stem = os.path.splitext(os.path.basename(rel))[0]
    return stem[: -len("_thumb")] if stem.endswith("_thumb") else stem


def _shard_date_for_photo(photo: Photo, original_abs: str) -> tuple[datetime.date, str]:
    spot = photo.spot
    if spot is not None and spot.date is not None:
        return spot.date, "spot.date"
    if photo.taken_at is not None:
        return photo.taken_at.date(), "taken_at"
    if os.path.exists(original_abs):
        return datetime.date.fromtimestamp(os.path.getmtime(original_abs)), "file mtime"
    return datetime.date.today(), "today (no date signal found)"


def _move_or_copy(src: str, dst: str, copy_mode: bool) -> None:
    storage.ensure_parent(dst)
    if copy_mode:
        shutil.copy2(src, dst)
    else:
        shutil.move(src, dst)


def migrate_photos(db, copy_mode: bool) -> tuple[int, int, int]:
    migrated = skipped = missing = 0
    for photo in db.query(Photo).all():
        if _already_migrated(photo.path):
            skipped += 1
            continue

        old_rel = _strip_legacy_prefix(photo.path)
        old_abs = storage.abs_path(old_rel)
        if not os.path.exists(old_abs):
            print(f"MISSING original for photo {photo.id}: {old_abs}")
            missing += 1
            continue

        file_id = _uuid_from_rel(old_rel)
        date, date_source = _shard_date_for_photo(photo, old_abs)
        new_original_rel = storage.original_rel(date, file_id)
        _move_or_copy(old_abs, storage.abs_path(new_original_rel), copy_mode)

        new_thumb_rel = None
        if photo.thumbnail_path and not photo.thumbnail_path.startswith(("http://", "https://")):
            old_thumb_rel = _strip_legacy_prefix(photo.thumbnail_path)
            old_thumb_abs = storage.abs_path(old_thumb_rel)
            if os.path.exists(old_thumb_abs):
                new_thumb_rel = storage.thumb_rel(date, file_id)
                _move_or_copy(old_thumb_abs, storage.abs_path(new_thumb_rel), copy_mode)
            else:
                print(f"MISSING thumbnail for photo {photo.id}: {old_thumb_abs}")

        photo.path = new_original_rel
        photo.thumbnail_path = new_thumb_rel
        print(f"photo {photo.id}: sharded by {date_source} -> {date.isoformat()}")
        migrated += 1

    db.commit()
    return migrated, skipped, missing


def migrate_operator_logos(db, copy_mode: bool) -> tuple[int, int, int]:
    migrated = skipped = missing = 0
    for operator in db.query(Operator).all():
        if _already_migrated(operator.image):
            skipped += 1
            continue

        old_rel = _strip_legacy_prefix(operator.image)
        old_abs = storage.abs_path(old_rel)
        if not os.path.exists(old_abs):
            print(f"MISSING logo for operator {operator.id} ({operator.name}): {old_abs}")
            missing += 1
            continue

        file_id = _uuid_from_rel(old_rel)
        new_rel = storage.asset_rel("operators", operator.id, file_id)
        _move_or_copy(old_abs, storage.abs_path(new_rel), copy_mode)
        operator.image = new_rel
        print(f"operator {operator.id} ({operator.name}): logo -> {new_rel}")
        migrated += 1

    db.commit()
    return migrated, skipped, missing


def migrate(copy_mode: bool) -> None:
    db = SessionLocal()
    try:
        p_migrated, p_skipped, p_missing = migrate_photos(db, copy_mode)
        o_migrated, o_skipped, o_missing = migrate_operator_logos(db, copy_mode)
        mode = "COPY (originals left in place)" if copy_mode else "MOVE"
        print()
        print(f"Mode: {mode}")
        print(f"Photos:         migrated={p_migrated} skipped={p_skipped} missing={p_missing}")
        print(f"Operator logos: migrated={o_migrated} skipped={o_skipped} missing={o_missing}")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--copy",
        action="store_true",
        help="Copy instead of move, leaving old flat files in place until you've verified rendering.",
    )
    args = parser.parse_args()
    migrate(args.copy)
