import React from "react";
import { Link } from "react-router-dom";

export default function RoleCard({ title, subtitle, primaryTo, secondaryTo, primaryText, secondaryText }) {
  return (
    <div className="eco-card p-4 h-100">
      <h4 className="fw-bold mb-2">{title}</h4>
      <p className="small-muted">{subtitle}</p>
      <div className="d-flex gap-2 flex-wrap mt-3">
        <Link className="btn eco-btn" to={primaryTo}>{primaryText}</Link>
        <Link className="btn eco-btn-outline" to={secondaryTo}>{secondaryText}</Link>
      </div>
    </div>
  );
}
