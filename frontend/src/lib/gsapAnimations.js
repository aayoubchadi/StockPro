import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const selectors = {
  heroItems: '.hero-item',
  parallaxLayers: '.parallax-layer, .blob, .hero-chip',
  reveal: '.reveal',
  imageReveal: '.image-reveal',
  cardsContainer: '.stagger-cards',
  bars: '.bar',
  counters: '.counter',
  dashboardSidebar: '.dashboard-sidebar',
  dashboardCard: '.dashboard-card',
};

const heroIntro = () => {
  gsap.from(selectors.heroItems, {
    y: 26,
    opacity: 0,
    stagger: 0.14,
    duration: 0.82,
    ease: 'power3.out',
    clearProps: 'transform,opacity',
  });
};

const setupParallax = () => {
  document.querySelectorAll(selectors.parallaxLayers).forEach((layer) => {
    const speed = Number(layer.dataset.speed || 0.12);
    gsap.to(layer, {
      yPercent: speed * 100,
      ease: 'none',
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
      },
    });
  });
};

const revealSections = () => {
  gsap.utils.toArray(selectors.reveal).forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      y: 30,
      duration: 0.86,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 82%',
        toggleActions: 'play none none reverse',
      },
    });
  });
};

const revealImages = () => {
  gsap.utils.toArray(selectors.imageReveal).forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      y: 24,
      scale: 0.9,
      duration: 0.88,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 86%',
        toggleActions: 'play none none reverse',
      },
    });
  });
};

const staggerCards = () => {
  const cards = document.querySelectorAll(`${selectors.cardsContainer} .feature-card`);
  if (!cards.length) {
    return;
  }

  gsap.from(cards, {
    opacity: 0,
    y: 30,
    duration: 0.68,
    stagger: 0.12,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: selectors.cardsContainer,
      start: 'top 80%',
    },
  });
};

const animateDashboardBars = () => {
  const bars = document.querySelectorAll(selectors.bars);
  const dashboardCard = document.querySelector(selectors.dashboardCard);

  if (!bars.length || !dashboardCard) {
    return;
  }

  gsap.set(bars, { height: 8 });

  gsap.to(bars, {
    height: (_, el) => `${el.dataset.height}px`,
    duration: 1.1,
    stagger: 0.12,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.dashboard-card',
      start: 'top 75%',
    },
  });

  bars.forEach((bar, index) => {
    gsap.to(bar, {
      scaleY: 0.93,
      transformOrigin: 'bottom center',
      duration: 1.8 + index * 0.1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 1.4 + index * 0.08,
    });
  });
};

const animateDashboardSidebar = () => {
  const dashboardSidebar = document.querySelector(selectors.dashboardSidebar);
  const dashboardCard = document.querySelector(selectors.dashboardCard);

  if (!dashboardSidebar || !dashboardCard) {
    return;
  }

  gsap.from(selectors.dashboardSidebar, {
    x: -70,
    opacity: 0,
    duration: 0.84,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: selectors.dashboardCard,
      start: 'top 78%',
    },
  });
};

const animateCounters = () => {
  const counters = document.querySelectorAll(selectors.counters);
  counters.forEach((el) => {
    const target = Number(el.dataset.target || 0);
    const state = { value: 0 };

    gsap.to(state, {
      value: target,
      duration: 1.5,
      ease: 'power2.out',
      onUpdate: () => {
        const rounded = Math.round(state.value);
        el.textContent = rounded >= 1000 ? rounded.toLocaleString('en-US') : String(rounded);
      },
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
      },
    });
  });
};

const magneticDashboardTilt = () => {
  const card = document.querySelector(selectors.dashboardCard);
  if (!card) {
    return;
  }

  card.addEventListener('mousemove', (event) => {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 8;
    const rotateX = -((y / rect.height) - 0.5) * 8;

    gsap.to(card, {
      rotateY,
      rotateX,
      transformPerspective: 900,
      duration: 0.28,
      ease: 'power2.out',
    });
  });

  card.addEventListener('mouseleave', () => {
    gsap.to(card, {
      rotateY: 0,
      rotateX: 0,
      duration: 0.45,
      ease: 'power3.out',
    });
  });
};

export const initAnimations = () => {
  // Kill existing ScrollTriggers to avoid duplicates
  ScrollTrigger.getAll().forEach(trigger => trigger.kill());

  heroIntro();
  setupParallax();
  revealSections();
  revealImages();
  staggerCards();
  animateDashboardSidebar();
  animateDashboardBars();
  animateCounters();
  magneticDashboardTilt();

  // Refresh ScrollTrigger after all animations are set up
  ScrollTrigger.refresh();
};

export const initLenisScroll = () => {
  // Smooth scrolling handled by CSS scroll-behavior
};

export const cleanupAnimations = () => {
  ScrollTrigger.getAll().forEach(trigger => trigger.kill());
};
