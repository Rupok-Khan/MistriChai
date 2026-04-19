import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEFAULT_SERVICE_OPTIONS, normalizeServiceOptions } from "../../utils/serviceCatalog";
import cardOneImg from "../../assets/image/card-1-home.jpg";
import cardTwoImg from "../../assets/image/card-2-home.jpg";
import cardThreeImg from "../../assets/image/card-3-home.jpg";
import heroImg from "../../assets/image/hero image.jpg";
import { SiteContentService } from "../../services/siteContent.service";

const IMAGES = {
  AC_REPAIR: cardOneImg,
  PLUMBING: cardTwoImg,
  GAS_STOVE_REPAIR: cardThreeImg,
  HOME_CLEANING: heroImg,
  HOME_ELECTRONICS: cardOneImg
};

export default function Services() {
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const navigate = useNavigate();
  const [services, setServices] = useState(DEFAULT_SERVICE_OPTIONS);

  useEffect(() => {
    let active = true;
    SiteContentService.getPublic()
      .then((res) => {
        if (!active) {
          return;
        }
        setServices(normalizeServiceOptions(res?.data?.services));
      })
      .catch(() => {
        if (active) {
          setServices(DEFAULT_SERVICE_OPTIONS);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const displayServices = useMemo(() => normalizeServiceOptions(services), [services]);

  const bookNow = (serviceKey) => {
    navigate(`/partners?category=${encodeURIComponent(serviceKey)}`);
  };

  const resolveImageSrc = (item) => {
    const uploaded = String(item?.imageUrl || "").trim();
    if (uploaded) {
      if (uploaded.startsWith("http://") || uploaded.startsWith("https://")) {
        return uploaded;
      }
      return `${API_BASE}${uploaded.startsWith("/") ? "" : "/"}${uploaded}`;
    }
    return IMAGES[item?.key] || heroImg;
  };

  return (
    <div className="container section-pad">
      <div className="text-center mb-4 mb-md-5">
        <div className="services-page-kicker">What We Fix</div>
        <h2 className="fw-bold services-page-title">Choose Your Service</h2>
        <p className="small-muted services-page-subtitle">
          Choose a category and book a verified technician in your area.
        </p>
      </div>

      <div className="row g-4">
        {displayServices.map((s) => (
          <div key={s.key} className="col-12 col-md-6 col-lg-4">
            <div className="service-card service-page-card h-100">
              <div className="service-img-wrap service-page-img-wrap">
                <img className="service-img service-page-img" src={resolveImageSrc(s)} alt={s.title} />
                <div className="service-page-chip">{s.title}</div>
              </div>

              <div className="service-body service-page-body">
                <div className="service-page-key">{String(s.key || "").replace(/_/g, " ")}</div>
                <div className="service-name">{s.title}</div>
                <div className="service-desc">{s.desc}</div>

                <button className="btn service-btn service-page-btn w-100" onClick={() => bookNow(s.key)}>
                  Book Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
