import { useEffect, useState } from "react";
import LocationPage from "./components/LocationPage.jsx";
import LocationsListPage from "./components/LocationsListPage.jsx";
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
  const isOperator = path.startsWith("/operator");
  const isLocation = path.startsWith("/location") && !path.startsWith("/locations");
  const isLocationsList = path.startsWith("/locations");
  const isSpot = !isTray && !isOperator && !isLocation && !isLocationsList;

  let page;
  if (isTray) page = <TrayPage />;
  else if (isOperator) page = <OperatorPage operatorId={getIdFromUrl()} />;
  else if (isLocation) page = <LocationPage locationId={getIdFromUrl()} />;
  else if (isLocationsList) page = <LocationsListPage />;
  else page = <SpotPage spotId={getSpotIdFromUrl()} />;

  return (
    <>
      <div className="app-nav mono">
        <a
          href="/"
          className={isSpot ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
        >
          Spots
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
