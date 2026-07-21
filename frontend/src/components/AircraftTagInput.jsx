import { useEffect, useRef, useState } from "react";
import { findAircraft, searchAircraft } from "../api.js";
import NewAircraftModal from "./NewAircraftModal.jsx";

export default function AircraftTagInput({ placeholder = "reg or serial", buttonLabel = "Tag", onTag, disabled }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      searchAircraft(query.trim())
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function pick(aircraft) {
    setOpen(false);
    setQuery("");
    setSuggestions([]);
    onTag({ aircraft_id: aircraft.id, category: aircraft.category });
  }

  async function submitTyped() {
    const value = query.trim();
    if (!value) return;
    setBusy(true);
    try {
      const match = await findAircraft(value);
      if (match) {
        pick(match);
      } else {
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
        placeholder={placeholder}
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
          {suggestions.map((a) => (
            <div key={a.id} className="tag-suggestion" onMouseDown={() => pick(a)}>
              <b>{a.identifier}</b>
              <span>{[a.manufacturer, a.type, a.variant].filter(Boolean).join(" ")}</span>
              <span className="cat">{a.category}</span>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <NewAircraftModal
          initialIdentifier={query.trim()}
          onCancel={() => setShowCreate(false)}
          onCreate={async (payload) => {
            setShowCreate(false);
            setQuery("");
            onTag({ new_aircraft: payload, category: payload.category });
          }}
        />
      )}
    </div>
  );
}
