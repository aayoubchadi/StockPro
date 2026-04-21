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
            'Tell us about your needs and we will get back to you as soon as possible.',
        infoTitle: 'Contact information',
        infoSubtitle:
            'You can use the form or send us an email directly. We are based in Agadir, Morocco.',
        emailLabel: 'Email',
        emailValue: 'contact@stockpro.app',
        locationLabel: 'Location',
        locationValue: 'Agadir, Morocco',
        availabilityLabel: 'Availability',
        availabilityValue: 'Monday to Friday, 09:00 - 18:00',
        formTitle: 'Send us a message',
        nameLabel: 'Full name',
        emailInputLabel: 'Email',
        subjectLabel: 'Subject',
        messageLabel: 'Message',
        submitLabel: 'Send message',
        success: 'Thanks for your message. We will contact you soon.',
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
            'Partagez votre besoin et nous vous repondrons dans les meilleurs delais.',
        infoTitle: 'Informations de contact',
        infoSubtitle:
            'Vous pouvez utiliser le formulaire ou nous ecrire directement par email. Nous sommes bases a Agadir, Maroc.',
        emailLabel: 'Email',
        emailValue: 'contact@stockpro.app',
        locationLabel: 'Localisation',
        locationValue: 'Agadir, Maroc',
        availabilityLabel: 'Disponibilite',
        availabilityValue: 'Lundi a vendredi, 09:00 - 18:00',
        formTitle: 'Envoyer un message',
        nameLabel: 'Nom complet',
        emailInputLabel: 'Email',
        subjectLabel: 'Sujet',
        messageLabel: 'Message',
        submitLabel: 'Envoyer',
        success: 'Merci pour votre message. Nous vous contacterons rapidement.',
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
                            <p>{copy.infoSubtitle}</p>

                            <ul className="contact-info-list">
                                <li>
                                    <span>{copy.emailLabel}</span>
                                    <a href={`mailto:${copy.emailValue}`}>{copy.emailValue}</a>
                                </li>
                                <li>
                                    <span>{copy.locationLabel}</span>
                                    <strong>{copy.locationValue}</strong>
                                </li>
                                <li>
                                    <span>{copy.availabilityLabel}</span>
                                    <strong>{copy.availabilityValue}</strong>
                                </li>
                            </ul>
                        </article>

                        <article className="contact-form-card feature-card reveal">
                            <h2>{copy.formTitle}</h2>

                            <form className="contact-form" onSubmit={handleSubmit}>
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

                                <button type="submit" className="btn btn-primary">{copy.submitLabel}</button>

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
