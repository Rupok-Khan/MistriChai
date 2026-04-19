// client/src/pages/admin/AdminPartnerReview.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminService } from "../../services/admin.service";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AdminPartnerReview() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setErr("");
      setLoading(true);
      try {
        const res = await AdminService.partnerDetails(userId);
        if (mounted) setData(res.data);
      } catch (e) {
        if (mounted) setErr(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const approve = async () => {
    setActionLoading(true);
    setErr("");
    try {
      const res = await AdminService.approvePartner(userId);
      if (res.partner_code) {
        alert(`Partner approved. Generated partner code: ${res.partner_code}`);
      }
      navigate("/admin/dashboard", { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const reject = async () => {
    if (!rejectReason.trim()) {
      setErr("Please write a rejection reason.");
      return;
    }
    setActionLoading(true);
    setErr("");
    try {
      await AdminService.rejectPartner(userId, rejectReason);
      navigate("/admin/dashboard", { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const imgSrc = (x) => {
    if (!x || typeof x !== "string") {
      return "";
    }
    return x.startsWith("http") ? x : `${BASE}${x}`;
  };

  return (
    <div className="container section-pad">
      <button className="btn eco-btn-outline mb-3" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <h2 className="fw-bold mb-1">Partner Review</h2>
      <div className="small-muted mb-3">User ID: {userId}</div>

      {err && <div className="alert alert-warning">{err}</div>}

      {loading ? (
        <div className="eco-card p-4 text-center">
          <div className="spinner-border" role="status" />
          <div className="small-muted mt-2">Loading details...</div>
        </div>
      ) : !data ? (
        <div className="eco-card p-4 text-center small-muted">No data found.</div>
      ) : (
        <div className="row g-3">
          {/* LEFT: Photos */}
          <div className="col-12 col-lg-5">
            <div className="eco-card p-3">
              <div className="fw-bold mb-2">Photos</div>

              <div className="mb-3">
                <div className="small-muted mb-1">Profile Photo</div>
                <img
                  className="review-img"
                  src={imgSrc(data.profile_photo_url || data.profile_photo)}
                  alt="Profile"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>

              <div className="mb-3">
                <div className="small-muted mb-1">NID Front</div>
                <img
                  className="review-img"
                  src={imgSrc(data.nid_front_photo_url || data.nid_front_photo)}
                  alt="NID Front"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>

              <div>
                <div className="small-muted mb-1">NID Back</div>
                <img
                  className="review-img"
                  src={imgSrc(data.nid_back_photo_url || data.nid_back_photo)}
                  alt="NID Back"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Details + Actions */}
          <div className="col-12 col-lg-7">
            <div className="eco-card p-3 p-md-4">
              <div className="d-flex justify-content-between flex-wrap gap-2 mb-2">
                <div className="fw-bold fs-5">
                  {data.first_name} {data.last_name}
                </div>
                <span className="badge text-bg-secondary">{data.verification_status}</span>
              </div>

              <div className="row g-2 small">
                <div className="col-12 col-md-6">
                  <div className="small-muted">NID Number</div>
                  <div className="fw-bold">{data.nid_number}</div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="small-muted">Category</div>
                  <div className="fw-bold">{data.technician_category}</div>
                </div>

                <div className="col-12">
                  <div className="small-muted">NID Address</div>
                  <div className="fw-bold">{data.nid_address}</div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="small-muted">Father</div>
                  <div className="fw-bold">{data.father_name}</div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="small-muted">Mother</div>
                  <div className="fw-bold">{data.mother_name}</div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="small-muted">Area</div>
                  <div className="fw-bold">
                    {data.district}, {data.thana}, Ward {data.ward_no}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="small-muted">City Corp / Union</div>
                  <div className="fw-bold">{data.city_corp_or_union}</div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="small-muted">Working Time</div>
                  <div className="fw-bold">
                    {data.working_start_time} - {data.working_end_time}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="small-muted">Experience</div>
                  <div className="fw-bold">{data.experience_years} years</div>
                </div>
              </div>

              <hr />

              <div className="d-flex flex-column flex-md-row gap-2">
                <button className="btn btn-success" disabled={actionLoading} onClick={approve}>
                  {actionLoading ? "Processing..." : "Approve"}
                </button>

                <button
                  className="btn btn-outline-danger"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#rejectBox"
                >
                  Reject
                </button>
              </div>

              <div className="collapse mt-3" id="rejectBox">
                <div className="eco-card p-3">
                  <label className="form-label">Rejection Reason</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Example: NID photo unclear / mismatch name / invalid address..."
                  />
                  <button
                    className="btn btn-danger mt-2"
                    disabled={actionLoading}
                    onClick={reject}
                  >
                    {actionLoading ? "Rejecting..." : "Confirm Reject"}
                  </button>
                </div>
              </div>

              {data.rejection_reason && (
                <div className="alert alert-danger mt-3 mb-0">
                  <b>Previous Rejection:</b> {data.rejection_reason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
