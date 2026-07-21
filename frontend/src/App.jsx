import { useEffect, useState } from "react";
import OperatorPage from "./components/OperatorPage.jsx";
import SpotPage from "./components/SpotPage.jsx";
import TrayPage from "./components/TrayPage.jsx";

function getSpotIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("spot")) || 1;
}

function getOperatorIdFromUrl() {
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

  let page;
  if (isTray) page = <TrayPage />;
  else if (isOperator) page = <OperatorPage operatorId={getOperatorIdFromUrl()} />;
  else page = <SpotPage spotId={getSpotIdFromUrl()} />;

  return (
    <>
      <div className="app-nav mono">
        <a
          href="/"
          className={!isTray && !isOperator ? "active" : ""}
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
      </div>
      {page}
    </>
  );
}
