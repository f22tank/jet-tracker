import { useEffect, useState } from "react";
import SpotPage from "./components/SpotPage.jsx";
import TrayPage from "./components/TrayPage.jsx";

function getSpotIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("spot")) || 1;
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

  return (
    <>
      <div className="app-nav mono">
        <a
          href="/"
          className={isTray ? "" : "active"}
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
      {isTray ? <TrayPage /> : <SpotPage spotId={getSpotIdFromUrl()} />}
    </>
  );
}
