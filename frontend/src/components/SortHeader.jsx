export default function SortHeader({ label, sortKey, sort, order, onSort }) {
  const active = sort === sortKey;
  return (
    <th className={active ? "active" : ""} onClick={() => onSort(sortKey)}>
      {label}
      {active && <span className="sort-arrow">{order === "asc" ? " ▲" : " ▼"}</span>}
    </th>
  );
}
