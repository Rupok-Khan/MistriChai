import React from "react";
import heroImage from "../assets/image/hero image.jpg";

export default function LoginLayout({ role, title, description, points = [], children }) {
  return (
    <main className="login-page section-pad">
      <div className="container">
        <section className="login-shell" aria-label={`${role} login`}>
          <div className="login-visual" style={{ backgroundImage: `url("${heroImage}")` }}>
            <div className="login-visual-content">
              <span className="login-role-badge">MistriChai · {role}</span>
              <h1>{title}</h1>
              <p>{description}</p>
              <div className="login-benefits">
                {points.map((point) => <span key={point}><b aria-hidden="true">✓</b>{point}</span>)}
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
