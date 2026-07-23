import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

// Same blue marker style as the main map (SpotMap.jsx) — kept as its own small
// divIcon here rather than a shared import since this is a standalone Leaflet
// instance, not a SpotMap-fed one (see below).
const pinIcon = L.divIcon({
  className: "spot-marker",
  html: '<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="#3b82f6" fill-opacity="0.25"/><circle cx="9" cy="9" r="4" fill="#3b82f6" stroke="#12161a" stroke-width="1.5"/></svg>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** A tiny, non-interactive single-point map for a spot's own coordinates. Spots
 * without a linked Location can still carry a raw dropped pin (spot_lat/spot_lon)
 * with no location_id to filter by, so the reusable SpotMap (which fetches by
 * scope — aircraft_id/operator_id/location_id/etc.) can't represent "just this
 * one point." Location pages have a real location_id and use SpotMap directly
 * instead of this component. */
export default function MiniMap({ lat, lon }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (lat == null || lon == null || !elRef.current) return;

    const map = L.map(elRef.current, {
      center: [lat, lon],
      zoom: 12,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    L.marker([lat, lon], { icon: pinIcon }).addTo(map);
    mapRef.current = map;

    // Leaflet measures its container at init time; mounted inside a flex/grid
    // cell it can read zero height on the first paint, so force one recalc.
    const t = setTimeout(() => map.invalidateSize(), 0);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lon]);

  if (lat == null || lon == null) return null;

  return (
    <div className="map">
      <div ref={elRef} style={{ position: "absolute", inset: 0 }} />
      <div className="map-coords mono">
        {lat.toFixed(4)}, {lon.toFixed(4)}
      </div>
    </div>
  );
}
