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

// Radar-green family, in the order pie/donut slices should draw — kept within the
// app's existing palette (sky/steel/aluminum/hairline are already-defined CSS vars)
// plus tints/shades of the accent so multi-slice charts never reach for a default
// library color scheme that would clash with the CRT aesthetic.
export const CHART_COLORS = [
  "#4ade80", // accent
  "#22c55e", // accent-dim
  "#86efac", // light green
  "#15803d", // dark green
  "#5fb0d4", // sky
  "#a7f3d0", // pale green
  "#8b959e", // steel
  "#166534", // deep green
  "#c7ced4", // aluminum
  "#3a434c", // hairline
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
