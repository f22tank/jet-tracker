/** Plots whichever coordinates apply — a defined Location's lat/lon, or a spot's
 * raw pin. No coordinates (blank spot, or a Location with none) simply renders
 * nothing, same "degrade gracefully" rule the future full map view will follow. */
export default function MiniMap({ lat, lon }) {
  if (lat == null || lon == null) return null;

  return (
    <div className="map">
      <svg viewBox="0 0 300 120" preserveAspectRatio="none">
        <rect width="300" height="120" fill="#161b20" />
        <path d="M0 78 L110 62 L200 70 L300 55" stroke="#2e363e" strokeWidth="1.5" fill="none" />
      </svg>
      <div className="pin">
        <svg width="20" height="26" viewBox="0 0 20 26">
          <path d="M10 0C4.5 0 0 4.5 0 10c0 7 10 16 10 16s10-9 10-16c0-5.5-4.5-10-10-10z" fill="#f4d03f" />
          <circle cx="10" cy="10" r="4" fill="#1c2126" />
        </svg>
      </div>
      <div className="map-coords mono">
        {lat.toFixed(4)}, {lon.toFixed(4)}
      </div>
    </div>
  );
}
