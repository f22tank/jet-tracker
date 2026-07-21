import { useState } from "react";
import { photoUrl } from "../api.js";
import OperatorTagInput from "./OperatorTagInput.jsx";

/** Displays a spot's linked Operator (logo/patch + name-as-link), or the legacy
 * free-text string as a read-only fallback if it hasn't been migrated/tagged yet.
 * Editing always goes through the filtered operator picker, never free text. */
export default function OperatorField({ label, type, operator, legacyValue, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleTag(ref) {
    setSaving(true);
    setError(null);
    try {
      await onSave(ref.operator_id);
      setEditing(false);
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="drow">
      <span className="k">{label}</span>
      {editing ? (
        <span className={`v${saving ? " saving" : ""}`}>
          <OperatorTagInput type={type} onTag={handleTag} disabled={saving} buttonLabel="Set" />
          {error && <span className="err">{error}</span>}
        </span>
      ) : operator ? (
        <span className="v operator-v" onClick={() => setEditing(true)}>
          {operator.image && <img className="operator-thumb" src={photoUrl(operator.image)} alt="" />}
          <a href={`/operator?id=${operator.id}`} className="operator-link" onClick={(e) => e.stopPropagation()}>
            {operator.name}
          </a>
          <span className="edit mono">edit</span>
        </span>
      ) : (
        <span className={`v${legacyValue ? "" : " empty"}`} onClick={() => setEditing(true)}>
          {legacyValue || `add ${label.toLowerCase()}`} <span className="edit mono">edit</span>
        </span>
      )}
    </div>
  );
}
