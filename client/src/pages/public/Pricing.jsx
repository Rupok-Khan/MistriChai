import React from "react";
import { Link } from "react-router-dom";

const plans = [
  { name: "1 Month", price: "৳30", code: "ONE_MONTH", note: "For occasional service needs" },
  { name: "6 Months", price: "৳149", code: "SIX_MONTHS", note: "Great for regular home care", featured: true },
  { name: "1 Year", price: "৳250", code: "ONE_YEAR", note: "Best value for frequent bookings" }
];

export default function Pricing() {
  return <main className="container section-pad">
    <div className="text-center mb-5"><span className="eyebrow">Simple membership</span><h1 className="fw-bold mt-2">Choose your service plan</h1><p className="small-muted mx-auto pricing-intro">One subscription removes booking fees during its active period. Final technician payment is separate.</p></div>
    <div className="row g-4 justify-content-center">{plans.map((plan) => <div className="col-12 col-md-4" key={plan.code}><article className={`eco-card pricing-card p-4 h-100 ${plan.featured ? "featured" : ""}`}>{plan.featured && <span className="pricing-popular">Most popular</span>}<h3 className="fw-bold">{plan.name}</h3><div className="pricing-price">{plan.price}</div><p className="small-muted">{plan.note}</p><ul className="pricing-list"><li>৳0 booking fee</li><li>Verified service partners</li><li>Dashboard booking tracking</li></ul><Link className="btn eco-btn w-100" to="/auth/customer/login">Choose this plan</Link></article></div>)}</div>
    <div className="eco-card p-4 mt-5 text-center"><h5 className="fw-bold">Transparent final payment</h5><p className="small-muted mb-0">When a customer pays the final service amount, 4% is retained by the platform as commission and the remaining 96% is credited to the partner wallet.</p></div>
  </main>;
}
