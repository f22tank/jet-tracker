// Empty by default: in production, nginx serves the app and proxies /api + /photos
// to the api container on the same origin, so relative URLs just work regardless of
// hostname (localhost, LAN IP, or VPN address). Set VITE_API_BASE_URL only for local
// dev against a Vite dev server that isn't behind that proxy (e.g. "http://localhost:8000").
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request(path, options) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    let body = null;
    try {
      body = await res.json();
    } catch {
      // no JSON body
    }
    throw new ApiError(body?.detail?.detail || body?.detail || res.statusText, res.status, body?.detail);
  }

  return res.json();
}

export function fetchSpot(spotId) {
  return request(`/api/spots/${spotId}`);
}

export function updateSpotFields(spotId, fields) {
  return request(`/api/spots/${spotId}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

/** Throws ApiError with status 409 and body.conflicting_spot when the
 * aircraft already has a spot on that date (UNIQUE(aircraft, date)). */
export function updateSpotDate(spotId, date) {
  return request(`/api/spots/${spotId}/date`, {
    method: "PUT",
    body: JSON.stringify({ date }),
  });
}

export function mergeSpot(spotId, targetSpotId) {
  return request(`/api/spots/${spotId}/merge/${targetSpotId}`, {
    method: "POST",
  });
}

/** The "wrong airframe" path — re-points a spot at a different aircraft (existing
 * via aircraft_id, or a brand-new one via new_aircraft). Throws ApiError with
 * status 409 and body.conflicting_spot on UNIQUE(aircraft, date) collision —
 * resolve with mergeSpot(spotId, conflictingSpot.id), same as updateSpotDate. */
export function reassignSpotAircraft(spotId, payload) {
  return request(`/api/spots/${spotId}/reassign-aircraft`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Detaches a misfiled photo from a spot — sends it back to the tray rather than deleting it. */
export function detachSpotPhoto(spotId, photoId) {
  return request(`/api/spots/${spotId}/photos/${photoId}`, {
    method: "DELETE",
  });
}

/** Resolves a photo's `path`/`thumbnail_path` to a loadable URL. Locally-ingested
 * photos are relative ("/photos/xxx.jpg", served by the API); seeded demo photos
 * are already-absolute URLs (Unsplash) and pass through unchanged. */
export function photoUrl(path) {
  if (!path) return path;
  return /^https?:\/\//.test(path) ? path : `${API_BASE_URL}${path}`;
}

export async function ingestPhotos(files) {
  const form = new FormData();
  for (const file of files) form.append("files", file);
  const res = await fetch(`${API_BASE_URL}/api/photos/ingest`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.detail || res.statusText, res.status, body?.detail);
  }
  return res.json();
}

export function fetchTray() {
  return request("/api/photos/tray");
}

export function updatePhotoRating(photoId, rating) {
  return request(`/api/photos/${photoId}`, {
    method: "PATCH",
    body: JSON.stringify({ rating }),
  });
}

/** The Upload tab's "Needs attention" view — spots missing location,
 * manufacturer, type, or aircraft identity. */
export function fetchIncompleteSpots() {
  return request("/api/spots/incomplete");
}

/** Throws ApiError with status 409 and body.conflicting_spot when the target
 * (aircraft, date) already has content — the tray's warn-then-merge. Retry with
 * { ...payload, force: true } to confirm. */
export function resolvePhotos(payload) {
  return request("/api/photos/resolve", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function searchAircraft(q) {
  return request(`/api/aircraft/search?q=${encodeURIComponent(q)}`);
}

export function findAircraft(value) {
  return request(`/api/aircraft/find?value=${encodeURIComponent(value)}`);
}

export function createLocation(location) {
  return request("/api/locations", {
    method: "POST",
    body: JSON.stringify(location),
  });
}

export function searchLocations(q) {
  return request(`/api/locations/search?q=${encodeURIComponent(q)}`);
}

export function findLocation(value) {
  return request(`/api/locations/find?value=${encodeURIComponent(value)}`);
}

export function fetchLocationsList() {
  return request("/api/locations");
}

export function fetchLocation(locationId) {
  return request(`/api/locations/${locationId}`);
}

export function fetchRecentLocations(limit = 8) {
  return request(`/api/locations/recent?limit=${limit}`);
}

export function updateLocation(locationId, fields) {
  return request(`/api/locations/${locationId}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

async function uploadFile(path, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE_URL}${path}`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.detail || res.statusText, res.status, body?.detail);
  }
  return res.json();
}

export function uploadLocationCoverPhoto(locationId, file) {
  return uploadFile(`/api/locations/${locationId}/cover-photo`, file);
}

export function removeLocationCoverPhoto(locationId) {
  return request(`/api/locations/${locationId}/cover-photo`, { method: "DELETE" });
}

export function searchOperators(type, q) {
  return request(`/api/operators/search?type=${type}&q=${encodeURIComponent(q)}`);
}

export function findOperator(type, value) {
  return request(`/api/operators/find?type=${type}&value=${encodeURIComponent(value)}`);
}

export function createOperator(payload) {
  return request("/api/operators", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMapSpots(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  }
  return request(`/api/map/spots?${search.toString()}`);
}

export function fetchMapFacets() {
  return request("/api/map/facets");
}

export function fetchAircraft(aircraftId) {
  return request(`/api/aircraft/${aircraftId}`);
}

export function updateAircraft(aircraftId, fields) {
  return request(`/api/aircraft/${aircraftId}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

export function fetchOperator(operatorId) {
  return request(`/api/operators/${operatorId}`);
}

export function updateOperator(operatorId, fields) {
  return request(`/api/operators/${operatorId}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

export function uploadOperatorLogo(operatorId, file) {
  return uploadFile(`/api/operators/${operatorId}/logo`, file);
}

export function removeOperatorLogo(operatorId) {
  return request(`/api/operators/${operatorId}/logo`, { method: "DELETE" });
}

export function fetchRecentSpots(limit = 12) {
  return request(`/api/gallery/recent?limit=${limit}`);
}

export function fetchGallerySpots({ q = "", category = "", sort = "date", order = "desc", page = 1, pageSize = 25 } = {}) {
  const params = new URLSearchParams({ q, sort, order, page: String(page), page_size: String(pageSize) });
  if (category) params.set("category", category);
  return request(`/api/gallery/spots?${params.toString()}`);
}

export function fetchOperatorsList(type) {
  return request(`/api/operators?type=${type}`);
}

export function fetchAircraftTable({ q = "", category = "", sort = "identifier", order = "asc", page = 1, pageSize = 25 } = {}) {
  const params = new URLSearchParams({ q, sort, order, page: String(page), page_size: String(pageSize) });
  if (category) params.set("category", category);
  return request(`/api/aircraft/table?${params.toString()}`);
}

export function fetchManufacturersList() {
  return request("/api/manufacturers");
}

export function searchManufacturers(q) {
  return request(`/api/manufacturers/search?q=${encodeURIComponent(q)}`);
}

export function fetchManufacturer(manufacturerId) {
  return request(`/api/manufacturers/${manufacturerId}`);
}

export function updateManufacturer(manufacturerId, fields) {
  return request(`/api/manufacturers/${manufacturerId}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

export function uploadManufacturerLogo(manufacturerId, file) {
  return uploadFile(`/api/manufacturers/${manufacturerId}/logo`, file);
}

export function removeManufacturerLogo(manufacturerId) {
  return request(`/api/manufacturers/${manufacturerId}/logo`, { method: "DELETE" });
}

export function fetchStats() {
  return request("/api/stats");
}

export { ApiError };
