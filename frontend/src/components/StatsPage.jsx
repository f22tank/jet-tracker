import { useEffect, useState } from "react";
import { fetchStats } from "../api.js";

const CATEGORY_LABELS = { commercial: "Commercial", military: "Military", ga: "GA" };

function RankedList({ title, items, linkPrefix }) {
  const max = Math.max(1, ...items.map((i) => i.spot_count));
  return (
    <div className="ledger" style={{ marginTop: 24 }}>
      <div className="ledger-head">
        <h2>{title}</h2>
      </div>
      <div style={{ padding: "10px 18px" }}>
        {items.length === 0 && <div className="state-msg mono">No data yet.</div>}
        {items.map((item) => (
          <a key={item.id} href={`${linkPrefix}${item.id}`} className="stat-bar-row">
            <span className="stat-bar-label">{item.name}</span>
            <span className="stat-bar-track">
              <span className="stat-bar-fill" style={{ width: `${(item.spot_count / max) * 100}%` }} />
            </span>
            <span className="stat-bar-count mono">{item.spot_count}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((err) => setLoadError(err.message || "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="state-msg mono">Loading stats…</div>;
  if (loadError) return <div className="state-msg error mono">{loadError}</div>;
  if (!stats) return null;

  const { headline, category_counts, top_operators, top_locations, top_manufacturers, spots_by_year } = stats;
  const maxYearCount = Math.max(1, ...spots_by_year.map((y) => y.count));

  return (
    <div className="wrap">
      <header className="tray-head">
        <h1>Stats</h1>
      </header>

      <div className="ledger">
        <div className="ledger-head">
          <h2>Headline</h2>
        </div>
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
      </div>

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>By Category</h2>
        </div>
        <div className="op-stats" style={{ gridTemplateColumns: `repeat(${category_counts.length || 1}, 1fr)` }}>
          {category_counts.map((c) => (
            <div className="op-stat" key={c.category}>
              <div className="op-stat-num mono">{c.count}</div>
              <div className="op-stat-label">{CATEGORY_LABELS[c.category] || c.category}</div>
            </div>
          ))}
        </div>
      </div>

      <RankedList title="Top Operators" items={top_operators} linkPrefix="/operator?id=" />
      <RankedList title="Top Locations" items={top_locations} linkPrefix="/location?id=" />
      <RankedList title="Top Manufacturers" items={top_manufacturers} linkPrefix="/manufacturer?id=" />

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Spots by Year</h2>
        </div>
        <div style={{ padding: "10px 18px" }}>
          {spots_by_year.length === 0 && <div className="state-msg mono">No data yet.</div>}
          {spots_by_year.map((y) => (
            <div key={y.year} className="stat-bar-row">
              <span className="stat-bar-label mono">{y.year}</span>
              <span className="stat-bar-track">
                <span className="stat-bar-fill" style={{ width: `${(y.count / maxYearCount) * 100}%` }} />
              </span>
              <span className="stat-bar-count mono">{y.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
