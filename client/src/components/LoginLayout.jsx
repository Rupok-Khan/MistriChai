import React, { useEffect, useState } from "react";
import heroImage from "../assets/image/hero image.jpg";
import { SiteContentService } from "../services/siteContent.service";

export default function LoginLayout({ contentKey, role, title, description, points = [], children }) {
  const [content, setContent] = useState(null);

  useEffect(() => {
    let mounted = true;
    SiteContentService.getPublic()
      .then((response) => {
        if (mounted) setContent(response?.data?.loginPages?.[contentKey] || null);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [contentKey]);

  const displayTitle = content?.title || title;
  const displayDescription = content?.description || description;
  const displayPoints = [content?.pointOne, content?.pointTwo, content?.pointThree].filter(Boolean);

  return (
    <main className="login-page section-pad">
      <div className="container">
        <section className="login-shell" aria-label={`${role} login`}>
          <div className="login-visual" style={{ backgroundImage: `url("${heroImage}")` }}>
            <div className="login-visual-content">
              <span className="login-role-badge">MistriChai · {role}</span>
              <h1>{displayTitle}</h1>
              <p>{displayDescription}</p>
              <div className="login-benefits">
                {(displayPoints.length ? displayPoints : points).map((point) => <span key={point}><b aria-hidden="true">✓</b>{point}</span>)}
              </div>
            </div>
          </div>
          <div className="login-form-panel">
            <div className="login-form-inner">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
