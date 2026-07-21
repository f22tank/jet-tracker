import { useState } from "react";

function operatorLabel(spot) {
  return spot.airline || spot.unit || spot.owner || null;
}

function SpotSummaryCard({ label, tag, spot, date, badge }) {
  const operator = operatorLabel(spot);
  return (
    <div className={`merge-card${badge ? ` merge-card--${badge}` : ""}`}>
      <div className="merge-card-label mono">{label}</div>
      <div className="merge-card-reg mono">{spot.aircraft.identifier}</div>
      <div className="merge-card-date mono">{date}</div>
      <div className="merge-card-loc">{spot.location ? spot.location.name : "Unplaced"}</div>
      <div className="merge-card-meta mono">
        {spot.photos.length} photo{spot.photos.length === 1 ? "" : "s"}
        {operator ? ` · ${operator}` : ""}
      </div>
      {tag && <div className={`merge-card-tag merge-card-tag--${badge} mono`}>{tag}</div>}
    </div>
  );
}

export default function CollisionDialog({ currentSpot, pendingDate, conflictingSpot, onCancel, onMerge }) {
  const [merging, setMerging] = useState(false);

  async function handleMerge() {
    setMerging(true);
    try {
      await onMerge();
    } finally {
      setMerging(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog dialog--wide" onClick={(e) => e.stopPropagation()}>
        <h4>⚠ Date collision</h4>
        <p>
          {currentSpot.aircraft.identifier} already has a spot logged on{" "}
          <b className="mono">{pendingDate}</b>. Merging will move this spot&rsquo;s photos and
          notes into the existing record, then delete this one. This can&rsquo;t be undone.
        </p>

        <div className="merge-compare">
          <SpotSummaryCard
            label="This spot"
            date={currentSpot.date}
            spot={currentSpot}
            badge="deleted"
            tag="will be deleted"
          />
          <div className="merge-arrow mono">→</div>
          <SpotSummaryCard
            label="Existing spot"
            date={conflictingSpot.date}
            spot={conflictingSpot}
            badge="survivor"
            tag="survives"
          />
        </div>

        <div className="actions">
          <button className="cancel" onClick={onCancel} disabled={merging}>
            Pick another date
          </button>
          <button className="merge" onClick={handleMerge} disabled={merging}>
            {merging ? "Merging…" : "Confirm merge"}
          </button>
        </div>
      </div>
    </div>
  );
}
