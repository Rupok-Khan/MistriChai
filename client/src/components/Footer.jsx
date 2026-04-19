import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../assets/css/footer.css";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  function onSubmit(e) {
    e.preventDefault();
    if (!email.trim()) {
      setStatus("Please enter your email.");
      return;
    }
    setStatus("Thanks. Newsletter request saved for this demo.");
    setEmail("");
  }

  return (
    <footer className="footer">
      <div className="footer__inner">
        {/* Left */}
        <div className="footer__brand">
          <div className="footer__logoRow">
            <div className="footer__logoMark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 2c2.7 2.4 4 4.9 4 7.4 0 3.1-2 5.6-4.8 6.3V22H9.8v-6.3C7 15 5 12.5 5 9.4 5 6.9 6.3 4.4 9 2l.6 7.1L12 6l2.4 3.1L15 2z"
                  fill="currentColor"
                />
              </svg>
            </div>

            <div className="footer__logoText">
              <div className="footer__name">
                On<span>Demand</span>
              </div>
              <div className="footer__tagline">Cleaning service company</div>
            </div>
          </div>

          <p className="footer__desc">
            Stay updated with our latest cleaning tips, service updates, and
            helpful articles on maintaining a spotless home.
          </p>
        </div>

        {/* Columns */}
        <div className="footer__cols">
          <div className="footer__col">
            <div className="footer__colTitle">Company</div>
            <Link className="footer__link" to="/about">About Us</Link>
            <Link className="footer__link" to="/services">Services</Link>
            <Link className="footer__link" to="/team">Our Team</Link>
          </div>

          <div className="footer__col">
            <div className="footer__colTitle">Know More</div>
            <Link className="footer__link" to="/support">Support</Link>
            <Link className="footer__link" to="/privacy">Privacy Policy</Link>
            <Link className="footer__link" to="/terms">Terms &amp; conditions</Link>
          </div>

          <div className="footer__col footer__col--newsletter">
            <div className="footer__colTitle">Newsletter</div>

            <form className="footer__form" onSubmit={onSubmit}>
              <input
                className="footer__input"
                type="email"
                placeholder="Email Goes here"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="footer__btn" type="submit">
                Send
              </button>
            </form>
            {status && <div className="small-muted mt-2">{status}</div>}
          </div>
        </div>
      </div>

      <div className="footer__divider" />

      <div className="footer__bottom">
        2024 “ondemand” All Rights Reserved
      </div>
    </footer>
  );
}
