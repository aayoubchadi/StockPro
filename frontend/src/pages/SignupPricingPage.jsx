import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { useLanguage } from '../lib/i18n';
import { getBillingPlans } from '../services/platformApi';

const SIGNUP_PREFILL_KEY = 'company-admin-signup';

function formatPrice(amountCents, currencyCode = 'MAD') {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
    }).format((Number(amountCents) || 0) / 100);
}

export default function SignupPricingPage() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [prefill, setPrefill] = useState({ fullName: '', username: '', email: '' });

    useEffect(() => {
        const stored = sessionStorage.getItem(SIGNUP_PREFILL_KEY);
        if (!stored) {
            return;
        }

        try {
            const parsed = JSON.parse(stored);
            setPrefill({
                fullName: String(parsed?.fullName || ''),
                username: String(parsed?.username || ''),
                email: String(parsed?.email || ''),
            });
        } catch {
            setPrefill({ fullName: '', username: '', email: '' });
        }
    }, []);

    useEffect(() => {
        let isActive = true;

        const loadPlans = async () => {
            setIsLoading(true);

            try {
                const fetchedPlans = await getBillingPlans();

                if (!isActive) {
                    return;
                }

                setPlans(fetchedPlans);
                setError('');
            } catch (err) {
                if (!isActive) {
                    return;
                }

                setError(err.message || 'Could not load pricing plans right now.');
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        loadPlans();

        return () => {
            isActive = false;
        };
    }, []);

    const handlePlanSelect = (planCode) => {
        navigate(`/company-admin-checkout?plan=${encodeURIComponent(planCode)}`);
    };

    return (
        <>
            <PageBackground />
            <Header showNav={false} />
            <main className="section section-shell signup-pricing-main">
                <section className="lp-pricing-section">
                    <div className="section-head lp-pricing-head">
                        <div>
                            <p className="eyebrow">{t('landing.pricing.eyebrow')}</p>
                            <h1>{t('landing.pricing.title')}</h1>
                            <p>{t('landing.pricing.subtitle')}</p>
                            <p className="lp-pricing-subnote">{t('landing.pricing.subnote')}</p>
                            {prefill.username ? (
                                <p className="lp-pricing-subnote">
                                    Signing up as <strong>{prefill.username}</strong>.
                                </p>
                            ) : prefill.email ? (
                                <p className="lp-pricing-subnote">
                                    Signing up as <strong>{prefill.email}</strong>.
                                </p>
                            ) : null}
                            <div className="hero-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}
                                >
                                    Return home
                                </button>
                            </div>
                        </div>
                    </div>

                    {error ? <p className="form-message error">{error}</p> : null}
                    {isLoading ? <p className="lp-pricing-loading">{t('landing.pricing.loading')}</p> : null}

                    <div className="lp-pricing-grid">
                        {plans.map((plan, index) => (
                            <article
                                key={plan.code}
                                className={`lp-plan-card feature-card${index === 1 ? ' is-popular' : ''}`}
                            >
                                {index === 1 ? (
                                    <span className="lp-plan-badge">{t('landing.pricing.mostPopular')}</span>
                                ) : null}

                                <div className="lp-plan-head">
                                    <h3>{plan.name}</h3>
                                    <p>{t('landing.pricing.planDescription').replace('{count}', plan.maxEmployees)}</p>
                                </div>

                                <div className="lp-plan-price-wrap">
                                    <p className="lp-plan-price">
                                        {formatPrice(plan.monthlyPriceCents, plan.currencyCode)}
                                        <span> / {t('landing.pricing.perMonth')}</span>
                                    </p>
                                    <p className="lp-plan-unit">
                                        {t('landing.pricing.planUnit').replace('{count}', plan.maxEmployees)}
                                    </p>
                                </div>

                                <ul className="lp-plan-list">
                                    <li>{t('landing.pricing.planSeatLabel').replace('{count}', plan.maxEmployees)}</li>
                                    <li>
                                        {plan.features?.canExportReports
                                            ? t('landing.pricing.planExportOn')
                                            : t('landing.pricing.planExportOff')}
                                    </li>
                                    <li>
                                        {plan.features?.canUseAdvancedAnalytics
                                            ? t('landing.pricing.planAnalyticsOn')
                                            : t('landing.pricing.planAnalyticsOff')}
                                    </li>
                                </ul>

                                <button
                                    type="button"
                                    className="btn btn-primary lp-plan-cta"
                                    onClick={() => handlePlanSelect(plan.code)}
                                >
                                    {t('landing.pricing.planCta')}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>
            </main>
        </>
    );
}
