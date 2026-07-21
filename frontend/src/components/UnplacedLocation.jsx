import { useState } from "react";

export default function UnplacedLocation({ onResolve }) {
  const [icao, setIcao] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onResolve({ icao: icao.trim() || null, name: name.trim() });
    } catch (err) {
      setError(err.message || "Failed to save location");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="unplaced">
      <div className="msg">This spot is unplaced — add a location to resolve it.</div>
      <form className="row" onSubmit={submit}>
        <input
          placeholder="ICAO (optional)"
          value={icao}
          onChange={(e) => setIcao(e.target.value.toUpperCase())}
          disabled={saving}
          style={{ width: 100 }}
        />
        <input
          placeholder="Airport name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={saving}
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={saving || !name.trim()}>
          {saving ? "Saving…" : "Set location"}
        </button>
      </form>
      {error && <span className="err">{error}</span>}
    </div>
  );
}
