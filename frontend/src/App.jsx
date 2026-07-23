import { useEffect, useState } from "react";
import AircraftListPage from "./components/AircraftListPage.jsx";
import AircraftPage from "./components/AircraftPage.jsx";
import AllSpotsPage from "./components/AllSpotsPage.jsx";
import HomePage from "./components/HomePage.jsx";
import LocationPage from "./components/LocationPage.jsx";
import LocationsListPage from "./components/LocationsListPage.jsx";
import ManufacturerPage from "./components/ManufacturerPage.jsx";
import ManufacturersListPage from "./components/ManufacturersListPage.jsx";
import MapPage from "./components/MapPage.jsx";
import OperatorPage from "./components/OperatorPage.jsx";
import OperatorsListPage from "./components/OperatorsListPage.jsx";
import SpotPage from "./components/SpotPage.jsx";
import StatsPage from "./components/StatsPage.jsx";
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
  const isStats = path.startsWith("/stats");
  const isAllSpots = path.startsWith("/spots");
  const isAircraftList = path.startsWith("/aircraft-list");
  const isAircraftDetail = path.startsWith("/aircraft") && !isAircraftList;
  const isOperatorsList = path.startsWith("/operators");
  const isOperatorDetail = path.startsWith("/operator") && !isOperatorsList;
  const isManufacturersList = path.startsWith("/manufacturers");
  const isManufacturerDetail = path.startsWith("/manufacturer") && !isManufacturersList;
  const isLocationsList = path.startsWith("/locations");
  const isLocation = path.startsWith("/location") && !isLocationsList;
  // "/spot" (singular, one spot's detail page) vs "/spots" (plural, the All Spots tab)
  const isSpotPage = path.startsWith("/spot") && !isAllSpots;
  const isHome =
    !isTray &&
    !isMap &&
    !isStats &&
    !isAllSpots &&
    !isAircraftList &&
    !isAircraftDetail &&
    !isOperatorsList &&
    !isOperatorDetail &&
    !isManufacturersList &&
    !isManufacturerDetail &&
    !isLocationsList &&
    !isLocation &&
    !isSpotPage;

  let page;
  if (isTray) page = <TrayPage />;
  else if (isMap) page = <MapPage />;
  else if (isStats) page = <StatsPage />;
  else if (isAllSpots) page = <AllSpotsPage />;
  else if (isAircraftList) page = <AircraftListPage />;
  else if (isAircraftDetail) page = <AircraftPage aircraftId={getIdFromUrl()} />;
  else if (isOperatorsList) page = <OperatorsListPage />;
  else if (isOperatorDetail) page = <OperatorPage operatorId={getIdFromUrl()} />;
  else if (isManufacturersList) page = <ManufacturersListPage />;
  else if (isManufacturerDetail) page = <ManufacturerPage manufacturerId={getIdFromUrl()} />;
  else if (isLocationsList) page = <LocationsListPage />;
  else if (isLocation) page = <LocationPage locationId={getIdFromUrl()} />;
  else if (isSpotPage) page = <SpotPage spotId={getSpotIdFromUrl()} />;
  else page = <HomePage />;

  function NavLink({ to, active, children }) {
    return (
      <a
        href={to}
        className={active ? "active" : ""}
        onClick={(e) => {
          e.preventDefault();
          navigate(to);
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <>
      <div className="app-nav mono">
        <NavLink to="/" active={isHome}>
          Home
        </NavLink>
        <NavLink to="/stats" active={isStats}>
          Stats
        </NavLink>
        <NavLink to="/map" active={isMap}>
          Map
        </NavLink>
        <NavLink to="/spots" active={isAllSpots}>
          All Spots
        </NavLink>
        <NavLink to="/aircraft-list" active={isAircraftList || isAircraftDetail}>
          Aircraft
        </NavLink>
        <NavLink to="/operators" active={isOperatorsList || isOperatorDetail}>
          Operators
        </NavLink>
        <NavLink to="/locations" active={isLocationsList || isLocation}>
          Locations
        </NavLink>
        <NavLink to="/manufacturers" active={isManufacturersList || isManufacturerDetail}>
          Manufacturers
        </NavLink>
        <NavLink to="/tray" active={isTray}>
          Upload
        </NavLink>
      </div>
      {page}
    </>
  );
}
