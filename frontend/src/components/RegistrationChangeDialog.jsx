import { useState } from "react";

const CATEGORY_LABELS = { commercial: "Commercial", military: "Military", ga: "GA" };

/** Shown whenever the user changes an aircraft's registration/serial from the
 * spot edit surface — this is inherently ambiguous (typo vs. wrong airframe),
 * so we never guess. Branches on whether the new value already belongs to a
 * different existing aircraft:
 *   - matched  -> offer to re-point this spot to that aircraft instead.
 *   - unmatched -> offer both "fix the typo here" (affects every spot on this
 *     airframe) and "create a new aircraft and move just this spot". */
export default function RegistrationChangeDialog({
  fieldLabel,
  newValue,
  currentAircraft,
  matchedAircraft,
  onCancel,
  onReassignExisting,
  onFixTypo,
  onCreateNew,
}) {
  const [busy, setBusy] = useState(false);

  async function run(action) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog dialog--wide" onClick={(e) => e.stopPropagation()}>
        <h4>⚠ {fieldLabel} change</h4>

        {matchedAircraft ? (
          <>
            <p>
              <b className="mono">{newValue}</b> already belongs to an existing aircraft —{" "}
              <b>{matchedAircraft.identifier}</b> ({[matchedAircraft.manufacturer, matchedAircraft.type].filter(Boolean).join(" ")},{" "}
              {CATEGORY_LABELS[matchedAircraft.category] || matchedAircraft.category}). Is this spot actually that
              aircraft?
            </p>
            <div className="actions">
              <button className="cancel" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
              <button className="merge" onClick={() => run(onReassignExisting)} disabled={busy}>
                {busy ? "Working…" : `Re-point this spot to ${matchedAircraft.identifier}`}
              </button>
            </div>
          </>
        ) : (
          <>
            <p>
              <b className="mono">{newValue}</b> doesn&rsquo;t match any existing aircraft. Is this a typo on{" "}
              <b>{currentAircraft.identifier}</b>&rsquo;s record, or was this spot tagged to the wrong airframe?
            </p>
            <div className="merge-compare">
              <div className="merge-card">
                <div className="merge-card-label mono">FIX TYPO</div>
                <div className="merge-card-loc" style={{ marginTop: 0 }}>
                  Renames <b>{currentAircraft.identifier}</b> to <b className="mono">{newValue}</b>. Affects{" "}
                  <b>{currentAircraft.spot_count}</b> spot{currentAircraft.spot_count === 1 ? "" : "s"} of this
                  aircraft.
                </div>
              </div>
              <div className="merge-arrow mono">or</div>
              <div className="merge-card">
                <div className="merge-card-label mono">WRONG AIRCRAFT</div>
                <div className="merge-card-loc" style={{ marginTop: 0 }}>
                  Creates a new aircraft (<b className="mono">{newValue}</b>) and moves only this spot to it. Leaves{" "}
                  <b>{currentAircraft.identifier}</b> untouched.
                </div>
              </div>
            </div>
            <div className="actions">
              <button className="cancel" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
              <button className="cancel" onClick={() => run(onFixTypo)} disabled={busy} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                {busy ? "Working…" : "Fix typo on this aircraft"}
              </button>
              <button className="merge" onClick={() => run(onCreateNew)} disabled={busy}>
                {busy ? "Working…" : "Create new aircraft & move this spot"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
