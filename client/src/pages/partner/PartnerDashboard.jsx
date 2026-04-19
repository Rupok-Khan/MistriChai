import React, { useEffect, useState } from "react";
import { PartnerService } from "../../services/partner.service";
import { DEFAULT_SERVICE_OPTIONS, buildServiceLabelMap, normalizeServiceOptions } from "../../utils/serviceCatalog";
import Loading from "../../components/Loading";
import Alert from "../../components/Alert";
import DashboardChatWindow from "../../components/DashboardChatWindow";
import { SiteContentService } from "../../services/siteContent.service";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function SidebarButton({ active, label, count, onClick }) {
  return (
    <button type="button" className={`admin-sidebar-link ${active ? "active" : ""}`} onClick={onClick}>
      <span>{label}</span>
      {typeof count === "number" && <span className="admin-sidebar-count">{count}</span>}
    </button>
  );
}

export default function PartnerDashboard() {
  const [me, setMe] = useState(null);
  const [currentOrders, setCurrentOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
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
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "" });
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", note: "" });
  const [workingHours, setWorkingHours] = useState({ working_start_time: "09:00", working_end_time: "18:00" });
  const [serviceOptions, setServiceOptions] = useState(DEFAULT_SERVICE_OPTIONS);
  const serviceLabelMap = buildServiceLabelMap(serviceOptions);

  const loadAll = async () => {
    setErr("");
    try {
      const [meRes, currentRes, historyRes, walletRes, supportRes, siteRes] = await Promise.all([
        PartnerService.me(),
        PartnerService.currentOrders(),
        PartnerService.orderHistory(),
        PartnerService.wallet(),
        PartnerService.supportMessages(),
        SiteContentService.getPublic()
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
        experience_years: meRes.data.experience_years
      });
      setWorkingHours({
        working_start_time: meRes.data.working_start_time?.slice(0, 5) || "09:00",
        working_end_time: meRes.data.working_end_time?.slice(0, 5) || "18:00"
      });
      setCurrentOrders(currentRes.data || []);
      setHistory(historyRes.data || []);
      setWallet(walletRes.data || { balance: 0, transactions: [] });
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
                {activeSection === "wallet" && "Review wallet activity and request withdrawals."}
                {activeSection === "history" && "Review completed and previous service orders."}
                {activeSection === "chat" && "Use chat from current orders to talk with assigned customers."}
                {activeSection === "support" && "Send support messages to admin and see admin replies."}
              </div>
            </div>

            {activeSection === "overview" && (
              <div className="row g-3">
                <div className="col-12 col-lg-6">
                  <div className="eco-card p-4 h-100">
                    <div className="d-flex gap-3 align-items-center">
                      <img className="img-fluid rounded-3 border" src={`${BASE}${me.profile_photo}`} alt="profile" style={{ width: 90, height: 90, objectFit: "cover" }} />
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
                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn eco-btn-outline" onClick={() => updateAvailability("AVAILABLE")}>Available</button>
                  <button className="btn eco-btn-outline" onClick={() => updateAvailability("BUSY")}>Busy</button>
                  <button className="btn eco-btn-outline" onClick={() => updateAvailability("OFFLINE")}>Offline</button>
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
                <form className="row g-2" onSubmit={saveProfile}>
                  {Object.entries(profileForm).map(([key, value]) => (
                    <div key={key} className={key === "nid_address" ? "col-12" : "col-12 col-md-6"}>
                      {key === "technician_category" ? (
                        <select className="form-select" value={value} onChange={(e) => setProfileForm((p) => ({ ...p, [key]: e.target.value }))}>
                          {serviceOptions.map((option) => (
                            <option key={option.key} value={option.key}>{option.title}</option>
                          ))}
                        </select>
                      ) : key === "nid_address" ? (
                        <textarea className="form-control" rows="2" value={value} onChange={(e) => setProfileForm((p) => ({ ...p, [key]: e.target.value }))} />
                      ) : (
                        <input className="form-control" value={value} onChange={(e) => setProfileForm((p) => ({ ...p, [key]: e.target.value }))} />
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
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Booking</th>
                        <th>Customer</th>
                        <th>Service</th>
                        <th>Status</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentOrders.map((order) => (
                        <tr key={order.id}>
                          <td>{order.booking_code}</td>
                          <td>{order.customer_name}</td>
                          <td>{serviceLabelMap[order.category] || order.category}</td>
                          <td>{order.status}</td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                              <button className="btn eco-btn-outline btn-sm" onClick={() => loadMessages(order.id)}>Chat</button>
                              <button className="btn eco-btn btn-sm" onClick={() => completeOrder(order.id)}>Complete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {currentOrders.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center small-muted">No active orders.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === "wallet" && (
              <div className="eco-card p-4">
                <div className="fw-bold mb-2">Wallet and Withdraw</div>
                <div className="small-muted mb-2">Balance: <b>{wallet.balance}</b></div>
                <form className="row g-2 mb-3" onSubmit={requestWithdrawal}>
                  <div className="col-12 col-md-4">
                    <input type="number" className="form-control" placeholder="Amount" value={withdrawForm.amount} onChange={(e) => setWithdrawForm((p) => ({ ...p, amount: e.target.value }))} />
                  </div>
                  <div className="col-12 col-md-5">
                    <input className="form-control" placeholder="Note" value={withdrawForm.note} onChange={(e) => setWithdrawForm((p) => ({ ...p, note: e.target.value }))} />
                  </div>
                  <div className="col-12 col-md-3">
                    <button className="btn eco-btn w-100">Request Withdraw</button>
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
                      {history.map((order) => (
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
    </div>
  );
}
