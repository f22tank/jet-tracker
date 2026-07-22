import { useEffect, useState } from "react";
import {
  ApiError,
  detachSpotPhoto,
  fetchAircraft,
  fetchSpot,
  findAircraft,
  mergeSpot,
  photoUrl,
  reassignSpotAircraft,
  updateAircraft,
  updateSpotDate,
  updateSpotFields,
} from "../api.js";
import CollisionDialog from "./CollisionDialog.jsx";
import LocationField from "./LocationField.jsx";
import OperatorField from "./OperatorField.jsx";
import RegistrationChangeDialog from "./RegistrationChangeDialog.jsx";

const CONFIGURATIONS = ["single_prop", "multi_prop", "turboprop", "jet", "rotary", "glider"];
const ROLES = ["bizjet", "warbird", "bush_float", "homebuilt", "trainer", "agricultural"];

function humanize(v) {
  return v ? v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : v;
}

/** A plain always-visible labeled input row — distinct from EditableField's
 * hover-reveal pattern. Everything inside the explicit Edit surface should
 * already read as "this is a form", so nothing here needs a hover cue. */
function FRow({ label, children }) {
  return (
    <div className="drow">
      <span className="k">{label}</span>
      <span className="v" style={{ cursor: "default", padding: "3px 0" }}>
        {children}
      </span>
    </div>
  );
}

function TextRow({ label, value, onCommit, placeholder, mono }) {
  const [draft, setDraft] = useState(value ?? "");

  // Resync when the underlying value changes for reasons other than this row's
  // own edit — e.g. reassigning the spot to a different aircraft swaps every
  // field's source record out from under an otherwise-stable component tree.
  useEffect(() => {
    setDraft(value ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <FRow label={label}>
      <input
        className={mono ? "mono" : undefined}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== (value ?? "")) onCommit(draft);
        }}
      />
    </FRow>
  );
}

export default function SpotEditModal({ spot, onClose, onUpdated, onMerged }) {
  const aircraft = spot.aircraft;

  const [error, setError] = useState(null);
  const [dateConflict, setDateConflict] = useState(null);
  const [regDialog, setRegDialog] = useState(null);

  async function refreshSpot() {
    const fresh = await fetchSpot(spot.id);
    onUpdated(fresh);
  }

  async function saveSpotField(field, value) {
    setError(null);
    try {
      const updated = await updateSpotFields(spot.id, { [field]: value });
      onUpdated(updated);
    } catch (err) {
      setError(err.message || "Failed to save");
    }
  }

  async function saveDate(value) {
    setError(null);
    try {
      const updated = await updateSpotDate(spot.id, value);
      onUpdated(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDateConflict({ pendingDate: value, currentSpot: spot, conflictingSpot: err.body.conflicting_spot });
        return;
      }
      setError(err.message || "Failed to save date");
    }
  }

  async function confirmMerge() {
    const merged = await mergeSpot(spot.id, dateConflict.conflictingSpot.id);
    setDateConflict(null);
    onMerged(merged);
  }

  async function setCover(photoId) {
    setError(null);
    try {
      const updated = await updateSpotFields(spot.id, { cover_photo_id: photoId });
      onUpdated(updated);
    } catch (err) {
      setError(err.message || "Failed to set cover");
    }
  }

  async function detachPhoto(photoId) {
    setError(null);
    try {
      const updated = await detachSpotPhoto(spot.id, photoId);
      onUpdated(updated);
    } catch (err) {
      setError(err.message || "Failed to detach photo");
    }
  }

  async function saveAircraftField(field, value) {
    setError(null);
    try {
      await updateAircraft(aircraft.id, { [field]: value });
      await refreshSpot();
    } catch (err) {
      setError(err.message || "Failed to save aircraft field");
    }
  }

  async function handleIdentifierChange(field, rawValue) {
    const trimmed = rawValue.trim();
    const current = aircraft[field] || "";
    if (trimmed === current) return;
    setError(null);
    try {
      const [match, detail] = await Promise.all([findAircraft(trimmed), fetchAircraft(aircraft.id)]);
      if (match && match.id === aircraft.id) {
        // Same airframe, just a case/whitespace tweak — nothing ambiguous here.
        await saveAircraftField(field, trimmed);
        return;
      }
      setRegDialog({
        field,
        newValue: trimmed,
        matchedAircraft: match || null,
        currentAircraft: { identifier: detail.identifier, spot_count: detail.stats.spot_count },
      });
    } catch (err) {
      setError(err.message || "Lookup failed");
    }
  }

  async function runReassign(payload) {
    try {
      const updated = await reassignSpotAircraft(spot.id, payload);
      setRegDialog(null);
      onUpdated(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setRegDialog(null);
        setDateConflict({ pendingDate: spot.date, currentSpot: spot, conflictingSpot: err.body.conflicting_spot });
        return;
      }
      setError(err.message || "Failed to reassign aircraft");
    }
  }

  async function regDialogFixTypo() {
    await saveAircraftField(regDialog.field, regDialog.newValue);
    setRegDialog(null);
  }

  async function regDialogReassignExisting() {
    await runReassign({ aircraft_id: regDialog.matchedAircraft.id });
  }

  async function regDialogCreateNew() {
    await runReassign({ new_aircraft: { category: aircraft.category, [regDialog.field]: regDialog.newValue } });
  }

  const category = aircraft.category;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-head">
          <h4>Edit Spot — {aircraft.identifier}</h4>
          <button type="button" className="edit-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && <div className="err" style={{ margin: "0 20px 12px" }}>{error}</div>}

        <div className="edit-modal-body">
          <section className="edit-modal-section">
            <h5>Spot</h5>

            <FRow label="Date">
              <input
                type="date"
                value={spot.date}
                onChange={(e) => saveDate(e.target.value)}
              />
            </FRow>

            <FRow label="Location">
              <LocationField
                location={spot.location}
                spotLat={spot.spot_lat}
                spotLon={spot.spot_lon}
                onSet={(update) => {
                  const fields = update.location_id
                    ? { location_id: update.location_id }
                    : { spot_lat: update.spot_lat, spot_lon: update.spot_lon };
                  return updateSpotFields(spot.id, fields).then(onUpdated);
                }}
              />
            </FRow>

            {category === "military" && (
              <>
                <OperatorField
                  label="Unit"
                  type="military_unit"
                  operator={spot.operator}
                  legacyValue={spot.unit}
                  onSave={(operatorId) => saveSpotField("operator_id", operatorId)}
                />
                <TextRow label="Markings" value={spot.markings} placeholder="add markings" onCommit={(v) => saveSpotField("markings", v)} />
              </>
            )}
            {category === "ga" && (
              <>
                <TextRow label="Owner" value={spot.owner} placeholder="add owner" onCommit={(v) => saveSpotField("owner", v)} />
                <TextRow label="Markings" value={spot.markings} placeholder="add markings" onCommit={(v) => saveSpotField("markings", v)} />
              </>
            )}
            {category === "commercial" && (
              <>
                <OperatorField
                  label="Airline"
                  type="airline"
                  operator={spot.operator}
                  legacyValue={spot.airline}
                  onSave={(operatorId) => saveSpotField("operator_id", operatorId)}
                />
                <TextRow label="Livery" value={spot.livery} placeholder="add livery" onCommit={(v) => saveSpotField("livery", v)} />
              </>
            )}

            <FRow label="Notes">
              <textarea
                rows={3}
                defaultValue={spot.notes || ""}
                placeholder="add notes"
                onBlur={(e) => {
                  if (e.target.value !== (spot.notes || "")) saveSpotField("notes", e.target.value);
                }}
              />
            </FRow>
          </section>

          <section className="edit-modal-section">
            <h5>Aircraft — {aircraft.identifier}</h5>
            <p className="edit-modal-hint">
              These belong to the airframe record, not just this sighting — changes apply everywhere{" "}
              <b>{aircraft.identifier}</b> has been spotted.
            </p>

            <FRow label="Category">
              <select value={category} onChange={(e) => saveAircraftField("category", e.target.value)}>
                <option value="commercial">Commercial</option>
                <option value="military">Military</option>
                <option value="ga">GA</option>
              </select>
            </FRow>

            {category === "military" ? (
              <TextRow
                label="Serial"
                value={aircraft.serial}
                mono
                placeholder="add serial"
                onCommit={(v) => handleIdentifierChange("serial", v)}
              />
            ) : (
              <TextRow
                label="Registration"
                value={aircraft.registration}
                mono
                placeholder="add registration"
                onCommit={(v) => handleIdentifierChange("registration", v)}
              />
            )}

            <TextRow label="Type" value={aircraft.type} placeholder="add type" onCommit={(v) => saveAircraftField("type", v)} />
            <TextRow
              label="Manufacturer"
              value={aircraft.manufacturer_entity?.name}
              placeholder="add manufacturer"
              onCommit={(v) => saveAircraftField("manufacturer_name", v)}
            />

            {category === "commercial" && (
              <>
                <TextRow label="MSN" value={aircraft.msn} mono placeholder="add MSN" onCommit={(v) => saveAircraftField("msn", v)} />
                <TextRow
                  label="Line #"
                  value={aircraft.line_number}
                  mono
                  placeholder="add line number"
                  onCommit={(v) => saveAircraftField("line_number", v)}
                />
                <TextRow
                  label="1st flight"
                  value={aircraft.first_flight != null ? String(aircraft.first_flight) : ""}
                  mono
                  placeholder="add year"
                  onCommit={(v) => saveAircraftField("first_flight", v ? Number(v) : null)}
                />
              </>
            )}
            {category === "military" && (
              <>
                <TextRow label="Variant" value={aircraft.variant} mono placeholder="add variant" onCommit={(v) => saveAircraftField("variant", v)} />
                <TextRow label="Operator" value={aircraft.operator} placeholder="add operator" onCommit={(v) => saveAircraftField("operator", v)} />
                <TextRow label="Home base" value={aircraft.home_base} placeholder="add home base" onCommit={(v) => saveAircraftField("home_base", v)} />
              </>
            )}
            {category === "ga" && (
              <>
                <FRow label="Configuration">
                  <select
                    value={aircraft.configuration || ""}
                    onChange={(e) => saveAircraftField("configuration", e.target.value || null)}
                  >
                    <option value="">— optional —</option>
                    {CONFIGURATIONS.map((c) => (
                      <option key={c} value={c}>
                        {humanize(c)}
                      </option>
                    ))}
                  </select>
                </FRow>
                <FRow label="Role">
                  <select value={aircraft.role || ""} onChange={(e) => saveAircraftField("role", e.target.value || null)}>
                    <option value="">— optional —</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {humanize(r)}
                      </option>
                    ))}
                  </select>
                </FRow>
              </>
            )}
          </section>

          <section className="edit-modal-section">
            <h5>Photos</h5>
            {spot.photos.length === 0 ? (
              <div className="state-msg mono">No photos on this spot.</div>
            ) : (
              <div className="edit-modal-photos">
                {spot.photos.map((p) => (
                  <div key={p.id} className="edit-modal-photo">
                    <img src={photoUrl(p.thumbnail_path || p.path)} alt="" />
                    <div className="edit-modal-photo-actions">
                      <button
                        type="button"
                        className="edit-modal-photo-star"
                        title="Set as cover"
                        onClick={() => setCover(p.id)}
                      >
                        {p.id === spot.cover_photo_id ? "★" : "☆"}
                      </button>
                      <button
                        type="button"
                        className="edit-modal-photo-detach"
                        title="Detach — sends back to the tray"
                        onClick={() => detachPhoto(p.id)}
                      >
                        Detach
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Both nested dialogs render their own full-screen backdrop; without stopping
          propagation here, a click-to-cancel on either would bubble up through this
          modal's own backdrop div and close the whole edit surface too. */}
      {dateConflict && (
        <div onClick={(e) => e.stopPropagation()}>
          <CollisionDialog
            pendingDate={dateConflict.pendingDate}
            currentSpot={dateConflict.currentSpot}
            conflictingSpot={dateConflict.conflictingSpot}
            onCancel={() => setDateConflict(null)}
            onMerge={confirmMerge}
          />
        </div>
      )}

      {regDialog && (
        <div onClick={(e) => e.stopPropagation()}>
          <RegistrationChangeDialog
            fieldLabel={regDialog.field === "serial" ? "Serial" : "Registration"}
            newValue={regDialog.newValue}
            currentAircraft={regDialog.currentAircraft}
            matchedAircraft={regDialog.matchedAircraft}
            onCancel={() => setRegDialog(null)}
            onReassignExisting={regDialogReassignExisting}
            onFixTypo={regDialogFixTypo}
            onCreateNew={regDialogCreateNew}
          />
        </div>
      )}
    </div>
  );
}
