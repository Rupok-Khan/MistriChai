import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SiteContentService } from "../../services/siteContent.service";
import heroImage from "../../assets/image/hero image.jpg";
import storyImage from "../../assets/image/card-1-home.jpg";
import customerImage from "../../assets/image/card-2-home.jpg";
import partnerImage from "../../assets/image/card-3-home.jpg";

const challengeItems = [
  ["Finding the Right Professional", "Customers may not know where to start when they need a specific service."],
  ["Trust", "It can be difficult to know who is behind a service listing."],
  ["Unorganized Booking", "Calls and messages across different channels can make service requests difficult to track."],
  ["Communication", "Customers and professionals need a clear way to communicate about an active booking."]
];

const approachItems = [
  ["Discover Services", "Explore the home services currently available through the platform."],
  ["Approved Professionals", "Professionals complete registration and must receive platform approval before becoming eligible for service assignments."],
  ["Structured Booking", "Choose a service, provide your problem details, location, preferred date, and time."],
  ["Manage Your Booking", "Follow booking progress, communicate through supported booking chat, request supported changes, and rate completed service."]
];

const workCards = [
  ["customer", "For Customers", "Find the Help You Need", "Explore available services, browse approved professionals, request a booking, select your preferred schedule, communicate about your booking, and manage your service journey through your account.", "Find a Service", "/services"],
  ["partner", "For Professionals", "Turn Skills Into Opportunities", "Service professionals can create a Partner profile, provide required identity and service information, select their category and working availability, and become eligible for service opportunities after platform approval.", "Become a Partner", "/auth/partner/signup"],
  ["platform", "Platform Management", "A Managed Service Platform", "MistriChai manages professional approvals, booking workflows, assignments, supported payment processes, service requests, customer support, and other platform operations through its administrative system.", "Explore Services", "/services"]
];

const steps = [
  ["01", "Choose Your Service", "Browse available service categories and select what you need."],
  ["02", "Find a Professional", "Explore approved professionals based on relevant service and location information."],
  ["03", "Request a Booking", "Provide the problem details, location, preferred date, time, and other required information."],
  ["04", "Get Connected", "Your booking follows the platform's assignment and service workflow."],
  ["05", "Manage the Service", "Follow booking status and use supported communication and booking-management features."],
  ["06", "Share Your Experience", "After a booking is completed, customers can provide a rating based on their experience."]
];

const values = [
  ["Simplicity", "Finding and requesting a home service should be easy to understand, from discovery to booking."],
  ["Trust", "We use a professional approval process and structured platform workflows to create a more accountable service environment."],
  ["Opportunity", "We want skilled service professionals to have a platform where their abilities can connect them with relevant service opportunities."],
  ["Responsibility", "We believe service platforms should provide clear workflows, controlled access, customer support, and responsible management of service interactions."]
];

export default function About() {
  const [content, setContent] = useState(null);

  useEffect(() => {
    let active = true;

    SiteContentService.getPublic()
      .then((res) => {
        if (active) setContent(res.data?.about || null);
      })
      .catch(() => {
        if (active) setContent(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const introText =
    content?.description ||
    "MistriChai is a home-service booking platform designed to connect customers with approved service professionals through a simple, organized, and convenient booking experience.";

  return (
    <main className="about-page">
      <section className="about-hero-section">
        <div className="container about-hero-grid">
          <div className="about-copy-block about-reveal">
            <span className="about-label about-label-purple">About MistriChai</span>
            <h1>
              Making Home Services <span>Easier to Find and Book</span>
            </h1>
            <p className="about-lead">{introText}</p>
            <p>
              Whether you need help with a repair, maintenance, or another available home service, MistriChai makes it easier to find the right professional and manage your service request in one place.
            </p>
            <div className="about-actions">
              <Link className="about-btn about-btn-primary" to="/services">Book a Service</Link>
              <Link className="about-btn about-btn-outline" to="/services">Explore Services</Link>
            </div>
          </div>

          <div className="about-hero-visual about-reveal">
            <img src={heroImage} alt="A MistriChai service professional ready to help inside a home" />
            <div className="about-float about-float-one">Approved Professional</div>
            <div className="about-float about-float-two">Easy Booking</div>
            <div className="about-float about-float-three">Customer Support</div>
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="container about-split">
          <div className="about-image-card about-reveal">
            <img src={storyImage} alt="Home service support through an organized booking platform" />
          </div>
          <div className="about-copy-block about-reveal">
            <span className="about-label">Our Story</span>
            <h2>Finding reliable home-service help should be simpler.</h2>
            <p>When something needs repairing or maintaining at home, finding the right person for the job can be difficult. Customers may need to search through personal contacts, social media, or different service providers without having one organized place to manage the process.</p>
            <p>MistriChai was created to make that experience simpler.</p>
            <p>Our platform brings customers and service professionals together through a structured system where customers can explore available services, find approved professionals, create bookings, follow their service requests, communicate when needed, and provide feedback after completed work.</p>
            <div className="about-highlight">One platform. A simpler way to find the help your home needs.</div>
          </div>
        </div>
      </section>

      <section className="about-section about-soft-section">
        <div className="container">
          <div className="about-section-head">
            <span className="about-label about-label-purple">Why MistriChai</span>
            <h2>Home services should not feel complicated</h2>
          </div>
          <div className="about-problem-grid">
            <article className="about-panel about-reveal">
              <h3>The Challenge</h3>
              {challengeItems.map(([title, text]) => (
                <div className="about-list-item" key={title}>
                  <b>{title}</b>
                  <p>{text}</p>
                </div>
              ))}
            </article>
            <article className="about-panel about-panel-featured about-reveal">
              <h3>The MistriChai Approach</h3>
              {approachItems.map(([title, text]) => (
                <div className="about-list-item" key={title}>
                  <b>{title}</b>
                  <p>{text}</p>
                </div>
              ))}
              <Link className="about-inline-link" to="/services">Find a Professional</Link>
            </article>
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="container">
          <div className="about-section-head">
            <span className="about-label">What We Do</span>
            <h2>Connecting customers with service professionals</h2>
            <p>MistriChai provides the digital connection between customers looking for home services and professionals looking for service opportunities.</p>
          </div>
          <div className="about-card-grid about-card-grid-three">
            {workCards.map(([tone, label, title, text, cta, href]) => (
              <article className={`about-card about-card-${tone} about-reveal`} key={title}>
                <span className="about-card-icon">{label.slice(0, 1)}</span>
                <small>{label}</small>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link className="about-card-link" to={href}>{cta}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-mission-section">
        <div className="container about-mission-inner">
          <span className="about-label about-label-white">Our Mission</span>
          <h2>{content?.missionTitle || "Make everyday home-service booking simple, organized, and accessible."}</h2>
          <p>{content?.missionText || "Our mission is to make it easier for customers to connect with appropriate service professionals while giving skilled professionals a structured platform to offer their services and manage opportunities."}</p>
        </div>
      </section>

      <section className="about-section">
        <div className="container about-split about-split-reverse">
          <div className="about-copy-block about-reveal">
            <span className="about-label about-label-purple">Our Vision</span>
            <h2>{content?.visionTitle || "Building a better way to access everyday services"}</h2>
            <p>{content?.visionText || "We envision MistriChai becoming a trusted platform where customers can conveniently discover home services and professionals can build opportunities around their skills."}</p>
            <p>As the platform grows, our focus is to improve the experience for both sides through better service discovery, clearer booking workflows, useful communication, and responsible platform management.</p>
          </div>
          <div className="about-ecosystem about-reveal" aria-label="Customer to MistriChai to service professional">
            <div className="about-eco-node about-eco-customer">Customer</div>
            <span>to</span>
            <div className="about-eco-node about-eco-brand">MistriChai</div>
            <span>to</span>
            <div className="about-eco-node about-eco-partner">Service Professional</div>
          </div>
        </div>
      </section>

      <section className="about-section about-soft-section">
        <div className="container">
          <div className="about-section-head">
            <span className="about-label">How It Works</span>
            <h2>From service need to completed booking</h2>
          </div>
          <div className="about-timeline">
            {steps.map(([number, title, text]) => (
              <article className="about-step about-reveal" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className="about-center-action">
            <Link className="about-btn about-btn-primary" to="/services">Book a Service</Link>
          </div>
        </div>
      </section>

      <section className="about-trust-section">
        <div className="container about-trust-grid">
          <div className="about-copy-block">
            <span className="about-label about-label-white">Trust & Responsibility</span>
            <h2>A more structured professional network</h2>
            <p>MistriChai Partners do not simply create a public profile and immediately become eligible for service assignments.</p>
            <p>During registration, professionals provide required profile, identity, location, service category, and working information. Their registration goes through an administrative review process, and approval is required before they become eligible for platform assignments.</p>
            <div className="about-trust-badge">Platform-Approved Professionals</div>
          </div>
          <div className="about-process">
            {["Register", "Submit Required Information", "Platform Review", "Approval", "Eligible for Service Assignments"].map((item, index) => (
              <div className={index >= 3 ? "about-process-row is-green" : "about-process-row"} key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{item}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="container">
          <div className="about-section-head">
            <span className="about-label about-label-purple">What Matters to Us</span>
            <h2>The principles behind MistriChai</h2>
          </div>
          <div className="about-card-grid about-card-grid-four">
            {values.map(([title, text], index) => (
              <article className={`about-value-card ${index % 2 ? "is-purple" : ""} about-reveal`} key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section about-soft-section">
        <div className="container">
          <div className="about-section-head">
            <h2>One platform. Two important communities.</h2>
          </div>
          <div className="about-audience-grid">
            <article className="about-audience-card about-audience-customer about-reveal">
              <img src={customerImage} alt="Customer home-service booking support" />
              <div>
                <h3>Need a Professional?</h3>
                <p>Explore available home services and find approved professionals for your service needs.</p>
                <ul>
                  <li>Browse Services</li>
                  <li>Find Professionals</li>
                  <li>Request Bookings</li>
                  <li>Track Booking Status</li>
                  <li>Booking Communication</li>
                  <li>Rate Completed Services</li>
                </ul>
                <Link className="about-btn about-btn-primary" to="/services">Book a Service</Link>
              </div>
            </article>
            <article className="about-audience-card about-audience-partner about-reveal">
              <img src={partnerImage} alt="Service professional working with tools" />
              <div>
                <h3>Have Professional Skills?</h3>
                <p>Join the MistriChai Partner network and use your skills to access eligible service opportunities.</p>
                <ul>
                  <li>Create Professional Profile</li>
                  <li>Select Service Category</li>
                  <li>Set Availability</li>
                  <li>Receive Assigned Work</li>
                  <li>Manage Orders</li>
                  <li>Manage Earnings and Withdrawals</li>
                </ul>
                <Link className="about-btn about-btn-purple" to="/auth/partner/signup">Become a Partner</Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="container">
          <div className="about-section-head">
            <h2>MistriChai connects the entire service journey</h2>
          </div>
          <div className="about-journey">
            {["Customer Need", "Choose Service", "Find or Request Professional", "Book and Schedule", "Professional Assignment", "Service", "Completion", "Customer Rating"].map((item, index) => (
              <div className={index === 0 || index >= 5 ? "about-journey-node is-green" : "about-journey-node"} key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section about-looking-section">
        <div className="container about-split">
          <div className="about-copy-block about-reveal">
            <span className="about-label">Looking Ahead</span>
            <h2>We're building for a better service experience</h2>
            <p>MistriChai is designed to grow with the needs of customers and service professionals. As we continue developing the platform, we aim to make service discovery, booking, communication, payments, and platform operations even more convenient and reliable.</p>
          </div>
          <div className="about-looking-visual about-reveal">
            <div>Homes</div>
            <div>Customers</div>
            <div>Professionals</div>
            <div>Bookings</div>
          </div>
        </div>
      </section>

      <section className="about-final-cta">
        <div className="container">
          <span>Ready to get started?</span>
          <h2>The help you need could be just a few steps away.</h2>
          <p>Explore available services, find an approved professional, and start your MistriChai booking journey.</p>
          <div className="about-actions about-actions-center">
            <Link className="about-btn about-btn-primary" to="/services">Book a Service</Link>
            <Link className="about-btn about-btn-light" to="/services">Explore Services</Link>
          </div>
          <Link className="about-partner-link" to="/auth/partner/signup">Are you a service professional? Become a Partner</Link>
        </div>
      </section>
    </main>
  );
}
