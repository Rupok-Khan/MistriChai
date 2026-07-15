import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CustomerService } from "../../services/customer.service";
import { DEFAULT_SERVICE_OPTIONS, buildServiceLabelMap, normalizeServiceOptions } from "../../utils/serviceCatalog";
import Loading from "../../components/Loading";
import Alert from "../../components/Alert";
import DashboardChatWindow from "../../components/DashboardChatWindow";
import { SiteContentService } from "../../services/siteContent.service";
import { PartnerService } from "../../services/partner.service";
import DashboardPagination from "../../components/DashboardPagination";
import DashboardInsights from "../../components/DashboardInsights";
import { paginate } from "../../utils/pagination";
import { resolveMediaUrl } from "../../utils/mediaUrl";

function SidebarButton({ active, label, count, onClick }) {
  return (
    <button type="button" className={`admin-sidebar-link ${active ? "active" : ""}`} onClick={onClick}>
      <span>{label}</span>
      {typeof count === "number" && <span className="admin-sidebar-count">{count}</span>}
    </button>
  );
}

function renderStars(value) {
  const total = 5;
  const full = Math.max(0, Math.min(total, Number(value || 0)));
  return `${"\u2605".repeat(full)}${"\u2606".repeat(total - full)}`;
}

export default function CustomerDashboard() {
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [me, setMe] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [workPayments, setWorkPayments] = useState([]);
  const [workTrxIds, setWorkTrxIds] = useState({});
  const [cancellationRequests, setCancellationRequests] = useState([]);
  const [cancellationDrafts, setCancellationDrafts] = useState({});
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportText, setSupportText] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [err, setErr] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [form, setForm] = useState({ name: "", email: "", mobile: "", address: "" });
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "" });
  const [replacementBooking, setReplacementBooking] = useState(null);
  const [replacementPartners, setReplacementPartners] = useState([]);
  const [replacementLoading, setReplacementLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [ratingDrafts, setRatingDrafts] = useState({});
  const [serviceOptions, setServiceOptions] = useState(DEFAULT_SERVICE_OPTIONS);
  const serviceLabelMap = buildServiceLabelMap(serviceOptions);

  const currentBookings = bookings.filter((booking) =>
    ["PAYMENT_PENDING", "PENDING_ASSIGNMENT", "WAITING_FOR_PARTNER", "ASSIGNED", "IN_PROGRESS"].includes(booking.status)
  );
  const previousBookings = bookings.filter((booking) =>
    ["COMPLETED", "REFUND_PENDING", "REFUNDED", "CANCELLED"].includes(booking.status)
  );
  const pendingRatingBookings = previousBookings.filter(
    (booking) => booking.status === "COMPLETED" && !booking.customer_rating
  );
  const historyRows = paginate(previousBookings, historyPage, 6);
  const currentRows = paginate(currentBookings, currentPage, 6);
  const cancellableBookings = currentBookings.filter(
    (booking) => booking.assigned_partner_user_id && ["ASSIGNED", "IN_PROGRESS"].includes(booking.status)
  );

  const loadAll = async () => {
    setErr("");
    try {
      const [meRes, bookingRes, paymentRes, supportRes, siteRes, cancellationRes, workPaymentRes] = await Promise.all([
        CustomerService.me(),
        CustomerService.bookings(),
        CustomerService.payments(),
        CustomerService.supportMessages(),
        SiteContentService.getPublic(),
        CustomerService.cancellationRequests(), CustomerService.workPayments()
      ]);

      setMe(meRes.data);
      setForm({
        name: meRes.data.name || "",
        email: meRes.data.email || "",
        mobile: meRes.data.mobile || "",
        address: meRes.data.address || ""
      });
      setBookings(bookingRes.data || []);
      setPayments(paymentRes.data || []);
      setWorkPayments(workPaymentRes.data || []);
      setCancellationRequests(cancellationRes.data || []);
      setSupportMessages(supportRes.data || []);
      setServiceOptions(normalizeServiceOptions(siteRes?.data?.services));
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!activeBookingId) {
      return undefined;
    }

    const timer = setInterval(() => {
      loadMessages(activeBookingId);
    }, 5000);

    return () => clearInterval(timer);
  }, [activeBookingId]);

  const loadMessages = async (bookingId) => {
    setActiveBookingId(bookingId);
    try {
      const res = await CustomerService.bookingMessages(bookingId);
      setMessages(res.data || []);
    } catch (e) {
      setErr(e.message);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await CustomerService.updateProfile(form);
      setMe(res.data);
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      await CustomerService.changePassword(passwordForm);
      setPasswordForm({ current_password: "", new_password: "" });
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!activeBookingId || (!messageText.trim() && !attachment)) {
      return;
    }
    try {
      const formData = new FormData();
      formData.append("message_text", messageText);
      if (attachment) {
        formData.append("attachment", attachment);
      }
      const res = await CustomerService.sendMessage(activeBookingId, formData);
      setMessages(res.data || []);
      setMessageText("");
      setAttachment(null);
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const sendSupportMessage = async (e) => {
    e.preventDefault();
    if (!supportText.trim()) {
      return;
    }
    try {
      setSupportLoading(true);
      await CustomerService.sendSupportMessage({ message: supportText.trim() });
      setSupportText("");
      const res = await CustomerService.supportMessages();
      setSupportMessages(res.data || []);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSupportLoading(false);
    }
  };

  const recordCashPayment = async (booking) => {
    try {
      await CustomerService.confirmCashPayment(booking.id, {
        amount: booking.estimated_cash_amount
      });
      await loadAll();
    } catch (e) {
      setErr(e.message);
    }
  };

  const updateRatingDraft = (bookingId, key, value) => {
    setRatingDrafts((prev) => ({
      ...prev,
      [bookingId]: {
        rating: prev[bookingId]?.rating || 0,
        review: prev[bookingId]?.review || "",
        ...prev[bookingId],
        [key]: value
      }
    }));
  };

  const submitRating = async (bookingId) => {
    const draft = ratingDrafts[bookingId] || { rating: 0, review: "" };
    if (!draft.rating) {
      setErr("Please choose a star rating first.");
      return;
    }

    try {
      await CustomerService.submitRating(bookingId, {
        rating: Number(draft.rating),
        review: draft.review || ""
      });
      setRatingDrafts((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      await loadAll();
    } catch (e) {
      setErr(e.message);
    }
  };

  const submitWorkPayment = async (id) => {
    try { await CustomerService.submitWorkPayment(id, { bkash_trx_id: workTrxIds[id] }); await loadAll(); }
    catch (e) { setErr(e.message); }
  };

  const approveWorkAmount = async (id) => {
    try { await CustomerService.approveWorkAmount(id); await loadAll(); }
    catch (e) { setErr(e.message); }
  };

  const updateCancellationDraft = (bookingId, key, value) => {
    setCancellationDrafts((prev) => ({
      ...prev,
      [bookingId]: { reason: "", proof: null, ...prev[bookingId], [key]: value }
    }));
  };

  const submitCancellationRequest = async (bookingId) => {
    const draft = cancellationDrafts[bookingId] || {};
    if (!String(draft.reason || "").trim()) {
      setErr("Please explain why you want to cancel this booking.");
      return;
    }
    try {
      const payload = new FormData();
      payload.append("reason", draft.reason.trim());
      if (draft.proof) payload.append("proof", draft.proof);
      await CustomerService.requestCancellation(bookingId, payload);
      setCancellationDrafts((prev) => ({ ...prev, [bookingId]: { reason: "", proof: null } }));
      await loadAll();
    } catch (e) {
      setErr(e.message);
    }
  };

  const submitPartnerChangeRequest = async (bookingId) => {
    const draft = cancellationDrafts[bookingId] || {};
    if (!String(draft.reason || "").trim()) { setErr("Please explain why you want another partner."); return; }
    try {
      const payload = new FormData();
      payload.append("reason", draft.reason.trim());
      if (draft.proof) payload.append("proof", draft.proof);
      await CustomerService.requestPartnerChange(bookingId, payload);
      setCancellationDrafts((prev) => ({ ...prev, [bookingId]: { reason: "", proof: null } }));
      await loadAll();
    } catch (e) { setErr(e.message); }
  };

  const browseReplacementPartners = async (booking) => {
    try {
      setReplacementLoading(true);
      setErr("");
      const res = await PartnerService.list({ category: booking.category });
      setReplacementPartners(res.data || []);
      setReplacementBooking(booking);
    } catch (e) { setErr(e.message); }
    finally { setReplacementLoading(false); }
  };

  const selectReplacementPartner = async (partnerId) => {
    try {
      setReplacementLoading(true);
      await CustomerService.selectReplacementPartner(replacementBooking.id, partnerId);
      setReplacementBooking(null);
      setReplacementPartners([]);
      await loadAll();
    } catch (e) { setErr(e.message); }
    finally { setReplacementLoading(false); }
  };

  const menuItems = [
    { key: "overview", label: "Overview" },
    { key: "notifications", label: "Notifications", count: pendingRatingBookings.length },
    { key: "profile", label: "Profile" },
    { key: "security", label: "Security" },
    { key: "current", label: "Current Orders", count: currentBookings.length },
    { key: "cancellations", label: "Cancellation Requests", count: cancellationRequests.filter((item) => item.status === "PENDING").length },
    { key: "previous", label: "Order History", count: previousBookings.length },
    { key: "payments", label: "Payments", count: payments.length },
    { key: "chat", label: "Chat Help" },
    { key: "support", label: "Support Messages", count: supportMessages.length }
  ];

  return (
    <div className="container section-pad dashboard-page dashboard-page-customer">
      <Alert type="danger">{err}</Alert>

      {!me ? (
        <Loading />
      ) : (
        <div className="admin-shell">
          <aside className="eco-card admin-sidebar">
            <div className="admin-sidebar-head">
              <h3 className="fw-bold mb-1">Customer Dashboard</h3>
              <div className="small-muted">Profile, orders, payments, and chat in focused sidebar sections.</div>
            </div>

            <div className="admin-sidebar-menu">
              {menuItems.map((item) => (
                <SidebarButton
                  key={item.key}
                  active={activeSection === item.key}
                  label={item.label}
                  count={item.count}
                  onClick={() => setActiveSection(item.key)}
                />
              ))}
            </div>

            <div className="admin-sidebar-actions">
              <Link className="btn eco-btn w-100" to="/services">Book New Service</Link>
            </div>
          </aside>

          <div className="admin-main">
            <div className="eco-card p-4 mb-3 dashboard-header">
              <div className="admin-panel-kicker">
                {activeSection === "overview" && "Overview"}
                {activeSection === "notifications" && "Notifications"}
                {activeSection === "profile" && "Profile"}
                {activeSection === "security" && "Security"}
                {activeSection === "current" && "Current Orders"}
                {activeSection === "cancellations" && "Cancellation Requests"}
                {activeSection === "previous" && "Previous Orders"}
                {activeSection === "payments" && "Payment History"}
                {activeSection === "chat" && "Live Chat"}
                {activeSection === "support" && "Support Messages"}
              </div>
              <div className="small-muted">
                {activeSection === "overview" && "See your account summary and jump quickly to the next action."}
                {activeSection === "notifications" && "Completed service jobs appear here until you submit your star rating."}
                {activeSection === "profile" && "Update your account information and address."}
                {activeSection === "security" && "Change your dashboard password."}
                {activeSection === "current" && "Track active bookings and open chat after assignment."}
                {activeSection === "cancellations" && "Request cancellation with a reason and optional proof. Admin must approve it."}
                {activeSection === "previous" && "Review completed, refunded, and closed bookings."}
                {activeSection === "payments" && "See your payment and refund history."}
                {activeSection === "chat" && "Chat becomes available after a technician is assigned to your order."}
                {activeSection === "support" && "Send a support message to admin and view admin replies."}
              </div>
            </div>

            {activeSection === "overview" && (
              <>
              <div className="row g-3 dashboard-overview">
                <div className="col-12 col-md-6 col-xl-3">
                  <div className="eco-card p-4 h-100 dashboard-primary-card">
                    <div className="small-muted">Active Orders</div>
                    <div className="fw-bold fs-3">{currentBookings.length}</div>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-xl-3">
                  <div className="eco-card p-4 h-100">
                    <div className="small-muted">Previous Orders</div>
                    <div className="fw-bold fs-3">{previousBookings.length}</div>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-xl-3">
                  <div className="eco-card p-4 h-100">
                    <div className="small-muted">Payments</div>
                    <div className="fw-bold fs-3">{payments.length}</div>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-xl-3">
                  <div className="eco-card p-4 h-100">
                    <div className="small-muted">Assigned Chats</div>
                    <div className="fw-bold fs-3">{currentBookings.filter((item) => item.assigned_partner_user_id).length}</div>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-xl-3">
                  <div className="eco-card p-4 h-100">
                    <div className="small-muted">Rating Notifications</div>
                    <div className="fw-bold fs-3">{pendingRatingBookings.length}</div>
                  </div>
                </div>
                <div className="col-12 col-lg-6">
                  <div className="eco-card p-4 h-100">
                    <div className="fw-bold mb-2">{me.name}</div>
                    <div className="small-muted mb-1">{me.mobile}</div>
                    <div className="small-muted mb-1">{me.email || "No email added"}</div>
                    <div className="small-muted">{me.address || "No address added yet"}</div>
                  </div>
                </div>
                <div className="col-12 col-lg-6">
                  <div className="eco-card p-4 h-100">
                    <div className="fw-bold mb-2">Quick Actions</div>
                    <div className="d-flex flex-wrap gap-2">
                      <button className="btn eco-btn-outline" onClick={() => setActiveSection("current")}>Open Current Orders</button>
                      <button className="btn eco-btn-outline" onClick={() => setActiveSection("payments")}>Open Payments</button>
                      <button className="btn eco-btn-outline" onClick={() => setActiveSection("notifications")}>Rate Completed Jobs</button>
                      <button className="btn eco-btn-outline" onClick={() => setActiveSection("profile")}>Edit Profile</button>
                    </div>
                  </div>
                </div>
              </div>
              <DashboardInsights title="Order progress" subtitle="Your service journey by status" segments={[
                { label: "Active", value: currentBookings.length, color: "#20a875" },
                { label: "Completed", value: previousBookings.filter((item) => item.status === "COMPLETED").length, color: "#6c63ff" },
                { label: "Other history", value: previousBookings.filter((item) => item.status !== "COMPLETED").length, color: "#ffb547" }
              ]} bars={[
                { label: "Orders", value: bookings.length, color: "#20a875" }, { label: "Active", value: currentBookings.length, color: "#2f8cff" },
                { label: "Paid", value: payments.length, color: "#6c63ff" }, { label: "Ratings", value: pendingRatingBookings.length, color: "#f0648b" }
              ]} highlight={`${currentBookings.length} active`} />
              </>
            )}

            {activeSection === "notifications" && (
              <div className="eco-card p-4">
                <div className="fw-bold mb-2">Rating Notifications</div>
                {pendingRatingBookings.length === 0 && (
                  <div className="small-muted">No pending rating requests right now.</div>
                )}
                {pendingRatingBookings.map((booking) => (
                  <div key={booking.id} className="border rounded-3 p-3 mb-3">
                    <div className="fw-semibold mb-1">
                      {booking.booking_code} | {serviceLabelMap[booking.category] || booking.category}
                    </div>
                    <div className="small-muted mb-2">
                      Partner: {booking.assigned_partner_first_name ? `${booking.assigned_partner_first_name} ${booking.assigned_partner_last_name}` : "Assigned"}
                    </div>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={`btn btn-sm ${Number(ratingDrafts[booking.id]?.rating || 0) >= star ? "eco-btn" : "eco-btn-outline"}`}
                          onClick={() => updateRatingDraft(booking.id, "rating", star)}
                        >
                          {star} {"\u2605"}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="form-control mb-2"
                      rows="2"
                      placeholder="Optional feedback"
                      value={ratingDrafts[booking.id]?.review || ""}
                      onChange={(e) => updateRatingDraft(booking.id, "review", e.target.value)}
                    />
                    <button className="btn eco-btn btn-sm" onClick={() => submitRating(booking.id)}>Submit Rating</button>
                  </div>
                ))}
              </div>
            )}

            {activeSection === "profile" && (
              <div className="eco-card p-4">
                <div className="fw-bold mb-2">Profile</div>
                <form className="row g-2" onSubmit={saveProfile}>
                  <div className="col-12">
                    <input className="form-control" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <input className="form-control" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <input className="form-control" value={form.mobile} onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <textarea className="form-control" rows="3" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <button className="btn eco-btn">Save Profile</button>
                  </div>
                </form>
              </div>
            )}

            {activeSection === "security" && (
              <div className="eco-card p-4">
                <div className="fw-bold mb-2">Security</div>
                <form className="row g-2" onSubmit={changePassword}>
                  <div className="col-12">
                    <input type="password" className="form-control" placeholder="Current password" value={passwordForm.current_password} onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <input type="password" className="form-control" placeholder="New password" value={passwordForm.new_password} onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <button className="btn eco-btn-outline">Change Password</button>
                  </div>
                </form>
              </div>
            )}

            {activeSection === "current" && (
              <div className="eco-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="fw-bold">Current Orders</div>
                  <Link className="btn eco-btn-outline" to="/services">Book New Service</Link>
                </div>
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Booking</th>
                        <th>Service</th>
                        <th>Partner</th>
                        <th>Status</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRows.items.map((booking) => (
                        <tr key={booking.id}>
                          <td>{booking.booking_code}</td>
                          <td>{serviceLabelMap[booking.category] || booking.category}</td>
                          <td>{booking.assigned_partner_first_name ? `${booking.assigned_partner_first_name} ${booking.assigned_partner_last_name}` : "Waiting for admin"}</td>
                          <td><span className="badge text-bg-secondary">{booking.status}</span></td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                              {booking.assigned_partner_user_id && (
                                <button className="btn eco-btn-outline btn-sm" onClick={() => loadMessages(booking.id)}>Chat</button>
                              )}
                              {!booking.assigned_partner_user_id && booking.status === "PENDING_ASSIGNMENT" && cancellationRequests.some((item) => Number(item.booking_id) === Number(booking.id) && item.request_type === "CUSTOMER_PARTNER_CHANGE" && item.status === "APPROVED") && (
                                <button className="btn eco-btn btn-sm" disabled={replacementLoading} onClick={() => browseReplacementPartners(booking)}>Browse New Partner</button>
                              )}
                              {booking.assigned_partner_user_id && ["ASSIGNED", "IN_PROGRESS"].includes(booking.status) && (() => {
                                const payment = workPayments.find((item) => Number(item.booking_id) === Number(booking.id));
                                const changesUsed = cancellationRequests.filter((item) => Number(item.booking_id) === Number(booking.id) && item.request_type === "CUSTOMER_PARTNER_CHANGE" && ["PENDING", "APPROVED"].includes(item.status)).length;
                                const canChange = (!payment || payment.status === "PROPOSED") && changesUsed < 2;
                                return <button className="btn eco-btn btn-sm" disabled={!canChange} title={!canChange ? (changesUsed >= 2 ? "Two free changes already used" : "Locked after final amount verification") : "Admin approval required; no new booking fee"} onClick={() => setActiveSection("cancellations")}>Change Partner ({Math.max(0, 2 - changesUsed)} left)</button>;
                              })()}
                              {booking.assigned_partner_user_id && ["ASSIGNED", "IN_PROGRESS"].includes(booking.status) && (
                                <button className="btn btn-outline-danger btn-sm" onClick={() => setActiveSection("cancellations")}>Request Cancel</button>
                              )}
                              {booking.status === "COMPLETED" && (
                                <button className="btn eco-btn btn-sm" onClick={() => recordCashPayment(booking)}>Cash Paid</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {currentBookings.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center small-muted">No current orders.</td>
                        </tr>
                      )}
                      {currentBookings.length > 0 && <tr><td colSpan="5"><DashboardPagination page={currentRows.page} pages={currentRows.pages} onChange={setCurrentPage} /></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === "cancellations" && (
              <div className="eco-card p-4">
                <div className="fw-bold mb-1">Change Partner or Cancel Booking</div>
                <div className="small-muted mb-3">Changing partner before a final amount is proposed keeps this booking and requires no additional booking fee. Admin will review and reassign it.</div>

                {cancellableBookings.map((booking) => {
                  const pending = cancellationRequests.some((item) => Number(item.booking_id) === Number(booking.id) && item.status === "PENDING");
                  const draft = cancellationDrafts[booking.id] || { reason: "", proof: null };
                  return (
                    <div key={booking.id} className="border rounded-3 p-3 mb-3">
                      <div className="fw-semibold">{booking.booking_code} | {serviceLabelMap[booking.category] || booking.category}</div>
                      <div className="small-muted mb-2">Partner: {booking.assigned_partner_first_name} {booking.assigned_partner_last_name}</div>
                      {pending ? (
                        <div className="alert alert-warning mb-0">This booking already has a request waiting for admin review.</div>
                      ) : (
                        <div className="row g-2">
                          <div className="col-12">
                            <textarea className="form-control" rows="3" minLength="10" placeholder="Explain why you need to cancel" value={draft.reason} onChange={(e) => updateCancellationDraft(booking.id, "reason", e.target.value)} />
                          </div>
                          <div className="col-12 col-md-8">
                            <input type="file" className="form-control" accept="image/*,.pdf,.doc,.docx,.txt" onChange={(e) => updateCancellationDraft(booking.id, "proof", e.target.files?.[0] || null)} />
                          </div>
                          <div className="col-12 col-md-4">
                            {(() => {
                              const payment = workPayments.find((item) => Number(item.booking_id) === Number(booking.id));
                              const changesUsed = cancellationRequests.filter((item) => Number(item.booking_id) === Number(booking.id) && item.request_type === "CUSTOMER_PARTNER_CHANGE" && ["PENDING", "APPROVED"].includes(item.status)).length;
                              if (changesUsed >= 2) return <div className="alert alert-warning py-2">Both free partner changes have already been used.</div>;
                              if (payment && payment.status !== "PROPOSED") return <div className="alert alert-warning py-2">You verified the final amount. Partner change now requires a new paid booking.</div>;
                              return <button type="button" className="btn eco-btn w-100 mb-2" onClick={() => submitPartnerChangeRequest(booking.id)}>Change Partner — No Extra Fee ({2 - changesUsed} left)</button>;
                            })()}
                            <button type="button" className="btn btn-outline-danger w-100" onClick={() => submitCancellationRequest(booking.id)}>Request Cancellation</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {cancellableBookings.length === 0 && <div className="small-muted mb-3">No assigned booking is currently eligible for cancellation.</div>}

                <div className="fw-bold mt-4 mb-2">Request History</div>
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead><tr><th>Booking</th><th>Reason / Proof</th><th>Status</th><th>Admin Note</th></tr></thead>
                    <tbody>
                      {cancellationRequests.map((item) => (
                        <tr key={item.id}>
                          <td>{item.booking_code}</td>
                          <td>
                            <div>{item.reason}</div>
                            {item.proof_url && <a href={resolveMediaUrl(item.proof_url)} target="_blank" rel="noreferrer">View proof</a>}
                          </td>
                          <td><span className="badge text-bg-secondary">{item.status}</span></td>
                          <td>{item.admin_note || "-"}</td>
                        </tr>
                      ))}
                      {cancellationRequests.length === 0 && <tr><td colSpan="4" className="text-center small-muted">No cancellation requests yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === "previous" && (
              <div className="eco-card p-4">
                <div className="fw-bold mb-2">Previous Orders</div>
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Booking</th>
                        <th>Service</th>
                        <th>Partner</th>
                        <th>Status</th>
                        <th>Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.items.map((booking) => (
                        <tr key={booking.id}>
                          <td>{booking.booking_code}</td>
                          <td>{serviceLabelMap[booking.category] || booking.category}</td>
                          <td>{booking.assigned_partner_first_name ? `${booking.assigned_partner_first_name} ${booking.assigned_partner_last_name}` : "Not assigned"}</td>
                          <td><span className="badge text-bg-secondary">{booking.status}</span></td>
                          <td style={{ minWidth: 280 }}>
                            {booking.customer_rating ? (
                              <div>
                                <div className="fw-semibold">{renderStars(booking.customer_rating)} ({booking.customer_rating}/5)</div>
                                {booking.customer_review && <div className="small-muted">{booking.customer_review}</div>}
                              </div>
                            ) : booking.status === "COMPLETED" ? (
                              <div>
                                <div className="d-flex flex-wrap gap-1 mb-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      className={`btn btn-sm ${Number(ratingDrafts[booking.id]?.rating || 0) >= star ? "eco-btn" : "eco-btn-outline"}`}
                                      onClick={() => updateRatingDraft(booking.id, "rating", star)}
                                    >
                                      {star} {"\u2605"}
                                    </button>
                                  ))}
                                </div>
                                <textarea
                                  className="form-control form-control-sm mb-2"
                                  rows="2"
                                  placeholder="Optional feedback"
                                  value={ratingDrafts[booking.id]?.review || ""}
                                  onChange={(e) => updateRatingDraft(booking.id, "review", e.target.value)}
                                />
                                <button className="btn eco-btn btn-sm" onClick={() => submitRating(booking.id)}>Rate Now</button>
                              </div>
                            ) : (
                              <span className="small-muted">Not available</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {previousBookings.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center small-muted">No previous orders yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <DashboardPagination page={historyRows.page} pages={historyRows.pages} onChange={setHistoryPage} />
              </div>
            )}

            {activeSection === "payments" && (
              <div className="eco-card p-4">
                <div className="fw-bold mb-2">Final Work Payments</div>
                <div className="alert alert-info">Send the exact amount to bKash <b>01984646174</b>, then submit the TrxID. The partner sets the amount; customers cannot edit it.</div>
                {workPayments.map((item) => <div className="border rounded-3 p-3 mb-3" key={item.id}>
                  <div className="fw-semibold">{item.booking_code} — {item.partner_name}</div>
                  <div>Amount: <b>৳{Number(item.amount).toFixed(2)}</b> | Status: <span className="badge text-bg-secondary">{item.status}</span></div>
                  {item.status === "PROPOSED" && <div className="mt-2"><div className="small-muted mb-2">Verify the final amount agreed with your partner. Payment will open immediately after confirmation.</div><button className="btn eco-btn" onClick={() => approveWorkAmount(item.id)}>Verify Final Amount</button></div>}
                  {item.status === "ADMIN_APPROVED" && <div className="input-group mt-2"><input className="form-control" placeholder="bKash TrxID" value={workTrxIds[item.id] || ""} onChange={(e) => setWorkTrxIds((p) => ({...p, [item.id]: e.target.value}))} /><button className="btn eco-btn" onClick={() => submitWorkPayment(item.id)}>Submit Payment</button></div>}
                  {item.bkash_trx_id && <div className="small-muted mt-1">TrxID: {item.bkash_trx_id}</div>}
                </div>)}
                {workPayments.length === 0 && <div className="small-muted mb-3">No final work payment has been requested.</div>}
                <div className="fw-bold mb-2">Payment History</div>
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Booking</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Method / TrxID</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((item) => (
                        <tr key={item.id}>
                          <td>{new Date(item.created_at).toLocaleString()}</td>
                          <td>{item.booking_code || "-"}</td>
                          <td>{item.transaction_type}</td>
                          <td>{item.amount}</td>
                          <td>
                            <div>{item.payment_method}</div>
                            {item.transaction_reference && <div className="small-muted">{item.transaction_reference}</div>}
                          </td>
                          <td>{item.status}</td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center small-muted">No payment records yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === "chat" && (
              <div className="eco-card p-4">
                <div className="fw-bold mb-2">Live Chat</div>
                <div className="small-muted">
                  Chat becomes available after admin assigns a technician. Use the `Chat` button from your assigned order.
                </div>
              </div>
            )}

            {activeSection === "support" && (
              <div className="eco-card p-4">
                <div className="fw-bold mb-3">Support Messages</div>
                <form className="row g-2 mb-3" onSubmit={sendSupportMessage}>
                  <div className="col-12">
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Write your message to admin"
                      value={supportText}
                      onChange={(e) => setSupportText(e.target.value)}
                      disabled={supportLoading}
                    />
                  </div>
                  <div className="col-12">
                    <button className="btn eco-btn" disabled={supportLoading || !supportText.trim()}>
                      {supportLoading ? "Sending..." : "Send to Admin"}
                    </button>
                  </div>
                </form>

                {supportMessages.length === 0 && <div className="small-muted">No support messages yet.</div>}
                {supportMessages.map((item) => (
                  <div key={item.id} className="border rounded-3 p-3 mb-3">
                    <div className="small-muted mb-1">You | {new Date(item.created_at).toLocaleString()}</div>
                    <div>{item.message}</div>
                    {(item.replies || []).map((reply) => (
                      <div key={reply.id} className="bg-light rounded-3 p-2 mt-2">
                        <div className="small-muted mb-1">Admin | {new Date(reply.created_at).toLocaleString()}</div>
                        <div>{reply.reply_text}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {replacementBooking && (
        <div className="payout-modal-backdrop" role="presentation" onMouseDown={() => setReplacementBooking(null)}>
          <div className="payout-modal replacement-partner-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div><h5 className="mb-1">Choose a New Partner</h5><div className="small-muted">Showing only {serviceLabelMap[replacementBooking.category] || replacementBooking.category} partners. Admin will make the final assignment.</div></div>
              <button type="button" className="btn-close" aria-label="Close" onClick={() => setReplacementBooking(null)} />
            </div>
            <div className="replacement-partner-list">
              {replacementPartners.map((partner) => {
                const available = String(partner.availability_status || "").toUpperCase() === "AVAILABLE";
                return <div className="replacement-partner-card" key={partner.id}>
                  <div className="d-flex align-items-center gap-3">
                    {partner.profile_photo_url ? <img src={partner.profile_photo_url} alt={partner.name} className="replacement-partner-photo" /> : <div className="replacement-partner-photo replacement-photo-fallback">{partner.name?.charAt(0)}</div>}
                    <div className="flex-grow-1"><div className="fw-semibold">{partner.name}</div><div className="small-muted">{partner.partner_code || "Approved partner"} · {partner.experience_years || 0} years</div><span className={`badge mt-1 ${available ? "text-bg-success" : "text-bg-secondary"}`}>{available ? "Available" : "Busy"}</span></div>
                    <button className="btn eco-btn btn-sm" disabled={replacementLoading} onClick={() => selectReplacementPartner(partner.id)}>Request</button>
                  </div>
                </div>;
              })}
              {!replacementLoading && replacementPartners.length === 0 && <div className="alert alert-secondary mb-0">No approved partners are listed for this category.</div>}
            </div>
          </div>
        </div>
      )}

      <DashboardChatWindow
        title="Customer Chat"
        visible={Boolean(activeBookingId)}
        messages={messages}
        messageText={messageText}
        onChangeMessage={setMessageText}
        onSend={sendMessage}
        attachment={attachment}
        onChangeAttachment={setAttachment}
        apiBase={apiBase}
        currentUserId={me?.id}
        onClose={() => {
          setActiveBookingId(null);
          setMessages([]);
          setMessageText("");
          setAttachment(null);
        }}
      />
    </div>
  );
}
