import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import {
  capturePayPalOrderAndCreateAdmin,
  createPayPalOrder,
  getBillingPlans,
} from '../services/platformApi';
import { loginRequest } from '../services/authApi';
import { getDashboardPathForRole, saveSession } from '../lib/authStore';

const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/;

function formatPrice(amountCents, currencyCode) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode || 'EUR',
    maximumFractionDigits: 0,
  }).format((Number(amountCents) || 0) / 100);
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function validateAdminPassword(password, email) {
  const errors = [];
  const value = String(password || '');
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const emailLocalPart = normalizedEmail.includes('@')
    ? normalizedEmail.split('@')[0]
    : normalizedEmail;

  if (value.length < 12) {
    errors.push('minimum length is 12');
  }

  if (value.length > 72) {
    errors.push('maximum length is 72');
  }

  if (!/[A-Z]/.test(value)) {
    errors.push('must include at least one uppercase letter');
  }

  if (!/[a-z]/.test(value)) {
    errors.push('must include at least one lowercase letter');
  }

  if (!/[0-9]/.test(value)) {
    errors.push('must include at least one digit');
  }

  if (!SPECIAL_CHAR_REGEX.test(value)) {
    errors.push('must include at least one special character');
  }

  if (/\s/.test(value)) {
    errors.push('must not include spaces');
  }

  if (emailLocalPart && value.toLowerCase().includes(emailLocalPart)) {
    errors.push('must not contain the email name');
  }

  return errors;
}

function getCheckoutValidationError({ selectedPlan, form }) {
  if (!selectedPlan) {
    return 'Please select a subscription plan.';
  }

  if (!String(form.companyName || '').trim()) {
    return 'Company name is required.';
  }

  if (!String(form.adminFullName || '').trim()) {
    return 'Admin full name is required.';
  }

  if (!String(form.adminEmail || '').trim()) {
    return 'Admin email is required.';
  }

  if (!form.adminPassword || !form.adminPasswordConfirm) {
    return 'Please complete and confirm your admin password.';
  }

  const passwordPolicyErrors = validateAdminPassword(form.adminPassword, form.adminEmail);

  if (passwordPolicyErrors.length > 0) {
    return `Password policy: ${passwordPolicyErrors.join(', ')}`;
  }

  if (form.adminPassword !== form.adminPasswordConfirm) {
    return 'Passwords do not match.';
  }

  return '';
}

export default function CompanyAdminCheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paypalButtonsRef = useRef(null);
  const paypalButtonsInstanceRef = useRef(null);
  const formRef = useRef({
    companyName: '',
    companySlug: '',
    adminFullName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
  });
  const selectedPlanRef = useRef(null);
  const isCaptureInFlightRef = useRef(false);
  const capturedOrderIdsRef = useRef(new Set());
  const [plans, setPlans] = useState([]);
  const [isPlansLoading, setIsPlansLoading] = useState(true);
  const [isPayPalSdkReady, setIsPayPalSdkReady] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasEditedSlug, setHasEditedSlug] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    companySlug: '',
    adminFullName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
  });

  const selectedPlanCodeFromUrl = searchParams.get('plan') || '';
  const [selectedPlanCode, setSelectedPlanCode] = useState(selectedPlanCodeFromUrl);
  const paypalClientId = String(import.meta.env.VITE_PAYPAL_CLIENT_ID || '').trim();

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === selectedPlanCode) || plans[0] || null,
    [plans, selectedPlanCode]
  );

  const passwordErrors = useMemo(
    () => validateAdminPassword(form.adminPassword, form.adminEmail),
    [form.adminPassword, form.adminEmail]
  );

  const isFormValid = useMemo(() => {
    if (!selectedPlan) {
      return false;
    }

    if (!form.companyName.trim() || !form.adminFullName.trim() || !form.adminEmail.trim()) {
      return false;
    }

    if (!form.adminPassword || !form.adminPasswordConfirm) {
      return false;
    }

    if (passwordErrors.length > 0) {
      return false;
    }

    if (form.adminPassword !== form.adminPasswordConfirm) {
      return false;
    }

    return true;
  }, [form, passwordErrors, selectedPlan]);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    selectedPlanRef.current = selectedPlan;
  }, [selectedPlan]);

  useEffect(() => {
    let isActive = true;

    const loadPlans = async () => {
      setIsPlansLoading(true);

      try {
        const fetchedPlans = await getBillingPlans();

        if (!isActive) {
          return;
        }

        setPlans(fetchedPlans);

        if (selectedPlanCodeFromUrl) {
          setSelectedPlanCode(selectedPlanCodeFromUrl);
        } else if (fetchedPlans[0]?.code) {
          setSelectedPlanCode(fetchedPlans[0].code);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setMessage(error.message || 'Unable to load subscription plans.');
        setMessageType('error');
      } finally {
        if (isActive) {
          setIsPlansLoading(false);
        }
      }
    };

    loadPlans();

    return () => {
      isActive = false;
    };
  }, [selectedPlanCodeFromUrl]);

  useEffect(() => {
    if (hasEditedSlug) {
      return;
    }

    setForm((current) => ({
      ...current,
      companySlug: slugify(current.companyName),
    }));
  }, [form.companyName, hasEditedSlug]);

  useEffect(() => {
    if (!paypalClientId || !selectedPlan) {
      setIsPayPalSdkReady(false);
      return undefined;
    }

    let isActive = true;
    const scriptId = 'paypal-js-sdk';
    const sdkCurrency = String(selectedPlan.currencyCode || 'EUR').toUpperCase();
    const sdkSrc = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      paypalClientId
    )}&currency=${encodeURIComponent(sdkCurrency)}&intent=capture&components=buttons`;

    const markReady = () => {
      if (isActive) {
        setIsPayPalSdkReady(true);
      }
    };

    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      const currentSrc = String(existingScript.getAttribute('src') || '');

      if (currentSrc === sdkSrc && window.paypal?.Buttons) {
        markReady();
        return () => {
          isActive = false;
        };
      }

      existingScript.remove();
      delete window.paypal;
    }

    setIsPayPalSdkReady(false);

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = sdkSrc;
    script.async = true;
    script.defer = true;
    script.onload = markReady;
    script.onerror = () => {
      if (!isActive) {
        return;
      }

      setMessage('PayPal script failed to load. Check your PayPal client id.');
      setMessageType('error');
    };

    document.head.appendChild(script);

    return () => {
      isActive = false;
    };
  }, [paypalClientId, selectedPlan]);

  useEffect(() => {
    if (!isPayPalSdkReady || !window.paypal?.Buttons || !paypalButtonsRef.current) {
      return undefined;
    }

    if (paypalButtonsInstanceRef.current?.close) {
      paypalButtonsInstanceRef.current.close();
      paypalButtonsInstanceRef.current = null;
    }

    paypalButtonsRef.current.innerHTML = '';

    if (!selectedPlan) {
      return undefined;
    }

    const buttons = window.paypal.Buttons({
      style: {
        shape: 'pill',
        layout: 'vertical',
        label: 'paypal',
        height: 44,
      },
      onClick: (_data, actions) => {
        if (isCaptureInFlightRef.current) {
          return actions.reject();
        }

        const currentPlan = selectedPlanRef.current || selectedPlan;
        const currentForm = formRef.current || form;

        const validationError = getCheckoutValidationError({
          selectedPlan: currentPlan,
          form: currentForm,
        });

        if (validationError) {
          setMessage(validationError);
          setMessageType('error');
          return actions.reject();
        }

        setMessage('');
        setMessageType('');
        return actions.resolve();
      },
      createOrder: async () => {
        setMessage('');
        setMessageType('');

        const currentPlan = selectedPlanRef.current || selectedPlan;

        if (!currentPlan?.code) {
          throw new Error('Please select a subscription plan before continuing.');
        }

        const order = await createPayPalOrder({
          planCode: currentPlan.code,
        });

        if (!order?.orderId) {
          throw new Error('PayPal order id was missing from API response.');
        }

        return order.orderId;
      },
      onApprove: async (data) => {
        const approvedOrderId = String(data?.orderID || '').trim();

        if (!approvedOrderId) {
          setMessage('PayPal approval did not return an order id. Please try again.');
          setMessageType('error');
          return;
        }

        if (capturedOrderIdsRef.current.has(approvedOrderId) || isCaptureInFlightRef.current) {
          return;
        }

        const currentPlan = selectedPlanRef.current || selectedPlan;
        const currentForm = formRef.current || form;
        const validationError = getCheckoutValidationError({
          selectedPlan: currentPlan,
          form: currentForm,
        });

        if (validationError) {
          setMessage(validationError);
          setMessageType('error');
          return;
        }

        isCaptureInFlightRef.current = true;
        capturedOrderIdsRef.current.add(approvedOrderId);

        try {
          setIsCapturing(true);
          setMessage('Finalizing payment and creating your company workspace...');
          setMessageType('');

          const captured = await capturePayPalOrderAndCreateAdmin({
            orderId: approvedOrderId,
            planCode: currentPlan.code,
            companyName: currentForm.companyName,
            companySlug: currentForm.companySlug,
            adminFullName: currentForm.adminFullName,
            adminEmail: currentForm.adminEmail,
            adminPassword: currentForm.adminPassword,
          });

          const loginData = await loginRequest({
            email: currentForm.adminEmail.trim().toLowerCase(),
            password: currentForm.adminPassword,
            companyId: captured?.company?.id || null,
            accountScope: 'tenant',
          });

          saveSession({
            accessToken: loginData.accessToken,
            refreshToken: loginData.refreshToken,
            tokenType: loginData.tokenType,
            expiresIn: loginData.expiresIn,
            refreshExpiresIn: loginData.refreshExpiresIn,
            user: loginData.user,
            email: loginData.user?.email || currentForm.adminEmail.trim().toLowerCase(),
            fullName: loginData.user?.fullName || currentForm.adminFullName,
            role: loginData.user?.role || 'company_admin',
            scope: loginData.user?.scope || 'tenant',
            companyId: loginData.user?.companyId || captured?.company?.id || null,
            permissions: loginData.user?.permissions || {},
            effectivePermissions: loginData.user?.effectivePermissions || {},
            company: loginData.user?.company || captured?.company || null,
            plan: loginData.user?.plan || null,
          });

          setMessage('Subscription activated. Redirecting to your admin dashboard...');
          setMessageType('success');

          window.setTimeout(() => {
            navigate(getDashboardPathForRole(loginData.user?.role || 'company_admin'));
          }, 700);
        } catch (error) {
          capturedOrderIdsRef.current.delete(approvedOrderId);
          setMessage(error.message || 'Payment was approved but account creation failed.');
          setMessageType('error');
        } finally {
          isCaptureInFlightRef.current = false;
          setIsCapturing(false);
        }
      },
      onCancel: () => {
        setMessage('PayPal checkout was cancelled.');
        setMessageType('error');
      },
      onError: (error) => {
        isCaptureInFlightRef.current = false;
        setIsCapturing(false);
        setMessage(error?.message || 'PayPal checkout failed.');
        setMessageType('error');
      },
    });

    if (!buttons.isEligible()) {
      setMessage('PayPal is not available on this browser/device.');
      setMessageType('error');
      return undefined;
    }

    buttons.render(paypalButtonsRef.current);
    paypalButtonsInstanceRef.current = buttons;

    return () => {
      if (paypalButtonsInstanceRef.current?.close) {
        paypalButtonsInstanceRef.current.close();
      }

      paypalButtonsInstanceRef.current = null;
    };
  }, [
    isPayPalSdkReady,
    navigate,
    selectedPlan?.code,
  ]);

  return (
    <>
      <PageBackground />
      <Header showNav={false} />
      <main className="section section-shell checkout-main">
        <section className="checkout-wrap">
          <p className="eyebrow">Company Admin Subscription</p>
          <h1>Create Your Company Admin By Subscription</h1>
          <p>
            Company admin accounts are created only after a successful PayPal payment.
            Your payment instantly provisions your company workspace and admin access.
          </p>

          <div className="checkout-grid">
            <article className="checkout-panel">
              <h2>Company Setup</h2>

              {isPlansLoading ? (
                <p>Loading plans...</p>
              ) : (
                <div className="checkout-plan-picker" role="radiogroup" aria-label="Select plan">
                  {plans.map((plan) => {
                    const isSelected = selectedPlan?.code === plan.code;

                    return (
                      <button
                        key={plan.code}
                        type="button"
                        className={`checkout-plan-option${isSelected ? ' is-selected' : ''}`}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedPlanCode(plan.code)}
                      >
                        <strong>{plan.name}</strong>
                        <span>{formatPrice(plan.monthlyPriceCents, plan.currencyCode)} / month</span>
                        <small>{plan.maxEmployees} users included</small>
                      </button>
                    );
                  })}
                </div>
              )}

              <form className="checkout-form" onSubmit={(event) => event.preventDefault()}>
                <label>
                  Company name
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        companyName: event.target.value,
                      }));
                    }}
                    placeholder="Acme Logistics"
                    required
                  />
                </label>

                <label>
                  Company slug (optional)
                  <input
                    type="text"
                    value={form.companySlug}
                    onChange={(event) => {
                      setHasEditedSlug(true);
                      setForm((current) => ({
                        ...current,
                        companySlug: slugify(event.target.value),
                      }));
                    }}
                    placeholder="acme-logistics"
                  />
                </label>

                <label>
                  Admin full name
                  <input
                    type="text"
                    value={form.adminFullName}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        adminFullName: event.target.value,
                      }));
                    }}
                    placeholder="Jane Founder"
                    required
                  />
                </label>

                <label>
                  Admin email
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        adminEmail: event.target.value,
                      }));
                    }}
                    placeholder="admin@company.com"
                    required
                  />
                </label>

                <label>
                  Admin password
                  <input
                    type="password"
                    value={form.adminPassword}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        adminPassword: event.target.value,
                      }));
                    }}
                    placeholder="Strong password"
                    required
                  />
                </label>

                <label>
                  Confirm admin password
                  <input
                    type="password"
                    value={form.adminPasswordConfirm}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        adminPasswordConfirm: event.target.value,
                      }));
                    }}
                    placeholder="Repeat password"
                    required
                  />
                </label>

                <small className="checkout-policy-note">
                  Password must be 12-72 chars with uppercase, lowercase, number, and special character.
                </small>
              </form>
            </article>

            <aside className="checkout-panel checkout-summary-panel">
              <h2>Payment Summary</h2>

              {selectedPlan ? (
                <>
                  <div className="checkout-summary-row">
                    <span>Plan</span>
                    <strong>{selectedPlan.name}</strong>
                  </div>
                  <div className="checkout-summary-row">
                    <span>Monthly billing</span>
                    <strong>{formatPrice(selectedPlan.monthlyPriceCents, selectedPlan.currencyCode)}</strong>
                  </div>
                  <div className="checkout-summary-row">
                    <span>Users included</span>
                    <strong>{selectedPlan.maxEmployees}</strong>
                  </div>
                  <div className="checkout-summary-row">
                    <span>Advanced analytics</span>
                    <strong>{selectedPlan.features?.canUseAdvancedAnalytics ? 'Included' : 'Not included'}</strong>
                  </div>
                </>
              ) : (
                <p>Select a plan to continue.</p>
              )}

              {!paypalClientId ? (
                <p className="form-message error">
                  Missing VITE_PAYPAL_CLIENT_ID. Add it to your frontend environment.
                </p>
              ) : null}

              {!isFormValid ? (
                <p className="checkout-paypal-hint">
                  Complete all fields and confirm password to unlock PayPal checkout.
                </p>
              ) : null}

              {passwordErrors.length > 0 ? (
                <p className="form-message error">
                  Password policy: {passwordErrors.join(', ')}
                </p>
              ) : null}

              {form.adminPassword && form.adminPasswordConfirm && form.adminPassword !== form.adminPasswordConfirm ? (
                <p className="form-message error">Passwords do not match.</p>
              ) : null}

              <div className="checkout-paypal-slot" ref={paypalButtonsRef} aria-busy={isCapturing} />

              {!isPayPalSdkReady && paypalClientId ? (
                <small className="checkout-paypal-hint">Loading PayPal checkout...</small>
              ) : null}
            </aside>
          </div>

          <p className={`form-message ${messageType}`} aria-live="polite">
            {message}
          </p>
        </section>
      </main>
    </>
  );
}
