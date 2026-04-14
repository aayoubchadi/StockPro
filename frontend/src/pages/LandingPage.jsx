import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import headerStockPro1 from '../assets/images/headerStockPro1.avif';
import robotImage from '../assets/images/robot.png';
import inventoryImage from '../assets/images/inventory.png';
import analyticsImage from '../assets/images/Analytique.png';
import stockImage from '../assets/images/stcok.avif';
import { useLanguage } from '../lib/i18n';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ChartUpIcon,
  ClipboardIcon,
} from '@hugeicons/core-free-icons';

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

        <section id="features" className="section section-shell lp-value-section">
          <div className="section-head lp-value-head">
            <p className="eyebrow">{t('landing.features.eyebrow')}</p>
            <h2>{t('landing.features.title')}</h2>
          </div>

          <div className="lp-value-stack">
            {featureSections.map((section, index) => (
              <article key={section.title} className={`lp-value-card${index % 2 === 1 ? ' is-reverse' : ''}`}>
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

                <div className="lp-value-media" role="img" aria-label={section.mediaAlt}>
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
