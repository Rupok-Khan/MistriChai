import { apiFetch } from "./api";

export const AdminService = {
  login: (payload) =>
    apiFetch("/api/admin/login", {
      method: "POST",
      body: payload
    }),
  dashboard: () => apiFetch("/api/admin/dashboard"),
  pendingPartners: () => apiFetch("/api/admin/partners/pending"),
  partnerDetails: (userId) => apiFetch(`/api/admin/partners/${userId}`),
  approvePartner: (userId) =>
    apiFetch(`/api/admin/partners/${userId}/approve`, {
      method: "PATCH",
      body: {}
    }),
  rejectPartner: (userId, reason) =>
    apiFetch(`/api/admin/partners/${userId}/reject`, {
      method: "PATCH",
      body: { reason }
    }),
  bookings: () => apiFetch("/api/admin/bookings"),
  approveBookingPayment: (bookingId) =>
    apiFetch(`/api/admin/bookings/${bookingId}/approve-payment`, {
      method: "PATCH",
      body: {}
    }),
  approveWorkPayment: (id) => apiFetch(`/api/admin/work-payments/${id}/approve`, { method: "PATCH", body: {} }),
  assignBooking: (bookingId, payload) =>
    apiFetch(`/api/admin/bookings/${bookingId}/assign`, {
      method: "PATCH",
      body: payload
    }),
  refundBooking: (bookingId, payload) =>
    apiFetch(`/api/admin/bookings/${bookingId}/refund`, {
      method: "PATCH",
      body: payload
    }),
  reviewBookingChangeRequest: (requestId, payload) =>
    apiFetch(`/api/admin/booking-change-requests/${requestId}/review`, {
      method: "PATCH",
      body: payload
    }),
  withdrawals: () => apiFetch("/api/admin/withdrawals"),
  payWithdrawal: (withdrawalId, payload) =>
    apiFetch(`/api/admin/withdrawals/${withdrawalId}/pay`, {
      method: "PATCH",
      body: payload
    }),
  customers: () => apiFetch("/api/admin/customers"),
  partners: () => apiFetch("/api/admin/partners"),
  updateCustomer: (id, payload) =>
    apiFetch(`/api/admin/customers/${id}`, {
      method: "PUT",
      body: payload
    }),
  deleteCustomer: (id) =>
    apiFetch(`/api/admin/customers/${id}`, {
      method: "DELETE"
    }),
  updatePartnerAccount: (id, payload) =>
    apiFetch(`/api/admin/accounts/partners/${id}`, {
      method: "PUT",
      body: payload
    }),
  deletePartner: (id) =>
    apiFetch(`/api/admin/accounts/partners/${id}`, {
      method: "DELETE"
    }),
  contacts: () => apiFetch("/api/admin/contacts"),
  replyContact: (id, payload) =>
    apiFetch(`/api/admin/contacts/${id}/reply`, {
      method: "POST",
      body: payload
    }),
  deleteContact: (id) =>
    apiFetch(`/api/admin/contacts/${id}`, {
      method: "DELETE"
    }),
  siteContent: () => apiFetch("/api/admin/site-content"),
  updateSiteContent: (payload) =>
    apiFetch("/api/admin/site-content", {
      method: "PUT",
      body: payload
    }),
  listServices: () => apiFetch("/api/admin/services"),
  createService: (payload) =>
    apiFetch("/api/admin/services", {
      method: "POST",
      body: payload
    }),
  updateService: (key, payload) =>
    apiFetch(`/api/admin/services/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: payload
    }),
  deleteService: (key) =>
    apiFetch(`/api/admin/services/${encodeURIComponent(key)}`, {
      method: "DELETE"
    })
};
