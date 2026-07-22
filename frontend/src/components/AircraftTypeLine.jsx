export function humanize(value) {
  if (!value) return null;
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Category-conditional type line, shared by the spotting page and the aircraft page:
 * military shows variant+operator+home_base; ga shows manufacturer+type+configuration+role;
 * commercial shows type+msn+line_number+first_flight. */
export default function AircraftTypeLine({ aircraft }) {
  const parts = [];
  if (aircraft.category === "military") {
    if (aircraft.variant) parts.push(<b key="variant">{aircraft.variant}</b>);
    if (aircraft.operator) parts.push(<span key="operator">{aircraft.operator}</span>);
    if (aircraft.home_base) parts.push(<span key="home_base">{aircraft.home_base}</span>);
  } else if (aircraft.category === "ga") {
    const model = [aircraft.manufacturer, aircraft.type].filter(Boolean).join(" ");
    if (model) parts.push(<b key="model">{model}</b>);
    if (aircraft.configuration) parts.push(<span key="configuration">{humanize(aircraft.configuration)}</span>);
    if (aircraft.role) parts.push(<span key="role">{humanize(aircraft.role)}</span>);
  } else {
    if (aircraft.type) parts.push(<b key="type">{aircraft.type}</b>);
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
