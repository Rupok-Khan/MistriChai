import React from "react";

export default function DashboardPagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const first = Math.max(1, Math.min(page - 2, pages - 4));
  const pageNumbers = Array.from({ length: Math.min(5, pages) }, (_, index) => first + index);
  return (
    <div className="dashboard-pagination">
      <button type="button" className="btn eco-btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <div className="dashboard-page-numbers">
        {pageNumbers.map((number) => <button type="button" key={number} className={`dashboard-page-button ${number === page ? "active" : ""}`} onClick={() => onChange(number)} aria-label={`Page ${number}`}>{number}</button>)}
      </div>
      <span className="dashboard-page-label">Page <b>{page}</b> of {pages}</span>
      <button type="button" className="btn eco-btn-outline btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}
