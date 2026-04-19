import React, { useContext } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/auth");
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
            <li className="nav-item"><NavLink className="nav-link" to="/">Home</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/services">Services</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/about">About</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/contact">Contact</NavLink></li>

            {!user ? (
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
          </ul>
        </div>
      </div>
    </nav>
  );
}
