import React, { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { AuthService } from "../../services/auth.service";

export default function PartnerLogin() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const data = await AuthService.partnerLogin({ identifier, password });
      login(data);
      navigate("/partner/dashboard");
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="container section-pad">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 col-lg-5">
          <div className="eco-card p-4">
            <h3 className="fw-bold mb-1">Partner Login</h3>
            <p className="small-muted">Use your mobile, email, or approved partner code to login.</p>

            {err && <div className="alert alert-danger">{err}</div>}

            <form onSubmit={submit}>
              <div className="mb-3">
                <label className="form-label">Email, Mobile, or Partner Code</label>
                <input className="form-control" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button className="btn eco-btn w-100">Login</button>
            </form>

            <div className="mt-3 small-muted">
              New partner? <Link to="/auth/partner/signup">Create account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
