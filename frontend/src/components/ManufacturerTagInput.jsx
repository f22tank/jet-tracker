import { useEffect, useRef, useState } from "react";
import { searchManufacturers } from "../api.js";

/** Search-as-you-type picker over existing Manufacturer records — same pattern
 * as AircraftTagInput/OperatorTagInput. Unlike those, there's no separate
 * "create new" step: Manufacturer only strictly needs a name, so submitting
 * typed text with no match just passes it through — the caller's onTag saves
 * it via AircraftUpdate.manufacturer_name, which finds-or-creates server-side. */
export default function ManufacturerTagInput({ placeholder = "search manufacturers", buttonLabel = "Set", onTag, disabled }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      searchManufacturers(query.trim())
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function pick(manufacturer) {
    setOpen(false);
    setQuery("");
    setSuggestions([]);
    onTag(manufacturer.name);
  }

  async function submitTyped() {
    const value = query.trim();
    if (!value) return;
    setBusy(true);
    try {
      await onTag(value);
      setOpen(false);
      setQuery("");
      setSuggestions([]);
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
          {suggestions.map((m) => (
            <div key={m.id} className="tag-suggestion" onMouseDown={() => pick(m)}>
              <b>{m.name}</b>
              {m.country && <span>{m.country}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
