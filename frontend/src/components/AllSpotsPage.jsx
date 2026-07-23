import { useEffect, useRef, useState } from "react";
import { fetchGallerySpots, photoUrl } from "../api.js";
import { formatTypeLine } from "./AircraftTypeLine.jsx";
import { formatDate } from "../format.js";
import CategoryFilter from "./CategoryFilter.jsx";
import SortHeader from "./SortHeader.jsx";

const PAGE_SIZE = 25;

export default function AllSpotsPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("date");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [table, setTable] = useState({ items: [], total: 0 });
  const [tableLoading, setTableLoading] = useState(true);
  const debounceRef = useRef(null);

  useEffect(() => {
    setTableLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGallerySpots({ q, category, sort, order, page, pageSize: PAGE_SIZE })
        .then(setTable)
        .finally(() => setTableLoading(false));
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [q, category, sort, order, page]);

  function handleSort(key) {
    if (sort === key) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setOrder(key === "date" || key === "created_at" ? "desc" : "asc");
    }
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(table.total / PAGE_SIZE));

  return (
    <div className="wrap home">
      <header className="home-head">
        <h1>All Spots</h1>
      </header>

      <section className="home-section">
        <div className="all-spots-head">
          <input
            className="search-box mono"
            placeholder="search reg, operator, type, location, notes…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <CategoryFilter
            value={category}
            onChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
          />
        </div>

        <div className="spots-table-wrap">
          <table className="spots-table">
            <thead>
              <tr>
                <th></th>
                <SortHeader label="Reg / Serial" sortKey="identifier" sort={sort} order={order} onSort={handleSort} />
                <SortHeader label="Type" sortKey="type" sort={sort} order={order} onSort={handleSort} />
                <SortHeader label="Operator" sortKey="operator" sort={sort} order={order} onSort={handleSort} />
                <th>Location</th>
                <SortHeader label="Date" sortKey="date" sort={sort} order={order} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {table.items.map((row) => (
                <tr key={row.id} onClick={() => (window.location.href = `/spot?spot=${row.id}`)}>
                  <td className="td-thumb">
                    {row.cover_thumbnail ? (
                      <img src={photoUrl(row.cover_thumbnail)} alt="" />
                    ) : (
                      <div className="td-thumb-empty">✈</div>
                    )}
                  </td>
                  <td className="mono">{row.aircraft_identifier}</td>
                  <td>{formatTypeLine(row.manufacturer_name, row.aircraft_type)}</td>
                  <td>{row.operator_label || "—"}</td>
                  <td>{row.location_label}</td>
                  <td className="mono">{formatDate(row.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!tableLoading && table.items.length === 0 && (
            <div className="state-msg mono">{q ? "No spots match your search." : "No spots yet."}</div>
          )}
        </div>

        <div className="table-pager">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ‹ Prev
          </button>
          <span className="mono">
            Page {page} of {totalPages} · {table.total} spot{table.total === 1 ? "" : "s"}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next ›
          </button>
        </div>
      </section>
    </div>
  );
}
