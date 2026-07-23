import { useEffect, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import { fetchOperator, photoUrl, removeOperatorLogo, updateOperator, uploadOperatorLogo } from "../api.js";
import { CHART_COLORS, CHART_SERIES_COLOR, CHART_SERIES_HOVER_COLOR, barScaleOptions, chartBaseOptions } from "../chartSetup.js";
import { formatDate } from "../format.js";
import AssetImageUpload from "./AssetImageUpload.jsx";
import { formatTypeLine } from "./AircraftTypeLine.jsx";
import DateRangeStat from "./DateRangeStat.jsx";
import EditableField from "./EditableField.jsx";
import SpotMap from "./SpotMap.jsx";

const doughnutOptions = {
  ...chartBaseOptions,
  plugins: { ...chartBaseOptions.plugins, legend: { position: "right" } },
};
const horizontalBarOptions = {
  ...chartBaseOptions,
  ...barScaleOptions,
  indexAxis: "y",
  plugins: { ...chartBaseOptions.plugins, legend: { display: false } },
};
const verticalBarOptions = {
  ...chartBaseOptions,
  ...barScaleOptions,
  plugins: { ...chartBaseOptions.plugins, legend: { display: false } },
};

function typeDoughnutData(topTypes) {
  return {
    labels: topTypes.map((t) => t.name),
    datasets: [{ data: topTypes.map((t) => t.count), backgroundColor: CHART_COLORS, borderColor: "#1c2126", borderWidth: 2 }],
  };
}

function locationBarData(topLocations) {
  return {
    labels: topLocations.map((l) => l.name),
    datasets: [
      { label: "Spots", data: topLocations.map((l) => l.spot_count), backgroundColor: CHART_SERIES_COLOR, hoverBackgroundColor: CHART_SERIES_HOVER_COLOR, borderRadius: 3 },
    ],
  };
}

function yearBarData(spotsByYear) {
  return {
    labels: spotsByYear.map((y) => String(y.year)),
    datasets: [
      { label: "Spots", data: spotsByYear.map((y) => y.count), backgroundColor: CHART_SERIES_COLOR, hoverBackgroundColor: CHART_SERIES_HOVER_COLOR, borderRadius: 3 },
    ],
  };
}

function DetailLine({ operator }) {
  const parts =
    operator.type === "airline"
      ? [operator.iata, operator.icao, operator.callsign].filter(Boolean)
      : [operator.branch, operator.tail_code, operator.home_base].filter(Boolean);

  if (parts.length === 0) return null;
  return (
    <div className="type-line">
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="sep">·</span>}
          {part}
        </span>
      ))}
    </div>
  );
}

export default function OperatorPage({ operatorId }) {
  const [operator, setOperator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetchOperator(operatorId)
      .then(setOperator)
      .catch((err) => setLoadError(err.message || "Failed to load operator"))
      .finally(() => setLoading(false));
  }, [operatorId]);

  if (loading) return <div className="state-msg mono">Loading operator…</div>;
  if (loadError) return <div className="state-msg error mono">{loadError}</div>;
  if (!operator) return null;

  const { stats } = operator;

  async function handleLogoUpload(file) {
    const updated = await uploadOperatorLogo(operatorId, file);
    setOperator((prev) => ({ ...prev, image: updated.image }));
  }

  async function handleLogoRemove() {
    const updated = await removeOperatorLogo(operatorId);
    setOperator((prev) => ({ ...prev, image: updated.image }));
  }

  async function saveBio(value) {
    const updated = await updateOperator(operatorId, { bio: value });
    setOperator(updated);
  }

  return (
    <div className="wrap">
      <header className="spot">
        {operator.parent && (
          <div className="op-breadcrumb mono">
            <a href={`/operator?id=${operator.parent.id}`}>{operator.parent.name}</a>
            <span className="sep">/</span>
            <span>{operator.name}</span>
          </div>
        )}
        <div className="reg-row">
          <AssetImageUpload
            className="asset-upload--op-logo"
            src={operator.image ? photoUrl(operator.image) : null}
            onUpload={handleLogoUpload}
            onRemove={operator.image ? handleLogoRemove : null}
            placeholder="+ Logo"
            alt={operator.name}
          />
          <div className="date-block">
            <span className="dl">{operator.type === "airline" ? "Airline" : "Military Unit"}</span>
            <span className="d" style={{ fontSize: 28 }}>
              {operator.name}
            </span>
          </div>
        </div>
        <DetailLine operator={operator} />
      </header>

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Stats</h2>
        </div>
        <div className="op-stats">
          <div className="op-stat">
            <div className="op-stat-num mono">{stats.spot_count}</div>
            <div className="op-stat-label">spot{stats.spot_count === 1 ? "" : "s"}</div>
          </div>
          <div className="op-stat">
            <div className="op-stat-num mono">{stats.aircraft_count}</div>
            <div className="op-stat-label">distinct aircraft</div>
          </div>
          <div className="op-stat">
            <DateRangeStat firstDate={stats.first_date} lastDate={stats.last_date} />
            <div className="op-stat-label">date range</div>
          </div>
        </div>
      </div>

      {stats.spots_by_year.length > 0 && (
        <div className="ledger" style={{ marginTop: 24 }}>
          <div className="ledger-head">
            <h2>Spots Over Time</h2>
          </div>
          <div className="chart-card-body">
            <Bar data={yearBarData(stats.spots_by_year)} options={verticalBarOptions} />
          </div>
        </div>
      )}

      {(stats.top_types.length > 0 || stats.top_locations.length > 0) && (
        <div className="chart-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {stats.top_types.length > 0 && (
            <div className="ledger">
              <div className="ledger-head">
                <h2>Top Aircraft Types</h2>
              </div>
              <div className="chart-card-body">
                <Doughnut data={typeDoughnutData(stats.top_types)} options={doughnutOptions} />
              </div>
            </div>
          )}
          {stats.top_locations.length > 0 && (
            <div className="ledger">
              <div className="ledger-head">
                <h2>Top Locations</h2>
              </div>
              <div className="chart-card-body">
                <Bar data={locationBarData(stats.top_locations)} options={horizontalBarOptions} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Bio</h2>
        </div>
        <div style={{ padding: "14px 18px" }}>
          <EditableField
            block
            value={operator.bio}
            placeholder="add a write-up — history, notable aircraft, whatever"
            onSave={saveBio}
            multiline
          />
        </div>
      </div>

      {operator.recent_photos.length > 0 && (
        <div className="ledger" style={{ marginTop: 24 }}>
          <div className="ledger-head">
            <h2>Recent Photos</h2>
          </div>
          <div className="recent-photos">
            {operator.recent_photos.map((p) => (
              <a key={p.id} href={`/spot?spot=${p.spot_id}`} className="recent-photo">
                <img src={photoUrl(p.thumbnail_path || p.path)} alt="" />
              </a>
            ))}
          </div>
        </div>
      )}

      {operator.children.length > 0 && (
        <div className="ledger" style={{ marginTop: 24 }}>
          <div className="ledger-head">
            <h2>Units</h2>
            <span className="sub mono">{operator.children.length} under this wing</span>
          </div>
          {operator.children.map((child) => (
            <a key={child.id} href={`/operator?id=${child.id}`} className="lrow" style={{ textDecoration: "none" }}>
              <span className="ld">{child.name}</span>
              <span className="ll">{[child.branch, child.tail_code, child.home_base].filter(Boolean).join(" · ")}</span>
            </a>
          ))}
        </div>
      )}

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Map</h2>
          <span className="sub mono">the {operator.name} footprint</span>
        </div>
        <div style={{ padding: 14 }}>
          <SpotMap
            scope={{ operator_id: operator.id }}
            hiddenFilters={["operator"]}
            emptyMessage={`No plotted spots yet for ${operator.name}.`}
          />
        </div>
      </div>

      <div className="ledger" style={{ marginTop: 24 }}>
        <div className="ledger-head">
          <h2>Spots</h2>
          <span className="sub mono">
            every photo of <b>{operator.name}</b>
          </span>
        </div>
        {operator.spots.length === 0 && <div className="state-msg mono">No spots linked yet.</div>}
        {operator.spots.map((entry) => (
          <a key={entry.id} href={`/spot?spot=${entry.id}`} className="lrow lrow--thumb" style={{ textDecoration: "none" }}>
            <span className="lrow-thumb-wrap">
              {entry.cover_thumbnail ? (
                <img className="lrow-thumb" src={photoUrl(entry.cover_thumbnail)} alt="" />
              ) : (
                <div className="lrow-thumb-empty">✈</div>
              )}
            </span>
            <span className="ld">{formatDate(entry.date)}</span>
            <span className="ll">
              {entry.aircraft_identifier} · {formatTypeLine(entry.manufacturer_name, entry.aircraft_type)}
            </span>
            <span className="lc">{entry.location_label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
