import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchSpot, mergeSpot, photoUrl, updateSpotDate, updateSpotFields } from "../api.js";
import AircraftTypeLine from "./AircraftTypeLine.jsx";
import CollisionDialog from "./CollisionDialog.jsx";
import EditableField from "./EditableField.jsx";
import LocationField from "./LocationField.jsx";
import MiniMap from "./MiniMap.jsx";
import OperatorField from "./OperatorField.jsx";

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShort(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export default function SpotPage({ spotId: initialSpotId }) {
  const [spotId, setSpotId] = useState(initialSpotId);
  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [dateConflict, setDateConflict] = useState(null); // { pendingDate, currentSpot, conflictingSpot }

  const load = useCallback((id) => {
    setLoading(true);
    setLoadError(null);
    fetchSpot(id)
      .then((data) => {
        setSpot(data);
        setSpotId(id);
      })
      .catch((err) => setLoadError(err.message || "Failed to load spot"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(initialSpotId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function navigateTo(id) {
    const url = new URL(window.location.href);
    url.searchParams.set("spot", id);
    window.history.pushState({}, "", url);
    load(id);
  }

  async function saveField(field, value) {
    const updated = await updateSpotFields(spotId, { [field]: value });
    setSpot(updated);
  }

  async function saveDate(value) {
    try {
      const updated = await updateSpotDate(spotId, value);
      setSpot(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDateConflict({ pendingDate: value, currentSpot: spot, conflictingSpot: err.body.conflicting_spot });
        return;
      }
      throw err;
    }
  }

  async function confirmMerge() {
    const merged = await mergeSpot(spotId, dateConflict.conflictingSpot.id);
    setDateConflict(null);
    setSpot(merged);
    setSpotId(merged.id);
    const url = new URL(window.location.href);
    url.searchParams.set("spot", merged.id);
    window.history.pushState({}, "", url);
  }

  async function setCover(photoId) {
    const updated = await updateSpotFields(spotId, { cover_photo_id: photoId });
    setSpot(updated);
  }

  async function setLocation(update) {
    const fields = update.location_id
      ? { location_id: update.location_id }
      : { spot_lat: update.spot_lat, spot_lon: update.spot_lon };
    const updated = await updateSpotFields(spotId, fields);
    setSpot(updated);
  }

  if (loading) return <div className="state-msg mono">Loading spot…</div>;
  if (loadError) return <div className="state-msg error mono">{loadError}</div>;
  if (!spot) return null;

  const ledger = spot.ledger;
  const currentIdx = ledger.findIndex((l) => l.id === spot.id);
  const prevEntry = ledger[currentIdx + 1]; // older (list sorted desc by date)
  const nextEntry = currentIdx > 0 ? ledger[currentIdx - 1] : null; // newer
  const cover = spot.photos.find((p) => p.id === spot.cover_photo_id) || spot.photos[0];
  const hasPhotos = spot.photos.length > 0;

  return (
    <>
      <div className="topbar">
        <div className="wrap topbar-in">
          <div className="brand">
            SPOT<b>·</b>BOOK
          </div>
          <div className="nav">
            <button disabled={!prevEntry} onClick={() => prevEntry && navigateTo(prevEntry.id)}>
              ‹ PREV{prevEntry && <span style={{ color: "var(--steel)" }}>{formatShort(prevEntry.date)}</span>}
            </button>
            <span className="pos mono">
              {spot.aircraft.identifier} / {ledger.length} spot{ledger.length === 1 ? "" : "s"}
            </span>
            <button disabled={!nextEntry} onClick={() => nextEntry && navigateTo(nextEntry.id)}>
              {nextEntry && <span style={{ color: "var(--steel)" }}>{formatShort(nextEntry.date)}</span>}NEXT ›
            </button>
          </div>
        </div>
      </div>

      <div className="wrap">
        <header className="spot">
          <div className="reg-row">
            <a href={`/aircraft?id=${spot.aircraft.id}`} className="reg mono reg-link">
              {spot.aircraft.identifier}
            </a>
            <div className="date-block">
              <span className="dl">Spotted</span>
              <span className="d">{formatDate(spot.date)}</span>
            </div>
          </div>
          <AircraftTypeLine aircraft={spot.aircraft} />
        </header>

        <div className="grid">
          <div className="cell">
            {hasPhotos ? (
              <div className="cover">
                <img src={photoUrl(cover.path)} alt={`${spot.aircraft.identifier} on approach`} />
                <div className="tag mono">★ COVER</div>
                <div className="exif mono">
                  {cover.camera && (
                    <span>
                      CAM <b>{cover.camera}</b>
                    </span>
                  )}
                  {cover.lens && (
                    <span>
                      LENS <b>{cover.lens}</b>
                    </span>
                  )}
                  {cover.focal_length && <span><b>{cover.focal_length}</b></span>}
                  {cover.aperture && <span><b>{cover.aperture}</b></span>}
                  {cover.shutter && <span><b>{cover.shutter}</b></span>}
                  {cover.iso && <span><b>{cover.iso}</b></span>}
                </div>
              </div>
            ) : (
              <div className="cover cover-empty">
                <div className="glyph">✈</div>
                <div className="label mono">No photos yet</div>
              </div>
            )}
          </div>

          <div className="cell rail">
            <div className="sect">
              <h3>Location</h3>
              <LocationField
                location={spot.location}
                spotLat={spot.spot_lat}
                spotLon={spot.spot_lon}
                onSet={setLocation}
              />
              <MiniMap lat={spot.location?.lat ?? spot.spot_lat} lon={spot.location?.lon ?? spot.spot_lon} />
            </div>

            <div className="sect">
              <h3>Details</h3>
              {spot.aircraft.category === "military" && (
                <>
                  <OperatorField
                    label="Unit"
                    type="military_unit"
                    operator={spot.operator}
                    legacyValue={spot.unit}
                    onSave={(operatorId) => saveField("operator_id", operatorId)}
                  />
                  <EditableField label="Markings" value={spot.markings} placeholder="add markings" onSave={(v) => saveField("markings", v)} />
                </>
              )}
              {spot.aircraft.category === "ga" && (
                <>
                  <EditableField label="Owner" value={spot.owner} placeholder="add owner" onSave={(v) => saveField("owner", v)} />
                  <EditableField label="Markings" value={spot.markings} placeholder="add markings" onSave={(v) => saveField("markings", v)} />
                </>
              )}
              {spot.aircraft.category === "commercial" && (
                <>
                  <OperatorField
                    label="Airline"
                    type="airline"
                    operator={spot.operator}
                    legacyValue={spot.airline}
                    onSave={(operatorId) => saveField("operator_id", operatorId)}
                  />
                  <EditableField label="Livery" value={spot.livery} placeholder="add livery" onSave={(v) => saveField("livery", v)} />
                </>
              )}
              <EditableField label="Date" value={spot.date} placeholder="set date" mono onSave={saveDate} />
              <EditableField label="Notes" value={spot.notes} placeholder="add notes" onSave={(v) => saveField("notes", v)} />
            </div>
          </div>
        </div>

        <div className="photos">
          <div className="photos-head">
            <h2>Photos</h2>
            <span className="count mono">
              {hasPhotos ? `${spot.photos.length} in this spot · click to set cover` : "no photos yet"}
            </span>
          </div>
          {hasPhotos ? (
            <div className="thumbs">
              {spot.photos.map((p) => (
                <div
                  key={p.id}
                  className={`thumb${p.id === spot.cover_photo_id ? " cover-sel" : ""}`}
                  onClick={() => setCover(p.id)}
                >
                  <div className="im">
                    <img src={photoUrl(p.thumbnail_path || p.path)} alt="" />
                  </div>
                  <div className="star">{p.id === spot.cover_photo_id ? "★" : "☆"}</div>
                  <div className="meta">
                    {p.camera} · {p.focal_length}
                    <br />
                    <b>
                      {p.aperture} · {p.shutter} · {p.iso}
                    </b>
                  </div>
                </div>
              ))}
              <div className="add-photos-tile" title="Upload flow lives in the tray, not this page">
                <div className="plus">+</div>
                <div className="label">Add photos</div>
              </div>
            </div>
          ) : (
            <div className="photos-empty-strip">
              No photos attached to this spot yet.{" "}
              <span style={{ color: "var(--sky)", cursor: "pointer" }} title="Upload flow lives in the tray, not this page">
                Add photos
              </span>
            </div>
          )}
        </div>

        <div className="ledger">
          <div className="ledger-head">
            <h2>This Aircraft</h2>
            <span className="sub mono">
              {spot.aircraft.identifier} · caught <b>{ledger.length}×</b>
            </span>
          </div>
          {ledger.map((entry) => (
            <div
              key={entry.id}
              className={`lrow${entry.is_current ? " here" : ""}`}
              onClick={() => !entry.is_current && navigateTo(entry.id)}
            >
              <span className="ld">{entry.date}</span>
              <span className="ll">{entry.location_label}</span>
              {entry.is_current ? (
                <span className="here-tag">◂ you are here</span>
              ) : (
                <span className="lc">
                  {entry.photo_count} photo{entry.photo_count === 1 ? "" : "s"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {dateConflict && (
        <CollisionDialog
          pendingDate={dateConflict.pendingDate}
          currentSpot={dateConflict.currentSpot}
          conflictingSpot={dateConflict.conflictingSpot}
          onCancel={() => setDateConflict(null)}
          onMerge={confirmMerge}
        />
      )}
    </>
  );
}
