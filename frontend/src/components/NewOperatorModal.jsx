import { useEffect, useRef, useState } from "react";
import { searchOperators } from "../api.js";

function ParentPicker({ value, onChange }) {
  const [query, setQuery] = useState(value?.name || "");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      searchOperators("military_unit", query.trim())
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="tag-input">
      <input
        placeholder="none"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && suggestions.length > 0 && (
        <div className="tag-suggestions mono">
          {suggestions.map((op) => (
            <div
              key={op.id}
              className="tag-suggestion"
              onMouseDown={() => {
                onChange(op);
                setQuery(op.name);
                setOpen(false);
              }}
            >
              <b>{op.name}</b>
              {op.home_base && <span>{op.home_base}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewOperatorModal({ type, initialName, onCreate, onCancel }) {
  const [name, setName] = useState(initialName || "");
  const [iata, setIata] = useState("");
  const [icao, setIcao] = useState("");
  const [callsign, setCallsign] = useState("");
  const [branch, setBranch] = useState("");
  const [tailCode, setTailCode] = useState("");
  const [homeBase, setHomeBase] = useState("");
  const [parent, setParent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isAirline = type === "airline";

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const payload = { type, name: name.trim() };
    if (isAirline) {
      payload.iata = iata || null;
      payload.icao = icao || null;
      payload.callsign = callsign || null;
    } else {
      payload.branch = branch || null;
      payload.tail_code = tailCode || null;
      payload.home_base = homeBase || null;
      payload.parent_operator_id = parent?.id || null;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate(payload);
    } catch (err) {
      setError(err.message || "Failed to create operator");
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog dialog--wide" onClick={(e) => e.stopPropagation()}>
        <h4 style={{ color: "var(--accent)" }}>+ New {isAirline ? "airline" : "unit"}</h4>
        <p>
          This {isAirline ? "airline" : "unit"} hasn&rsquo;t been tagged before — it becomes a shared record every
          future sighting can link to.
        </p>

        <form onSubmit={submit}>
          <div className="drow">
            <span className="k">Name</span>
            <span className="v">
              <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </span>
          </div>

          {isAirline ? (
            <>
              <div className="drow">
                <span className="k">IATA</span>
                <span className="v"><input value={iata} onChange={(e) => setIata(e.target.value.toUpperCase())} placeholder="AA" /></span>
              </div>
              <div className="drow">
                <span className="k">ICAO</span>
                <span className="v"><input value={icao} onChange={(e) => setIcao(e.target.value.toUpperCase())} placeholder="AAL" /></span>
              </div>
              <div className="drow">
                <span className="k">Callsign</span>
                <span className="v"><input value={callsign} onChange={(e) => setCallsign(e.target.value)} placeholder="AMERICAN" /></span>
              </div>
            </>
          ) : (
            <>
              <div className="drow">
                <span className="k">Branch</span>
                <span className="v"><input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="USAF" /></span>
              </div>
              <div className="drow">
                <span className="k">Tail code</span>
                <span className="v"><input value={tailCode} onChange={(e) => setTailCode(e.target.value.toUpperCase())} placeholder="SJ" /></span>
              </div>
              <div className="drow">
                <span className="k">Home base</span>
                <span className="v"><input value={homeBase} onChange={(e) => setHomeBase(e.target.value)} /></span>
              </div>
              <div className="drow">
                <span className="k">Parent wing</span>
                <span className="v"><ParentPicker value={parent} onChange={setParent} /></span>
              </div>
            </>
          )}

          {error && <div className="err" style={{ marginTop: 8 }}>{error}</div>}

          <div className="actions" style={{ marginTop: 16 }}>
            <button type="button" className="cancel" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="merge" disabled={saving}>
              {saving ? "Creating…" : "Create & tag"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
