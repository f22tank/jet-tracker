import SpotPage from "./components/SpotPage.jsx";

function getSpotIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("spot")) || 1;
}

export default function App() {
  return <SpotPage spotId={getSpotIdFromUrl()} />;
}
