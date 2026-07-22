import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import heroImg from "../../assets/image/hero image.jpg";
import cardOneImg from "../../assets/image/card-1-home.jpg";
import cardTwoImg from "../../assets/image/card-2-home.jpg";
import cardThreeImg from "../../assets/image/card-3-home.jpg";
import TeamSection from "../../components/TeamSection";
import HomeHero from "../../components/HomeHero";
import HomeContactSection from "../../components/HomeContactSection";
import { DEFAULT_SERVICE_OPTIONS, normalizeServiceOptions } from "../../utils/serviceCatalog";
import { SiteContentService } from "../../services/siteContent.service";
import Loading from "../../components/Loading";

export default function Home() {
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const useLocalImages = import.meta.env.DEV;
  const [content, setContent] = useState(null);
  const [contentState, setContentState] = useState(import.meta.env.DEV ? "ready" : "loading");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const services = normalizeServiceOptions(content?.services || DEFAULT_SERVICE_OPTIONS);
  const featured = services.slice(0, 4);
  const secondaryFeatured = featured.slice(1);
  const popular = services.slice(0, 4);

  useEffect(() => {
    let active = true;
    SiteContentService.getPublic()
      .then((res) => {
        if (active) {
          setContent(res.data || null);
          setContentState("ready");
        }
      })
      .catch(() => {
        if (active) {
          setContent(null);
          setContentState(useLocalImages ? "ready" : "error");
        }
      });

    return () => {
      active = false;
    };
  }, [loadAttempt, useLocalImages]);

  const home = content?.home;
  const promo = content?.promo;
  const contact = content?.contact;
  const whyChoose = content?.whyChoose || {};
  const reviews = Array.isArray(content?.reviews) ? content.reviews.slice(0, 7) : [];

  const resolveContentImage = (imageUrl, fallback) => {
    if (useLocalImages) return fallback;
    const value = String(imageUrl || "").trim();
    if (!value) return "";
    if (/^(https?:|data:|blob:)/.test(value)) return value;
    return `${API_BASE}${value.startsWith("/") ? "" : "/"}${value}`;
  };

  const resolveServiceImage = (item, index = 0) => {
    if (useLocalImages) {
      if (index === 0) return cardOneImg;
      if (index === 1) return cardTwoImg;
      return cardThreeImg;
    }
    const uploaded = String(item?.imageUrl || "").trim();
    if (uploaded) {
      if (uploaded.startsWith("http://") || uploaded.startsWith("https://")) {
        return uploaded;
      }
      return `${API_BASE}${uploaded.startsWith("/") ? "" : "/"}${uploaded}`;
    }
    return "";
  };

  if (!useLocalImages && contentState === "loading") {
    return <main className="content-loading-page"><Loading /><p>Loading the latest site content...</p></main>;
  }

  if (!useLocalImages && contentState === "error") {
    return <main className="content-loading-page"><div className="content-load-error"><strong>Site content is temporarily unavailable.</strong><p>The server may be waking up. Please try again.</p><button className="btn eco-btn" onClick={() => { setContentState("loading"); setLoadAttempt((value) => value + 1); }}>Try Again</button></div></main>;
  }

  const heroImageSrc = resolveContentImage(home?.heroImageUrl, heroImg);

  return (
    <div className="home-wrap">
      <section className="home-hero">
        <div className="home-hero-orb home-hero-orb-one" aria-hidden="true" />
        <div className="home-hero-orb home-hero-orb-two" aria-hidden="true" />
        <div className="container">
          <div className="row align-items-center gy-4">
            <div className="col-12 col-lg-6">
              <div className="hero-left">
                <div className="hero-kicker">{home?.heroKicker || "Quality service at a fair price"}</div>
                <h1 className="hero-title">{home?.heroTitle || "Specialized, efficient, and trusted home services"}</h1>
                <p className="hero-subtitle">
                  {home?.heroSubtitle || "Book verified technicians for AC and fridge repair, water line, gas line, cleaning, and home electronics with transparent booking, admin assignment, and direct customer-partner chat."}
                </p>

                <div className="d-flex flex-wrap gap-2 mt-4">
                  <Link to={home?.primaryButtonLink || "/services"} className="btn hero-btn-primary">
                    {home?.primaryButtonText || "Get Started Now"}
                  </Link>
                  <Link to={home?.secondaryButtonLink || "/services"} className="btn hero-btn-outline">
                    {home?.secondaryButtonText || "View all Services"}
                  </Link>
                </div>

                <div className="hero-badges mt-4">
                  <span className="hero-pill">{home?.badgeOne || "Verified Partners"}</span>
                  <span className="hero-pill">{home?.badgeTwo || "Fast Booking"}</span>
                  <span className="hero-pill">{home?.badgeThree || "Live Chat After Assign"}</span>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="hero-media">
                <div className="hero-graphic-ring" aria-hidden="true" />
                {heroImageSrc ? <img className="hero-img" src={heroImageSrc} alt={home?.heroImageAlt || "Service professionals"} onError={(event) => { if (event.currentTarget.src !== heroImg) event.currentTarget.src = heroImg; }} /> : <div className="content-image-placeholder hero-img-placeholder" aria-label="Hero image unavailable" />}
                <div className="hero-card hero-card-1">
                  <div className="hero-card-title">Trusted service</div>
                  <div className="hero-card-text">NID verified partners</div>
                </div>
                <div className="hero-float-symbol hero-float-symbol-one" aria-hidden="true">✓</div>
                <div className="hero-float-symbol hero-float-symbol-two" aria-hidden="true">⌂</div>
                <div className="hero-float-symbol hero-float-symbol-three" aria-hidden="true">⚙</div>
              </div>
            </div>
          </div>

          <div className="hero-strip mt-4">
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <div className="strip-item">
                  <div className="strip-title">{home?.stripOneTitle || "Secure Login"}</div>
                  <div className="strip-text">{home?.stripOneText || "Customer and Partner separate portals"}</div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="strip-item">
                  <div className="strip-title">{home?.stripTwoTitle || "Service Areas"}</div>
                  <div className="strip-text">{home?.stripTwoText || "District, Thana, Ward based filtering"}</div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="strip-item">
                  <div className="strip-title">{home?.stripThreeTitle || "Modern Workflow"}</div>
                  <div className="strip-text">{home?.stripThreeText || "Booking to Assign to Chat to Complete"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container section-pad home-services-section">
        <div className="services-showcase eco-card p-3 p-md-4">
          <div className="row g-4 align-items-stretch">
            <div className="col-12 col-lg-5">
              <div className="h-100">
                <div className="home-services-eyebrow">Featured services</div>
                <h2 className="fw-bold services-title">
                  We Always Provide The <br className="d-none d-md-block" />
                  Best Service
                </h2>

                <div className="service-card feature-card mt-4">
                  <div className="service-img-wrap">
                    {resolveServiceImage(featured[0], 2) ? <img className="service-img" src={resolveServiceImage(featured[0], 2)} alt={featured[0]?.title || "Home Cleaning"} /> : <div className="content-image-placeholder service-img" />}
                  </div>

                  <div className="service-body">
                    <div className="service-name">{featured[0]?.title || "Home Cleaning"}</div>
                    <p className="service-desc">
                      {featured[0]?.desc || "Verified home cleaning support with quick booking and trusted technicians."}
                    </p>
                    <Link to="/services" className="btn service-btn">Book Now</Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-7">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <div className="services-kicker">Services</div>
                  <p className="small-muted mb-0">Browse our current service categories and continue with the technician list and booking flow.</p>
                </div>
              </div>

              <div className="row g-3 mt-2">
                {secondaryFeatured.map((item, index) => (
                  <div key={item.key} className="col-12 col-md-6 col-lg-4">
                    <div className="service-card mini-card h-100">
                      <div className="service-img-wrap">
                        {resolveServiceImage(item, index + 1) ? <img
                          className="service-img"
                          src={resolveServiceImage(item, index + 1)}
                          alt={item.title}
                        /> : <div className="content-image-placeholder service-img" />}
                      </div>
                      <div className="service-body">
                        <div className="service-name">{item.title}</div>
                        <p className="service-desc">{item.desc}</p>
                        <Link to="/services" className="btn service-btn-outline">Book Now</Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="home-services-more mt-4">
                <span className="small-muted">Want to explore more options?</span>
                <Link className="btn eco-btn home-services-more-btn" to="/services">View All Services</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TeamSection />
      <HomeHero content={{ ...promo, leftImageUrl: resolveContentImage(promo?.leftImageUrl, ""), rightImageUrl: resolveContentImage(promo?.rightImageUrl, "") }} allowLocalFallback={useLocalImages} />

      <section className="container section-pad home-popular-section">
        <div className="text-center mb-4">
          <h2 className="fw-bold">Popular categories</h2>
          <p className="small-muted">Pick a service and continue</p>
        </div>

        <div className="row g-3">
          {popular.map((item) => (
            <div key={item.key} className="col-12 col-md-6 col-lg-3">
              <div className="eco-card p-4 h-100 home-category-card">
                <div className="eco-badge d-inline-block mb-2">{item.title}</div>
                <div className="small-muted">{item.desc}</div>
                <Link className="btn eco-btn-outline w-100 mt-3" to="/services">View</Link>
              </div>
            </div>
          ))}
        </div>

        <section className="home-why-section home-contained-section mt-5">
          <div className="row g-4 align-items-center">
            <div className="col-12 col-lg-5">
              <div className="home-services-eyebrow">{whyChoose.kicker || "Why choose us"}</div>
              <h2 className="fw-bold display-6">{whyChoose.title || "Service you can trust, from booking to completion"}</h2>
              <p className="small-muted mb-0">{whyChoose.description || "A safer and simpler way to find skilled help for your home."}</p>
            </div>
            <div className="col-12 col-lg-7"><div className="why-feature-grid">{[
              ["01", whyChoose.itemOneTitle || "Verified professionals", whyChoose.itemOneText || "Partner identity and service information are reviewed before approval."],
              ["02", whyChoose.itemTwoTitle || "Clear service workflow", whyChoose.itemTwoText || "Track every step from your dashboard."],
              ["03", whyChoose.itemThreeTitle || "Local and responsive", whyChoose.itemThreeText || "Find nearby technicians with live availability."]
            ].map(([number, title, text]) => <article className="why-feature-card" key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></div>
          </div>
        </section>

        {reviews.length > 0 && <section className="home-reviews-section home-contained-section mt-4">
          <div className="text-center mb-4"><div className="home-services-eyebrow">Customer stories</div><h2 className="fw-bold">What our customers say</h2><p className="small-muted mb-0">Real experiences shared by people using MistriChai.</p></div>
          <div className="review-marquee" aria-label="Customer reviews"><div className="review-marquee-track">
            {[...reviews, ...reviews].map((review, index) => <article className="modern-review-card" key={`${review.name}-${index}`} aria-hidden={index >= reviews.length}>
              <div className="review-quote">“</div><div className="review-stars">{"★".repeat(Math.max(1, Math.min(5, Number(review.rating) || 5)))}</div><p>{review.text}</p>
              <div className="review-person"><div className="review-avatar">{String(review.name || "C").charAt(0)}</div><div><strong>{review.name}</strong><span>{review.role || "Customer"}</span></div></div>
            </article>)}
          </div></div>
        </section>}

        <HomeContactSection content={contact} />
      </section>
    </div>
  );
}
