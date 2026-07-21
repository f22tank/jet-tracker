import { useEffect, useState } from "react";
import { fetchOperator, photoUrl } from "../api.js";

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function DetailLine({ operator }) {
  const parts =
    operator.type === "airline"
      ? [operator.iata, operator.icao, operator.callsign].filter(Boolean)
      : [operator.branch, operator.tail_code, operator.home_base].filter(Boolean);

  if (parts.length === 0) return null;
  return (
    <div className="type-line">
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="sep">·</span>}
          {part}
        </span>
      ))}
    </div>
  );
}

export default function OperatorPage({ operatorId }) {
  const [operator, setOperator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetchOperator(operatorId)
      .then(setOperator)
      .catch((err) => setLoadError(err.message || "Failed to load operator"))
      .finally(() => setLoading(false));
  }, [operatorId]);

  if (loading) return <div className="state-msg mono">Loading operator…</div>;
  if (loadError) return <div className="state-msg error mono">{loadError}</div>;
  if (!operator) return null;

  const { stats } = operator;

  return (
    <div className="wrap">
      <header className="spot">
        {operator.parent && (
          <div className="op-breadcrumb mono">
            <a href={`/operator?id=${operator.parent.id}`}>{operator.parent.name}</a>
            <span className="sep">/</span>
            <span>{operator.name}</span>
          </div>
        )}
        <div className="reg-row">
          {operator.image && <img className="op-image" src={photoUrl(operator.image)} alt="" />}
          <div className="date-block">
            <span className="dl">{operator.type === "airline" ? "Airline" : "Military Unit"}</span>
            <span className="d" style={{ fontSize: 28 }}>
              {operator.name}
            </span>
          </div>
        </div>
        <DetailLine operator={operator} />
      </header>

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Stats</h2>
        </div>
        <div className="op-stats">
          <div className="op-stat">
            <div className="op-stat-num mono">{stats.spot_count}</div>
            <div className="op-stat-label">spot{stats.spot_count === 1 ? "" : "s"}</div>
          </div>
          <div className="op-stat">
            <div className="op-stat-num mono">{stats.aircraft_count}</div>
            <div className="op-stat-label">distinct aircraft</div>
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

      {operator.children.length > 0 && (
        <div className="ledger" style={{ marginTop: 24 }}>
          <div className="ledger-head">
            <h2>Units</h2>
            <span className="sub mono">{operator.children.length} under this wing</span>
          </div>
          {operator.children.map((child) => (
            <a key={child.id} href={`/operator?id=${child.id}`} className="lrow" style={{ textDecoration: "none" }}>
              <span className="ld">{child.name}</span>
              <span className="ll">{[child.branch, child.tail_code, child.home_base].filter(Boolean).join(" · ")}</span>
            </a>
          ))}
        </div>
      )}

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Spots</h2>
          <span className="sub mono">
            every photo of <b>{operator.name}</b>
          </span>
        </div>
        {operator.spots.length === 0 && <div className="state-msg mono">No spots linked yet.</div>}
        {operator.spots.map((entry) => (
          <a key={entry.id} href={`/spot?spot=${entry.id}`} className="lrow" style={{ textDecoration: "none" }}>
            <span className="ld">{entry.date}</span>
            <span className="ll">
              {entry.aircraft_identifier} · {entry.aircraft_type}
            </span>
            <span className="lc">{entry.location_label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
