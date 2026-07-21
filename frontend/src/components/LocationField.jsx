import { useState } from "react";
import LocationTagInput from "./LocationTagInput.jsx";

/** Renders the spot's location in one of three states — defined Location
 * (name links to its page), raw pin (coordinates, no link), or blank (add
 * affordance) — and switches to the tag-time picker to edit any of them. */
export default function LocationField({ location, spotLat, spotLon, onSet }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSet(update) {
    setSaving(true);
    setError(null);
    try {
      await onSet(update);
      setEditing(false);
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div>
        <LocationTagInput onSet={handleSet} disabled={saving} />
        {error && <span className="err">{error}</span>}
        <span className="edit-cancel mono" onClick={() => setEditing(false)}>
          cancel
        </span>
      </div>
    );
  }

  if (location) {
    return (
      <div className="loc-click" onClick={() => setEditing(true)}>
        <div className="loc-code mono">{location.icao || location.iata || "—"}</div>
        <div className="loc-name">
          <a href={`/location?id=${location.id}`} className="operator-link" onClick={(e) => e.stopPropagation()}>
            {location.name}
          </a>
          {location.city ? ` · ${location.city}${location.country ? `, ${location.country}` : ""}` : ""}
          <span className="edit mono">edit</span>
        </div>
      </div>
    );
  }

  if (spotLat != null && spotLon != null) {
    return (
      <div className="loc-click" onClick={() => setEditing(true)}>
        <div className="loc-code mono">PIN</div>
        <div className="loc-name">
          {spotLat.toFixed(4)}, {spotLon.toFixed(4)}
          <span className="edit mono">edit</span>
        </div>
      </div>
    );
  }

  return (
    <div className="loc-click loc-empty" onClick={() => setEditing(true)}>
      add location <span className="edit mono">edit</span>
    </div>
  );
}
