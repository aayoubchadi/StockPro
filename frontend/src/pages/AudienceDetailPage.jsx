import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { useLanguage } from '../lib/i18n';
import {
    getAudienceLocale,
    getAudienceProfileBySlug,
    getAudienceProfileContent,
} from '../lib/audienceProfiles';
import { cleanupAnimations, initAnimations } from '../lib/gsapAnimations';

const detailCopy = {
    en: {
        solutionsButton: 'See solutions',
        solutionsSection: 'Recommended workflows',
        workflowSection: 'Operational flow',
        planSection: 'Implementation plan',
        planTitle: 'How to deploy this profile in a structured way',
        planSubtitle: 'A practical rollout framework to move from setup to measurable impact.',
        checklistTitle: 'Execution checklist',
        checklistItems: [
            'Configure your catalog, pricing rules, and stock locations.',
            'Set team roles, approvals, and operating responsibilities.',
            'Launch with a pilot workflow and monitor first-week adoption.',
            'Track KPIs weekly and optimize purchasing and invoicing routines.',
        ],
        kpiTitle: 'KPIs to monitor in the first 30 days',
        planFooter: 'Use this baseline to standardize operations before scaling to additional teams or branches.',
        startTrial: 'Start free trial',
        createAccount: 'Create account',
    },
    fr: {
        solutionsButton: 'Voir les solutions',
        solutionsSection: 'Workflows recommandes',
        workflowSection: 'Flux operationnel',
        planSection: 'Plan de mise en oeuvre',
        planTitle: 'Comment deployer ce profil avec une methode claire',
        planSubtitle: 'Un cadre concret pour passer du parametrage aux premiers resultats mesurables.',
        checklistTitle: 'Checklist d execution',
        checklistItems: [
            'Parametrez catalogue, regles de prix et emplacements de stock.',
            'Definissez roles, validations et responsabilites operationnelles.',
            'Lancez un flux pilote et suivez l adoption de la premiere semaine.',
            'Suivez les KPI chaque semaine pour ajuster achats et facturation.',
        ],
        kpiTitle: 'KPI a suivre pendant les 30 premiers jours',
        planFooter: 'Utilisez cette base pour standardiser les operations avant de passer a plus d equipes ou de sites.',
        startTrial: 'Demarrer l essai',
        createAccount: 'Creer un compte',
    },
};

export default function AudienceDetailPage() {
    const { audienceSlug } = useParams();
    const { language, t } = useLanguage();
    const locale = getAudienceLocale(language);
    const copy = detailCopy[locale] || detailCopy.en;

    const profile = getAudienceProfileBySlug(audienceSlug);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            initAnimations();
        });

        return () => {
            window.cancelAnimationFrame(frame);
            cleanupAnimations();
        };
    }, [language, audienceSlug]);

    if (!profile) {
        return <Navigate to="/" replace />;
    }

    const profileContent = getAudienceProfileContent(profile, language);

    return (
        <>
            <PageBackground />
            <Header />
            <main id="top" className="audience-page">
                <section className="section section-shell audience-detail-hero reveal">
                    <div className="audience-detail-copy">
                        <p className="eyebrow">{profileContent.heroEyebrow}</p>
                        <h1 className="hero-title hero-item">{profileContent.heroTitle}</h1>
                        <p className="hero-subtitle hero-item">{profileContent.heroSubtitle}</p>

                        <div className="hero-actions hero-item">
                            <a href="#audience-solutions" className="btn btn-secondary">
                                {copy.solutionsButton}
                            </a>
                            <Link to="/create-account" className="btn btn-primary">
                                {copy.createAccount}
                            </Link>
                        </div>

                        <h2 className="audience-subtitle">{profileContent.painsTitle}</h2>
                        <ul className="audience-pains-list">
                            {profileContent.pains.map((pain) => (
                                <li key={pain}>{pain}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="audience-detail-media image-reveal">
                        <img
                            src={profile.image}
                            alt={t(profile.labelKey)}
                            className={`audience-detail-image${profile.imageClassName ? ` ${profile.imageClassName}` : ''}`}
                        />
                    </div>
                </section>

                <section id="audience-solutions" className="section section-shell audience-solutions reveal">
                    <div className="section-head">
                        <p className="eyebrow">{copy.solutionsSection}</p>
                        <h2>{profileContent.solutionsTitle}</h2>
                    </div>

                    <div className="audience-solutions-grid stagger-cards">
                        {profileContent.solutions.map((solution) => (
                            <article key={solution.title} className="audience-solution-card feature-card">
                                <h3>{solution.title}</h3>
                                <p>{solution.copy}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="section section-shell audience-workflow reveal">
                    <div className="section-head">
                        <p className="eyebrow">{copy.workflowSection}</p>
                        <h2>{profileContent.workflowTitle}</h2>
                    </div>

                    <ol className="audience-workflow-list">
                        {profileContent.workflow.map((step) => (
                            <li key={step}>{step}</li>
                        ))}
                    </ol>
                </section>

                <section className="section section-shell audience-plan reveal">
                    <div className="section-head audience-plan-head">
                        <p className="eyebrow">{copy.planSection}</p>
                        <h2>{copy.planTitle}</h2>
                        <p>{copy.planSubtitle}</p>
                    </div>

                    <div className="audience-plan-grid">
                        <article className="audience-plan-card">
                            <h3>{copy.checklistTitle}</h3>
                            <ul className="audience-plan-list">
                                {copy.checklistItems.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </article>

                        <article className="audience-plan-card audience-plan-kpis">
                            <h3>{copy.kpiTitle}</h3>
                            <div className="audience-plan-kpi-grid">
                                {profileContent.results.map((result) => (
                                    <article key={result.label} className="audience-plan-kpi-card">
                                        <strong>{result.value}</strong>
                                        <span>{result.label}</span>
                                    </article>
                                ))}
                            </div>
                        </article>
                    </div>

                    <div className="audience-plan-footer">
                        <p>{copy.planFooter}</p>
                        <div className="audience-plan-actions">
                            <Link to="/create-account" className="btn btn-primary">
                                {profileContent.ctaPrimary || copy.startTrial}
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}
