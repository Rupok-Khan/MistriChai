import React from "react";
import { Link } from "react-router-dom";
import "../assets/css/homeHero.css";
import heroImage1 from "../assets/image/card-1-home.jpg";
import heroImage2 from "../assets/image/card-2-home.jpg";

export default function HomeHero({ content }) {
  const leftImage = content?.leftImageUrl?.trim() || heroImage1;
  const rightImage = content?.rightImageUrl?.trim() || heroImage2;

  return (
    <section className="hero">
      <div className="hero__inner">
        <div className="hero__left">
          <div className="hero__kicker">{content?.kicker || "Affordable cleaning solutions"}</div>
          <h1 className="hero__title">{content?.title || "High-Quality and Friendly Services at Fair Prices"}</h1>
          <p className="hero__desc">{content?.description || "We provide comprehensive cleaning services tailored to your needs."}</p>
          <Link className="hero__btn" to={content?.buttonLink || "/contact"}>
            {content?.buttonText || "Get a quote"}
          </Link>
        </div>

        <div className="hero__right">
          <div className="hero__imageStack">
            <div className="hero__img hero__img--small">
              <img src={leftImage} alt="Service preview" />
            </div>
            <div className="hero__img hero__img--main">
              <img src={rightImage} alt="Service preview" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
