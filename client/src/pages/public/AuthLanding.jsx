import React from "react";
import RoleCard from "../../components/RoleCard";

export default function AuthLanding() {
  return (
    <div className="eco-hero">
      <div className="container section-pad">
        <div className="text-center mb-4">
          <div className="eco-badge d-inline-block mb-3">Secure login • Verified partners</div>
          <h1 className="fw-bold">Login or Create an Account</h1>
          <p className="small-muted">Choose your account type to continue.</p>
        </div>

        <div className="row g-4 justify-content-center">
          <div className="col-12 col-md-5">
            <RoleCard
              title="Customer"
              subtitle="Book services, track requests, and get trusted technicians."
              primaryTo="/auth/customer/login"
              secondaryTo="/auth/customer/signup"
              primaryText="Login"
              secondaryText="Signup"
            />
          </div>

          <div className="col-12 col-md-5">
            <RoleCard
              title="Partner"
              subtitle="Join as a technician with NID verification and service area setup."
              primaryTo="/auth/partner/login"
              secondaryTo="/auth/partner/signup"
              primaryText="Login"
              secondaryText="Signup"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
