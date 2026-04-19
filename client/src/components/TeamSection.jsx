import React, { useEffect, useState } from "react";
import { PartnerService } from "../services/partner.service";

function Stars({ value = 0 }) {
  const full = Math.round(value);
  return (
    <div className="team-stars" aria-label={`Rating ${value}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>{i < full ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

export default function TeamSection() {
  const [team, setTeam] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    PartnerService.top(3)
      .then((res) => setTeam(res.data || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="container section-pad">
      <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            Effective Service Requires <br className="d-none d-md-block" />
            an Expert Technician Team
          </h2>
        </div>
        <div className="small-muted" style={{ maxWidth: 420 }}>
          <div className="fw-bold text-dark">Expert Team</div>
          We provide verified partners ensuring top-notch service quality and safety.
        </div>
      </div>

      {loading ? (
        <div className="eco-card p-4 text-center">
          <div className="spinner-border" role="status" />
          <div className="small-muted mt-2">Loading team...</div>
        </div>
      ) : err ? (
        <div className="alert alert-warning">{err}</div>
      ) : (
        <div className="row g-3">
          {team.map((p) => (
            <div key={p.id} className="col-12 col-md-6 col-lg-4">
              <div className="team-card h-100">
                <div className="team-img-wrap">
                  <img
                    className="team-img"
                    src={p.profile_photo_url || "https://via.placeholder.com/600x400?text=Partner"}
                    alt={p.name}
                  />
                </div>

                <div className="team-body">
                  <div className="team-name">{p.name}</div>

                  <div className="small-muted">
                    {p.technician_category} • {p.district}, {p.thana}
                  </div>

                  <Stars value={p.rating_avg || 5} />

                  <p className="team-desc">
                    Verified technician with {p.experience_years}+ years experience.
                    Reliable, punctual, and professional service.
                  </p>

                  <div className="team-social">
                    <span title="Facebook">f</span>
                    <span title="Twitter">x</span>
                    <span title="Instagram">⌁</span>
                    <span title="LinkedIn">in</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
