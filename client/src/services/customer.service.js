import { apiFetch } from "./api";

export const CustomerService = {
  me: () => apiFetch("/api/customer/me"),
  updateProfile: (payload) =>
    apiFetch("/api/customer/profile", {
      method: "PUT",
      body: payload
    }),
  changePassword: (payload) =>
    apiFetch("/api/customer/password", {
      method: "PATCH",
      body: payload
    }),
  createBooking: (payload) =>
    apiFetch("/api/customer/bookings", {
      method: "POST",
      body: payload
    }),
  bookings: () => apiFetch("/api/customer/bookings"),
  bookingMessages: (id) => apiFetch(`/api/customer/bookings/${id}/messages`),
  sendMessage: (id, payload) =>
    apiFetch(`/api/customer/bookings/${id}/messages`, {
      method: "POST",
      body: payload
    }),
  supportMessages: () => apiFetch("/api/contact/my"),
  sendSupportMessage: (payload) =>
    apiFetch("/api/contact", {
      method: "POST",
      body: payload
    }),
  confirmCashPayment: (id, payload) =>
    apiFetch(`/api/customer/bookings/${id}/cash-payment`, {
      method: "PATCH",
      body: payload
    }),
  submitRating: (id, payload) =>
    apiFetch(`/api/customer/bookings/${id}/rating`, {
      method: "POST",
      body: payload
    }),
  payments: () => apiFetch("/api/customer/payments")
};
