import { useEffect } from 'react';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { initAnimations, cleanupAnimations } from '../lib/gsapAnimations';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function LandingPage() {
  useEffect(() => {
    // Wait for DOM to be fully painted before initializing animations
    const timer = setTimeout(() => {
      initAnimations();
    }, 300);

    // Refresh ScrollTrigger on window resize
    const handleResize = () => {
      ScrollTrigger.refresh();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      cleanupAnimations();
    };
  }, []);

  return (
    <>
      <PageBackground />
      <Header />
      <main id="top">
        <section className="hero section section-shell">
          <div className="hero-copy">
            <p className="hero-eyebrow hero-item">Your ally for stock operations</p>
            <h1 className="hero-title hero-item">
              Run inventory, orders and finance from one clean dashboard.
            </h1>
            <p className="hero-subtitle hero-item">
              Automate stock updates, track margins in real-time, and keep your team in sync with a modern SaaS workspace.
            </p>
            <div className="hero-actions hero-item">
              <a href="#pricing" className="btn btn-primary">Try for free</a>
              <a href="#product" className="btn btn-ghost">Watch demo</a>
            </div>
          </div>

          <div className="hero-visual parallax-layer" data-speed="0.25">
            <div className="hero-chip chip-a">Live stock sync</div>
            <div className="hero-chip chip-b">+18% order velocity</div>
            <div className="dashboard-card">
              <aside className="dashboard-sidebar" aria-hidden="true">
                <div className="side-dot"></div>
                <div className="side-line"></div>
                <div className="side-line short"></div>
                <div className="side-line"></div>
              </aside>
              <div className="dashboard-main">
                <div className="dashboard-top">
                  <div>
                    <p className="label">Stock Value</p>
                    <p className="counter" data-target="428000">0</p>
                  </div>
                  <div className="pill">Updated 2m ago</div>
                </div>
                <div className="bar-chart" aria-label="Demo chart">
                  <span className="bar" data-height="72"></span>
                  <span className="bar" data-height="46"></span>
                  <span className="bar" data-height="86"></span>
                  <span className="bar" data-height="60"></span>
                  <span className="bar" data-height="96"></span>
                </div>
                <div className="dashboard-metrics">
                  <div className="metric">
                    <p className="label">Low stock alerts</p>
                    <p className="counter" data-target="23">0</p>
                  </div>
                  <div className="metric">
                    <p className="label">Orders today</p>
                    <p className="counter" data-target="154">0</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="section section-shell reveal">
          <div className="section-head">
            <p className="eyebrow">Product demo</p>
            <h2>Built for operators who need speed and control.</h2>
          </div>
          <div className="demo-grid">
            <article className="demo-panel image-reveal">
              <h3>Command center dashboard</h3>
              <p>Monitor order flow, stock turns, and profit with a single operational timeline.</p>
            </article>
            <article className="demo-panel image-reveal">
              <h3>Connected stock engine</h3>
              <p>Every purchase and sale updates your inventory instantly across all locations.</p>
            </article>
            <article className="demo-panel image-reveal">
              <h3>Automated supplier tasks</h3>
              <p>Generate purchase orders, alerts and replenishment rules with fewer clicks.</p>
            </article>
          </div>
        </section>

        <section id="features" className="section section-shell feature-stack">
          <article className="feature-row reveal">
            <div className="feature-text">
              <p className="eyebrow">01. Sales automation</p>
              <h3>From quote to invoice in one smooth flow.</h3>
              <p>Convert quotes, track deliveries and get paid faster with integrated payment links.</p>
              <a href="#pricing" className="inline-link">Explore sales tools</a>
            </div>
            <div className="feature-media image-reveal"></div>
          </article>

          <article className="feature-row reverse reveal">
            <div className="feature-text">
              <p className="eyebrow">02. Real-time inventory</p>
              <h3>See every movement across warehouses instantly.</h3>
              <p>Batch tracking, threshold alerts, and inventory valuation all available in one timeline.</p>
              <a href="#pricing" className="inline-link">Explore stock tools</a>
            </div>
            <div className="feature-media image-reveal"></div>
          </article>

          <article className="feature-row reveal">
            <div className="feature-text">
              <p className="eyebrow">03. Purchasing workflows</p>
              <h3>Prevent stockouts with smart replenishment rules.</h3>
              <p>Plan supplier orders with demand signals and approvals that fit your process.</p>
              <a href="#pricing" className="inline-link">Explore purchasing tools</a>
            </div>
            <div className="feature-media image-reveal"></div>
          </article>
        </section>

        <section className="section section-shell reveal">
          <div className="section-head">
            <p className="eyebrow">Why teams switch</p>
            <h2>Practical features, premium feel.</h2>
          </div>
          <div className="card-grid stagger-cards">
            <article className="feature-card">
              <h4>Fast onboarding</h4>
              <p>Deploy in days, not months, with guided setup and templates.</p>
            </article>
            <article className="feature-card">
              <h4>Fluid collaboration</h4>
              <p>Shared workspaces for sales, ops and accounting in one source of truth.</p>
            </article>
            <article className="feature-card">
              <h4>Reliable automation</h4>
              <p>Trigger actions from stock events and reduce repetitive manual tasks.</p>
            </article>
            <article className="feature-card">
              <h4>Actionable analytics</h4>
              <p>Track KPIs by warehouse, product family and period with clear trends.</p>
            </article>
          </div>
        </section>

        <section id="pricing" className="section section-shell reveal">
          <div className="pricing-box">
            <div>
              <p className="eyebrow">Start now</p>
              <h2>Try StockPilot free for 15 days.</h2>
              <p>No credit card required. Cancel anytime.</p>
            </div>
            <a href="#top" className="btn btn-primary">Start free trial</a>
          </div>
        </section>
      </main>
    </>
  );
}
