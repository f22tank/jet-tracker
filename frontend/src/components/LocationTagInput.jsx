import { useEffect, useRef, useState } from "react";
import { createLocation, findLocation, searchLocations } from "../api.js";
import NewLocationModal from "./NewLocationModal.jsx";

/** onSet receives either { location_id, location } (a defined place) or
 * { spot_lat, spot_lon } (a raw one-off pin) — the two are mutually exclusive,
 * enforced server-side, but this control only ever sends one at a time. */
export default function LocationTagInput({ buttonLabel = "Set", onSet, disabled }) {
  const [mode, setMode] = useState("place"); // "place" | "pin"

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef(null);

  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      searchLocations(query.trim())
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function pick(location) {
    setOpen(false);
    setQuery("");
    setSuggestions([]);
    onSet({ location_id: location.id, location });
  }

  async function submitTyped() {
    const value = query.trim();
    if (!value) return;
    setBusy(true);
    try {
      const match = await findLocation(value);
      if (match) pick(match);
      else {
        setOpen(false);
        setShowCreate(true);
      }
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) pick(suggestions[0]);
      else submitTyped();
    }
    if (e.key === "Escape") setOpen(false);
  }

  function submitPin() {
    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (Number.isNaN(latNum) || Number.isNaN(lonNum) || lat.trim() === "" || lon.trim() === "") return;
    onSet({ spot_lat: latNum, spot_lon: lonNum });
  }

  return (
    <div className="tag-input location-tag-input">
      <div className="mode-switch">
        <button type="button" className={mode === "place" ? "active" : ""} onClick={() => setMode("place")}>
          Place
        </button>
        <button type="button" className={mode === "pin" ? "active" : ""} onClick={() => setMode("pin")}>
          Raw pin
        </button>
      </div>

      {mode === "place" ? (
        <div className="row">
          <input
            value={query}
            placeholder="search or name a place"
            disabled={disabled || busy}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />
          <button type="button" onClick={submitTyped} disabled={disabled || busy || !query.trim()}>
            {busy ? "…" : buttonLabel}
          </button>
          {open && suggestions.length > 0 && (
            <div className="tag-suggestions mono">
              {suggestions.map((loc) => (
                <div key={loc.id} className="tag-suggestion" onMouseDown={() => pick(loc)}>
                  <b>{loc.name}</b>
                  <span>{[loc.icao, loc.iata, loc.city, loc.country].filter(Boolean).join(" · ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="row">
          <input placeholder="lat" value={lat} onChange={(e) => setLat(e.target.value)} disabled={disabled} style={{ width: 80 }} />
          <input placeholder="lon" value={lon} onChange={(e) => setLon(e.target.value)} disabled={disabled} style={{ width: 80 }} />
          <button type="button" onClick={submitPin} disabled={disabled || !lat.trim() || !lon.trim()}>
            {buttonLabel}
          </button>
        </div>
      )}

      {showCreate && (
        <NewLocationModal
          initialName={query.trim()}
          onCancel={() => setShowCreate(false)}
          onCreate={async (payload) => {
            const location = await createLocation(payload);
            setShowCreate(false);
            setQuery("");
            onSet({ location_id: location.id, location });
          }}
        />
      )}
    </div>
  );
}
