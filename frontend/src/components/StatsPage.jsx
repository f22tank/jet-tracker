import { useEffect, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import { fetchStats } from "../api.js";
import { CHART_COLORS, barScaleOptions, chartBaseOptions } from "../chartSetup.js";

const CATEGORY_LABELS = { commercial: "Commercial", military: "Military", ga: "GA" };

function ChartCard({ title, children }) {
  return (
    <div className="ledger" style={{ marginTop: 24 }}>
      <div className="ledger-head">
        <h2>{title}</h2>
      </div>
      <div className="chart-card-body">{children}</div>
    </div>
  );
}

function yearBarData(spotsByYear) {
  return {
    labels: spotsByYear.map((y) => String(y.year)),
    datasets: [
      {
        label: "Spots",
        data: spotsByYear.map((y) => y.count),
        backgroundColor: "#4ade80",
        hoverBackgroundColor: "#22c55e",
        borderRadius: 3,
      },
    ],
  };
}

function horizontalBarData(items, labelKey = "name", valueKey = "spot_count") {
  return {
    labels: items.map((i) => i[labelKey]),
    datasets: [
      {
        label: "Spots",
        data: items.map((i) => i[valueKey]),
        backgroundColor: "#4ade80",
        hoverBackgroundColor: "#22c55e",
        borderRadius: 3,
      },
    ],
  };
}

function doughnutData(items, labelKey = "name", valueKey = "count") {
  return {
    labels: items.map((i) => i[labelKey]),
    datasets: [
      {
        data: items.map((i) => i[valueKey]),
        backgroundColor: CHART_COLORS,
        borderColor: "#1c2126",
        borderWidth: 2,
      },
    ],
  };
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

  const { headline, category_counts, type_counts, top_operators, top_locations, top_manufacturers, spots_by_year } =
    stats;

  const categoryData = doughnutData(
    category_counts.map((c) => ({ name: CATEGORY_LABELS[c.category] || c.category, count: c.count })),
  );
  const operatorPieData = doughnutData(top_operators, "name", "spot_count");

  const horizontalOptions = {
    ...chartBaseOptions,
    ...barScaleOptions,
    indexAxis: "y",
    plugins: { ...chartBaseOptions.plugins, legend: { display: false } },
  };
  const verticalOptions = {
    ...chartBaseOptions,
    ...barScaleOptions,
    plugins: { ...chartBaseOptions.plugins, legend: { display: false } },
  };
  const doughnutOptions = {
    ...chartBaseOptions,
    plugins: { ...chartBaseOptions.plugins, legend: { position: "right" } },
  };

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

      <ChartCard title="Spots by Year">
        {spots_by_year.length === 0 ? (
          <div className="state-msg mono">No data yet.</div>
        ) : (
          <Bar data={yearBarData(spots_by_year)} options={verticalOptions} />
        )}
      </ChartCard>

      <div className="chart-grid">
        <ChartCard title="By Category">
          {category_counts.length === 0 ? (
            <div className="state-msg mono">No data yet.</div>
          ) : (
            <Doughnut data={categoryData} options={doughnutOptions} />
          )}
        </ChartCard>

        <ChartCard title="By Aircraft Type">
          {type_counts.length === 0 ? (
            <div className="state-msg mono">No data yet.</div>
          ) : (
            <Doughnut data={doughnutData(type_counts)} options={doughnutOptions} />
          )}
        </ChartCard>

        <ChartCard title="By Operator">
          {top_operators.length === 0 ? (
            <div className="state-msg mono">No data yet.</div>
          ) : (
            <Doughnut data={operatorPieData} options={doughnutOptions} />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Top Locations">
        {top_locations.length === 0 ? (
          <div className="state-msg mono">No data yet.</div>
        ) : (
          <Bar data={horizontalBarData(top_locations)} options={horizontalOptions} />
        )}
      </ChartCard>

      <ChartCard title="Top Manufacturers">
        {top_manufacturers.length === 0 ? (
          <div className="state-msg mono">No data yet.</div>
        ) : (
          <Bar data={horizontalBarData(top_manufacturers)} options={horizontalOptions} />
        )}
      </ChartCard>
    </div>
  );
}
