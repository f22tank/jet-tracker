import { useEffect, useState } from "react";
import {
  fetchLocation,
  photoUrl,
  removeLocationCoverPhoto,
  updateLocation,
  uploadLocationCoverPhoto,
} from "../api.js";
import { formatDate } from "../format.js";
import AssetImageUpload from "./AssetImageUpload.jsx";
import EditableField from "./EditableField.jsx";
import MiniMap from "./MiniMap.jsx";

function toNullableFloat(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
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

  async function saveField(field, value, { numeric = false } = {}) {
    const updated = await updateLocation(locationId, { [field]: numeric ? toNullableFloat(value) : value });
    setLocation(updated);
  }

  async function handleCoverUpload(file) {
    const updated = await uploadLocationCoverPhoto(locationId, file);
    setLocation(updated);
  }

  async function handleCoverRemove() {
    const updated = await removeLocationCoverPhoto(locationId);
    setLocation(updated);
  }

  return (
    <div className="wrap">
      <header className="spot">
        <div className="loc-cover-wrap">
          <AssetImageUpload
            className="asset-upload--loc-cover"
            src={location.cover_image ? photoUrl(location.cover_image) : null}
            onUpload={handleCoverUpload}
            onRemove={location.cover_image ? handleCoverRemove : null}
            placeholder="+ Add cover photo"
            alt={location.name}
          />
        </div>
        <div className="reg-row">
          <div className="date-block">
            <span className="dl">Location</span>
            <span className="d" style={{ fontSize: 28 }}>
              {location.name}
            </span>
          </div>
        </div>
      </header>

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Details</h2>
        </div>
        <div style={{ padding: "4px 18px" }}>
          <EditableField label="Name" value={location.name} placeholder="add name" onSave={(v) => saveField("name", v)} />
          <EditableField label="ICAO" value={location.icao} placeholder="add ICAO" mono onSave={(v) => saveField("icao", v)} />
          <EditableField label="IATA" value={location.iata} placeholder="add IATA" mono onSave={(v) => saveField("iata", v)} />
          <EditableField label="City" value={location.city} placeholder="add city" onSave={(v) => saveField("city", v)} />
          <EditableField label="Country" value={location.country} placeholder="add country" onSave={(v) => saveField("country", v)} />
          <EditableField
            label="Lat"
            value={location.lat != null ? String(location.lat) : ""}
            placeholder="add latitude"
            mono
            onSave={(v) => saveField("lat", v, { numeric: true })}
          />
          <EditableField
            label="Lon"
            value={location.lon != null ? String(location.lon) : ""}
            placeholder="add longitude"
            mono
            onSave={(v) => saveField("lon", v, { numeric: true })}
          />
        </div>
      </div>

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

      {location.recent_photos.length > 0 && (
        <div className="ledger" style={{ marginTop: 24 }}>
          <div className="ledger-head">
            <h2>Recent Photos</h2>
          </div>
          <div className="recent-photos">
            {location.recent_photos.map((p) => (
              <a key={p.id} href={`/spot?spot=${p.spot_id}`} className="recent-photo">
                <img src={photoUrl(p.thumbnail_path || p.path)} alt="" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Spots</h2>
          <span className="sub mono">
            every photo caught at <b>{location.name}</b>
          </span>
        </div>
        {location.spots.length === 0 && <div className="state-msg mono">No spots linked yet.</div>}
        {location.spots.map((entry) => (
          <a key={entry.id} href={`/spot?spot=${entry.id}`} className="lrow lrow--thumb" style={{ textDecoration: "none" }}>
            <span className="lrow-thumb-wrap">
              {entry.cover_thumbnail ? (
                <img className="lrow-thumb" src={photoUrl(entry.cover_thumbnail)} alt="" />
              ) : (
                <div className="lrow-thumb-empty">✈</div>
              )}
            </span>
            <span className="ld">{formatDate(entry.date)}</span>
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
