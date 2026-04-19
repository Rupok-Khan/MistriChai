import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="container section-pad">
      <div className="eco-card p-5 text-center">
        <h2 className="fw-bold">404</h2>
        <p className="small-muted">Page not found.</p>
        <Link className="btn eco-btn mt-2" to="/">Go Home</Link>
      </div>
    </div>
  );
}
