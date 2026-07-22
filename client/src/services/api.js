// client/src/services/api.js
import { clearAdminAuth } from "../utils/adminAuth";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/api/auth/refresh`, { method: "POST", credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session expired");
        const data = await response.json();
        localStorage.setItem("token", data.token);
        return data.token;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function apiFetch(path, options = {}, retried = false) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem("token");
  const adminToken = localStorage.getItem("admin_token");

  // choose token based on route
  if (path.startsWith("/api/admin")) {
    if (adminToken) headers.set("Authorization", `Bearer ${adminToken}`);
  } else {
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const body = options.body;

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  // If body is present and NOT FormData, send JSON content-type
  if (!isFormData && body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // ✅ IMPORTANT: avoid double JSON.stringify
  let finalBody = undefined;

  if (isFormData) {
    finalBody = body; // browser sets correct boundary header
    // ensure we don't force JSON content-type for FormData
    if (headers.has("Content-Type")) headers.delete("Content-Type");
  } else if (body !== undefined) {
    if (typeof body === "string") {
      // already stringified JSON or plain text
      finalBody = body;
    } else {
      // object/array/number/etc -> stringify once
      finalBody = JSON.stringify(body);
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body: finalBody,
    credentials: "include",
  });

  if (res.status === 401 && !retried && !path.startsWith("/api/admin") && !path.startsWith("/api/auth/")) {
    try {
      await refreshAccessToken();
      return apiFetch(path, options, true);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth-session-expired"));
    }
  }

  // Admin JWTs do not use the customer refresh-cookie flow. If the Render
  // deployment rotated JWT_SECRET (or the token expired), discard the stale
  // token so the next request can start a clean admin login.
  if (res.status === 401 && path.startsWith("/api/admin")) {
    clearAdminAuth();
    window.dispatchEvent(new Event("admin-session-expired"));
  }

  // ✅ Always read text first
  const text = await res.text();

  // ✅ try parse json, else use text message
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || "Request failed" };
  }

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}
