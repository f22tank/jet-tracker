import { useEffect, useState } from "react";

export default function EditableField({
  id,
  label,
  value,
  displayValue,
  placeholder,
  onSave,
  mono = false,
  multiline = false,
  block = false,
  autoEdit = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function startEdit() {
    setDraft(value ?? "");
    setError(null);
    setEditing(true);
  }

  // Deep-link support (Upload tab "needs attention" rows): open straight into
  // edit mode when this field is the one the user was routed here to fix.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (autoEdit) startEdit();
  }, [autoEdit]);

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
    if (e.key === "Enter" && !multiline) commit();
    if (e.key === "Escape") setEditing(false);
  }

  const shown = value ? displayValue ?? value : placeholder;

  if (block) {
    return (
      <div className="editable-block">
        {label && <div className="eb-label">{label}</div>}
        {editing ? (
          <div className={`eb-body${saving ? " saving" : ""}`}>
            <textarea
              autoFocus
              value={draft}
              disabled={saving}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={onKeyDown}
            />
            {error && <div className="err">{error}</div>}
          </div>
        ) : (
          <div className={`eb-body eb-click${value ? "" : " empty"}`} onClick={startEdit}>
            {shown}
            <span className="edit mono">edit</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id={id} className={`drow${id ? " field-target" : ""}`}>
      <span className="k">{label}</span>
      {editing ? (
        <span className={`v${saving ? " saving" : ""}`}>
          {multiline ? (
            <textarea
              autoFocus
              rows={4}
              value={draft}
              disabled={saving}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={onKeyDown}
            />
          ) : (
            <input
              autoFocus
              value={draft}
              disabled={saving}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={onKeyDown}
            />
          )}
          {error && <span className="err">{error}</span>}
        </span>
      ) : (
        <span className={`v${value ? "" : " empty"}`} onClick={startEdit}>
          {mono ? <b>{shown}</b> : shown}{" "}
          <span className="edit mono">edit</span>
        </span>
      )}
    </div>
  );
}
