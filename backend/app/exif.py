import datetime

from PIL import ExifTags


def _rational_to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        pass
    try:
        return value[0] / value[1]
    except Exception:
        return None


def _dms_to_decimal(dms, ref):
    try:
        degrees, minutes, seconds = dms
        decimal = float(degrees) + float(minutes) / 60 + float(seconds) / 3600
        if ref in ("S", "W"):
            decimal = -decimal
        return decimal
    except Exception:
        return None


def extract_exif(image) -> dict:
    """Best-effort EXIF extraction. Missing/unreadable tags are left as None
    rather than raising — a photo with no EXIF is a valid input (needs a manual date)."""
    result = {
        "camera": None,
        "lens": None,
        "focal_length": None,
        "aperture": None,
        "shutter": None,
        "iso": None,
        "gps_lat": None,
        "gps_lon": None,
        "taken_at": None,
    }

    try:
        exif = image.getexif()
    except Exception:
        return result
    if not exif:
        return result

    ifd0 = {ExifTags.TAGS.get(k, k): v for k, v in exif.items()}
    make = ifd0.get("Make")
    model = ifd0.get("Model")
    if make or model:
        result["camera"] = " ".join(str(x).strip() for x in [make, model] if x).strip()

    try:
        exif_ifd = exif.get_ifd(ExifTags.IFD.Exif)
    except Exception:
        exif_ifd = {}
    exif_data = {ExifTags.TAGS.get(k, k): v for k, v in exif_ifd.items()}

    lens = exif_data.get("LensModel")
    if lens:
        result["lens"] = str(lens)

    focal = _rational_to_float(exif_data.get("FocalLength"))
    if focal:
        result["focal_length"] = f"{focal:g}mm"

    fnumber = _rational_to_float(exif_data.get("FNumber"))
    if fnumber:
        result["aperture"] = f"f/{fnumber:g}"

    exposure = _rational_to_float(exif_data.get("ExposureTime"))
    if exposure:
        result["shutter"] = f"1/{round(1 / exposure)}" if exposure < 1 else f"{exposure:g}"

    iso = exif_data.get("ISOSpeedRatings") or exif_data.get("PhotographicSensitivity")
    if iso is not None:
        result["iso"] = f"ISO {iso}"

    taken = exif_data.get("DateTimeOriginal")
    if taken:
        try:
            result["taken_at"] = datetime.datetime.strptime(str(taken), "%Y:%m:%d %H:%M:%S")
        except ValueError:
            pass

    try:
        gps_ifd = exif.get_ifd(ExifTags.IFD.GPSInfo)
    except Exception:
        gps_ifd = {}
    gps_data = {ExifTags.GPSTAGS.get(k, k): v for k, v in gps_ifd.items()}
    lat, lat_ref = gps_data.get("GPSLatitude"), gps_data.get("GPSLatitudeRef")
    lon, lon_ref = gps_data.get("GPSLongitude"), gps_data.get("GPSLongitudeRef")
    if lat and lat_ref:
        result["gps_lat"] = _dms_to_decimal(lat, lat_ref)
    if lon and lon_ref:
        result["gps_lon"] = _dms_to_decimal(lon, lon_ref)

    return result
