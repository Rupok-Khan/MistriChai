// src/pages/customer/CustomerLogin.jsx
import React, { useContext, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { AuthService } from "../../services/auth.service";

export default function CustomerLogin() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const next = params.get("next"); // ex: /partners?category=AC_REPAIR
  const msg = params.get("msg");   // ex: Please login as customer to book a service.

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const data = await AuthService.customerLogin({ identifier, password });
      login(data);

      // redirect to next page if provided; otherwise dashboard
      navigate(next || "/customer/dashboard", { replace: true });
    } catch (e2) {
      setErr(e2.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container section-pad">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 col-lg-5">
          <div className="eco-card p-4">
            <h3 className="fw-bold mb-1">Customer Login</h3>
            <p className="small-muted mb-3">Use email or mobile number.</p>

            {msg && <div className="alert alert-info">{msg}</div>}
            {err && <div className="alert alert-danger">{err}</div>}

            <form onSubmit={submit}>
              <div className="mb-3">
                <label className="form-label">Email or Mobile</label>
                <input
                  className="form-control"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="example@mail.com or 017xxxxxxxx"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button className="btn eco-btn w-100" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <div className="mt-3 small-muted">
              No account? <Link to="/auth/customer/signup">Create one</Link>
            </div>

            <div className="mt-2 small-muted">
              Partner login? <Link to="/auth/partner/login">Go here</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
