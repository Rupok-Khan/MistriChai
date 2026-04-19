import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../services/api";
import { AuthContext } from "../context/AuthContext";
import "../assets/css/homeContactSection.css";

export default function HomeContactSection({ content }) {
  const { user } = useContext(AuthContext);
  const canSend = user && ["CUSTOMER", "PARTNER"].includes(user.role);
  const [form, setForm] = useState({ message: "" });
  const [status, setStatus] = useState({ loading: false, ok: null, msg: "" });
  const userLabel = user?.role === "CUSTOMER" ? "Customer" : user?.role === "PARTNER" ? "Partner" : "User";

  function onChange(e) {
    setForm((prev) => ({ ...prev, message: e.target.value }));
  }

  function validate() {
    if (!form.message.trim()) return "Message is required";
    if (form.message.trim().length < 10) return "Message must be at least 10 characters";
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();

    const err = validate();
    if (err) {
      setStatus({ loading: false, ok: false, msg: err });
      return;
    }

    try {
      setStatus({ loading: true, ok: null, msg: "" });
      await apiFetch("/api/contact", {
        method: "POST",
        body: {
          message: form.message.trim()
        }
      });

      setStatus({ loading: false, ok: true, msg: "Message sent successfully!" });
      setForm({ message: "" });
    } catch (error) {
      setStatus({
        loading: false,
        ok: false,
        msg: error?.message || "Something went wrong"
      });
    }
  }

  return (
    <section className="contactSec">
      <div className="contactSec__inner">
        <div className="contactSec__left">
          <h2 className="contactSec__leftTitle">Find us</h2>

          <div className="contactSec__card">
            <div className="contactSec__icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6.6 10.8c1.7 3.2 3.4 4.9 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.2 1.3.5 2.7.8 4.2.8.7 0 1.2.5 1.2 1.2V21c0 .7-.5 1.2-1.2 1.2C10.1 22.2 1.8 13.9 1.8 3.4c0-.7.5-1.2 1.2-1.2H6c.7 0 1.2.5 1.2 1.2 0 1.5.3 2.9.8 4.2.1.4 0 .9-.2 1.2l-2.2 2.2z" fill="currentColor" />
              </svg>
            </div>
            <div className="contactSec__meta">
              <div className="contactSec__metaTitle">Call Us</div>
              <div className="contactSec__metaText">{content?.supportPhone || "+880 1XXXXXXXXX"}</div>
            </div>
          </div>

          <div className="contactSec__card">
            <div className="contactSec__icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z" fill="currentColor" />
              </svg>
            </div>
            <div className="contactSec__meta">
              <div className="contactSec__metaTitle">Email Now</div>
              <div className="contactSec__metaText">{content?.supportEmail || "support@ondemand.com"}</div>
            </div>
          </div>

          <div className="contactSec__card">
            <div className="contactSec__icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2c-3.9 0-7 3.1-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z" fill="currentColor" />
              </svg>
            </div>
            <div className="contactSec__meta">
              <div className="contactSec__metaTitle">Address</div>
              <div className="contactSec__metaText">{content?.supportAddress || "7510, Brand Tower, New York, USA"}</div>
            </div>
          </div>
        </div>

        <div className="contactSec__right">
          <div className="contactSec__kicker">{content?.homeKicker || "Contact info"}</div>
          <h2 className="contactSec__rightTitle">{content?.homeTitle || "Keep In Touch"}</h2>
          <p className="contactSec__desc">{content?.homeDescription || "We prioritize responding to your inquiries promptly to ensure you receive the assistance you need in a timely manner."}</p>

          <form className="contactSec__form" onSubmit={onSubmit}>
            <input className="contactSec__input" value={user?.name || ""} disabled placeholder="Login required name" />
            <input className="contactSec__input" value={user?.email || ""} disabled placeholder="Email comes from your account" />
            <textarea className="contactSec__textarea" name="message" placeholder="Message" value={form.message} onChange={onChange} disabled={status.loading} />

            {!canSend && (
              <div className="contactSec__alert contactSec__alert--err">
                Please login as customer or partner to send support messages. <Link to="/auth">Login now</Link>.
              </div>
            )}

            {canSend && (
              <div className="small-muted">
                Sending as {userLabel}: <b>{user?.name}</b>
              </div>
            )}

            <button className="contactSec__btn" type="submit" disabled={status.loading || !canSend}>
              {status.loading ? "Sending..." : "Send Message"}
            </button>

            {status.ok === true && <div className="contactSec__alert contactSec__alert--ok">{status.msg}</div>}
            {status.ok === false && <div className="contactSec__alert contactSec__alert--err">{status.msg}</div>}
          </form>
        </div>
      </div>
    </section>
  );
}
