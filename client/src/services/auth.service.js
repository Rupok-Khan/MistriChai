import { apiFetch } from "./api";

export const AuthService = {
  customerSignup: (payload) =>
    apiFetch("/api/auth/customer/signup", {
      method: "POST",
      body: payload, // ✅ object, not JSON.stringify
    }),

  customerLogin: (payload) =>
    apiFetch("/api/auth/customer/login", {
      method: "POST",
      body: payload, // ✅ object, not JSON.stringify
    }),

  partnerLogin: (payload) =>
    apiFetch("/api/auth/partner/login", {
      method: "POST",
      body: payload, // ✅ object
    }),

  partnerSignup: (formData) =>
    apiFetch("/api/auth/partner/signup", {
      method: "POST",
      body: formData, // ✅ FormData
    }),
};
