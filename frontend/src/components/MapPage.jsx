import SpotMap from "./SpotMap.jsx";

export default function MapPage() {
  return (
    <div className="wrap">
      <header className="tray-head">
        <h1>Map</h1>
        <span className="mono count">everywhere you've caught something</span>
      </header>
      <SpotMap
        scope={{}}
        defaultFiltersOpen
        height="600px"
        emptyMessage="No spots plotted yet — tag a location or drop a pin to see it here."
      />
    </div>
  );
}
