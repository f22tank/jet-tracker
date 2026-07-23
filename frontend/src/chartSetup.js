import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Categorical palette for pie/donut segments and multi-series bars. The green
// accent is UI chrome (borders, highlights, active states, the logo) — it does
// not appear here, so data never gets confused with chrome. Blue leads instead;
// the rest are contrasting hues at matched saturation/brightness (~Tailwind
// "400" weight) so no single series visually dominates. Single-series bars (one
// dataset, many categories along one axis) use CHART_SERIES_COLOR below instead
// of pulling from this array — see chart usages in StatsPage/OperatorPage.
export const CHART_COLORS = [
  "#60a5fa", // blue — primary
  "#fbbf24", // amber
  "#f472b6", // magenta
  "#a78bfa", // violet
  "#22d3ee", // cyan
  "#34d399", // emerald
  "#fb923c", // orange
  "#94a3b8", // slate — neutral overflow for long tails
];

// Solid fill for single-series bar charts (one dataset, many categories).
export const CHART_SERIES_COLOR = "#60a5fa";
export const CHART_SERIES_HOVER_COLOR = "#3b82f6";

const MONO_FONT = { family: "'Spline Sans Mono'", size: 11 };

export const chartBaseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: "#c7ced4", font: MONO_FONT, boxWidth: 12, padding: 12 },
    },
    tooltip: {
      backgroundColor: "#252c33",
      titleColor: "#eef1f3",
      bodyColor: "#c7ced4",
      borderColor: "#3a434c",
      borderWidth: 1,
      padding: 8,
    },
  },
};

export const barScaleOptions = {
  scales: {
    x: {
      ticks: { color: "#8b959e", font: MONO_FONT },
      grid: { color: "#3a434c" },
    },
    y: {
      ticks: { color: "#8b959e", font: MONO_FONT },
      grid: { color: "#3a434c" },
      beginAtZero: true,
    },
  },
};
