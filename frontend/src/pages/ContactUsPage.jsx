import { useEffect, useState } from 'react';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { useLanguage } from '../lib/i18n';
import { cleanupAnimations, initAnimations } from '../lib/gsapAnimations';

const pageCopy = {
    en: {
        heroEyebrow: 'Contact',
        heroTitle: 'Contact us',
        heroSubtitle:
            'Share your request and we will reply with clear next steps.',
        infoTitle: 'Contact information',
        infoSubtitle:
            'Use the form for project requests, or contact us directly by email.',
        emailLabel: 'Email',
        emailValue: 'contact@stockpro.app',
        locationLabel: 'Location',
        locationValue: 'Agadir, Morocco',
        availabilityLabel: 'Availability',
        availabilityValue: 'Monday to Friday, 09:00 - 18:00 (GMT+1)',
        directEmailLabel: 'Email us directly',
        responseTitle: 'Response time',
        responseValue: 'Within one business day',
        formTitle: 'Send us a message',
        formSubtitle: 'Provide a few details so we can route your request quickly.',
        nameLabel: 'Full name',
        emailInputLabel: 'Email',
        subjectLabel: 'Subject',
        messageLabel: 'Message',
        submitLabel: 'Send message',
        privacyNote: 'Your information is only used to reply to your request.',
        success: 'Message sent successfully. We will contact you shortly.',
        placeholders: {
            name: 'Your full name',
            email: 'name@company.com',
            subject: 'How can we help?',
            message: 'Write your message here...',
        },
    },
    fr: {
        heroEyebrow: 'Contact',
        heroTitle: 'Contactez-nous',
        heroSubtitle:
            'Partagez votre besoin et nous reviendrons vers vous avec des etapes claires.',
        infoTitle: 'Informations de contact',
        infoSubtitle:
            'Utilisez le formulaire pour les demandes projet, ou contactez-nous directement par email.',
        emailLabel: 'Email',
        emailValue: 'contact@stockpro.app',
        locationLabel: 'Localisation',
        locationValue: 'Agadir, Maroc',
        availabilityLabel: 'Disponibilite',
        availabilityValue: 'Lundi a vendredi, 09:00 - 18:00 (GMT+1)',
        directEmailLabel: 'Nous ecrire directement',
        responseTitle: 'Delai de reponse',
        responseValue: 'Sous un jour ouvrable',
        formTitle: 'Envoyer un message',
        formSubtitle: 'Donnez quelques details pour orienter rapidement votre demande.',
        nameLabel: 'Nom complet',
        emailInputLabel: 'Email',
        subjectLabel: 'Sujet',
        messageLabel: 'Message',
        submitLabel: 'Envoyer',
        privacyNote: 'Vos informations servent uniquement a repondre a votre demande.',
        success: 'Message envoye avec succes. Nous vous contacterons rapidement.',
        placeholders: {
            name: 'Votre nom complet',
            email: 'nom@entreprise.com',
            subject: 'Comment pouvons-nous vous aider ?',
            message: 'Ecrivez votre message ici...',
        },
    },
};

const resolveLocale = (language) => {
    return language === 'fr' ? 'fr' : 'en';
};

export default function ContactUsPage() {
    const { language } = useLanguage();
    const locale = resolveLocale(language);
    const copy = pageCopy[locale] || pageCopy.en;

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            initAnimations();
        });

        return () => {
            window.cancelAnimationFrame(frame);
            cleanupAnimations();
        };
    }, [language]);

    const handleSubmit = (event) => {
        event.preventDefault();
        setFeedback(copy.success);
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
    };

    return (
        <>
            <PageBackground />
            <Header />
            <main id="top" className="company-page contact-page">
                <section className="section section-shell company-hero reveal">
                    <p className="eyebrow">{copy.heroEyebrow}</p>
                    <h1 className="hero-title hero-item">{copy.heroTitle}</h1>
                    <p className="hero-subtitle hero-item">{copy.heroSubtitle}</p>
                </section>

                <section className="section section-shell contact-grid-section reveal">
                    <div className="contact-grid">
                        <article className="contact-info-card feature-card reveal">
                            <h2>{copy.infoTitle}</h2>
                            <p className="contact-card-intro">{copy.infoSubtitle}</p>

                            <div className="contact-quick-actions">
                                <a href={`mailto:${copy.emailValue}`} className="contact-quick-link">
                                    {copy.directEmailLabel}
                                </a>
                            </div>

                            <ul className="contact-info-list">
                                <li className="contact-info-item">
                                    <span>{copy.emailLabel}</span>
                                    <a href={`mailto:${copy.emailValue}`}>{copy.emailValue}</a>
                                </li>
                                <li className="contact-info-item">
                                    <span>{copy.locationLabel}</span>
                                    <strong>{copy.locationValue}</strong>
                                </li>
                                <li className="contact-info-item">
                                    <span>{copy.availabilityLabel}</span>
                                    <strong>{copy.availabilityValue}</strong>
                                </li>
                                <li className="contact-info-item">
                                    <span>{copy.responseTitle}</span>
                                    <strong>{copy.responseValue}</strong>
                                </li>
                            </ul>
                        </article>

                        <article className="contact-form-card feature-card reveal">
                            <h2>{copy.formTitle}</h2>
                            <p className="contact-card-intro">{copy.formSubtitle}</p>

                            <form className="contact-form" onSubmit={handleSubmit}>
                                <div className="contact-form-row">
                                    <label>
                                        {copy.nameLabel}
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(event) => setName(event.target.value)}
                                            placeholder={copy.placeholders.name}
                                            required
                                        />
                                    </label>

                                    <label>
                                        {copy.emailInputLabel}
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            placeholder={copy.placeholders.email}
                                            required
                                        />
                                    </label>
                                </div>

                                <label>
                                    {copy.subjectLabel}
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(event) => setSubject(event.target.value)}
                                        placeholder={copy.placeholders.subject}
                                        required
                                    />
                                </label>

                                <label>
                                    {copy.messageLabel}
                                    <textarea
                                        rows={5}
                                        value={message}
                                        onChange={(event) => setMessage(event.target.value)}
                                        placeholder={copy.placeholders.message}
                                        required
                                    />
                                </label>

                                <div className="contact-form-actions">
                                    <button type="submit" className="btn btn-primary contact-submit-btn">
                                        {copy.submitLabel}
                                    </button>
                                    <p className="contact-form-note">{copy.privacyNote}</p>
                                </div>

                                <p className={`form-message ${feedback ? 'success' : ''}`} aria-live="polite">
                                    {feedback}
                                </p>
                            </form>
                        </article>
                    </div>
                </section>
            </main>
        </>
    );
}
