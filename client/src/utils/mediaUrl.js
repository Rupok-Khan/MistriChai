const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function resolveMediaUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}
