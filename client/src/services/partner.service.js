import { apiFetch } from "./api";

function buildQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      q.set(k, v);
    }
  });
  return q.toString();
}

export const PartnerService = {
  me: () => apiFetch("/api/partner/me"),
  updateProfile: (payload) =>
    apiFetch("/api/partner/profile", {
      method: "PUT",
      body: payload
    }),
  changePassword: (payload) =>
    apiFetch("/api/partner/password", {
      method: "PATCH",
      body: payload
    }),
  updateWorkingHours: (payload) =>
    apiFetch("/api/partner/working-hours", {
      method: "PATCH",
      body: payload
    }),
  updateAvailability: (payload) =>
    apiFetch("/api/partner/availability", {
      method: "PATCH",
      body: payload
    }),
  currentOrders: () => apiFetch("/api/partner/orders/current"),
  orderHistory: () => apiFetch("/api/partner/orders/history"),
  completeOrder: (id, payload) =>
    apiFetch(`/api/partner/orders/${id}/complete`, {
      method: "PATCH",
      body: payload
    }),
  updateProfilePhoto: (payload) => apiFetch("/api/partner/profile/photo", { method: "PATCH", body: payload }),
  setWorkPayment: (id, payload) => apiFetch(`/api/partner/orders/${id}/work-payment`, { method: "PUT", body: payload }),
  workPayments: () => apiFetch("/api/partner/work-payments"),
  rejectionRequests: () => apiFetch("/api/partner/rejection-requests"),
  requestOrderRejection: (id, payload) =>
    apiFetch(`/api/partner/orders/${id}/rejection-request`, {
      method: "POST",
      body: payload
    }),
  wallet: () => apiFetch("/api/partner/wallet"),
  savePayoutMethod: (payload) => apiFetch("/api/partner/wallet/payout-method", { method: "PUT", body: payload }),
  requestWithdrawal: (payload) =>
    apiFetch("/api/partner/wallet/withdrawals", {
      method: "POST",
      body: payload
    }),
  bookingMessages: (id) => apiFetch(`/api/partner/bookings/${id}/messages`),
  sendMessage: (id, payload) =>
    apiFetch(`/api/partner/bookings/${id}/messages`, {
      method: "POST",
      body: payload
    }),
  supportMessages: () => apiFetch("/api/contact/my"),
  sendSupportMessage: (payload) =>
    apiFetch("/api/contact", {
      method: "POST",
      body: payload
    }),
  list: (params) => {
    const qs = buildQuery(params);
    return apiFetch(`/api/partners?${qs}`);
  },
  top: (limit = 3) => apiFetch(`/api/partners/top?limit=${limit}`)
};
