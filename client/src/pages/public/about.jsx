import React, { useEffect, useState } from "react";
import { SiteContentService } from "../../services/siteContent.service";

export default function About() {
  const [content, setContent] = useState(null);

  useEffect(() => {
    let active = true;

    SiteContentService.getPublic()
      .then((res) => {
        if (active) setContent(res.data?.about || null);
      })
      .catch(() => {
        if (active) setContent(null);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="container section-pad">
      <div className="row g-4">
        <div className="col-12 col-lg-7">
          <div className="eco-card p-4">
            <h2 className="fw-bold">{content?.title || "About MistriChai"}</h2>
            <p className="small-muted mt-2">
              {content?.description || "MistriChai connects customers with verified service professionals. Our goal is to make home-service booking simple, trustworthy, and transparent."}
            </p>

            <div className="row g-3 mt-3">
              <div className="col-12 col-md-6">
                <div className="eco-card p-3">
                  <div className="fw-bold">Trust & Safety</div>
                  <div className="small-muted">Partners submit NID documents to reduce fraud.</div>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="eco-card p-3">
                  <div className="fw-bold">Right Technician</div>
                  <div className="small-muted">Service area and category helps correct assignment.</div>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="eco-card p-3">
                  <div className="fw-bold">Eco-friendly</div>
                  <div className="small-muted">Repair and reuse reduces waste and energy usage.</div>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="eco-card p-3">
                  <div className="fw-bold">Modern UX</div>
                  <div className="small-muted">Responsive design built with Bootstrap and raw CSS.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="eco-card p-4">
            <h4 className="fw-bold">{content?.missionTitle || "Mission"}</h4>
            <p className="small-muted">{content?.missionText || "Make local technician services safe, fast, and accessible for everyone."}</p>
            <hr />
            <h4 className="fw-bold">{content?.visionTitle || "Vision"}</h4>
            <p className="small-muted">{content?.visionText || "Build a trusted service ecosystem with verified partners and strong customer support."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
