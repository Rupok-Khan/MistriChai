import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SELECTOR = "section, .eco-card, .card, .admin-main > *, .services-showcase, .home-contained-section";

export default function MotionEnhancer() {
  const location = useLocation();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const observed = new WeakSet();
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("motion-visible");
        reveal.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -35px" });

    const register = (root = document) => {
      const elements = root.matches?.(SELECTOR) ? [root] : [...(root.querySelectorAll?.(SELECTOR) || [])];
      elements.forEach((element, index) => {
        if (observed.has(element) || element.closest(".review-marquee-track")) return;
        observed.add(element);
        element.classList.add("motion-reveal");
        element.style.setProperty("--motion-delay", `${Math.min(index % 4, 3) * 55}ms`);
        reveal.observe(element);
      });
    };

    const frame = requestAnimationFrame(() => register());
    const changes = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) register(node);
    })));
    changes.observe(document.getElementById("root"), { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      changes.disconnect();
      reveal.disconnect();
    };
  }, [location.pathname]);

  return null;
}
