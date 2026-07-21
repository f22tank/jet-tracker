const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

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

export function resolveSpotLocation(spotId, location) {
  return request(`/api/spots/${spotId}/location`, {
    method: "PUT",
    body: JSON.stringify(location),
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

export function fetchOperator(operatorId) {
  return request(`/api/operators/${operatorId}`);
}

export { ApiError };
