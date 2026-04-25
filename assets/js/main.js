/**
 * main.js — Shared UI logic: nav, sticky header, scroll reveals,
 *           animated counters, toast system, lightbox, mobile bar.
 */
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initStickyHeader();
    initScrollReveal();
    initCounters();
    initLightbox();
    injectMobileBar();
});

/* =========================================================
   1. Navigation toggle
   ========================================================= */
function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
        const open = toggle.classList.toggle('is-active');
        nav.classList.toggle('is-open', open);
        document.body.style.overflow = open ? 'hidden' : '';
        toggle.setAttribute('aria-expanded', open);
    });

    // Close on link click (mobile)
    nav.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', () => {
            toggle.classList.remove('is-active');
            nav.classList.remove('is-open');
            document.body.style.overflow = '';
            toggle.setAttribute('aria-expanded', 'false');
        });
    });

    // Mark active link
    const page = location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('.nav__link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === page || (page === '' && href === 'index.html')) {
            link.classList.add('is-active');
        }
    });
}

/* =========================================================
   2. Sticky compact header
   ========================================================= */
function initStickyHeader() {
    const header = document.querySelector('.header');
    if (!header) return;

    let last = 0;
    const onScroll = () => {
        const y = window.scrollY;
        header.classList.toggle('is-scrolled', y > 60);
        last = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

/* =========================================================
   3. Scroll reveal (IntersectionObserver)
   ========================================================= */
function initScrollReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
        els.forEach(el => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => observer.observe(el));
}

/* =========================================================
   4. Animated counters
   ========================================================= */
function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target, prefersReduced);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
}

function animateCounter(el, instant = false) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const isDecimal = String(target).includes('.');

    if (instant) {
        el.textContent = prefix + (isDecimal ? target.toFixed(1) : target) + suffix;
        return;
    }

    const duration = 1600;
    const start = performance.now();

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const current = ease * target;
        el.textContent = prefix + (isDecimal ? current.toFixed(1) : Math.floor(current)) + suffix;
        if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
}

/* =========================================================
   5. Toast system
   ========================================================= */
function showToast(message, type = 'info', duration = 4000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('is-leaving');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

window.showToast = showToast;

/* =========================================================
   6. Lightbox (gallery page)
   ========================================================= */
function initLightbox() {
    const items = document.querySelectorAll('.gallery-item');
    if (!items.length) return;

    // Create lightbox DOM
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-label', 'Image viewer');
    lb.innerHTML = `
    <button class="lightbox__close" aria-label="Close">&times;</button>
    <button class="lightbox__prev" aria-label="Previous">‹</button>
    <button class="lightbox__next" aria-label="Next">›</button>
    <img class="lightbox__img" src="" alt="" />
  `;
    document.body.appendChild(lb);

    const img = lb.querySelector('.lightbox__img');
    const closeBtn = lb.querySelector('.lightbox__close');
    const prevBtn = lb.querySelector('.lightbox__prev');
    const nextBtn = lb.querySelector('.lightbox__next');
    let currentIndex = 0;
    const srcs = [];

    items.forEach((item, i) => {
        const imgEl = item.querySelector('img');
        if (imgEl) {
            srcs.push({ src: imgEl.src, alt: imgEl.alt || '' });
            item.addEventListener('click', () => openLightbox(i));
            item.setAttribute('tabindex', '0');
            item.addEventListener('keydown', e => {
                if (e.key === 'Enter') openLightbox(i);
            });
        }
    });

    function openLightbox(i) {
        currentIndex = i;
        updateImage();
        lb.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
    }

    function closeLightbox() {
        lb.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    function updateImage() {
        img.src = srcs[currentIndex].src;
        img.alt = srcs[currentIndex].alt;
    }

    function prev() {
        currentIndex = (currentIndex - 1 + srcs.length) % srcs.length;
        updateImage();
    }

    function next() {
        currentIndex = (currentIndex + 1) % srcs.length;
        updateImage();
    }

    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);
    lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });

    document.addEventListener('keydown', e => {
        if (!lb.classList.contains('is-open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') prev();
        if (e.key === 'ArrowRight') next();
    });
}

/* =========================================================
   7. Mobile bottom bar injection
   ========================================================= */
function injectMobileBar() {
    if (document.querySelector('.mobile-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'mobile-bar';
    bar.innerHTML = `
    <div class="mobile-bar__inner">
      <a href="tel:${CLINIC.phoneRaw}" class="mobile-bar__btn mobile-bar__btn--call" aria-label="Call clinic">
        📞 Call
      </a>
      <a href="${CLINIC.whatsappLink}" target="_blank" rel="noopener" class="mobile-bar__btn mobile-bar__btn--wa" aria-label="WhatsApp">
        💬 WhatsApp
      </a>
      <a href="book.html" class="mobile-bar__btn mobile-bar__btn--book" aria-label="Book appointment">
        📅 Book
      </a>
    </div>
  `;
    document.body.appendChild(bar);
}
