import { formatDate } from "../format.js";

/** The "date range" stat tile shared by aircraft/operator/location pages. A plain
 * inline string ("22 May 2022 – 19 Apr 2025") wraps mid-value in a fixed-width
 * tile, orphaning the year — stack the two dates around the dash instead. */
export default function DateRangeStat({ firstDate, lastDate }) {
  if (!firstDate) return <div className="op-stat-num mono">—</div>;
  if (!lastDate || firstDate === lastDate) {
    return <div className="op-stat-num mono">{formatDate(firstDate)}</div>;
  }
  return (
    <div className="op-stat-num mono date-range">
      <span>{formatDate(firstDate)}</span>
      <span className="date-range-sep">–</span>
      <span>{formatDate(lastDate)}</span>
    </div>
  );
}
