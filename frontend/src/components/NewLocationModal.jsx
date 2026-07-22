import { useState } from "react";

export default function NewLocationModal({ initialName, onCreate, onCancel }) {
  const [name, setName] = useState(initialName || "");
  const [icao, setIcao] = useState("");
  const [iata, setIata] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        name: name.trim(),
        icao: icao.trim() || null,
        iata: iata.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        lat: lat.trim() ? Number(lat) : null,
        lon: lon.trim() ? Number(lon) : null,
      });
    } catch (err) {
      setError(err.message || "Failed to create location");
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog dialog--wide" onClick={(e) => e.stopPropagation()}>
        <h4 style={{ color: "var(--accent)" }}>+ New location</h4>
        <p>
          A defined place gets its own page and aggregates every spot there. You&rsquo;re responsible for
          entering coordinates — leave them blank if you don&rsquo;t know them.
        </p>

        <form onSubmit={submit}>
          <div className="drow">
            <span className="k">Name</span>
            <span className="v"><input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="the Wawa on Airport Dr" /></span>
          </div>
          <div className="drow">
            <span className="k">ICAO</span>
            <span className="v"><input value={icao} onChange={(e) => setIcao(e.target.value.toUpperCase())} placeholder="optional" /></span>
          </div>
          <div className="drow">
            <span className="k">IATA</span>
            <span className="v"><input value={iata} onChange={(e) => setIata(e.target.value.toUpperCase())} placeholder="optional" /></span>
          </div>
          <div className="drow">
            <span className="k">City</span>
            <span className="v"><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="optional" /></span>
          </div>
          <div className="drow">
            <span className="k">Country</span>
            <span className="v"><input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="optional" /></span>
          </div>
          <div className="drow">
            <span className="k">Lat / Lon</span>
            <span className="v" style={{ display: "flex", gap: 8 }}>
              <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="lat" style={{ width: 90 }} />
              <input value={lon} onChange={(e) => setLon(e.target.value)} placeholder="lon" style={{ width: 90 }} />
            </span>
          </div>

          {error && <div className="err" style={{ marginTop: 8 }}>{error}</div>}

          <div className="actions" style={{ marginTop: 16 }}>
            <button type="button" className="cancel" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="merge" disabled={saving}>
              {saving ? "Creating…" : "Create & set"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
