"""Photo/asset path conventions and file I/O helpers.

Layout on disk (relative to PHOTOS_DIR, which is also what's mounted at /photos):

    originals/YYYY/MM/DD/<uuid>.jpg   spot photos, irreplaceable, sharded by spot date
    thumbs/YYYY/MM/DD/<uuid>.jpg      regenerable derivatives, same uuid, tier is the directory
    assets/<entity_type>/<id>/<uuid>.jpg          entity uploads (operator logos, location covers)
    assets/<entity_type>/<id>/<uuid>_thumb.jpg    derivative for entity assets that need one

DB columns (Photo.path/thumbnail_path, Operator.image, Location.cover_image*) store the
relative path with no leading slash and no host — never PHOTOS_DIR itself — so the volume
can move/remount without a mass UPDATE. `to_url` adds the /photos/ serving prefix at the
API boundary.
"""
import datetime
import os
import uuid
from io import BytesIO

from PIL import Image

PHOTOS_DIR = os.getenv("PHOTOS_DIR", "photos")

ORIGINALS = "originals"
THUMBS = "thumbs"
ASSETS = "assets"

SPOT_THUMB_SIZE = (600, 600)
ASSET_THUMB_SIZE = (500, 500)

JPEG_CONTENT_TYPES = {"image/jpeg", "image/jpg"}
JPEG_EXTENSIONS = {".jpg", ".jpeg"}


class UnsupportedImageType(ValueError):
    pass


def new_id() -> str:
    return uuid.uuid4().hex


def assert_jpeg(filename: str | None, content_type: str | None) -> None:
    """JPEG only, per PHOTO_STORAGE_BRIEF — no RAW branch, no other formats."""
    ext = os.path.splitext(filename or "")[1].lower()
    if content_type in JPEG_CONTENT_TYPES or ext in JPEG_EXTENSIONS:
        return
    raise UnsupportedImageType(f"Only JPEG images are supported (got {content_type or ext or 'unknown type'})")


def _shard(date: datetime.date) -> str:
    return f"{date.year:04d}/{date.month:02d}/{date.day:02d}"


def original_rel(date: datetime.date, file_id: str) -> str:
    return f"{ORIGINALS}/{_shard(date)}/{file_id}.jpg"


def thumb_rel(date: datetime.date, file_id: str) -> str:
    return f"{THUMBS}/{_shard(date)}/{file_id}.jpg"


def asset_rel(entity_type: str, entity_id: int, file_id: str) -> str:
    return f"{ASSETS}/{entity_type}/{entity_id}/{file_id}.jpg"


def asset_thumb_rel(entity_type: str, entity_id: int, file_id: str) -> str:
    return f"{ASSETS}/{entity_type}/{entity_id}/{file_id}_thumb.jpg"


def abs_path(rel: str) -> str:
    return os.path.join(PHOTOS_DIR, *rel.split("/"))


def ensure_parent(path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)


def to_url(rel: str | None) -> str | None:
    """DB value -> servable URL. Passes through values that are already a full
    URL (seed data) or already carry the /photos/ prefix (not-yet-migrated rows)."""
    if not rel:
        return None
    if rel.startswith(("http://", "https://", "/photos/")):
        return rel
    return f"/photos/{rel}"


def delete_if_local(rel: str | None) -> None:
    """Best-effort delete of a DB-stored relative path — no-ops on seed-data http(s)
    URLs and on missing files. Used when an entity asset is replaced or removed so
    the old file doesn't get orphaned on disk."""
    if not rel or rel.startswith(("http://", "https://")):
        return
    if rel.startswith("/photos/"):
        rel = rel[len("/photos/"):]
    path = abs_path(rel)
    if os.path.exists(path):
        os.remove(path)


def save_jpeg(contents: bytes, rel: str) -> None:
    path = abs_path(rel)
    ensure_parent(path)
    with open(path, "wb") as f:
        f.write(contents)


def save_thumbnail(image: Image.Image, rel: str, size: tuple[int, int] = SPOT_THUMB_SIZE, quality: int = 82) -> None:
    path = abs_path(rel)
    ensure_parent(path)
    rgb = image.convert("RGB") if image.mode not in ("RGB", "L") else image
    thumb = rgb.copy()
    thumb.thumbnail(size)
    thumb.save(path, "JPEG", quality=quality)


def open_image(contents: bytes) -> Image.Image:
    img = Image.open(BytesIO(contents))
    img.load()
    return img
