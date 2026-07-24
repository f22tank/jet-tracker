import { useState } from "react";
import OperatorTagInput from "./OperatorTagInput.jsx";

/** Editable "parent operator" link — same pattern as ManufacturerField (FK
 * entity, editing always goes through the picker). `type` scopes the picker to
 * the current operator's own type, since a parent only makes sense within it
 * (a squadron's parent is a wing, not an airline). */
export default function ParentOperatorField({ parent, type, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function commit(operatorId) {
    setSaving(true);
    setError(null);
    try {
      await onSave(operatorId);
      setEditing(false);
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="drow">
      <span className="k">Parent</span>
      {editing ? (
        <span className={`v${saving ? " saving" : ""}`}>
          <OperatorTagInput type={type} buttonLabel="Set" onTag={(ref) => commit(ref.operator_id)} disabled={saving} />
          {error && <span className="err">{error}</span>}
        </span>
      ) : (
        <span className={`v${parent ? "" : " empty"}`} onClick={() => setEditing(true)}>
          {parent ? (
            <a href={`/operator?id=${parent.id}`} className="operator-link" onClick={(e) => e.stopPropagation()}>
              {parent.name}
            </a>
          ) : (
            "no parent"
          )}{" "}
          <span className="edit mono">edit</span>
          {parent && (
            <span
              className="edit mono"
              style={{ marginLeft: 8 }}
              onClick={(e) => {
                e.stopPropagation();
                commit(null);
              }}
            >
              clear
            </span>
          )}
        </span>
      )}
    </div>
  );
}
