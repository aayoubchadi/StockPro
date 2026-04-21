import { useEffect } from 'react';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { useLanguage } from '../lib/i18n';
import { cleanupAnimations, initAnimations } from '../lib/gsapAnimations';

const pageCopy = {
    en: {
        heroEyebrow: 'About our team',
        heroTitle: 'Who we are',
        heroSubtitle:
            'A small product-focused software team building dependable tools with care.',
        heroDescription:
            'We are three software development students from Agadir, Morocco. We combine engineering discipline, clear UX thinking, and a practical mindset to turn real workflows into useful digital products.',
        heroPills: ['3 developers', 'Agadir, Morocco', 'ESTA software engineering track'],
        spotlightLabel: 'How we work',
        spotlightTitle: 'Small team, serious delivery mindset.',
        spotlightItems: [
            'We design for clarity first so people can use the product without friction.',
            'We keep architecture readable so the software can evolve without becoming fragile.',
            'We build around real operational needs instead of adding features for the sake of it.',
        ],
        heroStats: [
            { value: '3', label: 'Developers' },
            { value: 'Agadir', label: 'Based in Morocco' },
            { value: 'ESTA', label: 'Software engineering track' },
        ],
        storyEyebrow: 'Foundation',
        storyTitle: 'Built on engineering discipline and practical product thinking',
        storyBodyA:
            'StockPro is shaped by a team that cares about useful outcomes, not just code output. We approach each screen, workflow, and technical decision with the goal of making daily operations simpler and more reliable.',
        storyBodyB:
            'Our academic background gives us a strong technical base, and our product mindset helps us translate that foundation into interfaces and systems that feel clear, stable, and professional.',
        storyFacts: [
            { label: 'Location', value: 'Agadir, Morocco' },
            { label: 'School', value: "ESTA Ecole Superieure de Technologie d'Agadir" },
            { label: 'Program', value: 'Conception et Developpement Logiciel' },
        ],
        principles: [
            {
                title: 'Readable systems',
                copy: 'We value codebases that stay clear, maintainable, and easy to hand over as the product grows.',
            },
            {
                title: 'Useful interfaces',
                copy: 'We prioritize interfaces that guide people quickly instead of overwhelming them with unnecessary steps.',
            },
            {
                title: 'Real-world fit',
                copy: 'We focus on business workflows, reliability, and long-term usefulness rather than feature overload.',
            },
        ],
        teamEyebrow: 'Team',
        teamTitle: 'Meet the developers behind the product',
        teamSubtitle:
            'Each profile card already includes a GitHub area that you can activate later by adding the profile URL.',
        focusLabel: 'Focus area',
        strengthLabel: 'Contribution',
        memberLabel: 'Profile',
        visitGithub: 'Visit GitHub profile',
        githubPlaceholderEyebrow: 'GitHub',
        githubPlaceholderTitle: 'Link ready to add',
        githubPlaceholderCopy:
            'Add the profile URL later and this card will automatically show the live CTA.',
        githubPanelEyebrow: 'GitHub setup',
        githubPanelTitle: 'Prepared for profile links',
        githubPanelSubtitle:
            'When you are ready, just fill the github field for each team member in this page and the button will appear automatically.',
        githubPanelHint: 'Field to update',
    },
    fr: {
        heroEyebrow: 'A propos de notre equipe',
        heroTitle: 'Qui sommes-nous',
        heroSubtitle:
            'Une petite equipe orientee produit qui concoit des outils fiables avec exigence.',
        heroDescription:
            'Nous sommes trois etudiants en developpement logiciel a Agadir, au Maroc. Nous combinons rigueur technique, clarte UX et sens pratique pour transformer des besoins reels en produits numeriques utiles.',
        heroPills: ['3 developpeurs', 'Agadir, Maroc', 'Parcours ingenierie logicielle ESTA'],
        spotlightLabel: 'Notre approche',
        spotlightTitle: 'Petite equipe, vraie rigueur de livraison.',
        spotlightItems: [
            'Nous concevons d abord pour la clarte afin que le produit soit simple a utiliser.',
            'Nous gardons une architecture lisible pour faire evoluer le logiciel sans le fragiliser.',
            'Nous partons des besoins operationnels reels plutot que d ajouter des fonctionnalites inutiles.',
        ],
        heroStats: [
            { value: '3', label: 'Developpeurs' },
            { value: 'Agadir', label: 'Base au Maroc' },
            { value: 'ESTA', label: 'Parcours ingenierie logicielle' },
        ],
        storyEyebrow: 'Base',
        storyTitle: 'Une equipe guidee par la rigueur technique et le sens du produit',
        storyBodyA:
            'StockPro est porte par une equipe qui recherche des resultats utiles, pas seulement du code. Chaque ecran, workflow et decision technique vise a rendre les operations quotidiennes plus simples et plus fiables.',
        storyBodyB:
            'Notre parcours academique nous apporte une base technique solide, et notre vision produit nous aide a la traduire en interfaces et systemes clairs, stables et professionnels.',
        storyFacts: [
            { label: 'Localisation', value: 'Agadir, Maroc' },
            { label: 'Ecole', value: "ESTA Ecole Superieure de Technologie d'Agadir" },
            { label: 'Filiere', value: 'Conception et Developpement Logiciel' },
        ],
        principles: [
            {
                title: 'Systemes lisibles',
                copy: 'Nous privilegions des bases de code claires, maintenables et faciles a faire evoluer.',
            },
            {
                title: 'Interfaces utiles',
                copy: 'Nous concevons des interfaces qui guident rapidement les utilisateurs sans complexite superflue.',
            },
            {
                title: 'Usage reel',
                copy: 'Nous mettons l accent sur les workflows metier, la fiabilite et la valeur dans la duree.',
            },
        ],
        teamEyebrow: 'Equipe',
        teamTitle: 'Les developpeurs derriere le produit',
        teamSubtitle:
            'Chaque carte membre contient deja un emplacement GitHub que vous pourrez activer plus tard en ajoutant l URL du profil.',
        focusLabel: 'Focus',
        strengthLabel: 'Contribution',
        memberLabel: 'Profil',
        visitGithub: 'Voir le profil GitHub',
        githubPlaceholderEyebrow: 'GitHub',
        githubPlaceholderTitle: 'Lien pret a ajouter',
        githubPlaceholderCopy:
            'Ajoutez l URL du profil plus tard et cette carte affichera automatiquement le bouton actif.',
        githubPanelEyebrow: 'Configuration GitHub',
        githubPanelTitle: 'Page prete pour les liens GitHub',
        githubPanelSubtitle:
            'Quand vous serez pret, il suffit de renseigner le champ github de chaque membre dans cette page et le bouton apparaitra automatiquement.',
        githubPanelHint: 'Champ a mettre a jour',
    },
};

// Leave github empty for now. Add each GitHub profile URL later to enable the CTA automatically.
const teamMembers = [
    {
        name: 'Ziyad Bizougarn',
        initials: 'ZB',
        accent: '#2f66ff',
        role: {
            en: 'Software developer student',
            fr: 'Etudiant developpeur logiciel',
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
            en: 'Software developer student',
            fr: 'Etudiant developpeur logiciel',
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
            en: 'Software developer student',
            fr: 'Etudiant developpeur logiciel',
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

                            <div className="about-hero-pills">
                                {copy.heroPills.map((pill) => (
                                    <span key={pill} className="about-hero-pill">
                                        {pill}
                                    </span>
                                ))}
                            </div>
                        </article>

                        <aside className="about-hero-aside">
                            <p className="about-panel-kicker">{copy.spotlightLabel}</p>
                            <h2>{copy.spotlightTitle}</h2>

                            <ul className="about-spotlight-list">
                                {copy.spotlightItems.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>

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

                <section className="section section-shell about-story-section reveal">
                    <div className="about-story-grid">
                        <article className="about-story-card feature-card reveal">
                            <p className="eyebrow">{copy.storyEyebrow}</p>
                            <h2>{copy.storyTitle}</h2>
                            <p>{copy.storyBodyA}</p>
                            <p>{copy.storyBodyB}</p>

                            <div className="about-story-facts">
                                {copy.storyFacts.map((fact) => (
                                    <article key={fact.label} className="about-story-fact">
                                        <span>{fact.label}</span>
                                        <strong>{fact.value}</strong>
                                    </article>
                                ))}
                            </div>
                        </article>

                        <div className="about-principles-grid stagger-cards">
                            {copy.principles.map((principle, index) => (
                                <article key={principle.title} className="about-principle-card feature-card">
                                    <span className="about-principle-index">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <h3>{principle.title}</h3>
                                    <p>{principle.copy}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="section section-shell about-team-section reveal">
                    <div className="section-head about-section-head">
                        <p className="eyebrow">{copy.teamEyebrow}</p>
                        <h2>{copy.teamTitle}</h2>
                        <p>{copy.teamSubtitle}</p>
                    </div>

                    <div className="about-team-grid stagger-cards">
                        {teamMembers.map((member, index) => {
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
                                        <span className="about-member-status">
                                            {copy.memberLabel} {index + 1}
                                        </span>
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
                                        ) : (
                                            <div className="about-member-placeholder">
                                                <span>{copy.githubPlaceholderEyebrow}</span>
                                                <strong>{copy.githubPlaceholderTitle}</strong>
                                                <p>{copy.githubPlaceholderCopy}</p>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section className="section section-shell about-github-panel-section reveal">
                    <article className="about-github-panel">
                        <div>
                            <p className="eyebrow">{copy.githubPanelEyebrow}</p>
                            <h2>{copy.githubPanelTitle}</h2>
                            <p>{copy.githubPanelSubtitle}</p>
                        </div>

                        <div className="about-github-hint">
                            <span>{copy.githubPanelHint}</span>
                            <code>teamMembers[].github</code>
                        </div>
                    </article>
                </section>
            </main>
        </>
    );
}
