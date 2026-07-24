import { useEffect, useState } from "react";
import { fetchAircraft, photoUrl, updateAircraft } from "../api.js";
import { formatDate } from "../format.js";
import AircraftTypeLine, { humanize } from "./AircraftTypeLine.jsx";
import DateRangeStat from "./DateRangeStat.jsx";
import EditableField from "./EditableField.jsx";
import ManufacturerField from "./ManufacturerField.jsx";
import SpotMap from "./SpotMap.jsx";

const CONFIGURATIONS = ["single_prop", "multi_prop", "turboprop", "jet", "rotary", "glider"];
const ROLES = ["bizjet", "warbird", "bush_float", "homebuilt", "trainer", "agricultural"];

export default function AircraftPage({ aircraftId }) {
  const [aircraft, setAircraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const focusField = new URLSearchParams(window.location.search).get("focus");

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetchAircraft(aircraftId)
      .then(setAircraft)
      .catch((err) => setLoadError(err.message || "Failed to load aircraft"))
      .finally(() => setLoading(false));
  }, [aircraftId]);

  // Upload-tab deep link: scroll the offending field into view and flash it.
  // (Fields that support click-to-edit also auto-open via their own autoEdit prop.)
  useEffect(() => {
    if (!aircraft || !focusField) return;
    const el = document.getElementById(`field-${focusField}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("field-target--flash");
    const t = setTimeout(() => el.classList.remove("field-target--flash"), 1700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aircraft, focusField]);

  if (loading) return <div className="state-msg mono">Loading aircraft…</div>;
  if (loadError) return <div className="state-msg error mono">{loadError}</div>;
  if (!aircraft) return null;

  const { stats } = aircraft;
  const heroSpot = aircraft.spots[0];
  const heroPhoto = heroSpot?.cover_thumbnail;

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
            <span className="dl">Category</span>
            <span className="d" style={{ fontSize: 20 }}>
              {aircraft.category === "ga" ? "General Aviation" : aircraft.category === "military" ? "Military" : "Commercial"}
            </span>
          </div>
          {heroSpot && (
            <div className="date-block">
              <span className="dl">Spotted</span>
              <span className="d" style={{ fontSize: 20 }}>
                {formatDate(heroSpot.date)}
              </span>
            </div>
          )}
        </div>
        <AircraftTypeLine aircraft={aircraft} />
      </header>

      <div className="grid grid--wide-rail">
        <div className="cell">
          {heroPhoto ? (
            <a href={`/spot?spot=${heroSpot.id}`} className="cover" style={{ textDecoration: "none", cursor: "pointer" }}>
              <img src={photoUrl(heroPhoto)} alt={`${aircraft.identifier} — most recent spot`} />
              <div className="exif mono">
                <span>
                  Spotted <b>{formatDate(heroSpot.date)}</b>
                </span>
              </div>
            </a>
          ) : (
            <div className="cover cover-empty">
              <div className="glyph">✈</div>
              <div className="label mono">No photos yet</div>
            </div>
          )}
        </div>

        <div className="cell rail">
          <div className="sect">
            <h3>Details</h3>
            <div className="drow-grid">
              <div id="field-category" className="drow field-target">
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
                  id="field-serial"
                  label="Serial"
                  value={aircraft.serial}
                  placeholder="add serial"
                  mono
                  onSave={(v) => saveField("serial", v)}
                  autoEdit={focusField === "serial"}
                />
              ) : (
                <EditableField
                  id="field-registration"
                  label="Registration"
                  value={aircraft.registration}
                  placeholder="add registration"
                  mono
                  onSave={(v) => saveField("registration", v)}
                  autoEdit={focusField === "registration"}
                />
              )}

              <ManufacturerField
                id="field-manufacturer"
                manufacturerEntity={aircraft.manufacturer_entity}
                onSave={(name) => saveField("manufacturer_name", name)}
                autoEdit={focusField === "manufacturer"}
              />
              <EditableField
                id="field-type"
                label="Type"
                value={aircraft.type}
                placeholder="add type"
                mono
                onSave={(v) => saveField("type", v)}
                autoEdit={focusField === "type"}
              />

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
            <DateRangeStat firstDate={stats.first_date} lastDate={stats.last_date} />
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
