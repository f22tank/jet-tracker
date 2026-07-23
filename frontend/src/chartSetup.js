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

// Categorical palette for pie/donut segments and multi-series bars — green stays
// primary (first slot, matches --accent) but a multi-slice chart that's all green
// shades is hard to read at a glance, so the rest are contrasting hues at matched
// saturation/brightness (~Tailwind "400" weight) so no single series visually
// dominates. Cyan/amber/magenta/blue read as CRT-phosphor-adjacent, which keeps
// the radar aesthetic even though it's no longer monochrome. Single-series bars
// (one dataset, many categories along one axis) stay solid accent green instead
// of pulling from this array — see chart usages in StatsPage/OperatorPage.
export const CHART_COLORS = [
  "#4ade80", // green (accent) — primary
  "#22d3ee", // cyan
  "#fbbf24", // amber
  "#f472b6", // magenta
  "#60a5fa", // blue
  "#a78bfa", // violet
  "#34d399", // emerald (secondary green)
  "#94a3b8", // slate — neutral overflow for long tails
];

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
