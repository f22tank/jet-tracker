"""Regenerate every spot-photo thumbnail from its original.

Fixes thumbnails baked before storage.save_thumbnail applied exif_transpose()
(see that function's docstring) — any thumbnail made from a portrait phone
photo before this fix is rotated 90°/180°/270° relative to how the original
displays. Since /thumbs is a purely regenerable derivative tree, this rebuilds
every thumbnail from /originals. /originals is read-only here — this script
only ever writes into /thumbs.

Idempotent and safe to re-run: skips rows with no local original (seed-data
http(s) URLs) and reports (without aborting) any original file that's missing
or unreadable. Rows not on the originals/ tree (unexpected legacy layout) are
also reported rather than guessed at.

Run with: python -m app.regenerate_thumbnails
"""
import os

from . import storage
from .database import SessionLocal
from .models import Photo


def regenerate() -> None:
    db = SessionLocal()
    try:
        regenerated = skipped = missing = 0
        for photo in db.query(Photo).all():
            if not photo.path or photo.path.startswith(("http://", "https://")):
                skipped += 1
                continue

            rel = photo.path[len("/photos/"):] if photo.path.startswith("/photos/") else photo.path
            if not rel.startswith(f"{storage.ORIGINALS}/"):
                print(f"SKIPPING photo {photo.id}: path not on the originals/ tree ({photo.path!r})")
                skipped += 1
                continue

            original_abs = storage.abs_path(rel)
            if not os.path.exists(original_abs):
                print(f"MISSING original for photo {photo.id}: {original_abs}")
                missing += 1
                continue

            try:
                with open(original_abs, "rb") as f:
                    contents = f.read()
                img = storage.open_image(contents)
            except Exception as exc:
                print(f"UNREADABLE original for photo {photo.id} ({original_abs}): {exc}")
                missing += 1
                continue

            thumb_rel = rel.replace(f"{storage.ORIGINALS}/", f"{storage.THUMBS}/", 1)
            storage.save_thumbnail(img, thumb_rel)
            photo.thumbnail_path = thumb_rel
            regenerated += 1

        db.commit()
        print(f"\nRegenerated {regenerated} thumbnail(s). Skipped {skipped}. Missing/unreadable: {missing}.")
    finally:
        db.close()


if __name__ == "__main__":
    regenerate()
