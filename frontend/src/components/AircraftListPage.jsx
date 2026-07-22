import { useEffect, useRef, useState } from "react";
import { fetchAircraftTable } from "../api.js";
import { formatDate } from "../format.js";
import SortHeader from "./SortHeader.jsx";

const PAGE_SIZE = 25;

const CATEGORY_LABELS = { commercial: "Commercial", military: "Military", ga: "GA" };

export default function AircraftListPage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("identifier");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [table, setTable] = useState({ items: [], total: 0 });
  const [tableLoading, setTableLoading] = useState(true);
  const debounceRef = useRef(null);

  useEffect(() => {
    setTableLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchAircraftTable({ q, sort, order, page, pageSize: PAGE_SIZE })
        .then(setTable)
        .finally(() => setTableLoading(false));
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [q, sort, order, page]);

  function handleSort(key) {
    if (sort === key) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setOrder(key === "spot_count" || key === "last_date" ? "desc" : "asc");
    }
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(table.total / PAGE_SIZE));

  return (
    <div className="wrap home">
      <header className="home-head">
        <h1>Aircraft</h1>
      </header>

      <section className="home-section">
        <div className="all-spots-head">
          <input
            className="search-box mono"
            placeholder="search reg, serial, type, manufacturer…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="spots-table-wrap">
          <table className="spots-table">
            <thead>
              <tr>
                <SortHeader label="Reg / Serial" sortKey="identifier" sort={sort} order={order} onSort={handleSort} />
                <SortHeader label="Type" sortKey="type" sort={sort} order={order} onSort={handleSort} />
                <SortHeader label="Category" sortKey="category" sort={sort} order={order} onSort={handleSort} />
                <SortHeader label="Manufacturer" sortKey="manufacturer" sort={sort} order={order} onSort={handleSort} />
                <th>Operator</th>
                <SortHeader label="Spots" sortKey="spot_count" sort={sort} order={order} onSort={handleSort} />
                <SortHeader label="Last seen" sortKey="last_date" sort={sort} order={order} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {table.items.map((row) => (
                <tr key={row.id} onClick={() => (window.location.href = `/aircraft?id=${row.id}`)}>
                  <td className="mono">{row.identifier}</td>
                  <td>{row.type}</td>
                  <td>{CATEGORY_LABELS[row.category] || row.category}</td>
                  <td>{row.manufacturer_name || "—"}</td>
                  <td>{row.operator_label || "—"}</td>
                  <td className="mono">{row.spot_count}</td>
                  <td className="mono">{row.last_date ? formatDate(row.last_date) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!tableLoading && table.items.length === 0 && (
            <div className="state-msg mono">{q ? "No aircraft match your search." : "No aircraft yet."}</div>
          )}
        </div>

        <div className="table-pager">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ‹ Prev
          </button>
          <span className="mono">
            Page {page} of {totalPages} · {table.total} aircraft
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next ›
          </button>
        </div>
      </section>
    </div>
  );
}
