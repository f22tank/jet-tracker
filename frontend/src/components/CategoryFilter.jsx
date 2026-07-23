const CATEGORIES = [
  { value: "", label: "All" },
  { value: "commercial", label: "Commercial" },
  { value: "military", label: "Military" },
  { value: "ga", label: "GA" },
];

/** The one quick-filter dimension for All Spots / Aircraft — a chip row, not a
 * full faceted filter panel. Empty string means no filter (server-side). */
export default function CategoryFilter({ value, onChange }) {
  return (
    <div className="mode-switch category-filter">
      {CATEGORIES.map((c) => (
        <button key={c.value} type="button" className={value === c.value ? "active" : ""} onClick={() => onChange(c.value)}>
          {c.label}
        </button>
      ))}
    </div>
  );
}
