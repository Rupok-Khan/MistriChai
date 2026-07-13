import React from "react";

export default function Terms() {
  return (
    <div className="container section-pad">
      <div className="eco-card p-4 p-md-5">
        <h2 className="fw-bold mb-2">Terms & Conditions</h2>
        <p className="small-muted">These basic terms describe how the demo booking platform works for customers, partners, and admin.</p>
        <div className="row g-3 mt-1">
          <div className="col-12 col-md-4">
            <div className="eco-card p-3 h-100">
              <div className="fw-bold">Booking Fee</div>
              <div className="small-muted mt-1">Customers send the fixed ৳99 service charge to the displayed admin bKash number and submit the transaction ID. Admin verifies it before assigning the job. Final service payment is made in cash to the partner after work completion.</div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="eco-card p-3 h-100">
              <div className="fw-bold">Assignment</div>
              <div className="small-muted mt-1">Admin can assign an approved partner. If assignment is not possible, the platform may refund the booking fee.</div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="eco-card p-3 h-100">
              <div className="fw-bold">Account Use</div>
              <div className="small-muted mt-1">Customers and partners are responsible for correct profile data and respectful chat communication.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
