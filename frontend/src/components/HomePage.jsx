import { useEffect, useRef, useState } from "react";
import { fetchGallerySpots, fetchRecentSpots, photoUrl } from "../api.js";

const PAGE_SIZE = 25;

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function SortHeader({ label, sortKey, sort, order, onSort }) {
  const active = sort === sortKey;
  return (
    <th className={active ? "active" : ""} onClick={() => onSort(sortKey)}>
      {label}
      {active && <span className="sort-arrow">{order === "asc" ? " ▲" : " ▼"}</span>}
    </th>
  );
}

export default function HomePage() {
  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("date");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [table, setTable] = useState({ items: [], total: 0 });
  const [tableLoading, setTableLoading] = useState(true);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchRecentSpots(12)
      .then(setRecent)
      .finally(() => setRecentLoading(false));
  }, []);

  useEffect(() => {
    setTableLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGallerySpots({ q, sort, order, page, pageSize: PAGE_SIZE })
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
      setOrder(key === "date" || key === "created_at" ? "desc" : "asc");
    }
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(table.total / PAGE_SIZE));

  return (
    <div className="wrap home">
      <header className="home-head">
        <h1>Jet Tracker</h1>
      </header>

      <section className="home-section">
        <h2>Recent</h2>
        {recentLoading ? (
          <div className="state-msg mono">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="empty-carousel">
            No spots yet — head to the <a href="/tray">Tray</a> to upload your first photos.
          </div>
        ) : (
          <div className="carousel">
            {recent.map((card) => (
              <a key={card.id} href={`/spot?spot=${card.id}`} className="carousel-card">
                <div className="cc-im">
                  {card.cover_thumbnail ? (
                    <img src={photoUrl(card.cover_thumbnail)} alt="" />
                  ) : (
                    <div className="cc-im-empty">✈</div>
                  )}
                </div>
                <div className="cc-reg mono">{card.aircraft_identifier}</div>
                <div className="cc-meta">
                  <span className="cc-date mono">{formatDate(card.date)}</span>
                  {card.operator_name && (
                    <span className="cc-operator">
                      {card.operator_image && <img src={photoUrl(card.operator_image)} alt="" />}
                      {card.operator_name}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
        <div className="all-spots-head">
          <h2>All Spots</h2>
          <input
            className="search-box mono"
            placeholder="search reg, operator, type, location, notes…"
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
                  <td>{row.aircraft_type}</td>
                  <td>{row.operator_label || "—"}</td>
                  <td>{row.location_label}</td>
                  <td className="mono">{row.date}</td>
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
