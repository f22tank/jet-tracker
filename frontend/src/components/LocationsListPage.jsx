import { useEffect, useState } from "react";
import { fetchLocationsList } from "../api.js";

export default function LocationsListPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    fetchLocationsList()
      .then(setLocations)
      .catch((err) => setLoadError(err.message || "Failed to load locations"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="state-msg mono">Loading locations…</div>;
  if (loadError) return <div className="state-msg error mono">{loadError}</div>;

  return (
    <div className="wrap tray">
      <header className="tray-head">
        <h1>Locations</h1>
        <span className="mono count">
          {locations.length} defined place{locations.length === 1 ? "" : "s"}
        </span>
      </header>

      <div className="ledger">
        {locations.length === 0 && (
          <div className="state-msg mono">No defined locations yet — tag a spot's place to create one.</div>
        )}
        {locations.map((loc) => (
          <a key={loc.id} href={`/location?id=${loc.id}`} className="lrow" style={{ textDecoration: "none" }}>
            <span className="ld">{loc.name}</span>
            <span className="ll">
              {[loc.icao, loc.iata].filter(Boolean).join(" / ")}
              {loc.city || loc.country ? ` · ${[loc.city, loc.country].filter(Boolean).join(", ")}` : ""}
            </span>
            <span className="lc">
              {loc.spot_count} spot{loc.spot_count === 1 ? "" : "s"}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
