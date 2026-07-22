import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminService } from "../../services/admin.service";
import { clearAdminAuth } from "../../utils/adminAuth";
import { DEFAULT_SERVICE_OPTIONS, buildServiceLabelMap, normalizeServiceOptions } from "../../utils/serviceCatalog";
import DashboardPagination from "../../components/DashboardPagination";
import DashboardInsights from "../../components/DashboardInsights";
import { paginate } from "../../utils/pagination";

function EmptyRow({ colSpan, text }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center small-muted">{text}</td>
    </tr>
  );
}

function SidebarButton({ active, label, count, onClick }) {
  return (
    <button type="button" className={`admin-sidebar-link ${active ? "active" : ""}`} onClick={onClick}>
      <span>{label}</span>
      {typeof count === "number" && <span className="admin-sidebar-count">{count}</span>}
    </button>
  );
}

function bookingStatusLabel(status) {
  if (["PENDING_ASSIGNMENT", "WAITING_FOR_PARTNER"].includes(status)) return "Pending";
  if (status === "PAYMENT_PENDING") return "Payment Pending";
  if (status === "ASSIGNED") return "Assigned";
  if (status === "IN_PROGRESS") return "In Progress";
  return String(status || "Unknown").replaceAll("_", " ");
}

const LOGIN_EDITOR_FIELDS = [
  ["title", "Panel heading", false],
  ["description", "Platform description", true],
  ["pointOne", "Benefit one", false],
  ["pointTwo", "Benefit two", false],
  ["pointThree", "Benefit three", false]
];

function LoginContentEditor({ pageKey, label, siteForm, setSiteForm }) {
  const values = siteForm.loginPages?.[pageKey] || {};
  const update = (field, value) => setSiteForm((previous) => ({
    ...previous,
    loginPages: {
      ...(previous.loginPages || {}),
      [pageKey]: { ...(previous.loginPages?.[pageKey] || {}), [field]: value }
    }
  }));

  return (
    <div className={`col-12 site-login-${pageKey}`}>
      <div className="border rounded-4 p-3">
        <div className="fw-bold mb-1">{label} Login Page</div>
        <div className="small-muted mb-3">Edit the text displayed over the image on the left side of this login page.</div>
        <div className="row g-3">
          {LOGIN_EDITOR_FIELDS.map(([field, labelText, multiline]) => (
            <div className={multiline ? "col-12" : "col-12 col-md-6"} key={field}>
              <label className="form-label" htmlFor={`${pageKey}-${field}`}>{labelText}</label>
              {multiline ? (
                <textarea id={`${pageKey}-${field}`} className="form-control" rows="4" value={values[field] || ""} onChange={(event) => update(field, event.target.value)} />
              ) : (
                <input id={`${pageKey}-${field}`} className="form-control" value={values[field] || ""} onChange={(event) => update(field, event.target.value)} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [dashboard, setDashboard] = useState({
    summary: {},
    pendingPartners: [],
    approvedPartners: [],
    customers: [],
    partners: [],
    bookings: [],
    withdrawals: [],
    changeRequests: [],
    bookingFees: [],
    bookingFeeSummary: {}
    ,workPayments: []
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [assignForm, setAssignForm] = useState({});
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingFeeSearch, setBookingFeeSearch] = useState("");
  const [bookingFeePage, setBookingFeePage] = useState(1);
  const [listPages, setListPages] = useState({ changes:1, customers:1, partners:1, withdrawals:1 });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [refundForm, setRefundForm] = useState({});
  const [changeRequestNotes, setChangeRequestNotes] = useState({});
  const [selectedChangeRequest, setSelectedChangeRequest] = useState(null);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editingPartnerId, setEditingPartnerId] = useState(null);
  const [customerForm, setCustomerForm] = useState({});
  const [partnerForm, setPartnerForm] = useState({});
  const [siteForm, setSiteForm] = useState({});
  const [siteSaving, setSiteSaving] = useState(false);
  const [siteEditor, setSiteEditor] = useState(null);
  const [heroImageFile, setHeroImageFile] = useState(null);
  const [promoImageFiles, setPromoImageFiles] = useState({ left: null, right: null });
  const [contacts, setContacts] = useState([]);
  const [replyForm, setReplyForm] = useState({});
  const [replyLoading, setReplyLoading] = useState({});
  const [editingServiceKey, setEditingServiceKey] = useState(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceDraft, setServiceDraft] = useState({
    key: "",
    title: "",
    desc: "",
    imageUrl: "",
    imageFile: null,
    removeImage: false
  });
  const updateReview = (index, field, value) => setSiteForm((prev) => ({
    ...prev,
    reviews: (prev.reviews || []).map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)
  }));
  const navigate = useNavigate();

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const [res, contactsRes] = await Promise.all([
        AdminService.dashboard(),
        AdminService.contacts()
      ]);
      const nextDashboard = res.data || {};
      setDashboard(nextDashboard);
      setSiteForm(nextDashboard.siteSettings || {});
      setContacts(contactsRes.items || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Poll in the background so assignments, payments, and messages appear
  // without requiring a full browser reload.
  useEffect(() => {
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleExpired = () => navigate("/admin/login", { replace: true, state: { from: "/admin/dashboard" } });
    window.addEventListener("admin-session-expired", handleExpired);
    return () => window.removeEventListener("admin-session-expired", handleExpired);
  }, [navigate]);

  const partnerOptions = useMemo(
    () => (dashboard.approvedPartners || []).map((p) => ({ value: p.user_id, label: `${p.first_name} ${p.last_name}` })),
    [dashboard.approvedPartners]
  );
  const serviceOptions = useMemo(
    () => normalizeServiceOptions(siteForm.services || dashboard.siteSettings?.services || DEFAULT_SERVICE_OPTIONS),
    [siteForm.services, dashboard.siteSettings?.services]
  );
  const serviceLabelMap = useMemo(() => buildServiceLabelMap(serviceOptions), [serviceOptions]);
  const filteredBookings = useMemo(() => (dashboard.bookings || []).filter((booking) => {
    const query = bookingSearch.trim().toLowerCase();
    return !query || String(booking.booking_code || booking.id || "").toLowerCase().includes(query)
      || String(booking.id || "").includes(query)
      || String(booking.customer_name || "").toLowerCase().includes(query);
  }), [dashboard.bookings, bookingSearch]);
  const bookingRows = paginate(filteredBookings, bookingPage, 7);
  const filteredBookingFees = useMemo(() => (dashboard.bookingFees || [])
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .filter((item) => {
      const query = bookingFeeSearch.trim().toLowerCase();
      return !query || String(item.booking_code || item.booking_id || "").toLowerCase().includes(query)
        || String(item.booking_id || "").includes(query)
        || String(item.customer_name || "").toLowerCase().includes(query);
    }), [dashboard.bookingFees, bookingFeeSearch]);
  const bookingFeeRows = paginate(filteredBookingFees, bookingFeePage, 7);
  const changeRows = paginate(dashboard.changeRequests, listPages.changes, 6);
  const customerRows = paginate(dashboard.customers, listPages.customers, 7);
  const partnerRows = paginate(dashboard.partners, listPages.partners, 7);
  const withdrawalRows = paginate(dashboard.withdrawals, listPages.withdrawals, 7);
  const setListPage = (key, page) => setListPages((previous) => ({...previous,[key]:page}));

  const menuItems = [
    { key: "overview", label: "Overview" },
    { key: "site", label: "Site Content" },
    { key: "services", label: "Services", count: serviceOptions.length },
    { key: "pending", label: "Partner Review", count: dashboard.pendingPartners?.length || 0 },
    { key: "bookings", label: "Bookings", count: dashboard.bookings?.length || 0 },
    { key: "changeRequests", label: "Cancel / Reject Requests", count: dashboard.changeRequests?.filter((item) => item.status === "PENDING").length || 0 },
    { key: "bookingFees", label: "Booking Fees", count: dashboard.bookingFees?.length || 0 },
    { key: "workPayments", label: "Work Payments", count: dashboard.workPayments?.filter((x) => x.status === "PENDING").length || 0 },
    { key: "customers", label: "Customers", count: dashboard.customers?.length || 0 },
    { key: "partners", label: "Partners", count: dashboard.partners?.length || 0 },
    { key: "messages", label: "Messages", count: contacts.length },
    { key: "withdrawals", label: "Withdrawals", count: dashboard.withdrawals?.length || 0 }
  ];

  const logout = () => {
    clearAdminAuth();
    navigate("/admin/login", { replace: true });
  };

  const assignBooking = async (bookingId, requestedPartnerId) => {
    try {
      await AdminService.assignBooking(bookingId, {
        partner_user_id: Number(assignForm[bookingId] || requestedPartnerId),
        admin_note: "Assigned by admin dashboard"
      });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const approveBookingPayment = async (bookingId) => {
    try {
      setErr("");
      await AdminService.approveBookingPayment(bookingId);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };
  const approveWorkPayment = async (id) => { try { await AdminService.approveWorkPayment(id); await load(); } catch (e) { setErr(e.message); } };

  const refundBooking = async (bookingId) => {
    try {
      await AdminService.refundBooking(bookingId, {
        admin_note: refundForm[bookingId] || "Partner unavailable, booking fee refunded."
      });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const reviewChangeRequest = async (requestId, action) => {
    try {
      setErr("");
      await AdminService.reviewBookingChangeRequest(requestId, {
        action,
        admin_note: changeRequestNotes[requestId] || ""
      });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const payWithdrawal = async (withdrawalId) => {
    try {
      await AdminService.payWithdrawal(withdrawalId, { admin_note: "Paid from admin panel" });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const startCustomerEdit = (item) => {
    setEditingCustomerId(item.id);
    setCustomerForm({
      name: item.name || "",
      email: item.email || "",
      mobile: item.mobile || "",
      address: item.address || "",
      is_active: Boolean(item.is_active)
    });
  };

  const saveCustomer = async (id) => {
    try {
      await AdminService.updateCustomer(id, customerForm);
      setEditingCustomerId(null);
      setCustomerForm({});
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const removeCustomer = async (id) => {
    try {
      await AdminService.deleteCustomer(id);
      if (editingCustomerId === id) {
        setEditingCustomerId(null);
        setCustomerForm({});
      }
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const startPartnerEdit = (item) => {
    setEditingPartnerId(item.id);
    setPartnerForm({
      first_name: item.first_name || "",
      last_name: item.last_name || "",
      email: item.email || "",
      mobile: item.mobile || "",
      nid_address: item.nid_address || "",
      nid_number: item.nid_number || "",
      father_name: item.father_name || "",
      mother_name: item.mother_name || "",
      district: item.district || "",
      thana: item.thana || "",
      ward_no: item.ward_no || "",
      city_corp_or_union: item.city_corp_or_union || "",
      technician_category: item.technician_category || serviceOptions[0]?.key || "AC_REPAIR",
      experience_years: item.experience_years || 0,
      verification_status: item.verification_status || "PENDING",
      availability_status: item.availability_status || "OFFLINE",
      working_start_time: item.working_start_time?.slice(0, 5) || "09:00",
      working_end_time: item.working_end_time?.slice(0, 5) || "18:00",
      is_active: Boolean(item.is_active)
    });
  };

  const savePartner = async (id) => {
    try {
      await AdminService.updatePartnerAccount(id, partnerForm);
      setEditingPartnerId(null);
      setPartnerForm({});
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const removePartner = async (id) => {
    try {
      await AdminService.deletePartner(id);
      if (editingPartnerId === id) {
        setEditingPartnerId(null);
        setPartnerForm({});
      }
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const saveSiteContent = async () => {
    try {
      setSiteSaving(true);
      setErr("");
      let payload = siteForm;
      if (heroImageFile || promoImageFiles.left || promoImageFiles.right) {
        payload = new FormData();
        payload.append("settings", JSON.stringify(siteForm));
        if (heroImageFile) payload.append("hero_image", heroImageFile);
        if (promoImageFiles.left) payload.append("promo_left_image", promoImageFiles.left);
        if (promoImageFiles.right) payload.append("promo_right_image", promoImageFiles.right);
      }
      const res = await AdminService.updateSiteContent(payload);
      const updatedSettings = res.data || {};
      setSiteForm(updatedSettings);
      setDashboard((prev) => ({ ...prev, siteSettings: updatedSettings }));
      setHeroImageFile(null);
      setPromoImageFiles({ left: null, right: null });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSiteSaving(false);
    }
  };

  const changeSiteLanguage = async (language) => {
    try {
      setSiteSaving(true);
      const next = { ...siteForm, preferences: { ...(siteForm.preferences || {}), language } };
      const res = await AdminService.updateSiteContent(next);
      setSiteForm(res.data || next);
      window.location.reload();
    } catch (e) { setErr(e.message); setSiteSaving(false); }
  };

  const replyToContact = async (id) => {
    const text = replyForm[id]?.trim();
    if (!text) {
      return;
    }
    try {
      setReplyLoading((prev) => ({ ...prev, [id]: true }));
      await AdminService.replyContact(id, { reply_text: text });
      setReplyForm((prev) => ({ ...prev, [id]: "" }));
      const res = await AdminService.contacts();
      setContacts(res.items || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setReplyLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const removeContact = async (id) => {
    try {
      await AdminService.deleteContact(id);
      setContacts((prev) => prev.filter((item) => Number(item.id) !== Number(id)));
    } catch (e) {
      setErr(e.message);
    }
  };

  const resetServiceDraft = () => {
    setEditingServiceKey(null);
    setServiceDraft({ key: "", title: "", desc: "", imageUrl: "", imageFile: null, removeImage: false });
  };

  const startServiceEdit = (item) => {
    setEditingServiceKey(item.key);
    setServiceDraft({
      key: item.key || "",
      title: item.title || "",
      desc: item.desc || "",
      imageUrl: item.imageUrl || "",
      imageFile: null,
      removeImage: false
    });
    setShowServiceModal(true);
  };

  const resolveImageSrc = (url) => {
    const value = String(url || "").trim();
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    return `${API_BASE}${value.startsWith("/") ? "" : "/"}${value}`;
  };

  const submitService = async () => {
    const payload = new FormData();
    payload.append("key", serviceDraft.key || "");
    payload.append("title", serviceDraft.title || "");
    payload.append("desc", serviceDraft.desc || "");
    if (editingServiceKey && serviceDraft.removeImage) {
      payload.append("remove_image", "1");
    }
    if (serviceDraft.imageFile) {
      payload.append("service_card_image", serviceDraft.imageFile);
    }
    try {
      if (editingServiceKey) {
        await AdminService.updateService(editingServiceKey, payload);
      } else {
        await AdminService.createService(payload);
      }
      resetServiceDraft();
      setShowServiceModal(false);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const removeService = async (key) => {
    try {
      await AdminService.deleteService(key);
      if (editingServiceKey === key) {
        resetServiceDraft();
      }
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const reactivateService = async (key) => {
    try {
      const payload = new FormData();
      payload.append("active", "true");
      await AdminService.updateService(key, payload);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="container section-pad dashboard-page dashboard-page-admin">
      <div className="admin-shell">
        <aside className="eco-card admin-sidebar">
          <div className="admin-sidebar-head">
            <h2 className="fw-bold mb-1">Admin Dashboard</h2>
            <div className="small-muted">Open a menu item to focus on one admin window at a time.</div>
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
            <button className="btn eco-btn-outline w-100" onClick={load}>Refresh Data</button>
            <button className="btn btn-outline-danger w-100" onClick={logout}>Logout</button>
          </div>
        </aside>

        <div className="admin-main">
          {err && <div className="alert alert-warning">{err}</div>}

          <div className="eco-card p-4 mb-3 dashboard-header">
            <div className="admin-panel-kicker">
              {activeSection === "overview" && "Overview"}
              {activeSection === "site" && "Site Content"}
              {activeSection === "services" && "Service Catalog"}
              {activeSection === "pending" && "Partner Review"}
              {activeSection === "bookings" && "Bookings and Assignment"}
              {activeSection === "changeRequests" && "Cancellation and Rejection Requests"}
              {activeSection === "bookingFees" && "Booking Fees"}
              {activeSection === "customers" && "Customer Management"}
              {activeSection === "partners" && "Partner Management"}
              {activeSection === "messages" && "Support Messages"}
              {activeSection === "withdrawals" && "Withdrawal Requests"}
            </div>
            <div className="small-muted">
              {activeSection === "overview" && "Quick stats and shortcuts for the admin panel."}
              {activeSection === "site" && "Update homepage, about page, and contact information."}
              {activeSection === "services" && "Add, edit, or delete service categories used across the platform."}
              {activeSection === "pending" && "Review newly submitted partner applications."}
              {activeSection === "bookings" && "Verify bKash service charges, then assign technicians or handle refunds."}
              {activeSection === "changeRequests" && "Review customer cancellations and partner job rejections, including submitted proof."}
              {activeSection === "bookingFees" && "Track pending, collected, refunded, and net platform booking fees."}
              {activeSection === "customers" && "Edit customer accounts and profile details."}
              {activeSection === "partners" && "Update partner profiles, status, and availability."}
              {activeSection === "messages" && "Read support messages and reply directly to customers or partners."}
              {activeSection === "withdrawals" && "Process partner payout requests."}
            </div>
          </div>

          {loading ? (
            <div className="eco-card p-4 text-center">
              <div className="spinner-border" role="status" />
            </div>
          ) : (
            <>
              {activeSection === "overview" && (
                <>
                  <div className="row g-3 mb-3 dashboard-overview">
            {[
              ["Pending Partners", dashboard.summary?.pending_partners || 0],
              ["Total Bookings", dashboard.summary?.total_bookings || 0],
              ["Booking Fee Revenue", `৳${Number(dashboard.summary?.booking_fee_revenue || 0).toFixed(0)}`],
              ["Pending Cancel / Reject", dashboard.summary?.pending_change_requests || 0],
              ["Active Bookings", dashboard.summary?.active_bookings || 0],
              ["Refund Cases", dashboard.summary?.refund_cases || 0],
              ["Customers", dashboard.summary?.total_customers || 0],
              ["Partners", dashboard.summary?.total_partners || 0]
            ].map(([label, value], index) => (
              <div key={label} className="col-12 col-md-6 col-xl-2">
                <div className={`eco-card p-4 h-100 ${index === 0 ? "dashboard-primary-card" : ""}`}>
                  <div className="small-muted">{label}</div>
                  <div className="fw-bold fs-3">{value}</div>
                </div>
              </div>
            ))}
                  </div>

                  <div className="row g-3">
                    <div className="col-12 col-lg-6">
                      <div className="eco-card p-4 h-100">
                        <div className="fw-bold mb-2">Snapshot</div>
                        <div className="small-muted mb-2">Unread contacts: {dashboard.summary?.unread_contacts || 0}</div>
                        <div className="small-muted mb-2">Pending withdrawals: {dashboard.summary?.withdrawal_requests || 0}</div>
                        <div className="small-muted mb-2">Approved partners: {dashboard.approvedPartners?.length || 0}</div>
                        <div className="small-muted">Use the sidebar to open a specific management area.</div>
                      </div>
                    </div>
                    <div className="col-12 col-lg-6">
                      <div className="eco-card p-4 h-100">
                        <div className="fw-bold mb-2">Quick Open</div>
                        <div className="d-flex flex-wrap gap-2">
                          <button className="btn eco-btn-outline" onClick={() => setActiveSection("pending")}>Partner Review</button>
                          <button className="btn eco-btn-outline" onClick={() => setActiveSection("bookings")}>Bookings</button>
                          <button className="btn eco-btn-outline" onClick={() => setActiveSection("site")}>Site Content</button>
                          <button className="btn eco-btn-outline" onClick={() => setActiveSection("services")}>Services</button>
                          <button className="btn eco-btn-outline" onClick={() => setActiveSection("withdrawals")}>Withdrawals</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DashboardInsights title="Platform distribution" subtitle="Users and booking workload" segments={[
                    { label: "Customers", value: dashboard.summary?.total_customers || 0, color: "#20a875" },
                    { label: "Partners", value: dashboard.summary?.total_partners || 0, color: "#6c63ff" },
                    { label: "Active bookings", value: dashboard.summary?.active_bookings || 0, color: "#ffb547" }
                  ]} bars={[
                    { label: "Bookings", value: dashboard.summary?.total_bookings || 0, color: "#20a875" },
                    { label: "Active", value: dashboard.summary?.active_bookings || 0, color: "#2f8cff" },
                    { label: "Partners", value: dashboard.summary?.total_partners || 0, color: "#6c63ff" },
                    { label: "Pending", value: dashboard.summary?.pending_change_requests || 0, color: "#f0648b" }
                  ]} highlight={`${dashboard.summary?.active_bookings || 0} live`} />
                </>
              )}

          {activeSection === "site" && (
          <div className="eco-card p-4 mb-3">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-3">
              <div>
                <div className="fw-bold">Site Content</div>
                <div className="small-muted">Edit homepage hero text, promo images, contact information, address, and about-page copy.</div>
              </div>
              <div className="language-control"><span><b>Website Language</b><small>Switch the entire website language</small></span><div className="btn-group"><button className={`btn btn-sm ${siteForm.preferences?.language !== "BANGLA" ? "eco-btn" : "eco-btn-outline"}`} disabled={siteSaving} onClick={() => changeSiteLanguage("ENGLISH")}>English</button><button className={`btn btn-sm ${siteForm.preferences?.language === "BANGLA" ? "eco-btn" : "eco-btn-outline"}`} disabled={siteSaving} onClick={() => changeSiteLanguage("BANGLA")}>বাংলা</button></div></div>
            </div>
            <div className="site-content-grid">{[["home","Home Hero","Hero text, images, buttons and highlights"],["why","Why Choose Us","Homepage trust points"],["reviews","Reviews","Seven animated customer reviews"],["promo","Promo Section","Homepage promotional content"],["about","About Page","Mission, vision and about copy"],["contact","Contact Details","Support and contact information"],["login-customer","Customer Login","Customer login image-panel content"],["login-partner","Partner Login","Partner login image-panel content"],["login-admin","Admin Login","Admin login image-panel content"]].map(([key,title,description]) => <button type="button" className="site-content-card" key={key} onClick={() => setSiteEditor(key)}><span className="site-content-icon">{title.charAt(0)}</span><span><b>{title}</b><small>{description}</small></span><span className="site-content-arrow">→</span></button>)}</div>

            {siteEditor && <div className="payout-modal-backdrop" role="presentation" onMouseDown={() => setSiteEditor(null)}><div className="payout-modal site-content-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><div className="d-flex justify-content-between align-items-start mb-3"><div><h5 className="mb-1">Edit Site Content</h5><div className="small-muted">Update this section and save your changes.</div></div><button className="btn-close" aria-label="Close" onClick={() => setSiteEditor(null)} /></div><div className="row g-4 site-editor-content" data-section={siteEditor}>
              <div className="col-12 site-home">
                <div className="border rounded-4 p-3">
                  <div className="fw-bold mb-3">Home Hero</div>
                  <div className="row g-2">
                    <div className="col-12 col-md-4">
                      <input className="form-control" placeholder="Kicker" value={siteForm.home?.heroKicker || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, heroKicker: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-8">
                      <input className="form-control" placeholder="Hero title" value={siteForm.home?.heroTitle || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, heroTitle: e.target.value } }))} />
                    </div>
                    <div className="col-12">
                      <textarea className="form-control" rows="3" placeholder="Hero subtitle" value={siteForm.home?.heroSubtitle || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, heroSubtitle: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label" htmlFor="hero-image-upload">Hero image</label>
                      <input id="hero-image-upload" type="file" className="form-control" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif" onChange={(e) => setHeroImageFile(e.target.files?.[0] || null)} />
                      <div className="small-muted mt-1">JPG, PNG, WebP, HEIC or AVIF. Maximum 5MB.</div>
                      {(heroImageFile || siteForm.home?.heroImageUrl) && <img className="site-hero-image-preview mt-3" src={heroImageFile ? URL.createObjectURL(heroImageFile) : siteForm.home.heroImageUrl.startsWith("http") ? siteForm.home.heroImageUrl : `${API_BASE}${siteForm.home.heroImageUrl}`} alt="Current hero preview" />}
                    </div>
                    <div className="col-12 col-md-6">
                      <input className="form-control" placeholder="Hero image alt text" value={siteForm.home?.heroImageAlt || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, heroImageAlt: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-3">
                      <input className="form-control" placeholder="Primary button text" value={siteForm.home?.primaryButtonText || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, primaryButtonText: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-3">
                      <input className="form-control" placeholder="Primary button link" value={siteForm.home?.primaryButtonLink || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, primaryButtonLink: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-3">
                      <input className="form-control" placeholder="Secondary button text" value={siteForm.home?.secondaryButtonText || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, secondaryButtonText: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-3">
                      <input className="form-control" placeholder="Secondary button link" value={siteForm.home?.secondaryButtonLink || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, secondaryButtonLink: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-4">
                      <input className="form-control" placeholder="Badge one" value={siteForm.home?.badgeOne || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, badgeOne: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-4">
                      <input className="form-control" placeholder="Badge two" value={siteForm.home?.badgeTwo || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, badgeTwo: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-4">
                      <input className="form-control" placeholder="Badge three" value={siteForm.home?.badgeThree || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, badgeThree: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-4">
                      <input className="form-control" placeholder="Strip one title" value={siteForm.home?.stripOneTitle || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, stripOneTitle: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-8">
                      <input className="form-control" placeholder="Strip one text" value={siteForm.home?.stripOneText || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, stripOneText: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-4">
                      <input className="form-control" placeholder="Strip two title" value={siteForm.home?.stripTwoTitle || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, stripTwoTitle: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-8">
                      <input className="form-control" placeholder="Strip two text" value={siteForm.home?.stripTwoText || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, stripTwoText: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-4">
                      <input className="form-control" placeholder="Strip three title" value={siteForm.home?.stripThreeTitle || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, stripThreeTitle: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-8">
                      <input className="form-control" placeholder="Strip three text" value={siteForm.home?.stripThreeText || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, stripThreeText: e.target.value } }))} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 site-why">
                <div className="border rounded-4 p-3">
                  <div className="fw-bold mb-1">Why Choose Us</div>
                  <div className="small-muted mb-3">Edit the three homepage trust points.</div>
                  <div className="row g-2">
                    {["kicker","title","description","itemOneTitle","itemOneText","itemTwoTitle","itemTwoText","itemThreeTitle","itemThreeText"].map((field) => <div className={field.includes("Text") || field === "description" ? "col-12" : "col-12 col-md-6"} key={field}>
                      <input className="form-control" placeholder={field.replace(/([A-Z])/g, " $1")} value={siteForm.whyChoose?.[field] || ""} onChange={(e) => setSiteForm((p) => ({ ...p, whyChoose: { ...p.whyChoose, [field]: e.target.value } }))} />
                    </div>)}
                  </div>
                </div>
              </div>

              <div className="col-12 site-reviews">
                <div className="border rounded-4 p-3">
                  <div className="fw-bold mb-1">Homepage Reviews</div>
                  <div className="small-muted mb-3">Seven cards are shown in the animated review row.</div>
                  <div className="row g-3">
                    {(siteForm.reviews || []).slice(0, 7).map((review, index) => <div className="col-12 col-lg-6" key={index}>
                      <div className="eco-card p-3 h-100">
                        <div className="fw-semibold mb-2">Review {index + 1}</div>
                        <div className="row g-2">
                          <div className="col-8"><input className="form-control" placeholder="Customer name" value={review.name || ""} onChange={(e) => updateReview(index, "name", e.target.value)} /></div>
                          <div className="col-4"><select className="form-select" value={review.rating || "5"} onChange={(e) => updateReview(index, "rating", e.target.value)}>{[5,4,3,2,1].map((rating) => <option key={rating}>{rating}</option>)}</select></div>
                          <div className="col-12"><input className="form-control" placeholder="Role or location" value={review.role || ""} onChange={(e) => updateReview(index, "role", e.target.value)} /></div>
                          <div className="col-12"><textarea className="form-control" rows="3" placeholder="Review text" value={review.text || ""} onChange={(e) => updateReview(index, "text", e.target.value)} /></div>
                        </div>
                      </div>
                    </div>)}
                  </div>
                </div>
              </div>

              <div className="col-12 site-promo">
                <div className="border rounded-4 p-3 h-100">
                  <div className="fw-bold mb-3">Promo Section</div>
                  <div className="row g-2">
                    <div className="col-12">
                      <input className="form-control" placeholder="Promo kicker" value={siteForm.promo?.kicker || ""} onChange={(e) => setSiteForm((p) => ({ ...p, promo: { ...p.promo, kicker: e.target.value } }))} />
                    </div>
                    <div className="col-12">
                      <input className="form-control" placeholder="Promo title" value={siteForm.promo?.title || ""} onChange={(e) => setSiteForm((p) => ({ ...p, promo: { ...p.promo, title: e.target.value } }))} />
                    </div>
                    <div className="col-12">
                      <textarea className="form-control" rows="3" placeholder="Promo description" value={siteForm.promo?.description || ""} onChange={(e) => setSiteForm((p) => ({ ...p, promo: { ...p.promo, description: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-6">
                      <input className="form-control" placeholder="Button text" value={siteForm.promo?.buttonText || ""} onChange={(e) => setSiteForm((p) => ({ ...p, promo: { ...p.promo, buttonText: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-6">
                      <input className="form-control" placeholder="Button link" value={siteForm.promo?.buttonLink || ""} onChange={(e) => setSiteForm((p) => ({ ...p, promo: { ...p.promo, buttonLink: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label" htmlFor="promo-left-image">Left promo image</label>
                      <input id="promo-left-image" type="file" className="form-control" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif" onChange={(e) => setPromoImageFiles((previous) => ({ ...previous, left: e.target.files?.[0] || null }))} />
                      <div className="small-muted mt-1">JPG, PNG, WebP, HEIC or AVIF. Maximum 5MB.</div>
                      {(promoImageFiles.left || siteForm.promo?.leftImageUrl) && <img className="site-hero-image-preview mt-3" src={promoImageFiles.left ? URL.createObjectURL(promoImageFiles.left) : siteForm.promo.leftImageUrl.startsWith("http") ? siteForm.promo.leftImageUrl : `${API_BASE}${siteForm.promo.leftImageUrl}`} alt="Left promo preview" />}
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label" htmlFor="promo-right-image">Right promo image</label>
                      <input id="promo-right-image" type="file" className="form-control" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif" onChange={(e) => setPromoImageFiles((previous) => ({ ...previous, right: e.target.files?.[0] || null }))} />
                      <div className="small-muted mt-1">JPG, PNG, WebP, HEIC or AVIF. Maximum 5MB.</div>
                      {(promoImageFiles.right || siteForm.promo?.rightImageUrl) && <img className="site-hero-image-preview mt-3" src={promoImageFiles.right ? URL.createObjectURL(promoImageFiles.right) : siteForm.promo.rightImageUrl.startsWith("http") ? siteForm.promo.rightImageUrl : `${API_BASE}${siteForm.promo.rightImageUrl}`} alt="Right promo preview" />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 site-about">
                <div className="border rounded-4 p-3 h-100">
                  <div className="fw-bold mb-3">About Page</div>
                  <div className="row g-2">
                    <div className="col-12">
                      <input className="form-control" placeholder="About title" value={siteForm.about?.title || ""} onChange={(e) => setSiteForm((p) => ({ ...p, about: { ...p.about, title: e.target.value } }))} />
                    </div>
                    <div className="col-12">
                      <textarea className="form-control" rows="4" placeholder="About description" value={siteForm.about?.description || ""} onChange={(e) => setSiteForm((p) => ({ ...p, about: { ...p.about, description: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-6">
                      <input className="form-control" placeholder="Mission title" value={siteForm.about?.missionTitle || ""} onChange={(e) => setSiteForm((p) => ({ ...p, about: { ...p.about, missionTitle: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-6">
                      <input className="form-control" placeholder="Vision title" value={siteForm.about?.visionTitle || ""} onChange={(e) => setSiteForm((p) => ({ ...p, about: { ...p.about, visionTitle: e.target.value } }))} />
                    </div>
                    <div className="col-12">
                      <textarea className="form-control" rows="2" placeholder="Mission text" value={siteForm.about?.missionText || ""} onChange={(e) => setSiteForm((p) => ({ ...p, about: { ...p.about, missionText: e.target.value } }))} />
                    </div>
                    <div className="col-12">
                      <textarea className="form-control" rows="2" placeholder="Vision text" value={siteForm.about?.visionText || ""} onChange={(e) => setSiteForm((p) => ({ ...p, about: { ...p.about, visionText: e.target.value } }))} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 site-contact">
                <div className="border rounded-4 p-3">
                  <div className="fw-bold mb-3">Contact Details</div>
                  <div className="row g-2">
                    <div className="col-12 col-md-6">
                      <input className="form-control" placeholder="Contact page title" value={siteForm.contact?.pageTitle || ""} onChange={(e) => setSiteForm((p) => ({ ...p, contact: { ...p.contact, pageTitle: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-6">
                      <input className="form-control" placeholder="Support box title" value={siteForm.contact?.supportTitle || ""} onChange={(e) => setSiteForm((p) => ({ ...p, contact: { ...p.contact, supportTitle: e.target.value } }))} />
                    </div>
                    <div className="col-12">
                      <textarea className="form-control" rows="2" placeholder="Contact page subtitle" value={siteForm.contact?.pageSubtitle || ""} onChange={(e) => setSiteForm((p) => ({ ...p, contact: { ...p.contact, pageSubtitle: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-4">
                      <input className="form-control" placeholder="Support email" value={siteForm.contact?.supportEmail || ""} onChange={(e) => setSiteForm((p) => ({ ...p, contact: { ...p.contact, supportEmail: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-4">
                      <input className="form-control" placeholder="Support phone" value={siteForm.contact?.supportPhone || ""} onChange={(e) => setSiteForm((p) => ({ ...p, contact: { ...p.contact, supportPhone: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-4">
                      <input className="form-control" placeholder="Support hours" value={siteForm.contact?.supportHours || ""} onChange={(e) => setSiteForm((p) => ({ ...p, contact: { ...p.contact, supportHours: e.target.value } }))} />
                    </div>
                    <div className="col-12">
                      <textarea className="form-control" rows="2" placeholder="Support address" value={siteForm.contact?.supportAddress || ""} onChange={(e) => setSiteForm((p) => ({ ...p, contact: { ...p.contact, supportAddress: e.target.value } }))} />
                    </div>
                    <div className="col-12">
                      <textarea className="form-control" rows="2" placeholder="Support note" value={siteForm.contact?.supportNote || ""} onChange={(e) => setSiteForm((p) => ({ ...p, contact: { ...p.contact, supportNote: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-4">
                      <input className="form-control" placeholder="Home contact kicker" value={siteForm.contact?.homeKicker || ""} onChange={(e) => setSiteForm((p) => ({ ...p, contact: { ...p.contact, homeKicker: e.target.value } }))} />
                    </div>
                    <div className="col-12 col-md-8">
                      <input className="form-control" placeholder="Home contact title" value={siteForm.contact?.homeTitle || ""} onChange={(e) => setSiteForm((p) => ({ ...p, contact: { ...p.contact, homeTitle: e.target.value } }))} />
                    </div>
                    <div className="col-12">
                      <textarea className="form-control" rows="3" placeholder="Home contact description" value={siteForm.contact?.homeDescription || ""} onChange={(e) => setSiteForm((p) => ({ ...p, contact: { ...p.contact, homeDescription: e.target.value } }))} />
                    </div>
                  </div>
                </div>
              </div>

              <LoginContentEditor pageKey="customer" label="Customer" siteForm={siteForm} setSiteForm={setSiteForm} />
              <LoginContentEditor pageKey="partner" label="Partner" siteForm={siteForm} setSiteForm={setSiteForm} />
              <LoginContentEditor pageKey="admin" label="Admin" siteForm={siteForm} setSiteForm={setSiteForm} />
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3"><button className="btn btn-light" onClick={() => setSiteEditor(null)}>Cancel</button><button className="btn eco-btn" onClick={async () => { await saveSiteContent(); setSiteEditor(null); }} disabled={siteSaving}>{siteSaving ? "Saving..." : "Save Changes"}</button></div>
            </div></div>}
          </div>
          )}

          {activeSection === "services" && (
          <div className="eco-card p-4 mb-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
              <div><div className="fw-bold">Existing Services</div><div className="small-muted">Manage the services available throughout the website.</div></div>
              <button className="btn eco-btn" onClick={() => { resetServiceDraft(); setShowServiceModal(true); }}>+ Add New Service</button>
            </div>
                <div className="border rounded-3 p-3">
                  <div className="table-responsive">
                    <table className="table align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Image</th>
                          <th>Key</th>
                          <th>Title</th>
                          <th>Description</th>
                          <th>Status</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviceOptions.map((item) => (
                          <tr key={item.key}>
                            <td>
                              {item.imageUrl ? (
                                <img
                                  src={resolveImageSrc(item.imageUrl)}
                                  alt={item.title}
                                  className="rounded-2 border"
                                  style={{ width: 64, height: 44, objectFit: "cover" }}
                                />
                              ) : (
                                <span className="small-muted">No image</span>
                              )}
                            </td>
                            <td>{item.key}</td>
                            <td>{item.title}</td>
                            <td>{item.desc}</td>
                            <td><span className={`badge ${item.active === false ? "text-bg-secondary" : "text-bg-success"}`}>{item.active === false ? "Inactive" : "Active"}</span></td>
                            <td className="text-end">
                              <div className="d-flex justify-content-end gap-2">
                                <button className="btn eco-btn-outline btn-sm" onClick={() => startServiceEdit(item)}>Edit</button>
                                {item.active === false ? (
                                  <button className="btn btn-outline-success btn-sm" onClick={() => reactivateService(item.key)}>Reactivate</button>
                                ) : (
                                  <button className="btn btn-outline-danger btn-sm" onClick={() => removeService(item.key)}>Deactivate</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {serviceOptions.length === 0 && <EmptyRow colSpan={6} text="No services configured." />}
                      </tbody>
                    </table>
                  </div>
                </div>
          </div>
          )}

          {activeSection === "pending" && (
          <div className="eco-card p-0 overflow-hidden mb-3">
            <div className="p-4 pb-0">
              <div className="fw-bold">Pending Partner Review</div>
            </div>
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Area</th>
                    <th>Contact</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard.pendingPartners || []).map((p) => (
                    <tr key={p.user_id}>
                      <td>{p.first_name} {p.last_name}</td>
                      <td>{serviceLabelMap[p.technician_category] || p.technician_category}</td>
                      <td>{p.district}, {p.thana}</td>
                      <td>{p.mobile}</td>
                      <td className="text-end">
                        <Link className="btn eco-btn" to={`/admin/partners/${p.user_id}`}>Review</Link>
                      </td>
                    </tr>
                  ))}
                  {(dashboard.pendingPartners || []).length === 0 && <EmptyRow colSpan={5} text="No pending partners." />}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {activeSection === "bookings" && (
          <div className="eco-card p-0 overflow-hidden mb-3">
            <div className="p-4 pb-0">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div><div className="fw-bold">Bookings and Assignment</div><div className="small-muted">The customer-selected partner is preselected for quick assignment.</div></div>
                <div className="input-group" style={{ maxWidth: 360 }}>
                  <span className="input-group-text">Search</span>
                  <input className="form-control" value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} placeholder="Booking ID or customer name" />
                  {bookingSearch && <button type="button" className="btn btn-outline-secondary" onClick={() => setBookingSearch("")}>Clear</button>}
                </div>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Booking</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Assign / Refund</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingRows.items.map((booking) => (
                    <tr key={booking.id}>
                      <td>{booking.booking_code}</td>
                      <td>{booking.customer_name}</td>
                      <td><div>{serviceLabelMap[booking.category] || booking.category}</div>{booking.requested_partner_first_name && <div className="small-muted">Requested: <b>{booking.requested_partner_first_name} {booking.requested_partner_last_name}</b></div>}</td>
                      <td style={{ minWidth: 190 }}>
                        <div><b>৳{Number(booking.booking_fee || 0).toFixed(0)}</b> via bKash</div>
                        <div className="small-muted">TrxID: {booking.bkash_trx_id || "Not provided"}</div>
                        <span className={`badge mt-1 ${booking.payment_status === "PAID" ? "text-bg-success" : "text-bg-warning"}`}>
                          {booking.payment_status || "UNKNOWN"}
                        </span>
                        {booking.payment_status === "PENDING" && (
                          <button className="btn eco-btn btn-sm d-block mt-2" onClick={() => approveBookingPayment(booking.id)}>
                            Approve Payment
                          </button>
                        )}
                      </td>
                      <td><span className={`badge ${booking.status === "ASSIGNED" ? "text-bg-success" : ["PENDING_ASSIGNMENT", "WAITING_FOR_PARTNER"].includes(booking.status) ? "text-bg-warning" : "text-bg-secondary"}`}>{bookingStatusLabel(booking.status)}</span></td>
                      <td style={{ minWidth: 320 }}>
                        <button type="button" className="btn btn-light btn-sm mb-2" onClick={() => setSelectedBooking(booking)}>View Details</button>
                        {booking.assigned_partner_first_name ? (
                          <div className="small-muted">
                            Assigned: {booking.assigned_partner_first_name} {booking.assigned_partner_last_name}
                          </div>
                        ) : (
                          <div className="d-flex gap-2">
                            <select className="form-select form-select-sm" value={assignForm[booking.id] ?? booking.requested_partner_user_id ?? ""} onChange={(e) => setAssignForm((p) => ({ ...p, [booking.id]: e.target.value }))}>
                              <option value="">Select partner</option>
                              {partnerOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <button
                              className="btn eco-btn btn-sm"
                              disabled={!(assignForm[booking.id] || booking.requested_partner_user_id) || booking.payment_status !== "PAID" || !["PENDING_ASSIGNMENT", "WAITING_FOR_PARTNER"].includes(booking.status)}
                              onClick={() => assignBooking(booking.id, booking.requested_partner_user_id)}
                            >
                              Assign
                            </button>
                          </div>
                        )}
                        {!["REFUNDED", "COMPLETED"].includes(booking.status) && (
                          <div className="d-flex gap-2 mt-2">
                            <input className="form-control form-control-sm" placeholder="Refund note" value={refundForm[booking.id] || ""} onChange={(e) => setRefundForm((p) => ({ ...p, [booking.id]: e.target.value }))} />
                            <button className="btn btn-outline-danger btn-sm" onClick={() => refundBooking(booking.id)}>Refund</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredBookings.length === 0 && <EmptyRow colSpan={6} text="No booking matches your search." />}
                </tbody>
              </table>
            </div>
            <DashboardPagination page={bookingRows.page} pages={bookingRows.pages} onChange={setBookingPage} />
          </div>
          )}

          {activeSection === "changeRequests" && (
          <div className="eco-card p-0 overflow-hidden mb-3">
            <div className="p-4 pb-0">
              <div className="fw-bold">Cancellation and Job Rejection Requests</div>
              <div className="small-muted">Customer cancellation approval refunds the booking fee. Partner rejection approval returns the booking for reassignment.</div>
            </div>
            <div className="table-responsive">
              <table className="table mb-0 align-middle compact-request-table">
                <thead className="table-light">
                  <tr><th>Booking / Requester</th><th>Request Type</th><th>Status</th><th className="text-end">Action</th></tr>
                </thead>
                <tbody>
                  {changeRows.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="fw-semibold">{item.booking_code}</div>
                        <div className="small-muted">{item.requester_name} | {item.requester_mobile}</div>
                        {item.request_type === "CUSTOMER_PARTNER_CHANGE" && item.current_partner_first_name && <div className="small-muted">Current partner: <b>{item.current_partner_first_name} {item.current_partner_last_name}</b>{item.current_partner_code ? ` (${item.current_partner_code})` : ""}</div>}
                      </td>
                      <td>{item.request_type === "CUSTOMER_CANCELLATION" ? "Customer Cancellation" : item.request_type === "CUSTOMER_PARTNER_CHANGE" ? "Customer Partner Change (no extra fee)" : "Partner Job Rejection"}</td>
                      <td><span className={`badge ${item.status === "PENDING" ? "text-bg-warning" : item.status === "APPROVED" ? "text-bg-success" : "text-bg-danger"}`}>{item.status}</span></td>
                      <td className="text-end"><button className="btn eco-btn-outline btn-sm" onClick={() => setSelectedChangeRequest(item)}>{item.status === "PENDING" ? "Review" : "View"}</button></td>
                    </tr>
                  ))}
                  {(dashboard.changeRequests || []).length === 0 && <EmptyRow colSpan={4} text="No cancellation or rejection requests." />}
                </tbody>
                <tfoot><tr><td colSpan="4"><DashboardPagination page={changeRows.page} pages={changeRows.pages} onChange={(page) => setListPage("changes",page)} /></td></tr></tfoot>
              </table>
            </div>
            {selectedChangeRequest && <div className="payout-modal-backdrop" role="presentation" onMouseDown={() => setSelectedChangeRequest(null)}><div className="payout-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><div className="d-flex justify-content-between align-items-start mb-3"><div><h5 className="mb-1">Review Change Request</h5><div className="small-muted">{selectedChangeRequest.booking_code}</div></div><button className="btn-close" aria-label="Close" onClick={() => setSelectedChangeRequest(null)} /></div><div className="dashboard-detail-grid mb-3"><div className="dashboard-detail-item"><span>Requester</span><b>{selectedChangeRequest.requester_name}</b><div>{selectedChangeRequest.requester_mobile}</div></div><div className="dashboard-detail-item"><span>Request Type</span><b>{selectedChangeRequest.request_type === "CUSTOMER_CANCELLATION" ? "Customer Cancellation" : selectedChangeRequest.request_type === "CUSTOMER_PARTNER_CHANGE" ? "Partner Change" : "Partner Job Rejection"}</b></div>{selectedChangeRequest.current_partner_first_name && <div className="dashboard-detail-item"><span>Current Partner</span><b>{selectedChangeRequest.current_partner_first_name} {selectedChangeRequest.current_partner_last_name}</b></div>}<div className="dashboard-detail-item"><span>Status</span><b>{selectedChangeRequest.status}</b></div></div><div className="dashboard-detail-item mb-3"><span>Reason</span><div>{selectedChangeRequest.reason}</div>{selectedChangeRequest.proof_url && <a className="d-inline-block mt-2" href={`${API_BASE}${selectedChangeRequest.proof_url}`} target="_blank" rel="noreferrer">Open submitted proof</a>}</div>{selectedChangeRequest.status === "PENDING" ? <><label className="form-label">Admin Note (optional)</label><textarea className="form-control mb-3" rows="3" value={changeRequestNotes[selectedChangeRequest.id] || ""} onChange={(e) => setChangeRequestNotes((prev) => ({...prev,[selectedChangeRequest.id]:e.target.value}))} /><div className="d-flex flex-wrap justify-content-end gap-2"><button className="btn btn-outline-danger" onClick={() => { reviewChangeRequest(selectedChangeRequest.id,"REJECT"); setSelectedChangeRequest(null); }}>Reject Request</button><button className="btn eco-btn" onClick={() => { reviewChangeRequest(selectedChangeRequest.id,"APPROVE"); setSelectedChangeRequest(null); }}>Approve</button></div></> : <div className="dashboard-detail-item"><span>Admin Note</span><div>{selectedChangeRequest.admin_note || "Reviewed without a note"}</div></div>}</div></div>}
          </div>
          )}

          {activeSection === "bookingFees" && (
          <div>
                  <div className="row g-3 mb-3">
              {[
                ["Collected", dashboard.bookingFeeSummary?.collected],
                ["Pending Approval", dashboard.bookingFeeSummary?.pending],
                ["Refunded", dashboard.bookingFeeSummary?.refunded],
                ["Net Admin Revenue", dashboard.bookingFeeSummary?.net]
              ].map(([label, value]) => (
                <div key={label} className="col-12 col-md-6 col-xl-3">
                  <div className="eco-card p-4 h-100">
                    <div className="small-muted">{label}</div>
                    <div className="fw-bold fs-3">৳{Number(value || 0).toFixed(0)}</div>
                  </div>
                </div>
                      ))}
            </div>
            <div className="eco-card p-0 overflow-hidden mb-3">
              <div className="p-4 pb-3 d-flex flex-wrap justify-content-between align-items-center gap-3"><div><div className="fw-bold">Booking Fee Records</div><div className="small-muted">Newest records appear first.</div></div><div className="input-group" style={{maxWidth:360}}><span className="input-group-text">Search</span><input className="form-control" placeholder="Booking ID or customer" value={bookingFeeSearch} onChange={(e) => { setBookingFeeSearch(e.target.value); setBookingFeePage(1); }} />{bookingFeeSearch && <button type="button" className="btn btn-outline-secondary" onClick={() => { setBookingFeeSearch(""); setBookingFeePage(1); }}>Clear</button>}</div></div>
              <div className="table-responsive">
                <table className="table mb-0 align-middle">
                  <thead className="table-light"><tr><th>Date</th><th>Booking</th><th>Customer</th><th>TrxID</th><th>Fee Status</th><th>Refund</th></tr></thead>
                  <tbody>
                    {bookingFeeRows.items.map((item) => (
                      <tr key={item.id}>
                        <td>{new Date(item.created_at).toLocaleString()}</td>
                        <td>{item.booking_code}<div className="small-muted">{item.booking_status}</div></td>
                        <td>{item.customer_name}<div className="small-muted">{item.customer_mobile}</div></td>
                        <td>{item.transaction_reference || "-"}</td>
                        <td>৳{Number(item.amount || 0).toFixed(0)} | {item.status}</td>
                        <td>{item.refund_status === "REFUNDED" ? `৳${Number(item.refund_amount || 0).toFixed(0)} REFUNDED` : "-"}</td>
                      </tr>
                      ))}
                    {filteredBookingFees.length === 0 && <EmptyRow colSpan={6} text={bookingFeeSearch ? "No booking fee matches your search." : "No booking fee records."} />}
                  </tbody>
                </table>
              </div>
              <DashboardPagination page={bookingFeeRows.page} pages={bookingFeeRows.pages} onChange={setBookingFeePage} />
            </div>
          </div>
          )}

          {activeSection === "workPayments" && <div className="eco-card p-4"><div className="fw-bold mb-3">Final Work Payments</div><div className="table-responsive"><table className="table align-middle"><thead><tr><th>Booking</th><th>Customer</th><th>Partner</th><th>Amount</th><th>TrxID</th><th>Status / Action</th></tr></thead><tbody>{(dashboard.workPayments || []).map((item) => <tr key={item.id}><td>{item.booking_code}</td><td>{item.customer_name}</td><td>{item.partner_name}</td><td>৳{Number(item.amount).toFixed(2)}</td><td>{item.bkash_trx_id || "-"}</td><td><span className="badge text-bg-secondary me-2">{item.status}</span>{item.status === "PENDING" && <button className="btn eco-btn btn-sm" onClick={() => approveWorkPayment(item.id)}>Approve Payment</button>}</td></tr>)}{(dashboard.workPayments || []).length === 0 && <EmptyRow colSpan={6} text="No work payments." />}</tbody></table></div></div>}

          {activeSection === "customers" && (
          <div className="eco-card p-0 overflow-hidden mb-3">
            <div className="p-4 pb-0 d-flex justify-content-between align-items-center">
              <div className="fw-bold">Customer Management</div>
              <div className="small-muted">Edit profile, update active status, or remove account.</div>
            </div>
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Address</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customerRows.items.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr>
                        <td>{item.name}</td>
                        <td>{item.mobile}</td>
                        <td>{item.email || "-"}</td>
                        <td>
                          <span className={`badge ${item.is_active ? "text-bg-success" : "text-bg-secondary"}`}>
                            {item.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td>{item.address}</td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-2">
                            <button className="btn eco-btn-outline btn-sm" onClick={() => startCustomerEdit(item)}>
                              Edit
                            </button>
                            <button className="btn btn-outline-danger btn-sm" onClick={() => removeCustomer(item.id)}>
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingCustomerId === item.id && (
                        <tr>
                          <td colSpan="6">
                            <div className="p-3">
                              <div className="row g-2">
                                <div className="col-12 col-md-4">
                                  <input className="form-control" value={customerForm.name || ""} onChange={(e) => setCustomerForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" />
                                </div>
                                <div className="col-12 col-md-4">
                                  <input className="form-control" value={customerForm.mobile || ""} onChange={(e) => setCustomerForm((p) => ({ ...p, mobile: e.target.value }))} placeholder="Mobile" />
                                </div>
                                <div className="col-12 col-md-4">
                                  <input className="form-control" value={customerForm.email || ""} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" />
                                </div>
                                <div className="col-12 col-md-8">
                                  <textarea className="form-control" rows="2" value={customerForm.address || ""} onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" />
                                </div>
                                <div className="col-12 col-md-4">
                                  <select className="form-select" value={customerForm.is_active ? "1" : "0"} onChange={(e) => setCustomerForm((p) => ({ ...p, is_active: e.target.value === "1" }))}>
                                    <option value="1">Active</option>
                                    <option value="0">Inactive</option>
                                  </select>
                                </div>
                              </div>
                              <div className="d-flex gap-2 mt-3">
                                <button className="btn eco-btn btn-sm" onClick={() => saveCustomer(item.id)}>Save</button>
                                <button className="btn eco-btn-outline btn-sm" onClick={() => setEditingCustomerId(null)}>Cancel</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {(dashboard.customers || []).length === 0 && <EmptyRow colSpan={6} text="No customers yet." />}
                  {(dashboard.customers || []).length > 0 && <tr><td colSpan="6"><DashboardPagination page={customerRows.page} pages={customerRows.pages} onChange={(page) => setListPage("customers",page)} /></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {activeSection === "partners" && (
          <div className="eco-card p-0 overflow-hidden mt-3 mb-3">
            <div className="p-4 pb-0 d-flex justify-content-between align-items-center">
              <div className="fw-bold">Partner Management</div>
              <div className="small-muted">Edit profile, update verification or availability, and remove account.</div>
            </div>
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Category</th>
                    <th>Area</th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerRows.items.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr>
                        <td>{item.first_name} {item.last_name}</td>
                        <td>{item.partner_code || "-"}</td>
                        <td>{serviceLabelMap[item.technician_category] || item.technician_category}</td>
                        <td>{item.district}, {item.thana}</td>
                        <td>
                          <div className="small-muted">{item.verification_status} / {item.availability_status}</div>
                          <span className={`badge ${item.is_active ? "text-bg-success" : "text-bg-secondary"}`}>
                            {item.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-2">
                            <button className="btn eco-btn-outline btn-sm" onClick={() => startPartnerEdit(item)}>
                              Edit
                            </button>
                            <button className="btn btn-outline-danger btn-sm" onClick={() => removePartner(item.id)}>
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingPartnerId === item.id && (
                        <tr>
                          <td colSpan="6">
                            <div className="p-3">
                              <div className="row g-2">
                                <div className="col-12 col-md-3">
                                  <input className="form-control" value={partnerForm.first_name || ""} onChange={(e) => setPartnerForm((p) => ({ ...p, first_name: e.target.value }))} placeholder="First name" />
                                </div>
                                <div className="col-12 col-md-3">
                                  <input className="form-control" value={partnerForm.last_name || ""} onChange={(e) => setPartnerForm((p) => ({ ...p, last_name: e.target.value }))} placeholder="Last name" />
                                </div>
                                <div className="col-12 col-md-3">
                                  <input className="form-control" value={partnerForm.mobile || ""} onChange={(e) => setPartnerForm((p) => ({ ...p, mobile: e.target.value }))} placeholder="Mobile" />
                                </div>
                                <div className="col-12 col-md-3">
                                  <input className="form-control" value={partnerForm.email || ""} onChange={(e) => setPartnerForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" />
                                </div>
                                <div className="col-12 col-md-6">
                                  <textarea className="form-control" rows="2" value={partnerForm.nid_address || ""} onChange={(e) => setPartnerForm((p) => ({ ...p, nid_address: e.target.value }))} placeholder="NID address" />
                                </div>
                                <div className="col-12 col-md-3">
                                  <input className="form-control" value={partnerForm.nid_number || ""} onChange={(e) => setPartnerForm((p) => ({ ...p, nid_number: e.target.value }))} placeholder="NID number" />
                                </div>
                                <div className="col-12 col-md-3">
                                  <input className="form-control" value={partnerForm.experience_years || ""} onChange={(e) => setPartnerForm((p) => ({ ...p, experience_years: e.target.value }))} placeholder="Experience" />
                                </div>
                                <div className="col-12 col-md-3">
                                  <input className="form-control" value={partnerForm.father_name || ""} onChange={(e) => setPartnerForm((p) => ({ ...p, father_name: e.target.value }))} placeholder="Father name" />
                                </div>
                                <div className="col-12 col-md-3">
                                  <input className="form-control" value={partnerForm.mother_name || ""} onChange={(e) => setPartnerForm((p) => ({ ...p, mother_name: e.target.value }))} placeholder="Mother name" />
                                </div>
                                <div className="col-12 col-md-2">
                                  <input className="form-control" value={partnerForm.district || ""} onChange={(e) => setPartnerForm((p) => ({ ...p, district: e.target.value }))} placeholder="District" />
                                </div>
                                <div className="col-12 col-md-2">
                                  <input className="form-control" value={partnerForm.thana || ""} onChange={(e) => setPartnerForm((p) => ({ ...p, thana: e.target.value }))} placeholder="Thana" />
                                </div>
                                <div className="col-12 col-md-2">
                                  <input className="form-control" value={partnerForm.ward_no || ""} onChange={(e) => setPartnerForm((p) => ({ ...p, ward_no: e.target.value }))} placeholder="Ward" />
                                </div>
                                <div className="col-12 col-md-3">
                                  <input className="form-control" value={partnerForm.city_corp_or_union || ""} onChange={(e) => setPartnerForm((p) => ({ ...p, city_corp_or_union: e.target.value }))} placeholder="City Corp / Union" />
                                </div>
                                <div className="col-12 col-md-3">
                                  <select className="form-select" value={partnerForm.technician_category || serviceOptions[0]?.key || "AC_REPAIR"} onChange={(e) => setPartnerForm((p) => ({ ...p, technician_category: e.target.value }))}>
                                    {serviceOptions.map((option) => (
                                      <option key={option.key} value={option.key}>{option.title}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="col-12 col-md-3">
                                  <select className="form-select" value={partnerForm.verification_status || "PENDING"} onChange={(e) => setPartnerForm((p) => ({ ...p, verification_status: e.target.value }))}>
                                    <option value="PENDING">PENDING</option>
                                    <option value="APPROVED">APPROVED</option>
                                    <option value="REJECTED">REJECTED</option>
                                  </select>
                                </div>
                                <div className="col-12 col-md-3">
                                  <select className="form-select" value={partnerForm.availability_status || "OFFLINE"} onChange={(e) => setPartnerForm((p) => ({ ...p, availability_status: e.target.value }))}>
                                    <option value="AVAILABLE">AVAILABLE</option>
                                    <option value="BUSY">BUSY</option>
                                    <option value="OFFLINE">OFFLINE</option>
                                  </select>
                                </div>
                                <div className="col-12 col-md-3">
                                  <input type="time" className="form-control" value={partnerForm.working_start_time || "09:00"} onChange={(e) => setPartnerForm((p) => ({ ...p, working_start_time: e.target.value }))} />
                                </div>
                                <div className="col-12 col-md-3">
                                  <input type="time" className="form-control" value={partnerForm.working_end_time || "18:00"} onChange={(e) => setPartnerForm((p) => ({ ...p, working_end_time: e.target.value }))} />
                                </div>
                                <div className="col-12 col-md-3">
                                  <select className="form-select" value={partnerForm.is_active ? "1" : "0"} onChange={(e) => setPartnerForm((p) => ({ ...p, is_active: e.target.value === "1" }))}>
                                    <option value="1">Active</option>
                                    <option value="0">Inactive</option>
                                  </select>
                                </div>
                              </div>
                              <div className="d-flex gap-2 mt-3">
                                <button className="btn eco-btn btn-sm" onClick={() => savePartner(item.id)}>Save</button>
                                <button className="btn eco-btn-outline btn-sm" onClick={() => setEditingPartnerId(null)}>Cancel</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {(dashboard.partners || []).length === 0 && <EmptyRow colSpan={6} text="No partners yet." />}
                  {(dashboard.partners || []).length > 0 && <tr><td colSpan="6"><DashboardPagination page={partnerRows.page} pages={partnerRows.pages} onChange={(page) => setListPage("partners",page)} /></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {activeSection === "messages" && (
          <div className="eco-card p-0 overflow-hidden mt-3 mb-3">
            <div className="p-4 pb-0 d-flex justify-content-between align-items-center">
              <div className="fw-bold">Support Messages</div>
              <div className="small-muted">Reply to customers and partners from here.</div>
            </div>
            <div className="p-4">
              {contacts.length === 0 && <div className="small-muted">No messages found.</div>}
              {contacts.map((item) => (
                <div key={item.id} className="border rounded-3 p-3 mb-3">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                    <div>
                      <div className="fw-bold">{item.name}</div>
                      <div className="small-muted">{item.user_role || "UNKNOWN"} | {item.email}{item.mobile ? ` | ${item.mobile}` : ""}</div>
                    </div>
                    <div className="small-muted">{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                  <div className="mb-3">{item.message}</div>

                  {(item.replies || []).map((reply) => (
                    <div key={reply.id} className="bg-light rounded-3 p-2 mb-2">
                      <div className="small-muted mb-1">
                        Admin {reply.replied_by_email ? `(${reply.replied_by_email})` : ""} | {new Date(reply.created_at).toLocaleString()}
                      </div>
                      <div>{reply.reply_text}</div>
                    </div>
                  ))}

                  <div className="d-flex gap-2 mt-3">
                    <input
                      className="form-control"
                      placeholder="Write admin reply"
                      value={replyForm[item.id] || ""}
                      onChange={(e) => setReplyForm((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    />
                    <button
                      className="btn eco-btn"
                      disabled={replyLoading[item.id] || !String(replyForm[item.id] || "").trim()}
                      onClick={() => replyToContact(item.id)}
                    >
                      {replyLoading[item.id] ? "Sending..." : "Reply"}
                    </button>
                    <button className="btn btn-outline-danger" onClick={() => removeContact(item.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {activeSection === "withdrawals" && (
          <div className="eco-card p-0 overflow-hidden mt-3">
            <div className="p-4 pb-0">
              <div className="fw-bold">Withdrawal Requests</div>
            </div>
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Partner</th>
                    <th>Code</th>
                    <th>Amount</th>
                    <th>Balance</th>
                    <th>Payment Details</th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawalRows.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.first_name} {item.last_name}</td>
                      <td>{item.partner_code || "-"}</td>
                      <td>{item.amount}</td>
                      <td>{item.current_balance}</td>
                      <td><div className="fw-semibold">{item.payout_method || "-"}</div><div>{item.payout_account_name || "-"}</div><div>{item.payout_account_number || "-"}</div>{item.payout_method === "BANK" && <div className="small-muted">{item.payout_bank_name} · {item.payout_branch_name}{item.payout_routing_number ? ` · ${item.payout_routing_number}` : ""}</div>}</td>
                      <td>{item.status}</td>
                      <td className="text-end">
                        <button className="btn eco-btn btn-sm" disabled={item.status !== "PENDING"} onClick={() => payWithdrawal(item.id)}>
                          Mark Paid
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(dashboard.withdrawals || []).length === 0 && <EmptyRow colSpan={7} text="No withdrawal requests." />}
                  {(dashboard.withdrawals || []).length > 0 && <tr><td colSpan="7"><DashboardPagination page={withdrawalRows.page} pages={withdrawalRows.pages} onChange={(page) => setListPage("withdrawals",page)} /></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          )}
            </>
          )}
        </div>
      </div>
      {selectedBooking && <div className="payout-modal-backdrop" role="presentation" onMouseDown={() => setSelectedBooking(null)}><div className="payout-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><div className="d-flex justify-content-between mb-3"><div><h5 className="mb-1">Booking Details</h5><div className="small-muted">{selectedBooking.booking_code}</div></div><button className="btn-close" aria-label="Close" onClick={() => setSelectedBooking(null)} /></div><div className="dashboard-detail-grid">{[["Customer", selectedBooking.customer_name],["Mobile", selectedBooking.customer_mobile],["Service", serviceLabelMap[selectedBooking.category] || selectedBooking.category],["Status", bookingStatusLabel(selectedBooking.status)],["Requested Partner", selectedBooking.requested_partner_first_name ? `${selectedBooking.requested_partner_first_name} ${selectedBooking.requested_partner_last_name}` : "None"],["Assigned Partner", selectedBooking.assigned_partner_first_name ? `${selectedBooking.assigned_partner_first_name} ${selectedBooking.assigned_partner_last_name}` : "Not assigned"],["Booking Fee", `৳${Number(selectedBooking.booking_fee || 0).toFixed(0)}`],["TrxID", selectedBooking.bkash_trx_id || "Not submitted"],["District / Thana", `${selectedBooking.district || "-"} / ${selectedBooking.thana || "-"}`],["Address", selectedBooking.service_address || "-"]].map(([label,value]) => <div className="dashboard-detail-item" key={label}><span>{label}</span><b>{value}</b></div>)}</div></div></div>}
      {showServiceModal && <div className="payout-modal-backdrop" role="presentation" onMouseDown={() => setShowServiceModal(false)}><div className="payout-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><div className="d-flex justify-content-between align-items-start mb-3"><div><h5 className="mb-1">{editingServiceKey ? "Edit Service" : "Add New Service"}</h5><div className="small-muted">Used across the website.</div></div><button className="btn-close" aria-label="Close" onClick={() => setShowServiceModal(false)} /></div><div className="row g-3"><div className="col-12"><label className="form-label">Service Key</label><input className="form-control" placeholder="e.g. CARPENTRY" value={serviceDraft.key} disabled={Boolean(editingServiceKey)} onChange={(e) => setServiceDraft((p) => ({...p,key:e.target.value}))} /></div><div className="col-12"><label className="form-label">Service Title</label><input className="form-control" value={serviceDraft.title} onChange={(e) => setServiceDraft((p) => ({...p,title:e.target.value}))} /></div><div className="col-12"><label className="form-label">Description</label><textarea className="form-control" rows="4" value={serviceDraft.desc} onChange={(e) => setServiceDraft((p) => ({...p,desc:e.target.value}))} /></div><div className="col-12"><label className="form-label">Service Card Image</label><input type="file" className="form-control" accept="image/*" onChange={(e) => setServiceDraft((p) => ({...p,imageFile:e.target.files?.[0] || null,removeImage:false}))} /></div><div className="col-12 d-flex justify-content-end gap-2"><button type="button" className="btn btn-light" onClick={() => setShowServiceModal(false)}>Cancel</button><button className="btn eco-btn" onClick={submitService}>{editingServiceKey ? "Update Service" : "Add Service"}</button></div></div></div></div>}
    </div>
  );
}
