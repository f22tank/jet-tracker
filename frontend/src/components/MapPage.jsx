import SpotMap from "./SpotMap.jsx";

export default function MapPage() {
  return (
    <div className="map-page">
      <header className="map-page-head">
        <h1>Map</h1>
        <span className="mono count">everywhere you've caught something</span>
      </header>
      <SpotMap
        scope={{}}
        defaultFiltersOpen
        overlayControls
        height="calc(100vh - 150px)"
        emptyMessage="No spots plotted yet — tag a location or drop a pin to see it here."
      />
    </div>
  );
}
