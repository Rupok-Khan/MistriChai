import { apiFetch } from "./api";

export const SiteContentService = {
  getPublic: () => apiFetch("/api/site-content"),
  getServices: async () => {
    const res = await apiFetch("/api/site-content");
    return res?.data?.services || [];
  }
};
