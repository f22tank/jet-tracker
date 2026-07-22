import { useEffect, useState } from "react";
import { fetchManufacturersList, photoUrl } from "../api.js";

export default function ManufacturersListPage() {
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    fetchManufacturersList()
      .then(setManufacturers)
      .catch((err) => setLoadError(err.message || "Failed to load manufacturers"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="state-msg mono">Loading manufacturers…</div>;
  if (loadError) return <div className="state-msg error mono">{loadError}</div>;

  return (
    <div className="wrap tray">
      <header className="tray-head">
        <h1>Manufacturers</h1>
        <span className="mono count">
          {manufacturers.length} manufacturer{manufacturers.length === 1 ? "" : "s"}
        </span>
      </header>

      <div className="ledger">
        {manufacturers.length === 0 && (
          <div className="state-msg mono">
            No manufacturers yet — run the manufacturer migration, or they'll appear as aircraft types get parsed.
          </div>
        )}
        {manufacturers.map((m) => (
          <a key={m.id} href={`/manufacturer?id=${m.id}`} className="lrow lrow--thumb" style={{ textDecoration: "none" }}>
            <span className="lrow-thumb-wrap">
              {m.logo ? (
                <img className="lrow-thumb" src={photoUrl(m.logo)} alt="" />
              ) : (
                <div className="lrow-thumb-empty">✈</div>
              )}
            </span>
            <span className="ld">{m.name}</span>
            <span className="ll">{m.country || ""}</span>
            <span className="lc">
              {m.aircraft_count} aircraft
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
