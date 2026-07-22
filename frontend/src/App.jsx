import { useEffect, useState } from "react";
import AircraftPage from "./components/AircraftPage.jsx";
import HomePage from "./components/HomePage.jsx";
import LocationPage from "./components/LocationPage.jsx";
import LocationsListPage from "./components/LocationsListPage.jsx";
import MapPage from "./components/MapPage.jsx";
import OperatorPage from "./components/OperatorPage.jsx";
import SpotPage from "./components/SpotPage.jsx";
import TrayPage from "./components/TrayPage.jsx";

function getSpotIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("spot")) || 1;
}

function getIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id")) || null;
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigate(to) {
    window.history.pushState({}, "", to);
    setPath(to);
  }

  const isTray = path.startsWith("/tray");
  const isMap = path.startsWith("/map");
  const isOperator = path.startsWith("/operator");
  const isAircraft = path.startsWith("/aircraft");
  const isLocation = path.startsWith("/location") && !path.startsWith("/locations");
  const isLocationsList = path.startsWith("/locations");
  const isSpotPage = path.startsWith("/spot");
  const isHome = !isTray && !isMap && !isOperator && !isAircraft && !isLocation && !isLocationsList && !isSpotPage;

  let page;
  if (isTray) page = <TrayPage />;
  else if (isMap) page = <MapPage />;
  else if (isOperator) page = <OperatorPage operatorId={getIdFromUrl()} />;
  else if (isAircraft) page = <AircraftPage aircraftId={getIdFromUrl()} />;
  else if (isLocation) page = <LocationPage locationId={getIdFromUrl()} />;
  else if (isLocationsList) page = <LocationsListPage />;
  else if (isSpotPage) page = <SpotPage spotId={getSpotIdFromUrl()} />;
  else page = <HomePage />;

  return (
    <>
      <div className="app-nav mono">
        <a
          href="/"
          className={isHome ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
        >
          Home
        </a>
        <a
          href="/map"
          className={isMap ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            navigate("/map");
          }}
        >
          Map
        </a>
        <a
          href="/tray"
          className={isTray ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            navigate("/tray");
          }}
        >
          Tray
        </a>
        <a
          href="/locations"
          className={isLocationsList ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            navigate("/locations");
          }}
        >
          Locations
        </a>
      </div>
      {page}
    </>
  );
}
