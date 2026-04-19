import React from "react";

export default function Privacy() {
  return (
    <div className="container section-pad">
      <div className="eco-card p-4 p-md-5">
        <h2 className="fw-bold mb-2">Privacy Policy</h2>
        <p className="small-muted">This demo platform stores customer and partner information needed for booking, verification, and communication.</p>
        <div className="row g-3 mt-1">
          <div className="col-12 col-md-4">
            <div className="eco-card p-3 h-100">
              <div className="fw-bold">Account Data</div>
              <div className="small-muted mt-1">Name, mobile, email, and address are used to create and manage accounts.</div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="eco-card p-3 h-100">
              <div className="fw-bold">Partner Verification</div>
              <div className="small-muted mt-1">NID and profile details are used only for admin review and service trust.</div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="eco-card p-3 h-100">
              <div className="fw-bold">Booking and Chat</div>
              <div className="small-muted mt-1">Chat and order records are stored so assigned users can communicate and track work history.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
