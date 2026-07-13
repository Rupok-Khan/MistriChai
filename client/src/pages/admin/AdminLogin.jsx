import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminService } from "../../services/admin.service";
import { getAdminToken, getAdminUser, setAdminAuth } from "../../utils/adminAuth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const next = useMemo(() => {
    // if redirected from protected page
    return location.state?.from || "/admin/dashboard";
  }, [location.state]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAdminToken() && getAdminUser()?.role === "ADMIN") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const data = await AdminService.login({ email, password });
      setAdminAuth(data);
      navigate(next, { replace: true });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container section-pad">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 col-lg-5">
          <div className="eco-card p-4 p-md-5">
            <h3 className="fw-bold mb-1">Admin Login</h3>
            <p className="small-muted mb-3">Access partner verification panel.</p>

            {err && <div className="alert alert-danger">{err}</div>}

            <form onSubmit={submit}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button className="btn eco-btn w-100" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <div className="small-muted mt-3">
              Tip: credentials are set in <code>.env</code> (ADMIN_EMAIL / ADMIN_PASSWORD)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
