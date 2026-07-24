/** Nullable 1-10 photo rating — storage and editing only, no dependent sorting
 * or "best of" behavior yet. Unrated shows the blank "—" option, never 0. */
export default function RatingSelect({ value, onChange, compact = false }) {
  return (
    <select
      className={`rating-select${compact ? " rating-select--compact" : ""}`}
      value={value ?? ""}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      title="Rating"
    >
      <option value="">—</option>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}
