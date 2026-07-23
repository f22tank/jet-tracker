export function humanize(value) {
  if (!value) return null;
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Manufacturer for a full Aircraft object — prefers the linked Manufacturer
 * entity, falls back to the legacy GA free-text field so aircraft tagged
 * before that entity existed still show one. */
export function aircraftManufacturerName(aircraft) {
  return aircraft?.manufacturer_entity?.name || aircraft?.manufacturer || null;
}

/** "Airbus A320" when manufacturer is known, plain "A320" when it's null
 * (unparsed rows from the migration) — never a stray separator either way. */
export function formatTypeLine(manufacturerName, type) {
  return [manufacturerName, type].filter(Boolean).join(" ") || null;
}

/** Category-conditional type line, shared by the spotting page and the aircraft page.
 * Field order reads naturally: manufacturer+model first, then the rest —
 * military shows manufacturer+variant, operator, home_base;
 * ga shows manufacturer+type, configuration, role;
 * commercial shows manufacturer+type, msn, line_number, first_flight. */
export default function AircraftTypeLine({ aircraft }) {
  const parts = [];
  const mfg = aircraftManufacturerName(aircraft);

  if (aircraft.category === "military") {
    const model = formatTypeLine(mfg, aircraft.variant);
    if (model) parts.push(<b key="model">{model}</b>);
    if (aircraft.operator) parts.push(<span key="operator">{aircraft.operator}</span>);
    if (aircraft.home_base) parts.push(<span key="home_base">{aircraft.home_base}</span>);
  } else if (aircraft.category === "ga") {
    const model = formatTypeLine(mfg, aircraft.type);
    if (model) parts.push(<b key="model">{model}</b>);
    if (aircraft.configuration) parts.push(<span key="configuration">{humanize(aircraft.configuration)}</span>);
    if (aircraft.role) parts.push(<span key="role">{humanize(aircraft.role)}</span>);
  } else {
    const model = formatTypeLine(mfg, aircraft.type);
    if (model) parts.push(<b key="type">{model}</b>);
    if (aircraft.msn)
      parts.push(
        <span key="msn">
          msn <b>{aircraft.msn}</b>
        </span>
      );
    if (aircraft.line_number)
      parts.push(
        <span key="line_number">
          ln <b>{aircraft.line_number}</b>
        </span>
      );
    if (aircraft.first_flight)
      parts.push(
        <span key="first_flight">
          first flight <b>{aircraft.first_flight}</b>
        </span>
      );
  }

  return (
    <div className="type-line">
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="sep">·</span>}
          {part}
        </span>
      ))}
    </div>
  );
}
