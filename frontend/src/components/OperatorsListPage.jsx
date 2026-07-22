import { useEffect, useState } from "react";
import { fetchOperatorsList, photoUrl } from "../api.js";

const TABS = [
  { key: "airline", label: "Airlines" },
  { key: "military_unit", label: "Military" },
];

function getTypeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("type") === "military_unit" ? "military_unit" : "airline";
}

export default function OperatorsListPage() {
  const [type, setType] = useState(getTypeFromUrl());
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetchOperatorsList(type)
      .then(setOperators)
      .catch((err) => setLoadError(err.message || "Failed to load operators"))
      .finally(() => setLoading(false));
  }, [type]);

  function selectType(t) {
    setType(t);
    const url = new URL(window.location.href);
    url.searchParams.set("type", t);
    window.history.pushState({}, "", url);
  }

  const activeLabel = TABS.find((t) => t.key === type)?.label || "";

  return (
    <div className="wrap tray">
      <header className="tray-head">
        <h1>Operators</h1>
        <span className="mono count">
          {operators.length} {activeLabel.toLowerCase()}
        </span>
      </header>

      <div className="mode-switch" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.key} className={type === t.key ? "active" : ""} onClick={() => selectType(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="state-msg mono">Loading operators…</div>
      ) : loadError ? (
        <div className="state-msg error mono">{loadError}</div>
      ) : (
        <div className="ledger">
          {operators.length === 0 && <div className="state-msg mono">No {activeLabel.toLowerCase()} tagged yet.</div>}
          {operators.map((op) => (
            <a key={op.id} href={`/operator?id=${op.id}`} className="lrow lrow--thumb" style={{ textDecoration: "none" }}>
              <span className="lrow-thumb-wrap">
                {op.image ? (
                  <img className="lrow-thumb" src={photoUrl(op.image)} alt="" />
                ) : (
                  <div className="lrow-thumb-empty">✈</div>
                )}
              </span>
              <span className="ld">{op.name}</span>
              <span className="ll">{[op.iata, op.icao, op.branch, op.tail_code].filter(Boolean).join(" · ")}</span>
              <span className="lc">
                {op.spot_count} spot{op.spot_count === 1 ? "" : "s"}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
