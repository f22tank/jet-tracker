import { useEffect, useState } from "react";
import { fetchRecentLocations, fetchRecentSpots, fetchStats, photoUrl } from "../api.js";
import { formatDate } from "../format.js";

export default function HomePage() {
  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const [recentLocations, setRecentLocations] = useState([]);
  const [recentLocationsLoading, setRecentLocationsLoading] = useState(true);

  const [headline, setHeadline] = useState(null);

  useEffect(() => {
    fetchRecentSpots(12)
      .then(setRecent)
      .finally(() => setRecentLoading(false));
  }, []);

  useEffect(() => {
    fetchRecentLocations(8)
      .then(setRecentLocations)
      .finally(() => setRecentLocationsLoading(false));
  }, []);

  useEffect(() => {
    fetchStats().then((s) => setHeadline(s.headline));
  }, []);

  return (
    <div className="wrap home">
      <header className="home-head">
        <h1>Jet Tracker</h1>
      </header>

      {headline && (
        <section className="home-section">
          <div className="op-stats cols-4">
            <div className="op-stat">
              <div className="op-stat-num mono">{headline.total_spots}</div>
              <div className="op-stat-label">spot{headline.total_spots === 1 ? "" : "s"}</div>
            </div>
            <div className="op-stat">
              <div className="op-stat-num mono">{headline.distinct_aircraft}</div>
              <div className="op-stat-label">distinct aircraft</div>
            </div>
            <div className="op-stat">
              <div className="op-stat-num mono">{headline.distinct_operators}</div>
              <div className="op-stat-label">distinct operators</div>
            </div>
            <div className="op-stat">
              <div className="op-stat-num mono">{headline.distinct_locations}</div>
              <div className="op-stat-label">distinct locations</div>
            </div>
          </div>
        </section>
      )}

      <section className="home-section">
        <h2>Recent</h2>
        {recentLoading ? (
          <div className="state-msg mono">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="empty-carousel">
            No spots yet — head to the <a href="/tray">Tray</a> to upload your first photos.
          </div>
        ) : (
          <div className="carousel">
            {recent.map((card) => (
              <a key={card.id} href={`/spot?spot=${card.id}`} className="carousel-card">
                <div className="cc-im">
                  {card.cover_thumbnail ? (
                    <img src={photoUrl(card.cover_thumbnail)} alt="" />
                  ) : (
                    <div className="cc-im-empty">✈</div>
                  )}
                </div>
                <div className="cc-reg mono">{card.aircraft_identifier}</div>
                <div className="cc-meta">
                  <span className="cc-date mono">{formatDate(card.date)}</span>
                  {card.operator_name && (
                    <span className="cc-operator">
                      {card.operator_image && <img src={photoUrl(card.operator_image)} alt="" />}
                      {card.operator_name}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
        <h2>Recent Locations</h2>
        {recentLocationsLoading ? (
          <div className="state-msg mono">Loading…</div>
        ) : recentLocations.length === 0 ? (
          <div className="empty-carousel">No locations tagged yet.</div>
        ) : (
          <div className="carousel">
            {recentLocations.map((loc) => (
              <a key={loc.id} href={`/location?id=${loc.id}`} className="carousel-card">
                <div className="cc-im">
                  {loc.cover_thumbnail ? (
                    <img src={photoUrl(loc.cover_thumbnail)} alt="" />
                  ) : (
                    <div className="cc-im-empty">◎</div>
                  )}
                </div>
                <div className="cc-reg">{loc.name}</div>
                <div className="cc-meta">
                  <span className="cc-date mono">
                    {[loc.icao, loc.iata].filter(Boolean).join(" / ") || `${loc.spot_count} spot${loc.spot_count === 1 ? "" : "s"}`}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
