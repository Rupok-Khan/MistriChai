// client/src/services/api.js
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function apiFetch(path, options = {}) {
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
  });

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
