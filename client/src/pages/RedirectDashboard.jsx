import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function RedirectDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate("/auth", { replace: true });
    else if (user.role === "CUSTOMER") navigate("/customer/dashboard", { replace: true });
    else if (user.role === "PARTNER") navigate("/partner/dashboard", { replace: true });
    else navigate("/", { replace: true });
  }, [user, navigate]);

  return (
    <div className="container section-pad">
      <div className="eco-card p-4 text-center">
        <div className="spinner-border" role="status" />
        <div className="small-muted mt-2">Redirecting...</div>
      </div>
    </div>
  );
}
