import { useEffect, useState } from "react";
import {
  fetchManufacturer,
  photoUrl,
  removeManufacturerLogo,
  updateManufacturer,
  uploadManufacturerLogo,
} from "../api.js";
import { formatDate } from "../format.js";
import AssetImageUpload from "./AssetImageUpload.jsx";
import EditableField from "./EditableField.jsx";

const CATEGORY_LABELS = { commercial: "Commercial", military: "Military", ga: "GA" };

export default function ManufacturerPage({ manufacturerId }) {
  const [manufacturer, setManufacturer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetchManufacturer(manufacturerId)
      .then(setManufacturer)
      .catch((err) => setLoadError(err.message || "Failed to load manufacturer"))
      .finally(() => setLoading(false));
  }, [manufacturerId]);

  if (loading) return <div className="state-msg mono">Loading manufacturer…</div>;
  if (loadError) return <div className="state-msg error mono">{loadError}</div>;
  if (!manufacturer) return null;

  const { stats } = manufacturer;

  async function handleLogoUpload(file) {
    const updated = await uploadManufacturerLogo(manufacturerId, file);
    setManufacturer((prev) => ({ ...prev, logo: updated.logo }));
  }

  async function handleLogoRemove() {
    const updated = await removeManufacturerLogo(manufacturerId);
    setManufacturer((prev) => ({ ...prev, logo: updated.logo }));
  }

  async function saveField(field, value) {
    const updated = await updateManufacturer(manufacturerId, { [field]: value });
    setManufacturer(updated);
  }

  return (
    <div className="wrap">
      <header className="spot">
        <div className="reg-row">
          <AssetImageUpload
            className="asset-upload--op-logo"
            src={manufacturer.logo ? photoUrl(manufacturer.logo) : null}
            onUpload={handleLogoUpload}
            onRemove={manufacturer.logo ? handleLogoRemove : null}
            placeholder="+ Logo"
            alt={manufacturer.name}
          />
          <div className="date-block">
            <span className="dl">Manufacturer</span>
            <span className="d" style={{ fontSize: 28 }}>
              {manufacturer.name}
            </span>
          </div>
        </div>
      </header>

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Details</h2>
        </div>
        <div style={{ padding: "4px 18px" }}>
          <EditableField
            label="Country"
            value={manufacturer.country}
            placeholder="add country"
            onSave={(v) => saveField("country", v)}
          />
        </div>
      </div>

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Stats</h2>
        </div>
        <div className="op-stats">
          <div className="op-stat">
            <div className="op-stat-num mono">{stats.aircraft_count}</div>
            <div className="op-stat-label">distinct aircraft</div>
          </div>
          <div className="op-stat">
            <div className="op-stat-num mono">{stats.spot_count}</div>
            <div className="op-stat-label">spot{stats.spot_count === 1 ? "" : "s"}</div>
          </div>
          <div className="op-stat">
            <div className="op-stat-num mono">{stats.type_count}</div>
            <div className="op-stat-label">distinct types</div>
          </div>
        </div>
      </div>

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Overview</h2>
        </div>
        <div style={{ padding: "14px 18px" }}>
          <EditableField
            block
            value={manufacturer.notes}
            placeholder="add a write-up — history, notable aircraft, whatever"
            onSave={(v) => saveField("notes", v)}
            multiline
          />
        </div>
      </div>

      {manufacturer.recent_spots.length > 0 && (
        <div className="ledger" style={{ marginTop: 24 }}>
          <div className="ledger-head">
            <h2>Recent Spots</h2>
          </div>
          <div className="recent-photos">
            {manufacturer.recent_spots.map((s) => (
              <a
                key={s.id}
                href={`/spot?spot=${s.id}`}
                className="recent-photo"
                title={`${s.aircraft_identifier || ""} · ${formatDate(s.date)}`}
              >
                {s.cover_thumbnail ? (
                  <img src={photoUrl(s.cover_thumbnail)} alt="" />
                ) : (
                  <div className="cc-im-empty">✈</div>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Aircraft</h2>
          <span className="sub mono">{manufacturer.aircraft.length} in the fleet</span>
        </div>
        {manufacturer.aircraft.length === 0 && <div className="state-msg mono">No aircraft linked yet.</div>}
        {manufacturer.aircraft.map((a) => (
          <a key={a.id} href={`/aircraft?id=${a.id}`} className="lrow" style={{ textDecoration: "none" }}>
            <span className="ld">{a.identifier}</span>
            <span className="ll">{a.type}</span>
            <span className="lc">{CATEGORY_LABELS[a.category] || a.category}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
