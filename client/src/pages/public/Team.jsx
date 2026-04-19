import React from "react";
import TeamSection from "../../components/TeamSection";

export default function Team() {
  return (
    <div className="container section-pad">
      <div className="text-center mb-4">
        <h2 className="fw-bold">Our Team</h2>
        <p className="small-muted">Meet some of our verified partners and technicians.</p>
      </div>
      <TeamSection />
    </div>
  );
}
