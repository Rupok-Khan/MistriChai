import React, { useContext, useEffect, useState } from "react";
import { PartnerService } from "../../services/partner.service";
import { DEFAULT_SERVICE_OPTIONS, buildServiceLabelMap, normalizeServiceOptions } from "../../utils/serviceCatalog";
import Loading from "../../components/Loading";
import Alert from "../../components/Alert";
import DashboardChatWindow from "../../components/DashboardChatWindow";
import { SiteContentService } from "../../services/siteContent.service";
import { AuthContext } from "../../context/AuthContext";
import DashboardPagination from "../../components/DashboardPagination";
import { paginate } from "../../utils/pagination";
import { resolveMediaUrl } from "../../utils/mediaUrl";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const PROFILE_FIELD_LABELS = {
  first_name: "First Name",
  last_name: "Last Name",
  email: "Email Address",
  mobile: "Mobile Number",
  nid_address: "NID Address",
  nid_number: "NID Number",
  father_name: "Father's Name",
  mother_name: "Mother's Name",
  district: "District",
  thana: "Thana / Upazila",
  ward_no: "Ward Number",
  city_corp_or_union: "City Corporation / Municipality / Union",
  technician_category: "Service Category",
  experience_years: "Years of Experience",
  facebook_url: "Facebook Profile URL",
  instagram_url: "Instagram Profile URL",
  linkedin_url: "LinkedIn Profile URL",
  whatsapp_url: "WhatsApp Link"
};

function SidebarButton({ active, label, count, onClick }) {
  return (
    <button type="button" className={`admin-sidebar-link ${active ? "active" : ""}`} onClick={onClick}>
      <span>{label}</span>
      {typeof count === "number" && <span className="admin-sidebar-count">{count}</span>}
    </button>
  );
}

export default function PartnerDashboard() {
  const { updateUser } = useContext(AuthContext);
  const [me, setMe] = useState(null);
  const [currentOrders, setCurrentOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [workPayments, setWorkPayments] = useState([]);
  const [workAmounts, setWorkAmounts] = useState({});
  const [finalPaymentOrder, setFinalPaymentOrder] = useState(null);
  const [finalPaymentSaving, setFinalPaymentSaving] = useState(false);
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [rejectionRequests, setRejectionRequests] = useState([]);
  const [rejectionDrafts, setRejectionDrafts] = useState({});
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportText, setSupportText] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [err, setErr] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [profileForm, setProfileForm] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "" });
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", note: "" });
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ method: "BKASH", account_name: "", account_number: "", bank_name: "", branch_name: "", routing_number: "" });
  const [historyPage, setHistoryPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [workingHours, setWorkingHours] = useState({ working_start_time: "09:00", working_end_time: "18:00" });
  const [serviceOptions, setServiceOptions] = useState(DEFAULT_SERVICE_OPTIONS);
  const serviceLabelMap = buildServiceLabelMap(serviceOptions);
  const serviceCategoryActive = me?.service_category_active !== false;
  const paidWorkPayments = workPayments.filter((item) => item.status === "PAID");
  const historyRows = paginate(history, historyPage, 6);
  const currentRows = paginate(currentOrders, currentPage, 6);

  const loadAll = async () => {
    setErr("");
    try {
      const [meRes, currentRes, historyRes, walletRes, supportRes, siteRes, rejectionRes, workPaymentRes] = await Promise.all([
        PartnerService.me(),
        PartnerService.currentOrders(),
        PartnerService.orderHistory(),
        PartnerService.wallet(),
        PartnerService.supportMessages(),
        SiteContentService.getPublic(),
        PartnerService.rejectionRequests(), PartnerService.workPayments()
      ]);

      setMe(meRes.data);
      setProfileForm({
        first_name: meRes.data.first_name,
        last_name: meRes.data.last_name,
        email: meRes.data.email || "",
        mobile: meRes.data.mobile,
        nid_address: meRes.data.nid_address,
        nid_number: meRes.data.nid_number,
        father_name: meRes.data.father_name,
        mother_name: meRes.data.mother_name,
        district: meRes.data.district,
        thana: meRes.data.thana,
        ward_no: meRes.data.ward_no,
        city_corp_or_union: meRes.data.city_corp_or_union,
        technician_category: meRes.data.technician_category,
        experience_years: meRes.data.experience_years,
        facebook_url: meRes.data.facebook_url || "",
        instagram_url: meRes.data.instagram_url || "",
        linkedin_url: meRes.data.linkedin_url || "",
        whatsapp_url: meRes.data.whatsapp_url || ""
      });
      setWorkingHours({
        working_start_time: meRes.data.working_start_time?.slice(0, 5) || "09:00",
        working_end_time: meRes.data.working_end_time?.slice(0, 5) || "18:00"
      });
      setCurrentOrders(currentRes.data || []);
      setHistory(historyRes.data || []);
      setWorkPayments(workPaymentRes.data || []);
      setWallet(walletRes.data || { balance: 0, transactions: [] });
      if (walletRes.data?.payout_method) setPayoutForm((previous) => ({ ...previous, ...walletRes.data.payout_method }));
      setRejectionRequests(rejectionRes.data || []);
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
      const res = await PartnerService.bookingMessages(bookingId);
      setMessages(res.data || []);
    } catch (e) {
      setErr(e.message);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await PartnerService.updateProfile(profileForm);
      setMe(res.data);
      updateUser({
        name: `${res.data.first_name} ${res.data.last_name}`.trim(),
        email: res.data.email,
        mobile: res.data.mobile
      });
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const saveWorkingHours = async (e) => {
    e.preventDefault();
    try {
      const res = await PartnerService.updateWorkingHours(workingHours);
      setMe(res.data);
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const updateAvailability = async (availability_status) => {
    try {
      const res = await PartnerService.updateAvailability({ availability_status });
      setMe(res.data);
    } catch (e) {
      setErr(e.message);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      await PartnerService.changePassword(passwordForm);
      setPasswordForm({ current_password: "", new_password: "" });
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const completeOrder = async (orderId) => {
    try {
      await PartnerService.completeOrder(orderId, { partner_note: "Completed by partner" });
      await loadAll();
    } catch (e) {
      setErr(e.message);
    }
  };

  const uploadProfilePhoto = async (e) => {
    e.preventDefault();
    if (!profilePhoto) { setErr("Choose a profile image first."); return; }
    try {
      setPhotoUploading(true);
      setErr("");
      const payload = new FormData();
      payload.append("profile_photo", profilePhoto);
      const res = await PartnerService.updateProfilePhoto(payload);
      setMe(res.data);
      setProfilePhoto(null);
    } catch (error) { setErr(error.message); }
    finally { setPhotoUploading(false); }
  };

  const saveWorkAmount = async (orderId) => {
    const amount = Number(workAmounts[orderId]);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErr("Enter a valid final payment amount.");
      return;
    }
    try {
      setFinalPaymentSaving(true);
      setErr("");
      await PartnerService.setWorkPayment(orderId, { amount });
      await loadAll();
      setFinalPaymentOrder(null);
    } catch (e) { setErr(e.message); }
    finally { setFinalPaymentSaving(false); }
  };

  const openFinalPaymentModal = (order) => {
    const payment = workPayments.find((item) => Number(item.booking_id) === Number(order.id));
    setWorkAmounts((previous) => ({ ...previous, [order.id]: previous[order.id] || payment?.amount || "" }));
    setFinalPaymentOrder(order);
    setErr("");
  };

  const updateRejectionDraft = (bookingId, key, value) => {
    setRejectionDrafts((prev) => ({
      ...prev,
      [bookingId]: { reason: "", proof: null, ...prev[bookingId], [key]: value }
    }));
  };

  const submitRejectionRequest = async (bookingId) => {
    const draft = rejectionDrafts[bookingId] || {};
    if (!String(draft.reason || "").trim()) {
      setErr("Please explain why you want to reject this job.");
      return;
    }
    try {
      const payload = new FormData();
      payload.append("reason", draft.reason.trim());
      if (draft.proof) payload.append("proof", draft.proof);
      await PartnerService.requestOrderRejection(bookingId, payload);
      setRejectionDrafts((prev) => ({ ...prev, [bookingId]: { reason: "", proof: null } }));
      await loadAll();
    } catch (e) {
      setErr(e.message);
    }
  };

  const requestWithdrawal = async (e) => {
    e.preventDefault();
    try {
      await PartnerService.requestWithdrawal({
        amount: Number(withdrawForm.amount),
        note: withdrawForm.note
      });
      setWithdrawForm({ amount: "", note: "" });
      await loadAll();
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const savePayoutMethod = async (e) => {
    e.preventDefault();
    try {
      setPayoutSaving(true);
      setErr("");
      const res = await PartnerService.savePayoutMethod(payoutForm);
      setWallet(res.data);
      setPayoutForm((previous) => ({ ...previous, ...res.data.payout_method }));
      setShowPayoutModal(false);
    } catch (error) {
      setErr(error.message);
    } finally {
      setPayoutSaving(false);
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
      const res = await PartnerService.sendMessage(activeBookingId, formData);
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
      await PartnerService.sendSupportMessage({ message: supportText.trim() });
      setSupportText("");
      const res = await PartnerService.supportMessages();
      setSupportMessages(res.data || []);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSupportLoading(false);
    }
  };

  const menuItems = [
    { key: "overview", label: "Overview" },
    { key: "availability", label: "Availability" },
    { key: "profile", label: "Profile Edit" },
    { key: "security", label: "Security" },
    { key: "current", label: "Current Orders", count: currentOrders.length },
    { key: "rejections", label: "Job Rejection Requests", count: rejectionRequests.filter((item) => item.status === "PENDING").length },
    { key: "wallet", label: "Wallet", count: wallet.transactions?.length || 0 },
    { key: "history", label: "Order History", count: history.length },
    { key: "chat", label: "Chat Help" },
    { key: "support", label: "Support Messages", count: supportMessages.length }
  ];

  return (
    <div className="container section-pad">
      <Alert type="danger">{err}</Alert>

      {!me || !profileForm ? (
        <Loading />
      ) : (
        <div className="admin-shell">
          <aside className="eco-card admin-sidebar">
            <div className="admin-sidebar-head">
              <h3 className="fw-bold mb-1">Partner Dashboard</h3>
              <div className="small-muted">Profile, availability, orders, wallet, and chat in focused sidebar sections.</div>
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
          </aside>

          <div className="admin-main">
            <div className="eco-card p-4 mb-3">
              <div className="admin-panel-kicker">
                {activeSection === "overview" && "Overview"}
                {activeSection === "availability" && "Availability"}
                {activeSection === "profile" && "Profile Edit"}
                {activeSection === "security" && "Security"}
                {activeSection === "current" && "Current Orders"}
                {activeSection === "rejections" && "Job Rejection Requests"}
                {activeSection === "wallet" && "Wallet and Withdraw"}
                {activeSection === "history" && "Order History"}
                {activeSection === "chat" && "Live Chat"}
                {activeSection === "support" && "Support Messages"}
              </div>
              <div className="small-muted">
                {activeSection === "overview" && "Check your verification, balance, and active work summary."}
                {activeSection === "availability" && "Update your availability and working hours."}
                {activeSection === "profile" && "Edit your profile and technician information."}
                {activeSection === "security" && "Change your dashboard password."}
                {activeSection === "current" && "Manage assigned jobs and complete them when finished."}
                {activeSection === "rejections" && "Ask admin to release an assigned job, with a reason and optional proof."}
                {activeSection === "wallet" && "Review wallet activity and request withdrawals."}
                {activeSection === "history" && "Review completed and previous service orders."}
                {activeSection === "chat" && "Use chat from current orders to talk with assigned customers."}
                {activeSection === "support" && "Send support messages to admin and see admin replies."}
              </div>
            </div>

            {activeSection === "overview" && (
              <div className="row g-3">
                {!serviceCategoryActive && (
                  <div className="col-12">
                    <div className="alert alert-warning mb-0">Your service category has been removed or temporarily deactivated. Your account and history are preserved; you will automatically become eligible for new jobs when admin reactivates this category.</div>
                  </div>
                )}
                <div className="col-12 col-lg-6">
                  <div className="eco-card p-4 h-100">
                    <div className="d-flex gap-3 align-items-center">
                      <img className="img-fluid rounded-3 border" src={resolveMediaUrl(me.profile_photo)} alt="profile" style={{ width: 90, height: 90, objectFit: "cover" }} />
                      <div>
                        <div className="fw-bold">{me.first_name} {me.last_name}</div>
                        <div className="small-muted">{serviceLabelMap[me.technician_category] || me.technician_category}</div>
                        <div className="small-muted">Partner Code: {me.partner_code || "After admin approval"}</div>
                      </div>
                    </div>
                    <hr />
                    <div className="small-muted">Verification: <b>{me.verification_status}</b></div>
                    <div className="small-muted">Availability: <b>{me.availability_status}</b></div>
                    <div className="small-muted">Wallet Balance: <b>{wallet.balance}</b></div>
                    {me.rejection_reason && <div className="alert alert-danger mt-3 mb-0">{me.rejection_reason}</div>}
                  </div>
                </div>
                <div className="col-12 col-lg-6">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <div className="eco-card p-4 h-100">
                        <div className="small-muted">Active Orders</div>
                        <div className="fw-bold fs-3">{currentOrders.length}</div>
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="eco-card p-4 h-100">
                        <div className="small-muted">Order History</div>
                        <div className="fw-bold fs-3">{history.length}</div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="eco-card p-4 h-100">
                        <div className="fw-bold mb-2">Quick Actions</div>
                        <div className="d-flex flex-wrap gap-2">
                          <button className="btn eco-btn-outline" onClick={() => setActiveSection("current")}>Open Orders</button>
                          <button className="btn eco-btn-outline" onClick={() => setActiveSection("wallet")}>Open Wallet</button>
                          <button className="btn eco-btn-outline" onClick={() => setActiveSection("availability")}>Update Availability</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "availability" && (
              <div className="eco-card p-4">
                <div className="fw-bold mb-2">Availability</div>
                {!serviceCategoryActive && <div className="alert alert-warning">Availability cannot be changed while your service category is inactive. It will unlock automatically after reactivation.</div>}
                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn eco-btn-outline" disabled={!serviceCategoryActive} onClick={() => updateAvailability("AVAILABLE")}>Available</button>
                  <button className="btn eco-btn-outline" disabled={!serviceCategoryActive} onClick={() => updateAvailability("BUSY")}>Busy</button>
                  <button className="btn eco-btn-outline" disabled={!serviceCategoryActive} onClick={() => updateAvailability("OFFLINE")}>Offline</button>
                </div>
                <form className="row g-2 mt-3" onSubmit={saveWorkingHours}>
                  <div className="col-6">
                    <input type="time" className="form-control" value={workingHours.working_start_time} onChange={(e) => setWorkingHours((p) => ({ ...p, working_start_time: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <input type="time" className="form-control" value={workingHours.working_end_time} onChange={(e) => setWorkingHours((p) => ({ ...p, working_end_time: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <button className="btn eco-btn">Save Working Time</button>
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

            {activeSection === "profile" && (
              <div className="eco-card p-4">
                <div className="fw-bold mb-2">Profile Edit</div>
                <form className="partner-photo-editor mb-4" onSubmit={uploadProfilePhoto}>
                  <img src={profilePhoto ? URL.createObjectURL(profilePhoto) : resolveMediaUrl(me.profile_photo)} alt={`${me.first_name} profile`} />
                  <div className="flex-grow-1">
                    <div className="fw-semibold">Profile photo</div>
                    <div className="small-muted mb-2">JPG, PNG, WebP, HEIC or AVIF. Maximum 5MB.</div>
                    <input type="file" className="form-control" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif" onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)} />
                  </div>
                  <button className="btn eco-btn" disabled={!profilePhoto || photoUploading}>{photoUploading ? "Uploading..." : "Update Photo"}</button>
                </form>
                <form className="row g-2" onSubmit={saveProfile}>
                  {Object.entries(profileForm).map(([key, value]) => (
                    <div key={key} className={key === "nid_address" ? "col-12" : "col-12 col-md-6"}>
                      <label className="form-label" htmlFor={`partner-profile-${key}`}>{PROFILE_FIELD_LABELS[key] || key.replace(/_/g, " ")}</label>
                      {key === "technician_category" ? (
                        <select id={`partner-profile-${key}`} className="form-select" value={value} onChange={(e) => setProfileForm((p) => ({ ...p, [key]: e.target.value }))}>
                          {!serviceCategoryActive && <option value={me.technician_category}>{me.service_category_title || me.technician_category} (Service inactive)</option>}
                          {serviceOptions.map((option) => (
                            <option key={option.key} value={option.key}>{option.title}</option>
                          ))}
                        </select>
                      ) : key === "nid_address" ? (
                        <textarea id={`partner-profile-${key}`} className="form-control" rows="2" value={value} onChange={(e) => setProfileForm((p) => ({ ...p, [key]: e.target.value }))} />
                      ) : (
                        <input id={`partner-profile-${key}`} type={key === "email" ? "email" : key === "experience_years" ? "number" : key.endsWith("_url") ? "url" : "text"} min={key === "experience_years" ? "0" : undefined} placeholder={key.endsWith("_url") ? "https://..." : undefined} className="form-control" value={value} onChange={(e) => setProfileForm((p) => ({ ...p, [key]: e.target.value }))} />
                      )}
                    </div>
                  ))}
                  <div className="col-12">
                    <button className="btn eco-btn">Save Profile</button>
                  </div>
                </form>
              </div>
            )}

            {activeSection === "current" && (
                <div className="eco-card p-4">
                  <div className="fw-bold mb-2">Current Orders</div>
                  {paidWorkPayments.length > 0 && <div className="alert alert-success">{paidWorkPayments.length} final payment(s) approved. You can now complete those jobs.</div>}
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Booking</th>
                        <th>Customer</th>
                        <th>Service</th>
                        <th>Status</th><th>Work Payment</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRows.items.map((order) => (
                        <tr key={order.id}>
                          <td>{order.booking_code}</td>
                          <td>{order.customer_name}</td>
                          <td>{serviceLabelMap[order.category] || order.category}</td>
                          <td>{order.status}</td>
                          <td>
                            <div className="d-flex flex-column align-items-start gap-2">
                              {(() => {
                                const payment = workPayments.find((item) => Number(item.booking_id) === Number(order.id));
                                return payment ? <span className="fw-semibold">৳{payment.amount} <span className="badge bg-success ms-1">{payment.status}</span></span> : <span className="small-muted">Not set</span>;
                              })()}
                              <button type="button" className="btn eco-btn-outline btn-sm" onClick={() => openFinalPaymentModal(order)}>Set Final Payment</button>
                            </div>
                          </td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                              <button className="btn eco-btn-outline btn-sm" onClick={() => loadMessages(order.id)}>Chat</button>
                              <button className="btn btn-outline-danger btn-sm" onClick={() => setActiveSection("rejections")}>Request Reject</button>
                              <button className="btn eco-btn btn-sm" disabled={workPayments.find((x) => Number(x.booking_id) === Number(order.id))?.status !== "PAID"} onClick={() => completeOrder(order.id)}>Complete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {currentOrders.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center small-muted">No active orders.</td>
                        </tr>
                      )}
                      {currentOrders.length > 0 && <tr><td colSpan="6"><DashboardPagination page={currentRows.page} pages={currentRows.pages} onChange={setCurrentPage} /></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === "rejections" && (
              <div className="eco-card p-4">
                <div className="fw-bold mb-1">Request Job Rejection</div>
                <div className="small-muted mb-3">Explain why you cannot continue. You may attach a chat screenshot, image, PDF, Word file, or text file up to 5MB.</div>

                {currentOrders.map((order) => {
                  const pending = rejectionRequests.some((item) => Number(item.booking_id) === Number(order.id) && item.status === "PENDING");
                  const draft = rejectionDrafts[order.id] || { reason: "", proof: null };
                  return (
                    <div key={order.id} className="border rounded-3 p-3 mb-3">
                      <div className="fw-semibold">{order.booking_code} | {serviceLabelMap[order.category] || order.category}</div>
                      <div className="small-muted mb-2">Customer: {order.customer_name}</div>
                      {pending ? (
                        <div className="alert alert-warning mb-0">Your request is waiting for admin review. This job cannot be completed meanwhile.</div>
                      ) : (
                        <div className="row g-2">
                          <div className="col-12">
                            <textarea className="form-control" rows="3" minLength="10" placeholder="Explain why you need to reject this job" value={draft.reason} onChange={(e) => updateRejectionDraft(order.id, "reason", e.target.value)} />
                          </div>
                          <div className="col-12 col-md-8">
                            <input type="file" className="form-control" accept="image/*,.pdf,.doc,.docx,.txt" onChange={(e) => updateRejectionDraft(order.id, "proof", e.target.files?.[0] || null)} />
                          </div>
                          <div className="col-12 col-md-4">
                            <button type="button" className="btn btn-outline-danger w-100" onClick={() => submitRejectionRequest(order.id)}>Send Request</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {currentOrders.length === 0 && <div className="small-muted mb-3">No assigned job is currently eligible for rejection.</div>}

                <div className="fw-bold mt-4 mb-2">Request History</div>
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead><tr><th>Booking</th><th>Reason / Proof</th><th>Status</th><th>Admin Note</th></tr></thead>
                    <tbody>
                      {rejectionRequests.map((item) => (
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
                      {rejectionRequests.length === 0 && <tr><td colSpan="4" className="text-center small-muted">No rejection requests yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === "wallet" && (
              <div className="eco-card p-4">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                  <div className="fw-bold">Wallet and Withdraw</div>
                  <button type="button" className="btn eco-btn" onClick={() => setShowPayoutModal(true)}>{wallet.payout_method ? "Edit Wallet" : "+ Add Wallet"}</button>
                </div>
                <div className="small-muted mb-2">Final work earnings balance: <b>৳{Number(wallet.balance || 0).toFixed(2)}</b></div>
                <div className="small-muted mb-3">Booking fees belong to the platform admin and are never added to this wallet.</div>
                {wallet.payout_method ? (
                  <div className="payout-method-card mb-3">
                    <span className="payout-method-badge">{wallet.payout_method.method}</span>
                    <div className="fw-semibold mt-2">{wallet.payout_method.account_name}</div>
                    <div>{wallet.payout_method.account_number}</div>
                    {wallet.payout_method.method === "BANK" && <div className="small-muted mt-1">{wallet.payout_method.bank_name} · {wallet.payout_method.branch_name}{wallet.payout_method.routing_number ? ` · Routing ${wallet.payout_method.routing_number}` : ""}</div>}
                  </div>
                ) : <div className="alert alert-warning">Add bKash, Nagad, Rocket, or bank account details before requesting a withdrawal.</div>}
                {Number(wallet.balance || 0) === 0 ? (
                  <div className="alert alert-secondary">No work earnings yet. Your wallet will be credited after an approved final payment and completed job.</div>
                ) : Number(wallet.withdrawable_balance || 0) < 300 ? (
                  <div className="alert alert-warning">Withdrawal becomes available when your withdrawable amount reaches ৳300. You must have at least ৳400 with no pending request because ৳100 remains in the wallet.</div>
                ) : (
                  <div className="alert alert-info">Available to withdraw: <b>৳{Number(wallet.withdrawable_balance || 0).toFixed(2)}</b>. Minimum request: ৳300. Protected wallet reserve: ৳100.</div>
                )}
                <form className="row g-2 mb-3" onSubmit={requestWithdrawal}>
                  <div className="col-12 col-md-4">
                    <input type="number" min="300" step="1" className="form-control" placeholder="Minimum ৳300" value={withdrawForm.amount} onChange={(e) => setWithdrawForm((p) => ({ ...p, amount: e.target.value }))} required />
                  </div>
                  <div className="col-12 col-md-5">
                    <input className="form-control" placeholder="Note" value={withdrawForm.note} onChange={(e) => setWithdrawForm((p) => ({ ...p, note: e.target.value }))} />
                  </div>
                  <div className="col-12 col-md-3">
                    <button className="btn eco-btn w-100" disabled={!wallet.payout_method || Number(wallet.withdrawable_balance || 0) < 300}>Request Withdraw</button>
                  </div>
                </form>
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wallet.transactions.map((item) => (
                        <tr key={item.id}>
                          <td>{new Date(item.created_at).toLocaleString()}</td>
                          <td>{item.transaction_type}</td>
                          <td>{item.amount}</td>
                          <td>{item.status}</td>
                        </tr>
                      ))}
                      {wallet.transactions.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center small-muted">No wallet records yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === "history" && (
              <div className="eco-card p-4">
                <div className="fw-bold mb-2">Order History</div>
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Booking</th>
                        <th>Customer</th>
                        <th>Service</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.items.map((order) => (
                        <tr key={order.id}>
                          <td>{order.booking_code}</td>
                          <td>{order.customer_name}</td>
                          <td>{serviceLabelMap[order.category] || order.category}</td>
                          <td>{order.status}</td>
                        </tr>
                      ))}
                      {history.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center small-muted">No completed orders yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <DashboardPagination page={historyRows.page} pages={historyRows.pages} onChange={setHistoryPage} />
              </div>
            )}

            {activeSection === "chat" && (
              <div className="eco-card p-4">
                <div className="fw-bold mb-2">Live Chat</div>
                <div className="small-muted">
                  Chat becomes active for assigned jobs. Use the `Chat` button from a current order to open the short chat window.
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

      <DashboardChatWindow
        title="Partner Chat"
        visible={Boolean(activeBookingId)}
        messages={messages}
        messageText={messageText}
        onChangeMessage={setMessageText}
        onSend={sendMessage}
        attachment={attachment}
        onChangeAttachment={setAttachment}
        apiBase={BASE}
        onClose={() => {
          setActiveBookingId(null);
          setMessages([]);
          setMessageText("");
          setAttachment(null);
        }}
      />
      {finalPaymentOrder && (
        <div className="payout-modal-backdrop" role="presentation" onMouseDown={() => !finalPaymentSaving && setFinalPaymentOrder(null)}>
          <div className="payout-modal final-payment-modal" role="dialog" aria-modal="true" aria-labelledby="final-payment-title" onMouseDown={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
              <div>
                <span className="badge bg-success mb-2">Work Payment</span>
                <h5 id="final-payment-title" className="mb-1">Set Final Payment</h5>
                <div className="small-muted">The customer must verify this amount before making payment.</div>
              </div>
              <button type="button" className="btn-close" aria-label="Close" disabled={finalPaymentSaving} onClick={() => setFinalPaymentOrder(null)} />
            </div>
            <div className="dashboard-detail-grid mb-4">
              <div className="dashboard-detail-item"><span>Booking</span><strong>{finalPaymentOrder.booking_code}</strong></div>
              <div className="dashboard-detail-item"><span>Customer</span><strong>{finalPaymentOrder.customer_name}</strong></div>
              <div className="dashboard-detail-item"><span>Service</span><strong>{serviceLabelMap[finalPaymentOrder.category] || finalPaymentOrder.category}</strong></div>
              <div className="dashboard-detail-item"><span>Current Status</span><strong>{finalPaymentOrder.status}</strong></div>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); saveWorkAmount(finalPaymentOrder.id); }}>
              <label className="form-label" htmlFor="final-payment-amount">Final payment amount (৳)</label>
              <div className="input-group mb-2">
                <span className="input-group-text">৳</span>
                <input id="final-payment-amount" type="number" min="1" step="0.01" className="form-control" placeholder="Enter agreed final amount" value={workAmounts[finalPaymentOrder.id] || ""} onChange={(e) => setWorkAmounts((previous) => ({ ...previous, [finalPaymentOrder.id]: e.target.value }))} autoFocus required />
              </div>
              <div className="small-muted mb-4">Confirm the amount agreed with the customer. The customer will see it as pending verification.</div>
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-light" disabled={finalPaymentSaving} onClick={() => setFinalPaymentOrder(null)}>Cancel</button>
                <button className="btn eco-btn" disabled={finalPaymentSaving}>{finalPaymentSaving ? "Saving..." : "Set Payment"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showPayoutModal && (
        <div className="payout-modal-backdrop" role="presentation" onMouseDown={() => setShowPayoutModal(false)}>
          <div className="payout-modal" role="dialog" aria-modal="true" aria-labelledby="payout-wallet-title" onMouseDown={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div><h5 id="payout-wallet-title" className="mb-1">Withdrawal Wallet</h5><div className="small-muted">Admin will send approved withdrawals to this account.</div></div>
              <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowPayoutModal(false)} />
            </div>
            <form onSubmit={savePayoutMethod}>
              <label className="form-label">Payment Method</label>
              <select className="form-select mb-3" value={payoutForm.method} onChange={(e) => setPayoutForm((p) => ({ ...p, method: e.target.value }))}>
                <option value="BKASH">bKash</option><option value="NAGAD">Nagad</option><option value="ROCKET">Rocket</option><option value="BANK">Bank Account</option>
              </select>
              <label className="form-label">Account Holder Name</label>
              <input className="form-control mb-3" maxLength="120" value={payoutForm.account_name} onChange={(e) => setPayoutForm((p) => ({ ...p, account_name: e.target.value }))} required />
              <label className="form-label">{payoutForm.method === "BANK" ? "Account Number" : "Mobile Account Number"}</label>
              <input className="form-control mb-3" maxLength="80" placeholder={payoutForm.method === "BANK" ? "Bank account number" : "01XXXXXXXXX"} value={payoutForm.account_number} onChange={(e) => setPayoutForm((p) => ({ ...p, account_number: e.target.value }))} required />
              {payoutForm.method === "BANK" && <div className="row g-3 mb-3"><div className="col-md-6"><label className="form-label">Bank Name</label><input className="form-control" maxLength="120" value={payoutForm.bank_name} onChange={(e) => setPayoutForm((p) => ({ ...p, bank_name: e.target.value }))} required /></div><div className="col-md-6"><label className="form-label">Branch Name</label><input className="form-control" maxLength="120" value={payoutForm.branch_name} onChange={(e) => setPayoutForm((p) => ({ ...p, branch_name: e.target.value }))} required /></div><div className="col-12"><label className="form-label">Routing Number (optional)</label><input className="form-control" maxLength="50" value={payoutForm.routing_number} onChange={(e) => setPayoutForm((p) => ({ ...p, routing_number: e.target.value }))} /></div></div>}
              <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-light" onClick={() => setShowPayoutModal(false)}>Cancel</button><button className="btn eco-btn" disabled={payoutSaving}>{payoutSaving ? "Saving..." : "Save Wallet"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
