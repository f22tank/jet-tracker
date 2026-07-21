import { useEffect, useState } from "react";
import { fetchLocation } from "../api.js";
import MiniMap from "./MiniMap.jsx";

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

export default function LocationPage({ locationId }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetchLocation(locationId)
      .then(setLocation)
      .catch((err) => setLoadError(err.message || "Failed to load location"))
      .finally(() => setLoading(false));
  }, [locationId]);

  if (loading) return <div className="state-msg mono">Loading location…</div>;
  if (loadError) return <div className="state-msg error mono">{loadError}</div>;
  if (!location) return null;

  const { stats } = location;
  const codes = [location.icao, location.iata].filter(Boolean);

  return (
    <div className="wrap">
      <header className="spot">
        <div className="reg-row">
          <div className="date-block">
            <span className="dl">Location</span>
            <span className="d" style={{ fontSize: 28 }}>
              {location.name}
            </span>
          </div>
        </div>
        <div className="type-line">
          {codes.length > 0 && (
            <span>
              <b>{codes.join(" / ")}</b>
            </span>
          )}
          {(location.city || location.country) && (
            <span>
              {codes.length > 0 && <span className="sep">·</span>}
              {[location.city, location.country].filter(Boolean).join(", ")}
            </span>
          )}
          {location.lat != null && location.lon != null && (
            <span>
              <span className="sep">·</span>
              {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
            </span>
          )}
        </div>
      </header>

      <MiniMap lat={location.lat} lon={location.lon} />

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Stats</h2>
        </div>
        <div className="op-stats cols-4">
          <div className="op-stat">
            <div className="op-stat-num mono">{stats.spot_count}</div>
            <div className="op-stat-label">spot{stats.spot_count === 1 ? "" : "s"}</div>
          </div>
          <div className="op-stat">
            <div className="op-stat-num mono">{stats.aircraft_count}</div>
            <div className="op-stat-label">distinct aircraft</div>
          </div>
          <div className="op-stat">
            <div className="op-stat-num mono">{stats.operator_count}</div>
            <div className="op-stat-label">distinct operators</div>
          </div>
          <div className="op-stat">
            <div className="op-stat-num mono">
              {stats.first_date ? formatDate(stats.first_date) : "—"}
              {stats.first_date && stats.last_date && stats.first_date !== stats.last_date
                ? ` – ${formatDate(stats.last_date)}`
                : ""}
            </div>
            <div className="op-stat-label">date range</div>
          </div>
        </div>
      </div>

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Spots</h2>
          <span className="sub mono">
            every photo caught at <b>{location.name}</b>
          </span>
        </div>
        {location.spots.length === 0 && <div className="state-msg mono">No spots linked yet.</div>}
        {location.spots.map((entry) => (
          <a key={entry.id} href={`/spot?spot=${entry.id}`} className="lrow" style={{ textDecoration: "none" }}>
            <span className="ld">{entry.date}</span>
            <span className="ll">
              {entry.aircraft_identifier} · {entry.aircraft_type}
            </span>
            <span className="lc">{entry.operator_label || ""}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
