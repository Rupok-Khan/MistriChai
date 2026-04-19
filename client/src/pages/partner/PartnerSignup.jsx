import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthService } from "../../services/auth.service";
import { AuthContext } from "../../context/AuthContext";
import { DEFAULT_SERVICE_OPTIONS, normalizeServiceOptions } from "../../utils/serviceCatalog";
import { SiteContentService } from "../../services/siteContent.service";

function StepHeader({ step }) {
  const pct = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <div className="mb-3">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <div className={`step-pill ${step === 1 ? "active" : ""}`}>
          <div className={`step-dot ${step === 1 ? "" : "muted"}`}>1</div>
          <div>
            <div className="fw-bold">Personal</div>
            <div className="small-muted">NID identity</div>
          </div>
        </div>

        <div className={`step-pill ${step === 2 ? "active" : ""}`}>
          <div className={`step-dot ${step === 2 ? "" : "muted"}`}>2</div>
          <div>
            <div className="fw-bold">Service Info</div>
            <div className="small-muted">Area & category</div>
          </div>
        </div>

        <div className={`step-pill ${step === 3 ? "active" : ""}`}>
          <div className={`step-dot ${step === 3 ? "" : "muted"}`}>3</div>
          <div>
            <div className="fw-bold">Documents</div>
            <div className="small-muted">Uploads & password</div>
          </div>
        </div>
      </div>

      <div className="progress-eco mt-3">
        <div style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function PartnerSignup() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [serviceOptions, setServiceOptions] = useState(DEFAULT_SERVICE_OPTIONS);

  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    // Step 1
    first_name: "",
    last_name: "",
    mobile: "",
    email: "",
    nid_address: "",
    father_name: "",
    mother_name: "",
    nid_number: "",

    // Step 2
    district: "",
    thana: "",
    ward_no: "",
    city_corp_or_union: "",
    technician_category: DEFAULT_SERVICE_OPTIONS[0].key,
    working_start_time: "09:00",
    working_end_time: "18:00",
    experience_years: 0,

    // Step 3
    password: ""
  });

  const [files, setFiles] = useState({
    profile_photo: null,
    nid_front_photo: null,
    nid_back_photo: null
  });

  const [previews, setPreviews] = useState({
    profile_photo: "",
    nid_front_photo: "",
    nid_back_photo: ""
  });

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    let active = true;
    SiteContentService.getPublic()
      .then((res) => {
        if (!active) {
          return;
        }
        const dynamicServices = normalizeServiceOptions(res?.data?.services);
        setServiceOptions(dynamicServices);
        setForm((prev) => ({
          ...prev,
          technician_category: dynamicServices.some((item) => item.key === prev.technician_category)
            ? prev.technician_category
            : dynamicServices[0]?.key || prev.technician_category
        }));
      })
      .catch(() => {
        if (active) {
          setServiceOptions(DEFAULT_SERVICE_OPTIONS);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const setFile = (k, file) => {
    setFiles((p) => ({ ...p, [k]: file || null }));
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviews((p) => ({ ...p, [k]: url }));
    } else {
      setPreviews((p) => ({ ...p, [k]: "" }));
    }
  };

  const timeValid = useMemo(() => {
    return form.working_start_time < form.working_end_time;
  }, [form.working_start_time, form.working_end_time]);

  // Basic per-step validation
  const canGoNext = () => {
    if (step === 1) {
      return (
        form.first_name.trim() &&
        form.last_name.trim() &&
        form.mobile.trim() &&
        form.nid_address.trim() &&
        form.father_name.trim() &&
        form.mother_name.trim() &&
        form.nid_number.trim()
      );
    }
    if (step === 2) {
      return (
        form.district.trim() &&
        form.thana.trim() &&
        form.ward_no.trim() &&
        form.city_corp_or_union.trim() &&
        form.technician_category &&
        form.working_start_time &&
        form.working_end_time &&
        timeValid
      );
    }
    if (step === 3) {
      return (
        form.password.trim().length >= 6 &&
        files.profile_photo &&
        files.nid_front_photo &&
        files.nid_back_photo
      );
    }
    return false;
  };

  const next = () => {
    setErr("");
    if (!canGoNext()) {
      setErr("Please fill all required fields correctly before continuing.");
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const back = () => {
    setErr("");
    setStep((s) => Math.max(1, s - 1));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!canGoNext()) {
      setErr("Please complete all required fields in this step.");
      return;
    }

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("profile_photo", files.profile_photo);
      fd.append("nid_front_photo", files.nid_front_photo);
      fd.append("nid_back_photo", files.nid_back_photo);

      const data = await AuthService.partnerSignup(fd);
      login(data);
      navigate("/partner/dashboard");
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="container section-pad">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          <div className="eco-card p-4 p-md-5">
            <h2 className="fw-bold mb-1">Partner Signup</h2>
            <p className="small-muted mb-3">
              Complete verification details in 3 steps. Your documents will be reviewed by admin.
            </p>

            <StepHeader step={step} />

            {err && <div className="alert alert-danger">{err}</div>}

            <form onSubmit={submit}>
              {/* STEP 1 */}
              {step === 1 && (
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">First Name (as NID)</label>
                    <input
                      className="form-control"
                      value={form.first_name}
                      onChange={(e) => setField("first_name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Last Name (as NID)</label>
                    <input
                      className="form-control"
                      value={form.last_name}
                      onChange={(e) => setField("last_name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Mobile</label>
                    <input
                      className="form-control"
                      value={form.mobile}
                      onChange={(e) => setField("mobile", e.target.value)}
                      required
                    />
                    <div className="small-muted mt-1">Used for login and contact.</div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Email (optional)</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Address (as NID)</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={form.nid_address}
                      onChange={(e) => setField("nid_address", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Father Name</label>
                    <input
                      className="form-control"
                      value={form.father_name}
                      onChange={(e) => setField("father_name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Mother Name</label>
                    <input
                      className="form-control"
                      value={form.mother_name}
                      onChange={(e) => setField("mother_name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">NID Number</label>
                    <input
                      className="form-control"
                      value={form.nid_number}
                      onChange={(e) => setField("nid_number", e.target.value)}
                      required
                    />
                    <div className="small-muted mt-1">Must be unique for verification.</div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="eco-card p-3 h-100">
                      <div className="fw-bold mb-1">Why we ask this?</div>
                      <div className="small-muted">
                        NID-based details reduce fraud and increase trust for customers.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="row g-3">
                  <div className="col-12">
                    <div className="eco-card p-3">
                      <div className="fw-bold">Current Service Area</div>
                      <div className="small-muted">
                        Used to show partners nearby and assign jobs correctly.
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label">District</label>
                    <input
                      className="form-control"
                      value={form.district}
                      onChange={(e) => setField("district", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label">Thana</label>
                    <input
                      className="form-control"
                      value={form.thana}
                      onChange={(e) => setField("thana", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label">Ward No</label>
                    <input
                      className="form-control"
                      value={form.ward_no}
                      onChange={(e) => setField("ward_no", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label">City Corp / Union</label>
                    <input
                      className="form-control"
                      value={form.city_corp_or_union}
                      onChange={(e) => setField("city_corp_or_union", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">Technician Category</label>
                    <select
                      className="form-select"
                      value={form.technician_category}
                      onChange={(e) => setField("technician_category", e.target.value)}
                    >
                      {serviceOptions.map((option) => (
                        <option key={option.key} value={option.key}>{option.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-6 col-md-4">
                    <label className="form-label">Working Start</label>
                    <input
                      type="time"
                      className="form-control"
                      value={form.working_start_time}
                      onChange={(e) => setField("working_start_time", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-6 col-md-4">
                    <label className="form-label">Working End</label>
                    <input
                      type="time"
                      className="form-control"
                      value={form.working_end_time}
                      onChange={(e) => setField("working_end_time", e.target.value)}
                      required
                    />
                    {!timeValid && (
                      <div className="text-danger small mt-1">
                        End time must be after start time.
                      </div>
                    )}
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">Experience (years)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={form.experience_years}
                      onChange={(e) => setField("experience_years", e.target.value)}
                    />
                  </div>

                  <div className="col-12">
                    <div className="eco-card p-3">
                      <div className="small-muted">
                        Availability is determined by working hours, and assigned jobs can mark you Busy until completion.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="row g-3">
                  <div className="col-12">
                    <div className="eco-card p-3">
                      <div className="fw-bold">Verification Documents</div>
                      <div className="small-muted">
                        Upload clear images of NID front/back and your profile photo.
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">Profile Photo</label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/*"
                      onChange={(e) => setFile("profile_photo", e.target.files?.[0])}
                      required
                    />
                    <div className="file-preview mt-2">
                      {previews.profile_photo ? (
                        <img className="img-fluid rounded-3" src={previews.profile_photo} alt="profile preview" />
                      ) : (
                        <div className="small-muted">No file selected</div>
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">NID Front Photo</label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/*"
                      onChange={(e) => setFile("nid_front_photo", e.target.files?.[0])}
                      required
                    />
                    <div className="file-preview mt-2">
                      {previews.nid_front_photo ? (
                        <img className="img-fluid rounded-3" src={previews.nid_front_photo} alt="nid front preview" />
                      ) : (
                        <div className="small-muted">No file selected</div>
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">NID Back Photo</label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/*"
                      onChange={(e) => setFile("nid_back_photo", e.target.files?.[0])}
                      required
                    />
                    <div className="file-preview mt-2">
                      {previews.nid_back_photo ? (
                        <img className="img-fluid rounded-3" src={previews.nid_back_photo} alt="nid back preview" />
                      ) : (
                        <div className="small-muted">No file selected</div>
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={form.password}
                      onChange={(e) => setField("password", e.target.value)}
                      required
                      minLength={6}
                    />
                    <div className="small-muted mt-1">Minimum 6 characters.</div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="eco-card p-3 h-100">
                      <div className="fw-bold mb-1">Verification note</div>
                      <div className="small-muted">
                        Make sure images are clear. Admin review will approve or reject your account.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="d-flex flex-column flex-md-row gap-2 mt-4">
                <button
                  type="button"
                  className="btn eco-btn-outline"
                  onClick={back}
                  disabled={step === 1}
                >
                  Back
                </button>

                {step < 3 ? (
                  <button type="button" className="btn eco-btn ms-md-auto" onClick={next}>
                    Next
                  </button>
                ) : (
                  <button type="submit" className="btn eco-btn ms-md-auto">
                    Submit Partner Application
                  </button>
                )}
              </div>

              <div className="small-muted mt-3">
                Already have an account? <Link to="/auth/partner/login">Login</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
