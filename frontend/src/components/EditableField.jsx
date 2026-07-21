import { useState } from "react";

export default function EditableField({ label, value, placeholder, onSave, mono = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function startEdit() {
    setDraft(value ?? "");
    setError(null);
    setEditing(true);
  }

  async function commit() {
    if (draft === (value ?? "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  }

  return (
    <div className="drow">
      <span className="k">{label}</span>
      {editing ? (
        <span className={`v${saving ? " saving" : ""}`}>
          <input
            autoFocus
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
          />
          {error && <span className="err">{error}</span>}
        </span>
      ) : (
        <span className={`v${value ? "" : " empty"}`} onClick={startEdit}>
          {mono ? <b>{value || placeholder}</b> : value || placeholder}{" "}
          <span className="edit mono">edit</span>
        </span>
      )}
    </div>
  );
}
