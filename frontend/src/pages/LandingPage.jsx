import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import headerStockPro1 from '../assets/images/headerStockPro1.avif';
import robotImage from '../assets/images/robot.png';
import inventoryImage from '../assets/images/inventory.png';
import analyticsImage from '../assets/images/Analytique.png';
import stockImage from '../assets/images/stcok.avif';
import blackLogo from '../assets/images/black-v.png';
import whiteLogo from '../assets/images/white-v.png';
import { useLanguage } from '../lib/i18n';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ChartUpIcon,
  ClipboardIcon,
} from '@hugeicons/core-free-icons';
import { cleanupAnimations, initAnimations } from '../lib/gsapAnimations';
import { getSession } from '../lib/authStore';

export default function LandingPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      initAnimations();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      cleanupAnimations();
    };
  }, [language]);

  const featureSections = [
    {
      title: t('landing.featureCards.smartCatalogTitle'),
      intro: t('landing.featureCards.smartCatalogCopy'),
      items: [
        t('landing.featureCards.smartCatalogCopy'),
        t('landing.featureCards.realtimeCopy'),
        t('landing.featureCards.purchaseCopy'),
      ],
      mediaSrc: inventoryImage,
      mediaAlt: 'Features image placeholder one',
    },
    {
      title: t('landing.featureCards.analyticsTitle'),
      intro: t('landing.featureCards.analyticsCopy'),
      items: [
        t('landing.featureCards.analyticsCopy'),
        t('landing.featureCards.workflowCopy'),
        t('landing.featureCards.invoiceCopy'),
      ],
      mediaSrc: analyticsImage,
      mediaAlt: 'Features image placeholder two',
    },
    {
      title: 'Gerez vos stocks efficacement',
      intro: 'Suivez votre stock en temps reel (incrementation, decrementation).',
      items: [
        'Suivez votre stock en temps reel (incrementation, decrementation).',
        'Centralisez tous vos produits et services.',
        'Fabriquez vos produits.',
        'Creez des bons de livraisons.',
      ],
      mediaSrc: stockImage,
      mediaAlt: 'Features image placeholder three',
    },
  ];

  const pricingPlans = [
    {
      key: 'demo',
      name: t('landing.pricing.plans.demo.name'),
      description: t('landing.pricing.plans.demo.description'),
      basePrice: 0,
      cta: t('landing.pricing.plans.demo.cta'),
      features: [
        t('landing.pricing.plans.demo.featureOne'),
        t('landing.pricing.plans.demo.featureTwo'),
        t('landing.pricing.plans.demo.featureThree'),
      ],
      popular: false,
    },
    {
      key: 'pro',
      name: t('landing.pricing.plans.pro.name'),
      description: t('landing.pricing.plans.pro.description'),
      basePrice: 19,
      includedUsers: 5,
      cta: t('landing.pricing.plans.pro.cta'),
      features: [
        t('landing.pricing.plans.pro.featureOne'),
        t('landing.pricing.plans.pro.featureTwo'),
        t('landing.pricing.plans.pro.featureThree'),
      ],
      popular: true,
    },
    {
      key: 'premium',
      name: t('landing.pricing.plans.premium.name'),
      description: t('landing.pricing.plans.premium.description'),
      basePrice: 39,
      includedUsers: 10,
      cta: t('landing.pricing.plans.premium.cta'),
      features: [
        t('landing.pricing.plans.premium.featureOne'),
        t('landing.pricing.plans.premium.featureTwo'),
        t('landing.pricing.plans.premium.featureThree'),
      ],
      popular: false,
    },
  ];

  const formatPrice = (amount) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handlePricingChoiceClick = (event) => {
    const session = getSession();
    const isLoggedIn = Boolean(session?.accessToken && session?.user?.email);

    if (isLoggedIn) {
      return;
    }

    event.preventDefault();
    navigate('/create-account?redirect=pricing');
  };

  return (
    <>
      <PageBackground />
      <Header />
      <main id="top">
        <section className="lp-hero section section-shell reveal">
          <div>
            <h1 className="hero-title hero-item">
              {t('landing.hero.title')}
            </h1>
            <p className="hero-subtitle hero-item">
              {t('landing.hero.subtitle')}
            </p>
            <div className="hero-actions hero-item">
              <a href="#pricing" className="btn btn-primary">{t('landing.hero.primaryCta')}</a>
              <a href="#product" className="btn btn-ghost">{t('landing.hero.secondaryCta')}</a>
            </div>
          </div>

          <div className="lp-hero-visual image-reveal">
            <div className="lp-hero-single image-reveal">
              <img className="lp-hero-image" src={headerStockPro1} alt="StockPro payment and sales workflow" />
            </div>
          </div>
        </section>

        <section id="product" className="section section-shell reveal">
          <div className="lp-why-wrap">
            <aside className="lp-why-aside reveal">
              <div className="lp-why-aside-inner">
                <h2>{t('landing.whyChoose.title')}</h2>
                <p>{t('landing.whyChoose.subtitle')}</p>
                <div className="lp-why-avatar image-reveal">
                  <img className="lp-why-robot" src={robotImage} alt="" aria-hidden="true" />
                </div>
              </div>
            </aside>

            <article className="lp-why-card reveal">
              <div className="lp-why-icon" aria-hidden="true">
                <HugeiconsIcon icon={ClipboardIcon} size={28} strokeWidth={1.8} color="currentColor" />
              </div>
              <h3>{t('landing.whyChoose.cardOneTitle')}</h3>
              <p>{t('landing.whyChoose.cardOneCopyA')}</p>
              <p>{t('landing.whyChoose.cardOneCopyB')}</p>
              <div className="lp-why-highlight">
                <strong>{t('landing.whyChoose.cardOneHighlightStrong')}</strong> {t('landing.whyChoose.cardOneHighlightRest')}
              </div>
            </article>

            <article className="lp-why-card reveal">
              <div className="lp-why-icon" aria-hidden="true">
                <HugeiconsIcon icon={ChartUpIcon} size={28} strokeWidth={1.8} color="currentColor" />
              </div>
              <h3>{t('landing.whyChoose.cardTwoTitle')}</h3>
              <p>{t('landing.whyChoose.cardTwoCopyA')}</p>
              <p>{t('landing.whyChoose.cardTwoCopyB')}</p>
              <div className="lp-why-highlight">
                <strong>{t('landing.whyChoose.cardTwoHighlightStrong')}</strong> {t('landing.whyChoose.cardTwoHighlightRest')}
              </div>
            </article>
          </div>
        </section>

        <section id="features" className="section section-shell lp-value-section reveal">
          <div className="section-head lp-value-head reveal">
            <p className="eyebrow">{t('landing.features.eyebrow')}</p>
            <h2>{t('landing.features.title')}</h2>
          </div>

          <div className="lp-value-stack">
            {featureSections.map((section, index) => (
              <article key={section.title} className={`lp-value-card reveal${index % 2 === 1 ? ' is-reverse' : ''}`}>
                <div className="lp-value-copy">
                  <span className="lp-value-chip">Inclus</span>
                  <h3>{section.title}</h3>
                  <p>{section.intro}</p>
                  <ul className="lp-value-list">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="lp-value-media image-reveal" role="img" aria-label={section.mediaAlt}>
                  {section.mediaSrc ? (
                    <img className="lp-value-media-image" src={section.mediaSrc} alt={section.mediaAlt} />
                  ) : (
                    <span>Image placeholder</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="section section-shell lp-pricing-section reveal">
          <div className="section-head lp-pricing-head reveal">
            <div>
              <p className="eyebrow">{t('landing.pricing.eyebrow')}</p>
              <h2>{t('landing.pricing.title')}</h2>
              <p>{t('landing.pricing.subtitle')}</p>
            </div>
          </div>

          <div className="lp-pricing-grid stagger-cards">
            {pricingPlans.map((plan) => {
              const billedUsers = plan.includedUsers ?? 0;
              const monthlyPrice = plan.basePrice * billedUsers;
              const isFreePlan = plan.basePrice === 0;

              return (
                <article key={plan.key} className={`lp-plan-card feature-card${plan.popular ? ' is-popular' : ''}`}>
                  {plan.popular ? <span className="lp-plan-badge">{t('landing.pricing.mostPopular')}</span> : null}

                  <div className="lp-plan-head">
                    <h3>{plan.name}</h3>
                    <p>{plan.description}</p>
                  </div>

                  <div className="lp-plan-price-wrap">
                    <p className="lp-plan-price">
                      {isFreePlan ? t('landing.pricing.freeLabel') : formatPrice(monthlyPrice)}
                      {!isFreePlan ? <span> / {t('landing.pricing.perMonth')}</span> : null}
                    </p>
                    <p className="lp-plan-unit">
                      {isFreePlan ? t('landing.pricing.demoNote') : `${formatPrice(plan.basePrice)} ${t('landing.pricing.perUser')} • ${plan.includedUsers} ${t('landing.pricing.userUnit')}`}
                    </p>
                  </div>

                  <ul className="lp-plan-list">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>

                  <a
                    href="#top"
                    className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'} lp-plan-cta`}
                    onClick={handlePricingChoiceClick}
                  >
                    {plan.cta}
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        <footer id="contact" className="section section-shell lp-footer reveal">
          <div className="lp-footer-grid reveal">
            <div className="lp-footer-brand reveal">
              <img src={blackLogo} alt="StockPro" className="lp-footer-logo lp-footer-logo-light" />
              <img src={whiteLogo} alt="StockPro" className="lp-footer-logo lp-footer-logo-dark" />
              <p className="lp-footer-kicker">{t('landing.footer.kicker')}</p>
              <p className="lp-footer-copy">{t('landing.footer.copy')}</p>
              <a href="/create-account" className="btn btn-primary lp-footer-cta">{t('landing.footer.primaryCta')}</a>
            </div>

            <div className="lp-footer-column reveal">
              <h4>{t('landing.footer.productTitle')}</h4>
              <a href="#product">{t('landing.footer.links.product')}</a>
              <a href="#features">{t('landing.footer.links.features')}</a>
              <a href="#pricing">{t('landing.footer.links.pricing')}</a>
            </div>

            <div className="lp-footer-column reveal">
              <h4>{t('landing.footer.companyTitle')}</h4>
              <a href="#top">{t('landing.footer.links.home')}</a>
              <a href="#contact">{t('landing.footer.links.contact')}</a>
              <a href="mailto:contact@stockpro.app">{t('landing.footer.links.email')}</a>
            </div>

            <div className="lp-footer-column reveal">
              <h4>{t('landing.footer.accountTitle')}</h4>
              <a href="/login">{t('landing.footer.links.login')}</a>
              <a href="/create-account">{t('landing.footer.links.createAccount')}</a>
              <a href="/forgot-password">{t('landing.footer.links.forgotPassword')}</a>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <span>{`© ${currentYear} StockPro. ${t('landing.footer.rights')}`}</span>
            <a href="#top">{t('landing.footer.backToTop')}</a>
          </div>
        </footer>
      </main>
    </>
  );
}
