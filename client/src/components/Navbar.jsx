import React, { useContext } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { clearAdminAuth, getAdminToken, getAdminUser } from "../utils/adminAuth";
import { PreferencesContext } from "../context/preferencesContext";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { isBangla, theme, toggleTheme } = useContext(PreferencesContext);
  const adminUser = getAdminToken() ? getAdminUser() : null;
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/auth");
  };

  const onAdminLogout = () => {
    clearAdminAuth();
    navigate("/admin/login");
  };

  return (
    <nav className="navbar navbar-expand-lg eco-navbar sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">
          On<span style={{ color: "var(--eco-700)" }}>Demand</span>
        </Link>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div id="nav" className="collapse navbar-collapse">
          <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-2">
            <li className="nav-item"><NavLink className="nav-link" to="/">{isBangla ? "হোম" : "Home"}</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/services">{isBangla ? "সেবাসমূহ" : "Services"}</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/about">{isBangla ? "আমাদের সম্পর্কে" : "About"}</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/contact">{isBangla ? "যোগাযোগ" : "Contact"}</NavLink></li>
            {adminUser?.role === "ADMIN" ? (
              <>
                <li className="nav-item small-muted me-lg-2">Admin: <b>{adminUser.email}</b></li>
                <li className="nav-item">
                  <Link className="btn eco-btn-outline me-2" to="/admin/dashboard">Admin Dashboard</Link>
                </li>
                <li className="nav-item">
                  <button className="btn eco-btn" onClick={onAdminLogout}>Logout</button>
                </li>
              </>
            ) : !user ? (
              <li className="nav-item">
                <Link className="btn eco-btn ms-lg-2" to="/auth">Login / Signup</Link>
              </li>
            ) : (
              <>
                <li className="nav-item small-muted me-lg-2">
                  {user.role === "CUSTOMER" ? "Customer" : "Partner"}: <b>{user.name}</b>
                </li>
                <li className="nav-item">
                  <Link className="btn eco-btn-outline me-2" to={user.role === "CUSTOMER" ? "/customer/dashboard" : "/partner/dashboard"}>
                    Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <button className="btn eco-btn" onClick={onLogout}>Logout</button>
                </li>
              </>
            )}
            <li className="nav-item theme-toggle-item">
              <button
                type="button"
                className="btn theme-toggle"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? (isBangla ? "লাইট মোড চালু করুন" : "Switch to light mode") : (isBangla ? "ডার্ক মোড চালু করুন" : "Switch to dark mode")}
                title={theme === "dark" ? (isBangla ? "লাইট মোড" : "Light mode") : (isBangla ? "ডার্ক মোড" : "Dark mode")}
              >
                <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
