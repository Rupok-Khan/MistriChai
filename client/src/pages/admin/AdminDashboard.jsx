import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminService } from "../../services/admin.service";
import { clearAdminAuth } from "../../utils/adminAuth";
import { DEFAULT_SERVICE_OPTIONS, buildServiceLabelMap, normalizeServiceOptions } from "../../utils/serviceCatalog";

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

export default function AdminDashboard() {
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [dashboard, setDashboard] = useState({
    summary: {},
    pendingPartners: [],
    approvedPartners: [],
    customers: [],
    partners: [],
    bookings: [],
    withdrawals: []
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [assignForm, setAssignForm] = useState({});
  const [refundForm, setRefundForm] = useState({});
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editingPartnerId, setEditingPartnerId] = useState(null);
  const [customerForm, setCustomerForm] = useState({});
  const [partnerForm, setPartnerForm] = useState({});
  const [siteForm, setSiteForm] = useState({});
  const [siteSaving, setSiteSaving] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [replyForm, setReplyForm] = useState({});
  const [replyLoading, setReplyLoading] = useState({});
  const [editingServiceKey, setEditingServiceKey] = useState(null);
  const [serviceDraft, setServiceDraft] = useState({
    key: "",
    title: "",
    desc: "",
    imageUrl: "",
    imageFile: null,
    removeImage: false
  });
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

  const partnerOptions = useMemo(
    () => (dashboard.approvedPartners || []).map((p) => ({ value: p.user_id, label: `${p.first_name} ${p.last_name}` })),
    [dashboard.approvedPartners]
  );
  const serviceOptions = useMemo(
    () => normalizeServiceOptions(siteForm.services || dashboard.siteSettings?.services || DEFAULT_SERVICE_OPTIONS),
    [siteForm.services, dashboard.siteSettings?.services]
  );
  const serviceLabelMap = useMemo(() => buildServiceLabelMap(serviceOptions), [serviceOptions]);

  const menuItems = [
    { key: "overview", label: "Overview" },
    { key: "site", label: "Site Content" },
    { key: "services", label: "Services", count: serviceOptions.length },
    { key: "pending", label: "Partner Review", count: dashboard.pendingPartners?.length || 0 },
    { key: "bookings", label: "Bookings", count: dashboard.bookings?.length || 0 },
    { key: "customers", label: "Customers", count: dashboard.customers?.length || 0 },
    { key: "partners", label: "Partners", count: dashboard.partners?.length || 0 },
    { key: "messages", label: "Messages", count: contacts.length },
    { key: "withdrawals", label: "Withdrawals", count: dashboard.withdrawals?.length || 0 }
  ];

  const logout = () => {
    clearAdminAuth();
    navigate("/admin/login", { replace: true });
  };

  const assignBooking = async (bookingId) => {
    try {
      await AdminService.assignBooking(bookingId, {
        partner_user_id: Number(assignForm[bookingId]),
        admin_note: "Assigned by admin dashboard"
      });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

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
      const res = await AdminService.updateSiteContent(siteForm);
      const updatedSettings = res.data || {};
      setSiteForm(updatedSettings);
      setDashboard((prev) => ({ ...prev, siteSettings: updatedSettings }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setSiteSaving(false);
    }
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

  return (
    <div className="container section-pad">
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

          <div className="eco-card p-4 mb-3">
            <div className="admin-panel-kicker">
              {activeSection === "overview" && "Overview"}
              {activeSection === "site" && "Site Content"}
              {activeSection === "services" && "Service Catalog"}
              {activeSection === "pending" && "Partner Review"}
              {activeSection === "bookings" && "Bookings and Assignment"}
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
              {activeSection === "bookings" && "Assign technicians and handle refund requests."}
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
                  <div className="row g-3 mb-3">
            {[
              ["Pending Partners", dashboard.summary?.pending_partners || 0],
              ["Total Bookings", dashboard.summary?.total_bookings || 0],
              ["Active Bookings", dashboard.summary?.active_bookings || 0],
              ["Refund Cases", dashboard.summary?.refund_cases || 0],
              ["Customers", dashboard.summary?.total_customers || 0],
              ["Partners", dashboard.summary?.total_partners || 0]
            ].map(([label, value]) => (
              <div key={label} className="col-12 col-md-6 col-xl-2">
                <div className="eco-card p-4 h-100">
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
                </>
              )}

          {activeSection === "site" && (
          <div className="eco-card p-4 mb-3">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-3">
              <div>
                <div className="fw-bold">Site Content</div>
                <div className="small-muted">Edit homepage hero text, promo images, contact information, address, and about-page copy.</div>
              </div>
              <button className="btn eco-btn" onClick={saveSiteContent} disabled={siteSaving}>
                {siteSaving ? "Saving..." : "Save Content"}
              </button>
            </div>

            <div className="row g-4">
              <div className="col-12">
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
                      <input className="form-control" placeholder="Hero image URL" value={siteForm.home?.heroImageUrl || ""} onChange={(e) => setSiteForm((p) => ({ ...p, home: { ...p.home, heroImageUrl: e.target.value } }))} />
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

              <div className="col-12 col-xl-6">
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
                    <div className="col-12">
                      <input className="form-control" placeholder="Left image URL" value={siteForm.promo?.leftImageUrl || ""} onChange={(e) => setSiteForm((p) => ({ ...p, promo: { ...p.promo, leftImageUrl: e.target.value } }))} />
                    </div>
                    <div className="col-12">
                      <input className="form-control" placeholder="Right image URL" value={siteForm.promo?.rightImageUrl || ""} onChange={(e) => setSiteForm((p) => ({ ...p, promo: { ...p.promo, rightImageUrl: e.target.value } }))} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-xl-6">
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

              <div className="col-12">
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
            </div>
          </div>
          )}

          {activeSection === "services" && (
          <div className="eco-card p-4 mb-3">
            <div className="row g-3">
              <div className="col-12 col-lg-5">
                <div className="border rounded-3 p-3 h-100">
                  <div className="fw-bold mb-2">{editingServiceKey ? "Edit Service" : "Add New Service"}</div>
                  <div className="row g-2">
                    <div className="col-12">
                      <input
                        className="form-control"
                        placeholder="Service key (e.g. CARPENTRY)"
                        value={serviceDraft.key}
                        onChange={(e) => setServiceDraft((p) => ({ ...p, key: e.target.value }))}
                        disabled={Boolean(editingServiceKey)}
                      />
                    </div>
                    <div className="col-12">
                      <input
                        className="form-control"
                        placeholder="Service title"
                        value={serviceDraft.title}
                        onChange={(e) => setServiceDraft((p) => ({ ...p, title: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Short service description"
                        value={serviceDraft.desc}
                        onChange={(e) => setServiceDraft((p) => ({ ...p, desc: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={(e) =>
                          setServiceDraft((p) => ({
                            ...p,
                            imageFile: e.target.files?.[0] || null,
                            removeImage: false
                          }))
                        }
                      />
                      <div className="small-muted mt-1">
                        Upload service card image (max 5MB). Leave empty to keep current image.
                      </div>
                    </div>
                    {(serviceDraft.imageUrl || serviceDraft.imageFile) && (
                      <div className="col-12">
                        {serviceDraft.imageFile && (
                          <div className="small-muted mb-2">Selected: {serviceDraft.imageFile.name}</div>
                        )}
                        {serviceDraft.imageUrl && !serviceDraft.imageFile && !serviceDraft.removeImage && (
                          <img
                            src={resolveImageSrc(serviceDraft.imageUrl)}
                            alt="Service preview"
                            className="img-fluid rounded-3 border"
                            style={{ maxHeight: 140, objectFit: "cover" }}
                          />
                        )}
                        {editingServiceKey && serviceDraft.imageUrl && !serviceDraft.imageFile && (
                          <div className="d-flex gap-2 mt-2">
                            <button
                              type="button"
                              className={`btn btn-sm ${serviceDraft.removeImage ? "btn-outline-secondary" : "btn-outline-danger"}`}
                              onClick={() =>
                                setServiceDraft((p) => ({
                                  ...p,
                                  removeImage: !p.removeImage
                                }))
                              }
                            >
                              {serviceDraft.removeImage ? "Undo Remove Image" : "Remove Current Image"}
                            </button>
                            {serviceDraft.removeImage && (
                              <div className="small-muted align-self-center">
                                Current image will be removed after update.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="col-12 d-flex gap-2">
                      <button className="btn eco-btn btn-sm" onClick={submitService}>
                        {editingServiceKey ? "Update Service" : "Add Service"}
                      </button>
                      <button className="btn eco-btn-outline btn-sm" onClick={resetServiceDraft}>
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-7">
                <div className="border rounded-3 p-3 h-100">
                  <div className="fw-bold mb-2">Existing Services</div>
                  <div className="table-responsive">
                    <table className="table align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Image</th>
                          <th>Key</th>
                          <th>Title</th>
                          <th>Description</th>
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
                            <td className="text-end">
                              <div className="d-flex justify-content-end gap-2">
                                <button className="btn eco-btn-outline btn-sm" onClick={() => startServiceEdit(item)}>Edit</button>
                                <button className="btn btn-outline-danger btn-sm" onClick={() => removeService(item.key)}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {serviceOptions.length === 0 && <EmptyRow colSpan={5} text="No services configured." />}
                      </tbody>
                    </table>
                  </div>
                </div>
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
              <div className="fw-bold">Bookings and Assignment</div>
            </div>
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Booking</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Assign / Refund</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard.bookings || []).map((booking) => (
                    <tr key={booking.id}>
                      <td>{booking.booking_code}</td>
                      <td>{booking.customer_name}</td>
                      <td>{serviceLabelMap[booking.category] || booking.category}</td>
                      <td>{booking.status}</td>
                      <td style={{ minWidth: 320 }}>
                        {booking.assigned_partner_first_name ? (
                          <div className="small-muted">
                            Assigned: {booking.assigned_partner_first_name} {booking.assigned_partner_last_name}
                          </div>
                        ) : (
                          <div className="d-flex gap-2">
                            <select className="form-select form-select-sm" value={assignForm[booking.id] || ""} onChange={(e) => setAssignForm((p) => ({ ...p, [booking.id]: e.target.value }))}>
                              <option value="">Select partner</option>
                              {partnerOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <button className="btn eco-btn btn-sm" disabled={!assignForm[booking.id]} onClick={() => assignBooking(booking.id)}>
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
                </tbody>
              </table>
            </div>
          </div>
          )}

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
                  {(dashboard.customers || []).map((item) => (
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
                  {(dashboard.partners || []).map((item) => (
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
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard.withdrawals || []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.first_name} {item.last_name}</td>
                      <td>{item.partner_code || "-"}</td>
                      <td>{item.amount}</td>
                      <td>{item.current_balance}</td>
                      <td>{item.status}</td>
                      <td className="text-end">
                        <button className="btn eco-btn btn-sm" disabled={item.status !== "PENDING"} onClick={() => payWithdrawal(item.id)}>
                          Mark Paid
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(dashboard.withdrawals || []).length === 0 && <EmptyRow colSpan={6} text="No withdrawal requests." />}
                </tbody>
              </table>
            </div>
          </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
