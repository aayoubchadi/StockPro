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

const getMotionContext = () => {
  if (typeof window === 'undefined') {
    return { reducedMotion: false, touchDevice: false };
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touchDevice =
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches;

  return { reducedMotion, touchDevice };
};

const heroIntro = () => {
  gsap.from(selectors.heroItems, {
    y: 28,
    opacity: 0,
    stagger: 0.12,
    duration: 0.92,
    ease: 'power3.out',
    force3D: true,
    clearProps: 'transform,opacity',
  });
};

const setupParallax = ({ reducedMotion, touchDevice }) => {
  if (reducedMotion || touchDevice) {
    return;
  }

  document.querySelectorAll(selectors.parallaxLayers).forEach((layer) => {
    const speed = Number(layer.dataset.speed || 0.05);
    gsap.to(layer, {
      yPercent: speed * 75,
      ease: 'none',
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
      },
    });
  });
};

const revealSections = () => {
  gsap.utils.toArray(selectors.reveal).forEach((el) => {
    gsap.from(el, {
      autoAlpha: 0,
      y: 34,
      scale: 0.988,
      duration: 0.94,
      ease: 'power3.out',
      force3D: true,
      clearProps: 'transform,opacity,visibility',
      scrollTrigger: {
        trigger: el,
        start: 'top 86%',
        once: true,
      },
    });
  });
};

const revealImages = () => {
  gsap.utils.toArray(selectors.imageReveal).forEach((el) => {
    gsap.from(el, {
      autoAlpha: 0,
      y: 26,
      scale: 0.97,
      duration: 0.96,
      ease: 'power3.out',
      force3D: true,
      clearProps: 'transform,opacity,visibility',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        once: true,
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
    autoAlpha: 0,
    y: 30,
    scale: 0.98,
    duration: 0.88,
    stagger: 0.1,
    ease: 'power3.out',
    force3D: true,
    clearProps: 'transform,opacity,visibility',
    scrollTrigger: {
      trigger: selectors.cardsContainer,
      start: 'top 86%',
      once: true,
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

const magneticDashboardTilt = ({ touchDevice }) => {
  if (touchDevice) {
    return;
  }

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

  const motion = getMotionContext();

  if (motion.reducedMotion) {
    return;
  }

  heroIntro();
  setupParallax(motion);
  revealSections();
  revealImages();
  staggerCards();
  animateDashboardSidebar();
  animateDashboardBars();
  animateCounters();
  magneticDashboardTilt(motion);

  // Refresh ScrollTrigger after all animations are set up
  ScrollTrigger.refresh();
};

export const initLenisScroll = () => {
  // Smooth scrolling handled by CSS scroll-behavior
};

export const cleanupAnimations = () => {
  ScrollTrigger.getAll().forEach(trigger => trigger.kill());
};
