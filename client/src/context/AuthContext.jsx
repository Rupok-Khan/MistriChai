import React, { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContext.js";

export { AuthContext } from "./authContext.js";

export function AuthProvider({ children }) {
  // Initialize from localStorage ONCE (no setState inside effect needed)
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = (payload) => {
    // payload = { token, user }
    localStorage.setItem("token", payload.token);
    localStorage.setItem("user", JSON.stringify(payload.user));
    setUser(payload.user);
  };

  const logout = () => {
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...updates };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  };

  // Optional: keep state in sync if user logs out in another tab
  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem("user");
        setUser(raw ? JSON.parse(raw) : null);
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("storage", handler);
    window.addEventListener("auth-session-expired", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("auth-session-expired", handler);
    };
  }, []);

  const value = useMemo(() => ({ user, login, logout, updateUser }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
