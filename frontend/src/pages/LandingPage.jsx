import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import headerStockPro1 from '../assets/images/headerStockPro1.avif';
import robotImage from '../assets/images/robot.png';
import { useLanguage } from '../lib/i18n';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AddInvoiceIcon,
  Analytics01Icon,
  ChartUpIcon,
  ClipboardIcon,
  FileManagementIcon,
  ShoppingBag01Icon,
} from '@hugeicons/core-free-icons';

function FeatureCard({ title, copy, icon }) {
  return (
    <article className="lp-feature-card image-reveal">
      <div className="lp-feature-icon" aria-hidden="true">
        <HugeiconsIcon icon={icon} size={20} strokeWidth={1.8} color="currentColor" />
      </div>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}

function MetricCard({ label, value }) {
  return (
    <article className="lp-metric-card">
      <p className="label">{label}</p>
      <p className="counter" data-target={value}>0</p>
    </article>
  );
}

export default function LandingPage() {
  const { t } = useLanguage();

  const featureItems = [
    {
      icon: ClipboardIcon,
      title: t('landing.featureCards.smartCatalogTitle'),
      copy: t('landing.featureCards.smartCatalogCopy'),
    },
    {
      icon: Analytics01Icon,
      title: t('landing.featureCards.realtimeTitle'),
      copy: t('landing.featureCards.realtimeCopy'),
    },
    {
      icon: ShoppingBag01Icon,
      title: t('landing.featureCards.purchaseTitle'),
      copy: t('landing.featureCards.purchaseCopy'),
    },
    {
      icon: ChartUpIcon,
      title: t('landing.featureCards.analyticsTitle'),
      copy: t('landing.featureCards.analyticsCopy'),
    },
    {
      icon: FileManagementIcon,
      title: t('landing.featureCards.workflowTitle'),
      copy: t('landing.featureCards.workflowCopy'),
    },
    {
      icon: AddInvoiceIcon,
      title: t('landing.featureCards.invoiceTitle'),
      copy: t('landing.featureCards.invoiceCopy'),
    },
  ];

  return (
    <>
      <PageBackground />
      <Header />
      <main id="top">
        <section className="lp-hero section section-shell">
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

          <div className="lp-hero-visual">
            <div className="lp-hero-single">
              <img className="lp-hero-image" src={headerStockPro1} alt="StockPro payment and sales workflow" />
            </div>
          </div>
        </section>

        <section id="product" className="section section-shell">
          <div className="lp-why-wrap">
            <aside className="lp-why-aside">
              <div className="lp-why-aside-inner">
                <h2>{t('landing.whyChoose.title')}</h2>
                <p>{t('landing.whyChoose.subtitle')}</p>
                <div className="lp-why-avatar">
                  <img className="lp-why-robot" src={robotImage} alt="" aria-hidden="true" />
                </div>
              </div>
            </aside>

            <article className="lp-why-card">
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

            <article className="lp-why-card">
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

        <section id="features" className="section section-shell">
          <div className="section-head">
            <p className="eyebrow">{t('landing.features.eyebrow')}</p>
            <h2>{t('landing.features.title')}</h2>
          </div>
          <div className="lp-feature-grid stagger-cards">
            {featureItems.map((feature) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                copy={feature.copy}
                icon={feature.icon}
              />
            ))}
          </div>
        </section>

        <section className="section section-shell">
          <div className="lp-stats-band">
            <MetricCard label={t('landing.stats.warehouses')} value="42" />
            <MetricCard label={t('landing.stats.purchaseRules')} value="780" />
            <MetricCard label={t('landing.stats.timeSaved')} value="31" />
            <MetricCard label={t('landing.stats.alerts')} value="120" />
          </div>

          <div className="lp-testimonial">
            <p>{t('landing.testimonial.quote')}</p>
            <div>
              <strong>Rami Haddad</strong>
              <span>{t('landing.testimonial.role')}</span>
            </div>
          </div>
        </section>

        <section id="pricing" className="section section-shell">
          <div className="pricing-box">
            <div>
              <p className="eyebrow">{t('landing.pricing.eyebrow')}</p>
              <h2>{t('landing.pricing.title')}</h2>
              <p>{t('landing.pricing.subtitle')}</p>
            </div>
            <a href="#top" className="btn btn-primary">{t('landing.pricing.button')}</a>
          </div>
        </section>
      </main>
    </>
  );
}
