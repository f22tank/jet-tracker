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

export { ApiError };
