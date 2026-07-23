import { useEffect, useState } from "react";
import ManufacturerTagInput from "./ManufacturerTagInput.jsx";

/** Displays an aircraft's linked Manufacturer (name-as-link to its page), or an
 * "add manufacturer" affordance — editing always goes through the picker,
 * never free text, since this is an entity FK. */
export default function ManufacturerField({ id, manufacturerEntity, onSave, autoEdit = false }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (autoEdit) setEditing(true);
  }, [autoEdit]);

  async function handleTag(name) {
    setSaving(true);
    setError(null);
    try {
      await onSave(name);
      setEditing(false);
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id={id} className={`drow${id ? " field-target" : ""}`}>
      <span className="k">Manufacturer</span>
      {editing ? (
        <span className={`v${saving ? " saving" : ""}`}>
          <ManufacturerTagInput onTag={handleTag} disabled={saving} buttonLabel="Set" />
          {error && <span className="err">{error}</span>}
        </span>
      ) : (
        <span className={`v${manufacturerEntity ? "" : " empty"}`} onClick={() => setEditing(true)}>
          {manufacturerEntity ? (
            <a
              href={`/manufacturer?id=${manufacturerEntity.id}`}
              className="operator-link"
              onClick={(e) => e.stopPropagation()}
            >
              {manufacturerEntity.name}
            </a>
          ) : (
            "add manufacturer"
          )}{" "}
          <span className="edit mono">edit</span>
        </span>
      )}
    </div>
  );
}
