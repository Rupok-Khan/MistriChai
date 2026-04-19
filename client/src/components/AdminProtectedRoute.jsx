import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAdminToken, getAdminUser } from "../utils/adminAuth";

export default function AdminProtectedRoute({ children }) {
  const location = useLocation();
  const token = getAdminToken();
  const user = getAdminUser();

  if (!token || user?.role !== "ADMIN") {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
