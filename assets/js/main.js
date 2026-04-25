import { CLINIC } from "./config.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function setupClinicBindings() {
  document.querySelectorAll("[data-clinic='name']").forEach((el) => (el.textContent = CLINIC.name));
  document.querySelectorAll("[data-clinic='alt-name']").forEach((el) => (el.textContent = CLINIC.altName));
  document.querySelectorAll("[data-clinic='doctor']").forEach((el) => (el.textContent = CLINIC.doctor));
  document.querySelectorAll("[data-clinic='phone']").forEach((el) => (el.textContent = CLINIC.phoneDisplay));
  document.querySelectorAll("[data-clinic='address']").forEach((el) => (el.textContent = CLINIC.address));
  document.querySelectorAll("[data-clinic='hours']").forEach((el) => (el.textContent = CLINIC.hoursLabel));
  document.querySelectorAll("[data-clinic='google-count']").forEach((el) => (el.textContent = CLINIC.ratingGoogle.count));
  document.querySelectorAll("[data-clinic='justdial-count']").forEach((el) => (el.textContent = CLINIC.ratingJustdial.count));
  document.querySelectorAll("[data-clinic='pricing']").forEach((el) => (el.textContent = CLINIC.pricing));
  document.querySelectorAll("[data-link='tel']").forEach((el) => (el.href = `tel:${CLINIC.phone}`));
  document.querySelectorAll("[data-link='wa']").forEach((el) => (el.href = CLINIC.whatsapp));
  document.querySelectorAll("[data-link='dir']").forEach((el) => (el.href = CLINIC.directions));
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
}

function setupHeader() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("compact", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function setupReveal() {
  if (prefersReducedMotion) return;
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );
  items.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 40, 300)}ms`;
    observer.observe(item);
  });
}

function animateCounter(el) {
  const target = Number(el.dataset.counterTarget || "0");
  const suffix = el.dataset.counterSuffix || "";
  if (!target) return;
  if (prefersReducedMotion) {
    el.textContent = `${target}${suffix}`;
    return;
  }
  const duration = 1200;
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const value = Math.floor(target * (1 - Math.pow(1 - progress, 3)));
    el.textContent = `${value}${suffix}`;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function setupCounters() {
  const counters = document.querySelectorAll("[data-counter-target]");
  if (!counters.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.4 }
  );
  counters.forEach((c) => observer.observe(c));
}

function setupToasts() {
  const wrap = document.createElement("div");
  wrap.className = "toast-wrap";
  document.body.appendChild(wrap);
  window.showToast = (message, type = "info") => {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    if (type === "error") toast.style.background = "#8a1f2b";
    wrap.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  };
}

function setupLightbox() {
  const gallery = document.querySelector("[data-gallery]");
  const dialog = document.getElementById("lightbox");
  const image = document.getElementById("lightboxImage");
  const close = document.getElementById("lightboxClose");
  if (!gallery || !dialog || !image || !close) return;

  gallery.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-full]");
    if (!button) return;
    image.src = button.dataset.full;
    image.alt = button.dataset.alt || "Gallery image";
    dialog.showModal();
  });

  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    const frame = event.target.closest(".lightbox-frame");
    if (!frame) dialog.close();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupClinicBindings();
  setupHeader();
  setupReveal();
  setupCounters();
  setupToasts();
  setupLightbox();
});