import { useEffect, useState } from "react";
import { fetchAircraft, photoUrl, updateAircraft } from "../api.js";
import { formatDate } from "../format.js";
import AircraftTypeLine, { humanize } from "./AircraftTypeLine.jsx";
import EditableField from "./EditableField.jsx";
import ManufacturerField from "./ManufacturerField.jsx";
import SpotMap from "./SpotMap.jsx";

const CONFIGURATIONS = ["single_prop", "multi_prop", "turboprop", "jet", "rotary", "glider"];
const ROLES = ["bizjet", "warbird", "bush_float", "homebuilt", "trainer", "agricultural"];

export default function AircraftPage({ aircraftId }) {
  const [aircraft, setAircraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetchAircraft(aircraftId)
      .then(setAircraft)
      .catch((err) => setLoadError(err.message || "Failed to load aircraft"))
      .finally(() => setLoading(false));
  }, [aircraftId]);

  if (loading) return <div className="state-msg mono">Loading aircraft…</div>;
  if (loadError) return <div className="state-msg error mono">{loadError}</div>;
  if (!aircraft) return null;

  const { stats } = aircraft;

  async function saveField(field, value) {
    const updated = await updateAircraft(aircraftId, { [field]: value });
    setAircraft(updated);
  }

  return (
    <div className="wrap">
      <header className="spot">
        <div className="reg-row">
          <div className="reg mono">{aircraft.identifier}</div>
          <div className="date-block">
            <span className="dl">{aircraft.category === "ga" ? "General Aviation" : aircraft.category === "military" ? "Military" : "Commercial"}</span>
          </div>
        </div>
        <AircraftTypeLine aircraft={aircraft} />
      </header>

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Details</h2>
        </div>
        <div style={{ padding: "4px 18px" }}>
          <div className="drow">
            <span className="k">Category</span>
            <span className="v" style={{ cursor: "default" }}>
              <select value={aircraft.category} onChange={(e) => saveField("category", e.target.value)}>
                <option value="commercial">Commercial</option>
                <option value="military">Military</option>
                <option value="ga">GA</option>
              </select>
            </span>
          </div>

          {aircraft.category === "military" ? (
            <EditableField
              label="Serial"
              value={aircraft.serial}
              placeholder="add serial"
              mono
              onSave={(v) => saveField("serial", v)}
            />
          ) : (
            <EditableField
              label="Registration"
              value={aircraft.registration}
              placeholder="add registration"
              mono
              onSave={(v) => saveField("registration", v)}
            />
          )}

          <ManufacturerField
            manufacturerEntity={aircraft.manufacturer_entity}
            onSave={(name) => saveField("manufacturer_name", name)}
          />
          <EditableField label="Type" value={aircraft.type} placeholder="add type" mono onSave={(v) => saveField("type", v)} />

          {aircraft.category === "commercial" && (
            <>
              <EditableField label="MSN" value={aircraft.msn} placeholder="add MSN" mono onSave={(v) => saveField("msn", v)} />
              <EditableField label="Line #" value={aircraft.line_number} placeholder="add line number" mono onSave={(v) => saveField("line_number", v)} />
              <EditableField
                label="1st flight"
                value={aircraft.first_flight != null ? String(aircraft.first_flight) : ""}
                placeholder="add year"
                mono
                onSave={(v) => saveField("first_flight", v ? Number(v) : null)}
              />
            </>
          )}
          {aircraft.category === "military" && (
            <>
              <EditableField label="Variant" value={aircraft.variant} placeholder="add variant" mono onSave={(v) => saveField("variant", v)} />
              <EditableField label="Operator" value={aircraft.operator} placeholder="add operator" onSave={(v) => saveField("operator", v)} />
              <EditableField label="Home base" value={aircraft.home_base} placeholder="add home base" onSave={(v) => saveField("home_base", v)} />
            </>
          )}
          {aircraft.category === "ga" && (
            <>
              <div className="drow">
                <span className="k">Configuration</span>
                <span className="v" style={{ cursor: "default" }}>
                  <select
                    value={aircraft.configuration || ""}
                    onChange={(e) => saveField("configuration", e.target.value || null)}
                  >
                    <option value="">— optional —</option>
                    {CONFIGURATIONS.map((c) => (
                      <option key={c} value={c}>
                        {humanize(c)}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
              <div className="drow">
                <span className="k">Role</span>
                <span className="v" style={{ cursor: "default" }}>
                  <select value={aircraft.role || ""} onChange={(e) => saveField("role", e.target.value || null)}>
                    <option value="">— optional —</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {humanize(r)}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

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
            <div className="op-stat-num mono">{stats.location_count}</div>
            <div className="op-stat-label">distinct locations</div>
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
          <h2>Map</h2>
          <span className="sub mono">everywhere {aircraft.identifier} has been caught</span>
        </div>
        <div style={{ padding: 14 }}>
          <SpotMap
            scope={{ aircraft_id: aircraft.id }}
            emptyMessage="No plotted spots yet for this aircraft."
          />
        </div>
      </div>

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Spots</h2>
          <span className="sub mono">
            every photo of <b>{aircraft.identifier}</b>
          </span>
        </div>
        {aircraft.spots.length === 0 && <div className="state-msg mono">No spots linked yet.</div>}
        {aircraft.spots.map((entry) => (
          <a key={entry.id} href={`/spot?spot=${entry.id}`} className="lrow lrow--thumb" style={{ textDecoration: "none" }}>
            <span className="lrow-thumb-wrap">
              {entry.cover_thumbnail ? (
                <img className="lrow-thumb" src={photoUrl(entry.cover_thumbnail)} alt="" />
              ) : (
                <div className="lrow-thumb-empty">✈</div>
              )}
            </span>
            <span className="ld">{formatDate(entry.date)}</span>
            <span className="ll">{entry.operator_label || "—"}</span>
            <span className="lc">{entry.location_label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
