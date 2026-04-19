import React, { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { AuthService } from "../../services/auth.service";

export default function CustomerSignup() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", mobile: "", address: "", password: "" });
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setInfo("");
    try {
      const data = await AuthService.customerSignup(form);
      login(data);
      navigate("/customer/dashboard");
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="container section-pad">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-7">
          <div className="eco-card p-4">
            <h3 className="fw-bold mb-1">Customer Signup</h3>
            <p className="small-muted">Create your account with email and mobile to book services. Google signup can be connected later without changing this design.</p>

            {err && <div className="alert alert-danger">{err}</div>}
            {info && <div className="alert alert-info">{info}</div>}

            <form onSubmit={submit} className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Full Name</label>
                <input className="form-control" value={form.name} onChange={(e) => onChange("name", e.target.value)} required />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={form.email} onChange={(e) => onChange("email", e.target.value)} required />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Mobile</label>
                <input className="form-control" value={form.mobile} onChange={(e) => onChange("mobile", e.target.value)} required />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Password</label>
                <input type="password" className="form-control" value={form.password} onChange={(e) => onChange("password", e.target.value)} required />
              </div>
              <div className="col-12">
                <label className="form-label">Address</label>
                <textarea className="form-control" rows="3" value={form.address} onChange={(e) => onChange("address", e.target.value)} required />
              </div>
              <div className="col-12">
                <button className="btn eco-btn w-100">Create Account</button>
              </div>
              <div className="col-12">
                <button
                  type="button"
                  className="btn eco-btn-outline w-100"
                  onClick={() => setInfo("Google signup is not configured in this local demo yet. Please use email and mobile signup.")}
                >
                  Continue with Google
                </button>
              </div>
            </form>

            <div className="mt-3 small-muted">
              Already have an account? <Link to="/auth/customer/login">Login</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
