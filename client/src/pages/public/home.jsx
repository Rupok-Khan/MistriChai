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

export default function Home() {
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [content, setContent] = useState(null);
  const services = normalizeServiceOptions(content?.services || DEFAULT_SERVICE_OPTIONS);
  const featured = services.slice(0, 3);
  const popular = services.slice(0, 4);

  useEffect(() => {
    let active = true;

    SiteContentService.getPublic()
      .then((res) => {
        if (active) setContent(res.data || null);
      })
      .catch(() => {
        if (active) setContent(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const home = content?.home;
  const promo = content?.promo;
  const contact = content?.contact;

  const resolveServiceImage = (item, index = 0) => {
    const uploaded = String(item?.imageUrl || "").trim();
    if (uploaded) {
      if (uploaded.startsWith("http://") || uploaded.startsWith("https://")) {
        return uploaded;
      }
      return `${API_BASE}${uploaded.startsWith("/") ? "" : "/"}${uploaded}`;
    }
    if (index === 0) return cardOneImg;
    if (index === 1) return cardTwoImg;
    return cardThreeImg;
  };

  return (
    <div className="home-wrap">
      <section className="home-hero">
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
                <img className="hero-img" src={home?.heroImageUrl?.trim() || heroImg} alt={home?.heroImageAlt || "Service professionals"} />
                <div className="hero-card hero-card-1">
                  <div className="hero-card-title">Trusted service</div>
                  <div className="hero-card-text">NID verified partners</div>
                </div>
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

      <section className="container section-pad">
        <div className="services-showcase eco-card p-3 p-md-4">
          <div className="row g-4 align-items-stretch">
            <div className="col-12 col-lg-5">
              <div className="h-100">
                <h2 className="fw-bold services-title">
                  We Always Provide The <br className="d-none d-md-block" />
                  Best Service
                </h2>

                <div className="service-card feature-card mt-4">
                  <div className="service-img-wrap">
                    <img className="service-img" src={resolveServiceImage(featured[0], 2)} alt={featured[0]?.title || "Home Cleaning"} />
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
                {featured.map((item, index) => (
                  <div key={item.key} className="col-12 col-md-6 col-lg-4">
                    <div className="service-card mini-card h-100">
                      <div className="service-img-wrap">
                        <img
                          className="service-img"
                          src={resolveServiceImage(item, index)}
                          alt={item.title}
                        />
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

              <div className="small-muted mt-3">
                Want more? <Link to="/services">View all services</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TeamSection />
      <HomeHero content={promo} />

      <section className="container section-pad">
        <div className="text-center mb-4">
          <h2 className="fw-bold">Popular categories</h2>
          <p className="small-muted">Pick a service and continue</p>
        </div>

        <div className="row g-3">
          {popular.map((item) => (
            <div key={item.key} className="col-12 col-md-6 col-lg-3">
              <div className="eco-card p-4 h-100">
                <div className="eco-badge d-inline-block mb-2">{item.title}</div>
                <div className="small-muted">{item.desc}</div>
                <Link className="btn eco-btn-outline w-100 mt-3" to="/services">View</Link>
              </div>
            </div>
          ))}
        </div>

        <HomeContactSection content={contact} />
      </section>
    </div>
  );
}
