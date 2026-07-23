"""Photo/asset path conventions and file I/O helpers.

Layout on disk (relative to PHOTOS_DIR, which is also what's mounted at /photos):

    originals/YYYY/MM/DD/<uuid>.jpg   spot photos, irreplaceable, sharded by spot date
    thumbs/YYYY/MM/DD/<uuid>.jpg      regenerable derivatives, same uuid, tier is the directory
    assets/<entity_type>/<id>/<uuid>.<ext>          entity uploads (operator logos, location covers)
    assets/<entity_type>/<id>/<uuid>_thumb.<ext>    derivative for entity assets that need one

Spot photos are JPEG-only (see PHOTO_STORAGE_BRIEF). Entity assets additionally allow
PNG so logos/patches can keep transparency — `<ext>` there is whichever of .jpg/.png
the upload actually was, never forced to JPEG.

DB columns (Photo.path/thumbnail_path, Operator.image, Location.cover_image*) store the
relative path with no leading slash and no host — never PHOTOS_DIR itself — so the volume
can move/remount without a mass UPDATE. `to_url` adds the /photos/ serving prefix at the
API boundary.
"""
import datetime
import os
import uuid
from io import BytesIO

from PIL import Image, ImageOps

PHOTOS_DIR = os.getenv("PHOTOS_DIR", "photos")

ORIGINALS = "originals"
THUMBS = "thumbs"
ASSETS = "assets"

SPOT_THUMB_SIZE = (600, 600)
ASSET_THUMB_SIZE = (500, 500)

JPEG_CONTENT_TYPES = {"image/jpeg", "image/jpg"}
JPEG_EXTENSIONS = {".jpg", ".jpeg"}
PNG_CONTENT_TYPES = {"image/png"}
PNG_EXTENSIONS = {".png"}
ASSET_CONTENT_TYPES = JPEG_CONTENT_TYPES | PNG_CONTENT_TYPES
ASSET_EXTENSIONS = JPEG_EXTENSIONS | PNG_EXTENSIONS


class UnsupportedImageType(ValueError):
    pass


def new_id() -> str:
    return uuid.uuid4().hex


def assert_jpeg(filename: str | None, content_type: str | None) -> None:
    """Spot photo ingest — JPEG only, per PHOTO_STORAGE_BRIEF. No RAW branch, no
    other formats, and never relaxed — entity assets have their own, wider check
    (assert_asset_image) rather than this one being loosened globally."""
    ext = os.path.splitext(filename or "")[1].lower()
    if content_type in JPEG_CONTENT_TYPES or ext in JPEG_EXTENSIONS:
        return
    raise UnsupportedImageType(f"Only JPEG images are supported (got {content_type or ext or 'unknown type'})")


def assert_asset_image(filename: str | None, content_type: str | None) -> None:
    """Entity asset uploads (operator/manufacturer logos, location covers) — JPEG
    or PNG. PNG is allowed here (and only here) so logos/patches can keep
    transparency instead of showing an opaque box on the dark background."""
    ext = os.path.splitext(filename or "")[1].lower()
    if content_type in ASSET_CONTENT_TYPES or ext in ASSET_EXTENSIONS:
        return
    raise UnsupportedImageType(
        f"Only JPEG or PNG images are supported (got {content_type or ext or 'unknown type'})"
    )


def asset_ext(filename: str | None, content_type: str | None) -> str:
    """.png if the upload is PNG (preserve transparency), else .jpg."""
    ext = os.path.splitext(filename or "")[1].lower()
    if content_type in PNG_CONTENT_TYPES or ext in PNG_EXTENSIONS:
        return ".png"
    return ".jpg"


def _shard(date: datetime.date) -> str:
    return f"{date.year:04d}/{date.month:02d}/{date.day:02d}"


def original_rel(date: datetime.date, file_id: str) -> str:
    return f"{ORIGINALS}/{_shard(date)}/{file_id}.jpg"


def thumb_rel(date: datetime.date, file_id: str) -> str:
    return f"{THUMBS}/{_shard(date)}/{file_id}.jpg"


def asset_rel(entity_type: str, entity_id: int, file_id: str, ext: str = ".jpg") -> str:
    return f"{ASSETS}/{entity_type}/{entity_id}/{file_id}{ext}"


def asset_thumb_rel(entity_type: str, entity_id: int, file_id: str, ext: str = ".jpg") -> str:
    return f"{ASSETS}/{entity_type}/{entity_id}/{file_id}_thumb{ext}"


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


def save_file(contents: bytes, rel: str) -> None:
    """Writes the upload's raw bytes as-is — already-validated JPEG or PNG content,
    no re-encoding, so nothing is lost (including PNG alpha)."""
    path = abs_path(rel)
    ensure_parent(path)
    with open(path, "wb") as f:
        f.write(contents)


def save_thumbnail(image: Image.Image, rel: str, size: tuple[int, int] = SPOT_THUMB_SIZE, quality: int = 82) -> None:
    """Format follows `rel`'s extension — PNG originals get a PNG thumb (alpha
    preserved), everything else gets a JPEG thumb.

    exif_transpose() runs first: phone cameras store pixels in sensor orientation
    plus an EXIF Orientation tag; browsers honor that tag when displaying the
    original, but PIL's resize reads raw pixels and ignores it, so a thumbnail
    made from a portrait photo without this bakes in a 90°/180°/270° rotation
    the original never showed. This also strips the tag from the derivative,
    which is correct since the rotation is now physically applied to the pixels."""
    image = ImageOps.exif_transpose(image)
    path = abs_path(rel)
    ensure_parent(path)
    if rel.lower().endswith(".png"):
        img = image.convert("RGBA") if image.mode not in ("RGBA", "LA", "P") else image
        thumb = img.copy()
        thumb.thumbnail(size)
        thumb.save(path, "PNG")
    else:
        rgb = image.convert("RGB") if image.mode not in ("RGB", "L") else image
        thumb = rgb.copy()
        thumb.thumbnail(size)
        thumb.save(path, "JPEG", quality=quality)


def open_image(contents: bytes) -> Image.Image:
    img = Image.open(BytesIO(contents))
    img.load()
    return img
