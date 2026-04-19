import React from "react";
import { Link } from "react-router-dom";

export default function Support() {
  return (
    <div className="container section-pad">
      <div className="eco-card p-4 p-md-5">
        <h2 className="fw-bold mb-2">Support</h2>
        <p className="small-muted">
          Need help with signup, booking, assignment, refund, or wallet issues? Start here.
        </p>

        <div className="row g-3 mt-1">
          <div className="col-12 col-md-4">
            <div className="eco-card p-3 h-100">
              <div className="fw-bold">Customers</div>
              <div className="small-muted mt-1">Use your dashboard for orders, payment history, and assigned chat.</div>
              <Link className="btn eco-btn-outline mt-3" to="/auth/customer/login">Customer Login</Link>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="eco-card p-3 h-100">
              <div className="fw-bold">Partners</div>
              <div className="small-muted mt-1">Manage profile, working time, orders, wallet, and chat.</div>
              <Link className="btn eco-btn-outline mt-3" to="/auth/partner/login">Partner Login</Link>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="eco-card p-3 h-100">
              <div className="fw-bold">Contact</div>
              <div className="small-muted mt-1">If the issue needs platform help, send a message from the contact page.</div>
              <Link className="btn eco-btn-outline mt-3" to="/contact">Contact Us</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
