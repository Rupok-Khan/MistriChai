import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { PartnerService } from "../../services/partner.service";
import { CustomerService } from "../../services/customer.service";
import { DEFAULT_SERVICE_OPTIONS, buildServiceLabelMap, normalizeServiceOptions } from "../../utils/serviceCatalog";
import { SiteContentService } from "../../services/siteContent.service";

const DEFAULT_FILTERS = {
  district: "",
  thana: "",
  ward_no: "",
  availableNow: true
};

const DEFAULT_BOOKING_STATE = {
  partnerId: "",
  problem_summary: "",
  service_address: "",
  district: "",
  thana: "",
  ward_no: "",
  city_corp_or_union: "",
  preferred_date: "",
  preferred_time: "",
  booking_fee: "200",
  estimated_cash_amount: "0",
  customer_note: ""
};

function isAvailableStatus(value) {
  return String(value || "").trim().toUpperCase() === "AVAILABLE";
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function PartnerList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const query = useQuery();
  const [serviceOptions, setServiceOptions] = useState(DEFAULT_SERVICE_OPTIONS);
  const serviceLabelMap = useMemo(() => buildServiceLabelMap(serviceOptions), [serviceOptions]);
  const category = query.get("category") || serviceOptions[0]?.key || "AC_REPAIR";

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [list, setList] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingState, setBookingState] = useState(DEFAULT_BOOKING_STATE);

  useEffect(() => {
    let active = true;
    SiteContentService.getPublic()
      .then((res) => {
        if (active) {
          setServiceOptions(normalizeServiceOptions(res?.data?.services));
        }
      })
      .catch(() => {
        if (active) {
          setServiceOptions(DEFAULT_SERVICE_OPTIONS);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      navigate(
        `/auth/customer/login?next=${encodeURIComponent(`/partners?category=${category}`)}`,
        { replace: true }
      );
      return;
    }
    if (user.role !== "CUSTOMER") {
      navigate("/auth", { replace: true });
    }
  }, [user, navigate, category]);

  useEffect(() => {
    setFilters(DEFAULT_FILTERS);
    setBookingState(DEFAULT_BOOKING_STATE);
  }, [category]);

  const loadPartnerDirectory = useCallback(async () => {
    try {
      const data = await PartnerService.list({
        category,
        availableNow: false
      });
      setDirectory(data.data || []);
    } catch {
      // Keep UI usable with filtered list even if directory call fails.
    }
  }, [category]);

  const loadPartners = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const data = await PartnerService.list({
        category,
        district: filters.district,
        thana: filters.thana,
        ward_no: filters.ward_no,
        availableNow: filters.availableNow
      });
      const source = data.data || [];
      const normalized = filters.availableNow
        ? source.filter((item) => isAvailableStatus(item.availability_status))
        : source;
      setList(normalized);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [category, filters.availableNow, filters.district, filters.thana, filters.ward_no]);

  useEffect(() => {
    if (user?.role === "CUSTOMER") {
      loadPartnerDirectory();
      loadPartners();
    }
  }, [loadPartnerDirectory, loadPartners, user]);

  const districtOptions = useMemo(() => {
    return [...new Set((directory || []).map((item) => String(item.district || "").trim()).filter(Boolean))].sort();
  }, [directory]);

  const thanaOptions = useMemo(() => {
    const source = (directory || []).filter((item) =>
      !filters.district || item.district === filters.district
    );
    return [...new Set(source.map((item) => String(item.thana || "").trim()).filter(Boolean))].sort();
  }, [directory, filters.district]);

  const onFilterChange = (k, v) => {
    setFilters((prev) => {
      if (k === "district") {
        return { ...prev, district: v, thana: "" };
      }
      return { ...prev, [k]: v };
    });
  };

  const onBookingChange = (k, v) => setBookingState((p) => ({ ...p, [k]: v }));

  const choosePartner = (partner) => {
    setBookingState((prev) => ({
      ...prev,
      partnerId: String(partner.id),
      district: partner.district || "",
      thana: partner.thana || "",
      ward_no: partner.ward_no || "",
      city_corp_or_union: partner.city_corp_or_union || ""
    }));
  };

  const clearSelectedPartner = () => {
    setBookingState((prev) => ({
      ...prev,
      partnerId: "",
      district: "",
      thana: "",
      ward_no: "",
      city_corp_or_union: ""
    }));
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await CustomerService.createBooking({
        requested_partner_user_id: Number(bookingState.partnerId),
        category,
        problem_summary: bookingState.problem_summary,
        service_address: bookingState.service_address,
        district: bookingState.district,
        thana: bookingState.thana,
        ward_no: bookingState.ward_no,
        city_corp_or_union: bookingState.city_corp_or_union,
        preferred_date: bookingState.preferred_date,
        preferred_time: bookingState.preferred_time,
        booking_fee: Number(bookingState.booking_fee),
        estimated_cash_amount: Number(bookingState.estimated_cash_amount || 0),
        customer_note: bookingState.customer_note
      });
      navigate("/customer/dashboard");
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const selectedPartner = useMemo(() => {
    if (!bookingState.partnerId) {
      return null;
    }
    const byFiltered = list.find((p) => String(p.id) === bookingState.partnerId);
    if (byFiltered) {
      return byFiltered;
    }
    return directory.find((p) => String(p.id) === bookingState.partnerId) || null;
  }, [bookingState.partnerId, directory, list]);

  return (
    <div className="container section-pad">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
        <div>
          <h2 className="fw-bold mb-1">{serviceLabelMap[category] || "Service"} Technicians</h2>
          <div className="small-muted">
            Step 1: choose a technician. Step 2: complete the booking form.
          </div>
        </div>
      </div>

      {err && <div className="alert alert-warning">{err}</div>}

      <div className="eco-card p-3 p-md-4 mb-3">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">District</label>
            <select className="form-select" value={filters.district} onChange={(e) => onFilterChange("district", e.target.value)}>
              <option value="">All Districts</option>
              {districtOptions.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Thana</label>
            <select className="form-select" value={filters.thana} onChange={(e) => onFilterChange("thana", e.target.value)}>
              <option value="">All Thanas</option>
              {thanaOptions.map((thana) => (
                <option key={thana} value={thana}>{thana}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Ward No</label>
            <input className="form-control" value={filters.ward_no} onChange={(e) => onFilterChange("ward_no", e.target.value)} />
          </div>
          <div className="col-12 col-md-3">
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                checked={filters.availableNow}
                onChange={(e) => onFilterChange("availableNow", e.target.checked)}
                id="availableNow"
              />
              <label className="form-check-label" htmlFor="availableNow">
                Available Only
              </label>
            </div>
            <button className="btn eco-btn w-100" type="button" onClick={loadPartners} disabled={loading}>
              {loading ? "Loading..." : "Apply Filters"}
            </button>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className={selectedPartner ? "col-12 col-xl-7" : "col-12"}>
          {loading ? (
            <div className="eco-card p-4 text-center">
              <div className="spinner-border" role="status" />
            </div>
          ) : list.length === 0 ? (
            <div className="eco-card p-4 text-center small-muted">
              No technicians found for this filter.
            </div>
          ) : (
            <div className="row g-3">
              {list.map((p) => (
                <div key={p.id} className="col-12 col-md-6">
                  <div className="eco-card p-3 h-100">
                    <div className="d-flex gap-3">
                      <img src={p.profile_photo_url} alt={p.name} className="partner-avatar" />
                      <div className="flex-grow-1">
                        <div className="fw-bold">{p.name}</div>
                        <div className="small-muted">Code: {p.partner_code || "Pending approval code"}</div>
                        <div className="small-muted">{p.district}, {p.thana}, Ward {p.ward_no}</div>
                        <div className="small-muted">Working: {p.working_start_time} - {p.working_end_time}</div>
                        <div className="small-muted">Experience: {p.experience_years} years</div>
                        <div className="small-muted">
                          Rating: {Number(p.rating_avg || 0).toFixed(1)} / 5 ({p.rating_count || 0} reviews)
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <span className={`badge ${isAvailableStatus(p.availability_status) ? "text-bg-success" : "text-bg-secondary"}`}>
                        {p.availability_status}
                      </span>
                      <button className="btn eco-btn" onClick={() => choosePartner(p)}>
                        {String(p.id) === bookingState.partnerId ? "Selected" : "Choose and Continue"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedPartner && (
          <div className="col-12 col-xl-5">
            <div className="eco-card p-4 h-100">
              <div className="fw-bold mb-1">Booking Form</div>
              <div className="small-muted mb-3">
                Selected partner: <b>{selectedPartner.name}</b>
              </div>

              <form className="row g-3" onSubmit={submitBooking}>
                <div className="col-12">
                  <label className="form-label">Problem Details</label>
                  <textarea className="form-control" rows="3" value={bookingState.problem_summary} onChange={(e) => onBookingChange("problem_summary", e.target.value)} required />
                </div>
                <div className="col-12">
                  <label className="form-label">Service Address</label>
                  <textarea className="form-control" rows="2" value={bookingState.service_address} onChange={(e) => onBookingChange("service_address", e.target.value)} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Preferred Date</label>
                  <input type="date" className="form-control" value={bookingState.preferred_date} onChange={(e) => onBookingChange("preferred_date", e.target.value)} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Preferred Time</label>
                  <input className="form-control" value={bookingState.preferred_time} onChange={(e) => onBookingChange("preferred_time", e.target.value)} placeholder="Morning / 2 PM / Evening" />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Booking Fee</label>
                  <input type="number" className="form-control" value={bookingState.booking_fee} onChange={(e) => onBookingChange("booking_fee", e.target.value)} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Expected Cash Payment</label>
                  <input type="number" className="form-control" value={bookingState.estimated_cash_amount} onChange={(e) => onBookingChange("estimated_cash_amount", e.target.value)} />
                </div>
                <div className="col-12">
                  <label className="form-label">Extra Note</label>
                  <textarea className="form-control" rows="2" value={bookingState.customer_note} onChange={(e) => onBookingChange("customer_note", e.target.value)} />
                </div>
                <div className="col-12 d-flex gap-2">
                  <button type="button" className="btn eco-btn-outline w-50" onClick={clearSelectedPartner}>
                    Change Partner
                  </button>
                  <button className="btn eco-btn w-50">
                    Pay Fee & Place Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
