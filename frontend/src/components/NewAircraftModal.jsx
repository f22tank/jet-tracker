import { useState } from "react";

const CONFIGURATIONS = ["single_prop", "multi_prop", "turboprop", "jet", "rotary", "glider"];
const ROLES = ["bizjet", "warbird", "bush_float", "homebuilt", "trainer", "agricultural"];

function humanize(value) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function NewAircraftModal({ initialIdentifier, onCreate, onCancel }) {
  const [category, setCategory] = useState("commercial");
  const [fields, setFields] = useState({
    registration: initialIdentifier || "",
    serial: initialIdentifier || "",
    type: "",
    msn: "",
    line_number: "",
    first_flight: "",
    variant: "",
    operator: "",
    home_base: "",
    manufacturer: "",
    configuration: "",
    role: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);

    const payload = { category };
    if (category === "military") {
      if (!fields.serial.trim()) return setError("Serial is required for military aircraft");
      payload.serial = fields.serial.trim();
      payload.variant = fields.variant || null;
      payload.operator = fields.operator || null;
      payload.home_base = fields.home_base || null;
      payload.type = fields.type || null;
    } else {
      if (!fields.registration.trim()) return setError("Registration is required");
      payload.registration = fields.registration.trim();
      payload.type = fields.type || null;
      if (category === "commercial") {
        payload.msn = fields.msn || null;
        payload.line_number = fields.line_number || null;
        payload.first_flight = fields.first_flight ? Number(fields.first_flight) : null;
      } else {
        payload.manufacturer = fields.manufacturer || null;
        payload.configuration = fields.configuration || null;
        payload.role = fields.role || null;
      }
    }

    setSaving(true);
    try {
      await onCreate(payload);
    } catch (err) {
      setError(err.message || "Failed to create aircraft");
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog dialog--wide" onClick={(e) => e.stopPropagation()}>
        <h4 style={{ color: "var(--hivis)" }}>+ New aircraft</h4>
        <p>This registration/serial hasn&rsquo;t been tagged before. Pick a category — it&rsquo;s set once and every future sighting of this airframe inherits it.</p>

        <form onSubmit={submit}>
          <div className="drow">
            <span className="k">Category</span>
            <span className="v" style={{ display: "flex", gap: 8 }}>
              {["commercial", "military", "ga"].map((c) => (
                <label key={c} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input type="radio" name="category" checked={category === c} onChange={() => setCategory(c)} />
                  {c === "ga" ? "GA" : humanize(c)}
                </label>
              ))}
            </span>
          </div>

          {category === "military" ? (
            <>
              <div className="drow">
                <span className="k">Serial</span>
                <span className="v"><input value={fields.serial} onChange={(e) => set("serial", e.target.value)} autoFocus /></span>
              </div>
              <div className="drow">
                <span className="k">Type</span>
                <span className="v"><input value={fields.type} onChange={(e) => set("type", e.target.value)} placeholder="F-16" /></span>
              </div>
              <div className="drow">
                <span className="k">Variant</span>
                <span className="v"><input value={fields.variant} onChange={(e) => set("variant", e.target.value)} placeholder="F-16C" /></span>
              </div>
              <div className="drow">
                <span className="k">Operator</span>
                <span className="v"><input value={fields.operator} onChange={(e) => set("operator", e.target.value)} placeholder="USAF" /></span>
              </div>
              <div className="drow">
                <span className="k">Home base</span>
                <span className="v"><input value={fields.home_base} onChange={(e) => set("home_base", e.target.value)} /></span>
              </div>
            </>
          ) : (
            <>
              <div className="drow">
                <span className="k">Reg</span>
                <span className="v"><input value={fields.registration} onChange={(e) => set("registration", e.target.value)} autoFocus /></span>
              </div>
              <div className="drow">
                <span className="k">Type</span>
                <span className="v"><input value={fields.type} onChange={(e) => set("type", e.target.value)} placeholder={category === "ga" ? "182" : "Boeing 737-800"} /></span>
              </div>
              {category === "commercial" ? (
                <>
                  <div className="drow">
                    <span className="k">MSN</span>
                    <span className="v"><input value={fields.msn} onChange={(e) => set("msn", e.target.value)} /></span>
                  </div>
                  <div className="drow">
                    <span className="k">Line #</span>
                    <span className="v"><input value={fields.line_number} onChange={(e) => set("line_number", e.target.value)} /></span>
                  </div>
                  <div className="drow">
                    <span className="k">1st flight</span>
                    <span className="v"><input value={fields.first_flight} onChange={(e) => set("first_flight", e.target.value)} placeholder="2001" /></span>
                  </div>
                </>
              ) : (
                <>
                  <div className="drow">
                    <span className="k">Manufacturer</span>
                    <span className="v"><input value={fields.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} placeholder="Cessna" /></span>
                  </div>
                  <div className="drow">
                    <span className="k">Configuration</span>
                    <span className="v">
                      <select value={fields.configuration} onChange={(e) => set("configuration", e.target.value)}>
                        <option value="">— optional —</option>
                        {CONFIGURATIONS.map((c) => (
                          <option key={c} value={c}>{humanize(c)}</option>
                        ))}
                      </select>
                    </span>
                  </div>
                  <div className="drow">
                    <span className="k">Role</span>
                    <span className="v">
                      <select value={fields.role} onChange={(e) => set("role", e.target.value)}>
                        <option value="">— optional —</option>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{humanize(r)}</option>
                        ))}
                      </select>
                    </span>
                  </div>
                </>
              )}
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
