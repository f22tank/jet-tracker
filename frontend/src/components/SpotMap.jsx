import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.heat";
import { useEffect, useRef, useState } from "react";
import { fetchMapFacets, fetchMapSpots, photoUrl } from "../api.js";

// Bundler fix: Leaflet's default icon URLs are relative and break under Vite/webpack.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const CATEGORY_LABELS = { commercial: "Commercial", military: "Military", ga: "GA" };

function buildPopupContent(group) {
  const container = document.createElement("div");
  container.className = "map-popup";

  if (group.length === 1) {
    const s = group[0];
    if (s.cover_thumbnail) {
      const img = document.createElement("img");
      img.src = photoUrl(s.cover_thumbnail);
      container.appendChild(img);
    }
    const reg = document.createElement("div");
    reg.className = "mp-reg";
    reg.textContent = s.aircraft_identifier || "—";
    container.appendChild(reg);

    const meta = document.createElement("div");
    meta.className = "mp-meta";
    meta.textContent = [s.date, s.operator_label].filter(Boolean).join(" · ");
    container.appendChild(meta);

    const link = document.createElement("a");
    link.href = `/spot?spot=${s.id}`;
    link.textContent = "View spot →";
    container.appendChild(link);
  } else {
    const heading = document.createElement("div");
    heading.className = "mp-reg";
    heading.textContent = `${group.length} spots here`;
    container.appendChild(heading);

    const list = document.createElement("div");
    list.className = "mp-list";
    for (const s of group) {
      const link = document.createElement("a");
      link.href = `/spot?spot=${s.id}`;
      link.textContent = `${s.aircraft_identifier || "?"} · ${s.date}`;
      list.appendChild(link);
    }
    container.appendChild(list);
  }
  return container;
}

/** The one reusable map: fed a `scope` (base params always merged into the query —
 * {} for the big map, {aircraft_id} or {operator_id} for the per-page placements).
 * Owns its own filter state, server-side fetch, and cluster/heat toggle — every
 * placement is just a different scope, not a different component. */
export default function SpotMap({ scope = {}, hiddenFilters = [], defaultFiltersOpen = false, emptyMessage, height }) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const clusterLayerRef = useRef(null);
  const heatLayerRef = useRef(null);

  const [viewMode, setViewMode] = useState("cluster");
  const [filtersOpen, setFiltersOpen] = useState(defaultFiltersOpen);
  const [facets, setFacets] = useState({ aircraft_types: [], operators: [], locations: [] });

  const [category, setCategory] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [aircraftType, setAircraftType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [locationId, setLocationId] = useState("");

  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMapFacets().then(setFacets).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {
      category: category || undefined,
      operator_id: operatorId || undefined,
      aircraft_type: aircraftType || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      location_id: locationId || undefined,
      ...scope, // fixed scope always wins over the (possibly hidden) local filter
    };
    fetchMapSpots(params)
      .then(setSpots)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.aircraft_id, scope.operator_id, category, operatorId, aircraftType, dateFrom, dateTo, locationId]);

  // Map instance — created once.
  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;
    const map = L.map(mapElRef.current, { center: [39, -98], zoom: 4 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw markers/heat whenever the spot set or view mode changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (clusterLayerRef.current) {
      map.removeLayer(clusterLayerRef.current);
      clusterLayerRef.current = null;
    }
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (spots.length === 0) return;

    if (viewMode === "heat") {
      const points = spots.map((s) => [s.lat, s.lon, 1]);
      heatLayerRef.current = L.heatLayer(points, { radius: 35, blur: 25, max: 1, minOpacity: 0.4 }).addTo(map);
    } else {
      const groups = new Map();
      for (const s of spots) {
        const key = `${s.lat.toFixed(5)},${s.lon.toFixed(5)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(s);
      }
      const cluster = L.markerClusterGroup();
      for (const [key, group] of groups) {
        const [lat, lon] = key.split(",").map(Number);
        const marker = L.marker([lat, lon]);
        marker.bindPopup(buildPopupContent(group));
        cluster.addLayer(marker);
      }
      cluster.addTo(map);
      clusterLayerRef.current = cluster;
    }

    const bounds = L.latLngBounds(spots.map((s) => [s.lat, s.lon]));
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.2));
  }, [spots, viewMode]);

  function clearFilters() {
    setCategory("");
    setOperatorId("");
    setAircraftType("");
    setDateFrom("");
    setDateTo("");
    setLocationId("");
  }

  const showFilter = (key) => !hiddenFilters.includes(key);
  const anyFilterActive = category || operatorId || aircraftType || dateFrom || dateTo || locationId;

  return (
    <div className="spot-map">
      <div className="map-toolbar">
        <div className="mode-switch">
          <button type="button" className={viewMode === "cluster" ? "active" : ""} onClick={() => setViewMode("cluster")}>
            Cluster
          </button>
          <button type="button" className={viewMode === "heat" ? "active" : ""} onClick={() => setViewMode("heat")}>
            Heat
          </button>
        </div>
        <button type="button" className="filters-toggle mono" onClick={() => setFiltersOpen((o) => !o)}>
          Filters{anyFilterActive ? " •" : ""} {filtersOpen ? "▾" : "▸"}
        </button>
      </div>

      {filtersOpen && (
        <div className="map-filters">
          {showFilter("category") && (
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
          {showFilter("operator") && (
            <select value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
              <option value="">All operators</option>
              {facets.operators.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.name}
                </option>
              ))}
            </select>
          )}
          {showFilter("type") && (
            <select value={aircraftType} onChange={(e) => setAircraftType(e.target.value)}>
              <option value="">All types</option>
              {facets.aircraft_types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          {showFilter("date") && (
            <>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To" />
            </>
          )}
          {showFilter("location") && (
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">All locations</option>
              {facets.locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          )}
          {anyFilterActive && (
            <button type="button" className="cancel" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>
      )}

      <div ref={mapElRef} className="map-canvas" style={height ? { height } : undefined} />

      {!loading && spots.length === 0 && (
        <div className="state-msg mono map-empty">{emptyMessage || "No plottable spots yet."}</div>
      )}
    </div>
  );
}
