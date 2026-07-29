import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { DEFAULT_SERVICE_OPTIONS, normalizeServiceOptions } from "../../utils/serviceCatalog";
import cardOneImg from "../../assets/image/card-1-home.jpg";
import cardTwoImg from "../../assets/image/card-2-home.jpg";
import cardThreeImg from "../../assets/image/card-3-home.jpg";
import heroImg from "../../assets/image/hero image.jpg";
import { SiteContentService } from "../../services/siteContent.service";
import Loading from "../../components/Loading";

const IMAGES = {
  AC_REPAIR: cardOneImg,
  PLUMBING: cardTwoImg,
  GAS_STOVE_REPAIR: cardThreeImg,
  HOME_CLEANING: heroImg,
  HOME_ELECTRONICS: cardOneImg
};

const bookingSteps = [
  ["01", "Choose a Service", "Browse available categories and select the service that matches your needs."],
  ["02", "Find a Professional", "Browse approved professionals based on relevant service and location information."],
  ["03", "Choose Your Schedule", "Provide your location, preferred date, time, and details about the service you need."],
  ["04", "Manage Your Booking", "Follow your booking status, communicate when needed, and rate the service after completion."]
];

const trustFeatures = [
  ["Approved Professionals", "Partners must complete the platform's registration and approval process before becoming eligible for service assignments."],
  ["Organized Booking", "Keep your service request, schedule, professional assignment, and booking status connected to one booking."],
  ["Booking Communication", "Use supported booking communication to discuss relevant service information."],
  ["Customer Feedback", "Customers can rate completed bookings and share feedback about their service experience."]
];

const faqs = [
  ["How do I book a service?", "Choose an available service, provide the required booking information, and follow the booking process through your customer account."],
  ["Can I choose a professional?", "Where supported by the booking flow, customers can browse approved professionals and indicate their preferred professional."],
  ["How do I know a professional is approved?", "Professionals must go through the MistriChai registration and administrative approval process before becoming eligible for platform assignments."],
  ["Can I change or cancel a booking?", "Supported cancellation and change requests can be submitted through the booking workflow and may require platform review depending on booking status."],
  ["Can I communicate with the professional?", "Supported bookings include booking communication features for customers and assigned professionals."],
  ["Can I rate my service?", "Customers can submit a rating for their own completed booking."]
];

export default function Services() {
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const useLocalImages = import.meta.env.DEV;
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [services, setServices] = useState(useLocalImages ? DEFAULT_SERVICE_OPTIONS : []);
  const [contentState, setContentState] = useState(useLocalImages ? "ready" : "loading");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    let active = true;
    SiteContentService.getPublic()
      .then((res) => {
        if (!active) {
          return;
        }
        setServices(normalizeServiceOptions(res?.data?.services));
        setContentState("ready");
      })
      .catch(() => {
        if (active) {
          setServices(useLocalImages ? DEFAULT_SERVICE_OPTIONS : []);
          setContentState(useLocalImages ? "ready" : "error");
        }
      });

    return () => {
      active = false;
    };
  }, [loadAttempt, useLocalImages]);

  const displayServices = useMemo(() => normalizeServiceOptions(services).filter((item) => item.active), [services]);
  const filteredServices = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return displayServices;
    return displayServices.filter((item) => {
      const haystack = `${item.title} ${item.desc} ${item.key}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [displayServices, query]);

  const bookNow = (serviceKey) => {
    const next = `/partners?category=${encodeURIComponent(serviceKey)}`;
    if (user?.role === "CUSTOMER") {
      navigate(next);
      return;
    }
    navigate(`/auth/customer/login?next=${encodeURIComponent(next)}`);
  };

  const findProfessionals = () => {
    if (user?.role === "CUSTOMER") {
      navigate("/partners");
      return;
    }
    navigate(`/auth/customer/login?next=${encodeURIComponent("/partners")}`);
  };

  const exploreServices = () => {
    document.getElementById("all-services")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resolveImageSrc = (item) => {
    if (useLocalImages) return IMAGES[item?.key] || heroImg;
    const uploaded = String(item?.imageUrl || "").trim();
    if (uploaded) {
      if (uploaded.startsWith("http://") || uploaded.startsWith("https://")) {
        return uploaded;
      }
      return `${API_BASE}${uploaded.startsWith("/") ? "" : "/"}${uploaded}`;
    }
    return "";
  };

  if (!useLocalImages && contentState === "loading") return <main className="content-loading-page"><Loading /><p>Loading services from the server...</p></main>;
  if (!useLocalImages && contentState === "error") return <main className="content-loading-page"><div className="content-load-error"><strong>Services are temporarily unavailable.</strong><p>The server may be waking up. Please try again.</p><button className="btn eco-btn" onClick={() => { setContentState("loading"); setLoadAttempt((value) => value + 1); }}>Try Again</button></div></main>;

  return (
    <main className="services-catalog-page">
      <section className="services-hero">
        <div className="container services-hero-grid">
          <div className="services-hero-copy services-reveal">
            <span className="services-kicker">Home Services</span>
            <h1>Professional Help for Your Home, Made Simple.</h1>
            <p className="services-lead">Explore available MistriChai services and connect with approved professionals for your home repair, maintenance, and service needs.</p>
            <p>Choose what you need, find a professional, select your preferred schedule, and manage your booking through MistriChai.</p>
            <div className="services-actions">
              <button className="services-btn services-btn-primary" type="button" onClick={exploreServices}>Explore Services</button>
              <button className="services-btn services-btn-outline" type="button" onClick={() => document.getElementById("booking-process")?.scrollIntoView({ behavior: "smooth", block: "start" })}>How It Works</button>
            </div>
            <div className="services-trust-strip">
              <span>Approved Professionals</span>
              <span>Simple Booking</span>
              <span>Customer Support</span>
            </div>
          </div>
          <div className="services-hero-collage services-reveal">
            <img className="services-collage-main" src={heroImg} alt="MistriChai professional home-service support" />
            <img className="services-collage-small services-collage-one" src={cardTwoImg} alt="Plumbing service support" />
            <img className="services-collage-small services-collage-two" src={cardOneImg} alt="Home repair service support" />
          </div>
        </div>
      </section>

      <section className="services-search-wrap">
        <div className="container">
          <div className="services-search-panel">
            <div>
              <h2>What do you need help with?</h2>
              <p>Browse by category or explore all available services below.</p>
            </div>
            <div className="services-search-control">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={'Try "Plumbing", "Electrical", "AC Service"...'}
                aria-label="Search for a service"
              />
              <button type="button" onClick={exploreServices}>Search Services</button>
            </div>
          </div>
        </div>
      </section>

      <section className="services-section services-main-section" id="all-services">
        <div className="container">
          <div className="services-section-head">
            <span className="services-kicker">Our Services</span>
            <h2>Everything Your Home Needs, All in One Place.</h2>
            <p>Browse our available service categories and choose the help you need.</p>
          </div>

          <div className="services-count-row">
            <strong>All Services</strong>
            <span>{displayServices.length} available</span>
          </div>

          {filteredServices.length ? (
            <div className="services-grid">
              {filteredServices.map((s) => (
                <article key={s.key} className="modern-service-card services-reveal">
                  <div className="service-page-img-wrap">
                    {resolveImageSrc(s) ? <img className="service-page-img" src={resolveImageSrc(s)} alt={s.title} /> : <div className="content-image-placeholder service-page-img" />}
                  </div>

                  <div className="service-page-body">
                    <div className="service-page-key">{String(s.key || "").replace(/_/g, " ")}</div>
                    <h3 className="service-name">{s.title}</h3>
                    <p className="service-desc">{s.desc}</p>

                    <button className="service-page-btn" onClick={() => bookNow(s.key)} type="button">
                      Book Now
                    </button>
                    <button className="service-details-link" onClick={() => bookNow(s.key)} type="button">
                      View Details
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="services-empty-state">
              <span>Search</span>
              <h3>We could not find that service.</h3>
              <p>Try another search or browse all available MistriChai services.</p>
              <button type="button" onClick={() => setQuery("")}>View All Services</button>
            </div>
          )}
        </div>
      </section>

      <section className="services-section services-support-section">
        <div className="container services-split">
          <div>
            <span className="services-kicker">Need Something Else?</span>
            <h2>Can&apos;t find the service you&apos;re looking for?</h2>
            <p>Tell our support team what you need. We&apos;ll help you understand the available options on MistriChai.</p>
            <div className="services-actions">
              <button className="services-btn services-btn-primary" type="button" onClick={() => navigate("/support")}>Contact Support</button>
              <button className="services-btn services-btn-outline" type="button" onClick={findProfessionals}>Browse Professionals</button>
            </div>
          </div>
          <div className="services-support-visual" aria-hidden="true">
            <div>Support</div>
            <div>Service Options</div>
            <div>Booking Help</div>
          </div>
        </div>
      </section>

      <section className="services-section" id="booking-process">
        <div className="container">
          <div className="services-section-head">
            <span className="services-kicker">Simple Process</span>
            <h2>From Service Selection to Booking</h2>
            <p>MistriChai keeps the process simple so you can focus on getting the help you need.</p>
          </div>
          <div className="services-process-grid">
            {bookingSteps.map(([number, title, text]) => (
              <article className="services-process-card" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className="services-center-action">
            <button className="services-btn services-btn-primary" type="button" onClick={exploreServices}>Start Booking</button>
          </div>
        </div>
      </section>

      <section className="services-section services-why-section">
        <div className="container">
          <div className="services-section-head">
            <span className="services-kicker">Why MistriChai</span>
            <h2>More Than Just Finding a Professional</h2>
            <p>MistriChai provides a structured platform for discovering services and managing your booking journey.</p>
          </div>
          <div className="services-feature-grid">
            {trustFeatures.map(([title, text], index) => (
              <article className="services-feature-card" key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="services-section">
        <div className="container services-split services-pro-section">
          <div className="services-pro-image">
            <img src={cardThreeImg} alt="Approved MistriChai service professional working in a home" />
          </div>
          <div>
            <span className="services-kicker">Service Professionals</span>
            <h2>Prefer to Choose a Professional First?</h2>
            <p>Browse approved MistriChai professionals by available service and location information and find someone suitable for your service request.</p>
            <ul className="services-check-list">
              <li>Approved Partner Profiles</li>
              <li>Service Categories</li>
              <li>Location Information</li>
              <li>Availability Information</li>
            </ul>
            <button className="services-btn services-btn-primary" type="button" onClick={findProfessionals}>Find Professionals</button>
          </div>
        </div>
      </section>

      <section className="services-section services-confidence-section">
        <div className="container">
          <div className="services-section-head">
            <span className="services-kicker">Book With Confidence</span>
            <h2>A Clearer Home-Service Experience</h2>
          </div>
          <div className="services-confidence-grid">
            {["Find", "Book", "Manage"].map((title, index) => (
              <article key={title}>
                <span>{title}</span>
                <p>{[
                  "Discover available services and approved professionals.",
                  "Submit your service details, location, date, and preferred time.",
                  "Track the booking journey and use available communication and support features."
                ][index]}</p>
              </article>
            ))}
          </div>
          <div className="services-center-action">
            <button className="services-btn services-btn-primary" type="button" onClick={exploreServices}>Book a Service</button>
          </div>
        </div>
      </section>

      <section className="services-section">
        <div className="container services-faq-wrap">
          <div className="services-section-head">
            <span className="services-kicker">Questions & Answers</span>
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className="services-faq-list">
            {faqs.map(([question, answer], index) => (
              <article className={openFaq === index ? "services-faq-item is-open" : "services-faq-item"} key={question}>
                <button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>
                  {question}
                  <span>{openFaq === index ? "-" : "+"}</span>
                </button>
                {openFaq === index && <p>{answer}</p>}
              </article>
            ))}
          </div>
          <button className="services-faq-link" type="button" onClick={() => navigate("/support")}>Still have questions? Contact Support</button>
        </div>
      </section>

      <section className="services-final-cta">
        <div className="container">
          <span>Get Started</span>
          <h2>Your Home Needs Help. MistriChai Makes Finding It Easier.</h2>
          <p>Choose a service, connect with an approved professional, and start your booking today.</p>
          <div className="services-actions services-actions-center">
            <button className="services-btn services-btn-light" type="button" onClick={exploreServices}>Book a Service</button>
            <button className="services-btn services-btn-dark-outline" type="button" onClick={findProfessionals}>Find Professionals</button>
          </div>
        </div>
      </section>

      <button className="services-mobile-sticky" type="button" onClick={exploreServices}>Book a Service</button>
    </main>
  );
}
