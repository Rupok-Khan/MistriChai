import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { apiFetch } from "../../services/api";
import { SiteContentService } from "../../services/siteContent.service";

export default function Contact() {
  const { user } = useContext(AuthContext);
  const canSend = user && ["CUSTOMER", "PARTNER"].includes(user.role);
  const [form, setForm] = useState({ message: "" });
  const [status, setStatus] = useState({ loading: false, ok: null, msg: "" });
  const [content, setContent] = useState(null);

  useEffect(() => {
    let active = true;

    SiteContentService.getPublic()
      .then((res) => {
        if (active) setContent(res.data?.contact || null);
      })
      .catch(() => {
        if (active) setContent(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const onChange = (v) => setForm((prev) => ({ ...prev, message: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!canSend) {
      setStatus({ loading: false, ok: false, msg: "Please login as customer or partner first." });
      return;
    }
    setStatus({ loading: true, ok: null, msg: "" });
    try {
      await apiFetch("/api/contact", {
        method: "POST",
        body: { message: form.message }
      });
      setStatus({ loading: false, ok: true, msg: "Message sent successfully." });
      setForm({ message: "" });
    } catch (err) {
      setStatus({ loading: false, ok: false, msg: err.message || "Message sending failed." });
    }
  };

  return (
    <div className="container section-pad">
      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="eco-card p-4">
            <h2 className="fw-bold">{content?.pageTitle || "Contact"}</h2>
            <p className="small-muted">{content?.pageSubtitle || "Send a message and our team will respond as soon as possible."}</p>

            {status.ok === true && <div className="alert alert-success">{status.msg}</div>}
            {status.ok === false && <div className="alert alert-danger">{status.msg}</div>}

            <form onSubmit={submit} className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Name</label>
                <input className="form-control" value={user?.name || ""} readOnly disabled />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={user?.email || ""} readOnly disabled />
              </div>
              <div className="col-12">
                <label className="form-label">Message</label>
                <textarea className="form-control" rows="4" value={form.message} onChange={(e) => onChange(e.target.value)} required disabled={status.loading} />
                {!canSend && (
                  <div className="small text-danger mt-2">
                    Please <Link to="/auth">login</Link> as customer or partner to send a message.
                  </div>
                )}
              </div>
              <div className="col-12">
                <button className="btn eco-btn w-100" disabled={status.loading || !canSend}>
                  {status.loading ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="eco-card p-4 h-100">
            <h4 className="fw-bold">{content?.supportTitle || "Support Info"}</h4>
            <p className="small-muted mb-2">Email: {content?.supportEmail || "support@ondemand.com"}</p>
            <p className="small-muted mb-2">Phone: {content?.supportPhone || "+880 1XXXXXXXXX"}</p>
            <p className="small-muted mb-2">Hours: {content?.supportHours || "9:00 AM - 10:00 PM"}</p>
            <p className="small-muted mb-2">Address: {content?.supportAddress || "7510, Brand Tower, New York, USA"}</p>
            <hr />
            <div className="small-muted">{content?.supportNote || "For booking-related issues, customers and partners can also use dashboard chat after assignment."}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
