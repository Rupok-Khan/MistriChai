// client/src/utils/adminAuth.js

export function setAdminAuth(data) {
  localStorage.setItem("admin_token", data.token);
  localStorage.setItem("admin_user", JSON.stringify(data.user));
}

export function getAdminToken() {
  return localStorage.getItem("admin_token");
}

export function getAdminUser() {
  try {
    const raw = localStorage.getItem("admin_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAdminAuth() {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_user");
}
