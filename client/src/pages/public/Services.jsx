import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function Services() {
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const useLocalImages = import.meta.env.DEV;
  const navigate = useNavigate();
  const [services, setServices] = useState(useLocalImages ? DEFAULT_SERVICE_OPTIONS : []);
  const [contentState, setContentState] = useState(useLocalImages ? "ready" : "loading");
  const [loadAttempt, setLoadAttempt] = useState(0);

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

  const displayServices = useMemo(() => normalizeServiceOptions(services), [services]);

  const bookNow = (serviceKey) => {
    navigate(`/partners?category=${encodeURIComponent(serviceKey)}`);
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
      <div className="container section-pad">
      <div className="text-center mb-4 mb-md-5 services-catalog-heading">
        <div className="services-page-kicker">What We Fix</div>
        <h2 className="fw-bold services-page-title">Choose Your Service</h2>
        <p className="small-muted services-page-subtitle">
          Choose a category and book a verified technician in your area.
        </p>
      </div>

      <div className="row g-4">
        {displayServices.map((s) => (
          <div key={s.key} className="col-12 col-md-6 col-lg-4">
            <article className="service-card service-page-card modern-service-card h-100">
              <div className="service-img-wrap service-page-img-wrap">
                {resolveImageSrc(s) ? <img className="service-img service-page-img" src={resolveImageSrc(s)} alt={s.title} /> : <div className="content-image-placeholder service-img service-page-img" />}
              </div>

              <div className="service-body service-page-body">
                <div className="service-page-key">{String(s.key || "").replace(/_/g, " ")}</div>
                <div className="service-name">{s.title}</div>
                <div className="service-desc">{s.desc}</div>

                <button className="btn service-btn service-page-btn w-100" onClick={() => bookNow(s.key)}>
                  Book Now
                </button>
              </div>
            </article>
          </div>
        ))}
      </div>
      </div>
    </main>
  );
}
