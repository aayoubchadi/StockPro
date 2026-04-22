import { useEffect } from 'react';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { useLanguage } from '../lib/i18n';
import { cleanupAnimations, initAnimations } from '../lib/gsapAnimations';

const pageCopy = {
    en: {
        heroEyebrow: 'About our team',
        heroTitle: 'Who we are',
        heroSubtitle: 'A focused software team building reliable products with clarity and discipline.',
        heroDescription:
            'We are three software engineering students based in Agadir, Morocco, building practical solutions for real operational needs.',
        spotlightLabel: 'How we work',
        spotlightTitle: 'Small team, strong execution.',
        spotlightSummary:
            'Our approach is simple: clear interfaces, dependable architecture, and decisions based on real business workflows.',
        heroStats: [
            { value: '3', label: 'Developers' },
            { value: 'Agadir', label: 'Based in Morocco' },
        ],
        teamEyebrow: 'Team',
        teamTitle: 'Meet the developers behind the product',
        teamSubtitle: 'A complementary team with clear responsibilities across product and engineering.',
        focusLabel: 'Focus area',
        strengthLabel: 'Contribution',
        visitGithub: 'Visit GitHub profile',
    },
    fr: {
        heroEyebrow: 'A propos de notre equipe',
        heroTitle: 'Qui sommes-nous',
        heroSubtitle:
            'Une equipe logicielle concentree qui construit des produits fiables avec clarte et rigueur.',
        heroDescription:
            'Nous sommes trois etudiants en ingenierie logicielle a Agadir, au Maroc, et nous construisons des solutions pratiques pour des besoins operationnels reels.',
        spotlightLabel: 'Notre approche',
        spotlightTitle: 'Petite equipe, execution solide.',
        spotlightSummary:
            'Notre methode est simple: interfaces claires, architecture fiable, et decisions ancrees dans les workflows metier reels.',
        heroStats: [
            { value: '3', label: 'Developpeurs' },
            { value: 'Agadir', label: 'Base au Maroc' },
        ],
        teamEyebrow: 'Equipe',
        teamTitle: 'Les developpeurs derriere le produit',
        teamSubtitle: 'Une equipe complementaire avec des responsabilites claires entre produit et ingenierie.',
        focusLabel: 'Focus',
        strengthLabel: 'Contribution',
        visitGithub: 'Voir le profil GitHub',
    },
};

// Leave github empty for now. Add each GitHub profile URL later to enable the CTA automatically.
const teamMembers = [
    {
        name: 'Ziyad Bizougarn',
        initials: 'ZB',
        accent: '#2f66ff',
        role: {
            en: 'Software engineering student',
            fr: 'Etudiant en ingenierie logicielle',
        },
        focus: {
            en: 'Frontend architecture and product UX',
            fr: 'Architecture frontend et UX produit',
        },
        strength: {
            en: 'Shapes interface systems, navigation clarity, and overall product presentation.',
            fr: 'Structure les interfaces, la clarte de navigation et la presentation globale du produit.',
        },
        github: '',
    },
    {
        name: 'Chadi Ayoub',
        initials: 'CA',
        accent: '#18a67f',
        role: {
            en: 'Software engineering student',
            fr: 'Etudiant en ingenierie logicielle',
        },
        focus: {
            en: 'Backend logic and API design',
            fr: 'Logique backend et conception API',
        },
        strength: {
            en: 'Builds service logic, application flows, and strong technical foundations behind the product.',
            fr: 'Construit la logique metier, les flux applicatifs et la base technique du produit.',
        },
        github: '',
    },
    {
        name: 'Aajli Hamza',
        initials: 'AH',
        accent: '#f59e0b',
        role: {
            en: 'Software engineering student',
            fr: 'Etudiant en ingenierie logicielle',
        },
        focus: {
            en: 'Data structure and application reliability',
            fr: 'Structure de donnees et fiabilite applicative',
        },
        strength: {
            en: 'Reinforces data consistency, stability, and the dependable behavior of the application.',
            fr: 'Renforce la coherence des donnees, la stabilite et le comportement fiable de l application.',
        },
        github: '',
    },
];

const resolveLocale = (language) => {
    return language === 'fr' ? 'fr' : 'en';
};

export default function WhoWeArePage() {
    const { language } = useLanguage();
    const locale = resolveLocale(language);
    const copy = pageCopy[locale] || pageCopy.en;

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            initAnimations();
        });

        return () => {
            window.cancelAnimationFrame(frame);
            cleanupAnimations();
        };
    }, [language]);

    return (
        <>
            <PageBackground />
            <Header />
            <main id="top" className="about-page">
                <section className="section section-shell about-hero-section reveal">
                    <div className="about-hero-grid">
                        <article className="about-hero-main">
                            <p className="eyebrow">{copy.heroEyebrow}</p>
                            <h1 className="hero-title hero-item">{copy.heroTitle}</h1>
                            <p className="hero-subtitle hero-item">{copy.heroSubtitle}</p>
                            <p className="about-hero-copy hero-item">{copy.heroDescription}</p>
                        </article>

                        <aside className="about-hero-aside">
                            <p className="about-panel-kicker">{copy.spotlightLabel}</p>
                            <h2>{copy.spotlightTitle}</h2>
                            <p className="about-spotlight-summary">{copy.spotlightSummary}</p>

                            <div className="about-hero-metrics">
                                {copy.heroStats.map((stat) => (
                                    <article key={stat.label} className="about-hero-metric">
                                        <strong>{stat.value}</strong>
                                        <span>{stat.label}</span>
                                    </article>
                                ))}
                            </div>
                        </aside>
                    </div>
                </section>

                <section className="section section-shell about-team-section reveal">
                    <div className="section-head about-section-head">
                        <p className="eyebrow">{copy.teamEyebrow}</p>
                        <h2>{copy.teamTitle}</h2>
                        <p>{copy.teamSubtitle}</p>
                    </div>

                    <div className="about-team-grid stagger-cards">
                        {teamMembers.map((member) => {
                            const hasGithub = Boolean(member.github);

                            return (
                                <article
                                    key={member.name}
                                    className="about-member-card feature-card"
                                    style={{ '--about-member-accent': member.accent }}
                                >
                                    <div className="about-member-top">
                                        <div className="about-member-avatar" aria-hidden="true">
                                            {member.initials}
                                        </div>
                                    </div>

                                    <h3>{member.name}</h3>
                                    <p className="about-member-role">{member.role[locale]}</p>

                                    <div className="about-member-meta">
                                        <div>
                                            <span>{copy.focusLabel}</span>
                                            <strong>{member.focus[locale]}</strong>
                                        </div>
                                        <div>
                                            <span>{copy.strengthLabel}</span>
                                            <strong>{member.strength[locale]}</strong>
                                        </div>
                                    </div>

                                    <div className="about-member-footer">
                                        {hasGithub ? (
                                            <a
                                                href={member.github}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="about-member-link"
                                            >
                                                <span className="about-member-link-label">
                                                    {copy.visitGithub}
                                                </span>
                                                <span className="about-member-link-arrow" aria-hidden="true">
                                                    -&gt;
                                                </span>
                                            </a>
                                        ) : null}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            </main>
        </>
    );
}
