/** The one shared date display format across the app: "24 Nov 2020" (day, abbreviated
 * month, four-digit year). Accepts a date-only ISO string ("2026-07-22") or a full
 * datetime string/Date. No other display format should be used anywhere. */
export function formatDate(value) {
  if (!value) return "";
  const iso = typeof value === "string" && value.length === 10 ? `${value}T00:00:00` : value;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}
