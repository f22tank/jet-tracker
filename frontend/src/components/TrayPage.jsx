import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, fetchIncompleteSpots, fetchTray, ingestPhotos, photoUrl, resolvePhotos } from "../api.js";
import { formatDate } from "../format.js";
import AircraftTagInput from "./AircraftTagInput.jsx";
import CollisionDialog from "./CollisionDialog.jsx";
import LocationTagInput from "./LocationTagInput.jsx";
import OperatorTagInput from "./OperatorTagInput.jsx";

const MISSING_LABELS = {
  location: "location",
  manufacturer: "manufacturer",
  type: "type",
  registration: "registration",
  serial: "serial",
};

// Which fields live on the Aircraft record vs. the Spot record — determines
// where a "needs attention" row should route to. A field maps 1:1 to the query
// param the target page reads to deep-link into (and, where supported,
// auto-open) the offending field.
const AIRCRAFT_FIELDS = new Set(["manufacturer", "type", "registration", "serial", "category"]);

/** Route each incomplete-spot row to wherever its missing field actually lives,
 * instead of always linking the spot page. A single aircraft-side field goes
 * straight to the aircraft page (deep-linked to that field); a missing location,
 * or a mix of spot- and aircraft-side gaps, goes to the spot page — the natural
 * hub, since it links onward to the aircraft too. */
function destinationFor(entry) {
  const hasLocation = entry.missing.includes("location");
  const aircraftFields = entry.missing.filter((m) => AIRCRAFT_FIELDS.has(m));

  if (!hasLocation && aircraftFields.length > 0) {
    const focus = aircraftFields.length === 1 ? `&focus=${aircraftFields[0]}` : "";
    return { href: `/aircraft?id=${entry.aircraft_id}${focus}`, label: "aircraft" };
  }
  return { href: `/spot?spot=${entry.id}`, label: "spot" };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function TrayPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const fileInputRef = useRef(null);

  const [selected, setSelected] = useState(() => new Set());
  const [perPhotoDate, setPerPhotoDate] = useState({});

  const [dateMode, setDateMode] = useState("off"); // off | fixed | various
  const [fixedDate, setFixedDate] = useState(today());
  const [locationMode, setLocationMode] = useState("off");
  const [fixedPlacement, setFixedPlacement] = useState(null); // { location_id, label } or { spot_lat, spot_lon, label }
  const [airlineMode, setAirlineMode] = useState("off");
  const [fixedOperator, setFixedOperator] = useState(null); // { id, name }

  const [conflict, setConflict] = useState(null); // { payload, conflictingSpot }
  const [bulkError, setBulkError] = useState(null);

  const [incompleteSpots, setIncompleteSpots] = useState([]);
  const [incompleteLoading, setIncompleteLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchTray()
      .then(setPhotos)
      .catch((err) => setLoadError(err.message || "Failed to load tray"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchIncompleteSpots()
      .then(setIncompleteSpots)
      .finally(() => setIncompleteLoading(false));
  }, []);

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      await ingestPhotos(files);
      load();
    } catch (err) {
      setLoadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function effectiveDate(photo) {
    if (dateMode === "fixed") return fixedDate;
    return perPhotoDate[photo.id] || (photo.taken_at ? photo.taken_at.slice(0, 10) : "");
  }

  function handleFixedPlacement(update) {
    if (update.location_id) {
      setFixedPlacement({ location_id: update.location_id, label: update.location.name });
    } else {
      setFixedPlacement({
        spot_lat: update.spot_lat,
        spot_lon: update.spot_lon,
        label: `${update.spot_lat.toFixed(3)}, ${update.spot_lon.toFixed(3)}`,
      });
    }
  }

  function buildPayload(photoIds, date, ref, category) {
    const payload = { photo_ids: photoIds, date };
    if (ref.aircraft_id) payload.aircraft_id = ref.aircraft_id;
    else payload.new_aircraft = ref.new_aircraft;
    if (locationMode === "fixed" && fixedPlacement) {
      if (fixedPlacement.location_id) payload.location_id = fixedPlacement.location_id;
      else {
        payload.spot_lat = fixedPlacement.spot_lat;
        payload.spot_lon = fixedPlacement.spot_lon;
      }
    }
    if (category === "commercial" && airlineMode === "fixed" && fixedOperator) {
      payload.operator_id = fixedOperator.id;
    }
    return payload;
  }

  async function doResolve(photoIds, date, ref, category) {
    const payload = buildPayload(photoIds, date, ref, category);
    try {
      await resolvePhotos(payload);
      setPhotos((prev) => prev.filter((p) => !photoIds.includes(p.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        photoIds.forEach((id) => next.delete(id));
        return next;
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflict({ payload, conflictingSpot: err.body.conflicting_spot });
        return;
      }
      throw err;
    }
  }

  async function handleTagSingle(photo, ref) {
    const date = effectiveDate(photo);
    if (!date) {
      setBulkError("This photo needs a date before it can be tagged.");
      return;
    }
    setBulkError(null);
    await doResolve([photo.id], date, ref, ref.category);
  }

  async function handleBulkTag(ref) {
    const ids = [...selected];
    const groups = new Map();
    const missingDate = [];
    for (const id of ids) {
      const photo = photos.find((p) => p.id === id);
      if (!photo) continue;
      const date = effectiveDate(photo);
      if (!date) {
        missingDate.push(id);
        continue;
      }
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date).push(id);
    }
    if (missingDate.length > 0) {
      setBulkError(`${missingDate.length} selected photo(s) need a date first — they were skipped.`);
    } else {
      setBulkError(null);
    }
    for (const [date, groupIds] of groups) {
      await doResolve(groupIds, date, ref, ref.category);
    }
  }

  async function confirmMerge() {
    await resolvePhotos({ ...conflict.payload, force: true });
    setPhotos((prev) => prev.filter((p) => !conflict.payload.photo_ids.includes(p.id)));
    setSelected((prev) => {
      const next = new Set(prev);
      conflict.payload.photo_ids.forEach((id) => next.delete(id));
      return next;
    });
    setConflict(null);
  }

  const needsDate = photos.filter((p) => !effectiveDate(p));
  const needsAircraft = photos.filter((p) => effectiveDate(p));

  const pendingPreview = conflict
    ? {
        aircraft: conflict.conflictingSpot.aircraft,
        date: conflict.payload.date,
        location: fixedPlacement?.location_id ? { name: fixedPlacement.label } : null,
        spot_lat: fixedPlacement?.spot_lat ?? null,
        spot_lon: fixedPlacement?.spot_lon ?? null,
        photos: new Array(conflict.payload.photo_ids.length).fill(null),
        operator: fixedOperator ? { name: fixedOperator.name } : null,
        owner: conflict.payload.owner || null,
      }
    : null;

  return (
    <div className="wrap tray">
      <header className="tray-head">
        <h1>Upload</h1>
        <span className="mono count">{photos.length} unassigned photo{photos.length === 1 ? "" : "s"}</span>
      </header>

      {!incompleteLoading && incompleteSpots.length > 0 && (
        <div className="tray-section">
          <h2>
            Needs Attention <span className="mono count">{incompleteSpots.length}</span>
          </h2>
          <div className="incomplete-list">
            {incompleteSpots.map((s) => {
              const dest = destinationFor(s);
              return (
                <a key={s.id} href={dest.href} className="lrow incomplete-row" style={{ textDecoration: "none" }}>
                  <span className="ld">{formatDate(s.date)}</span>
                  <span className="ll">{s.aircraft_identifier || "—"}</span>
                  <span className="lc">
                    {s.missing.map((m) => (
                      <span key={m} className={`missing-chip${m === "location" ? " missing-chip--high" : ""}`}>
                        {MISSING_LABELS[m] || m}
                      </span>
                    ))}
                    <span className="dest-hint mono">→ {dest.label}</span>
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      <div
        className={`dropzone${dropActive ? " active" : ""}${uploading ? " busy" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDropActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="dz-label mono">{uploading ? "Ingesting…" : "Drop photos here, or click to browse"}</div>
      </div>

      {loadError && <div className="state-msg error mono">{loadError}</div>}

      <div className="batch-bar">
        <div className="batch-toggle">
          <span className="k">Date</span>
          {["off", "fixed", "various"].map((m) => (
            <button key={m} className={dateMode === m ? "active" : ""} onClick={() => setDateMode(m)}>
              {m}
            </button>
          ))}
          {dateMode === "fixed" && (
            <input type="date" value={fixedDate} onChange={(e) => setFixedDate(e.target.value)} />
          )}
        </div>

        <div className="batch-toggle">
          <span className="k">Location</span>
          {["off", "fixed", "various"].map((m) => (
            <button key={m} className={locationMode === m ? "active" : ""} onClick={() => setLocationMode(m)}>
              {m}
            </button>
          ))}
          {locationMode === "fixed" &&
            (fixedPlacement ? (
              <span className="mono fixed-value">{fixedPlacement.label}</span>
            ) : (
              <LocationTagInput buttonLabel="Set" onSet={handleFixedPlacement} />
            ))}
        </div>

        <div className="batch-toggle">
          <span className="k">Airline</span>
          {["off", "fixed"].map((m) => (
            <button key={m} className={airlineMode === m ? "active" : ""} onClick={() => setAirlineMode(m)}>
              {m}
            </button>
          ))}
          {airlineMode === "fixed" &&
            (fixedOperator ? (
              <span className="mono fixed-value">{fixedOperator.name}</span>
            ) : (
              <OperatorTagInput
                type="airline"
                buttonLabel="Set"
                onTag={(ref) => setFixedOperator({ id: ref.operator_id, name: ref.operator.name })}
              />
            ))}
        </div>
      </div>

      {loading ? (
        <div className="state-msg mono">Loading tray…</div>
      ) : (
        <>
          {needsDate.length > 0 && (
            <div className="tray-section">
              <h2>Needs date <span className="mono count">{needsDate.length}</span></h2>
              <div className="tray-grid">
                {needsDate.map((p) => (
                  <div key={p.id} className="tray-card needs-date">
                    <div className="tc-im">
                      <img src={photoUrl(p.thumbnail_path || p.path)} alt="" />
                    </div>
                    <input
                      type="date"
                      value={perPhotoDate[p.id] || ""}
                      onChange={(e) => setPerPhotoDate((d) => ({ ...d, [p.id]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="tray-section">
            <h2>Needs aircraft <span className="mono count">{needsAircraft.length}</span></h2>
            {bulkError && <div className="err" style={{ marginBottom: 8 }}>{bulkError}</div>}
            {selected.size > 0 && (
              <div className="bulk-bar">
                <span className="mono">{selected.size} selected</span>
                <AircraftTagInput buttonLabel={`Tag ${selected.size}`} onTag={handleBulkTag} />
                <button className="cancel" onClick={() => setSelected(new Set())}>
                  Clear
                </button>
              </div>
            )}
            <div className="tray-grid">
              {needsAircraft.map((p) => (
                <div key={p.id} className="tray-card">
                  <label className="tc-select">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
                  </label>
                  <div className="tc-im">
                    <img src={photoUrl(p.thumbnail_path || p.path)} alt="" />
                  </div>
                  <div className="tc-date mono">{formatDate(effectiveDate(p))}</div>
                  <AircraftTagInput onTag={(ref) => handleTagSingle(p, ref)} />
                </div>
              ))}
            </div>
            {needsAircraft.length === 0 && photos.length === 0 && (
              <div className="state-msg mono">Tray is empty — drop some photos above.</div>
            )}
          </div>
        </>
      )}

      {conflict && (
        <CollisionDialog
          pendingDate={conflict.payload.date}
          currentSpot={pendingPreview}
          conflictingSpot={conflict.conflictingSpot}
          onCancel={() => setConflict(null)}
          onMerge={confirmMerge}
        />
      )}
    </div>
  );
}
