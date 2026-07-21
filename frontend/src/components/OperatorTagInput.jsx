import { useEffect, useRef, useState } from "react";
import { createOperator, findOperator, searchOperators } from "../api.js";
import NewOperatorModal from "./NewOperatorModal.jsx";

/** type: "airline" | "military_unit" — the filtered dropdown from the brief:
 * commercial spots only ever see airlines, military spots only ever see units. */
export default function OperatorTagInput({ type, placeholder, buttonLabel = "Tag", onTag, disabled }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef(null);

  const defaultPlaceholder = type === "airline" ? "airline" : "unit";

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      searchOperators(type, query.trim())
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, type]);

  function pick(operator) {
    setOpen(false);
    setQuery("");
    setSuggestions([]);
    onTag({ operator_id: operator.id, operator });
  }

  async function submitTyped() {
    const value = query.trim();
    if (!value) return;
    setBusy(true);
    try {
      const match = await findOperator(type, value);
      if (match) pick(match);
      else {
        setOpen(false);
        setShowCreate(true);
      }
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) pick(suggestions[0]);
      else submitTyped();
    }
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="tag-input">
      <input
        value={query}
        placeholder={placeholder || defaultPlaceholder}
        disabled={disabled || busy}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      <button type="button" onClick={submitTyped} disabled={disabled || busy || !query.trim()}>
        {busy ? "…" : buttonLabel}
      </button>

      {open && suggestions.length > 0 && (
        <div className="tag-suggestions mono">
          {suggestions.map((op) => (
            <div key={op.id} className="tag-suggestion" onMouseDown={() => pick(op)}>
              <b>{op.name}</b>
              <span>{[op.iata, op.icao, op.callsign, op.branch, op.tail_code].filter(Boolean).join(" ")}</span>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <NewOperatorModal
          type={type}
          initialName={query.trim()}
          onCancel={() => setShowCreate(false)}
          onCreate={async (payload) => {
            const operator = await createOperator(payload);
            setShowCreate(false);
            setQuery("");
            onTag({ operator_id: operator.id, operator });
          }}
        />
      )}
    </div>
  );
}
