/**
 * UI interactions: theme toggle, mobile nav, scroll-reveal, tag stagger,
 * contact form (mailto), footer year.
 */
(function () {
  "use strict";

  /* ---------- Theme toggle (dark default; .light class switches) ---------- */
  const themeBtn = document.getElementById("theme-toggle");
  function syncThemeButton() {
    const light = document.documentElement.classList.contains("light");
    themeBtn.setAttribute(
      "aria-label",
      light ? "Switch to dark mode" : "Switch to light mode"
    );
  }
  themeBtn.addEventListener("click", () => {
    const light = document.documentElement.classList.toggle("light");
    try {
      localStorage.setItem("theme", light ? "light" : "dark");
    } catch (e) { /* storage unavailable */ }
    syncThemeButton();
    // Let the 3D scene re-tint itself
    window.dispatchEvent(new CustomEvent("themechange"));
  });
  syncThemeButton();

  /* ---------- Mobile nav ---------- */
  const nav = document.querySelector(".nav");
  const menuBtn = document.getElementById("menu-btn");
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  // Close menu when a link is chosen
  nav.querySelectorAll(".nav-links a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-label", "Open menu");
    })
  );

  /* ---------- Scroll-reveal ---------- */
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealEls = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in-view"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -60px 0px", threshold: 0.1 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Stagger indices for skill tags ---------- */
  document.querySelectorAll(".stagger").forEach((list) => {
    Array.from(list.children).forEach((li, i) => li.style.setProperty("--i", i));
  });

  /* ---------- Footer year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();
})();
