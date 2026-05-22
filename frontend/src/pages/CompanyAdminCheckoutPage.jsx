import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import {
  capturePayPalOrderAndCreateAdmin,
  createPayPalOrder,
  getBillingPlans,
  getPayPalCheckoutMetadata,
} from '../services/platformApi';
import { loginRequest } from '../services/authApi';
import { getDashboardPathForRole, saveSession } from '../lib/authStore';

const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/;
const CHECKOUT_STORAGE_KEY = 'company-admin-checkout';
const APPROVED_ORDER_STORAGE_KEY = 'company-admin-approved-paypal-order';
const CHECKOUT_STEPS = [
  { key: 'plan', label: 'Plan' },
  { key: 'details', label: 'Company details' },
  { key: 'payment', label: 'Payment' },
];
const PAYPAL_SDK_SRC_PREFIX = 'https://www.paypal.com/sdk/js';

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function formatPrice(amountCents, currencyCode) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode || 'MAD',
    maximumFractionDigits: 0,
  }).format((Number(amountCents) || 0) / 100);
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

  if (!String(form.adminUsername || '').trim()) {
    return 'Admin username is required.';
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

function getPayPalSdkScripts() {
  return Array.from(document.querySelectorAll('script')).filter((script) =>
    String(script.getAttribute('src') || '').startsWith(PAYPAL_SDK_SRC_PREFIX)
  );
}

function clearPayPalSdk() {
  getPayPalSdkScripts().forEach((script) => {
    script.remove();
  });

  try {
    delete window.paypal;
  } catch {
    window.paypal = undefined;
  }
}

export default function CompanyAdminCheckoutPage() {
  const navigate = useNavigate();
  const paypalButtonsRef = useRef(null);
  const paypalButtonsInstanceRef = useRef(null);
  const formRef = useRef({
    companyName: '',
    companySlug: '',
    adminUsername: '',
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
  const [checkoutMetadata, setCheckoutMetadata] = useState(null);
  const [isCheckoutMetadataLoading, setIsCheckoutMetadataLoading] = useState(false);
  const [isPayPalSdkReady, setIsPayPalSdkReady] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [approvedOrderId, setApprovedOrderId] = useState(() =>
    String(sessionStorage.getItem(APPROVED_ORDER_STORAGE_KEY) || '').trim()
  );
  const [form, setForm] = useState({
    companyName: '',
    companySlug: '',
    adminUsername: '',
    adminFullName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
  });

  const [selectedPlanCode, setSelectedPlanCode] = useState('');
  const paypalClientId = String(import.meta.env.VITE_PAYPAL_CLIENT_ID || '').trim();
  const activeStepIndex = 2;

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === selectedPlanCode) || plans[0] || null,
    [plans, selectedPlanCode]
  );

  const paypalSdkCurrency = useMemo(() => {
    const metadataPlanCode = String(checkoutMetadata?.plan?.code || '').trim();
    if (!metadataPlanCode || metadataPlanCode !== selectedPlan?.code) {
      return '';
    }

    const metadataCurrency = String(checkoutMetadata?.payment?.currencyCode || '').trim().toUpperCase();
    return metadataCurrency;
  }, [checkoutMetadata?.payment?.currencyCode, checkoutMetadata?.plan?.code, selectedPlan?.code]);

  const finalizeApprovedOrder = useCallback(async (orderId) => {
    const normalizedOrderId = String(orderId || '').trim();

    if (!normalizedOrderId) {
      setMessage('PayPal approval did not return an order id. Please try again.');
      setMessageType('error');
      return;
    }

    if (capturedOrderIdsRef.current.has(normalizedOrderId) || isCaptureInFlightRef.current) {
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
    capturedOrderIdsRef.current.add(normalizedOrderId);
    setApprovedOrderId(normalizedOrderId);
    sessionStorage.setItem(APPROVED_ORDER_STORAGE_KEY, normalizedOrderId);

    try {
      setIsCapturing(true);
      setMessage('Finalizing payment and creating your company workspace...');
      setMessageType('');

      const captured = await capturePayPalOrderAndCreateAdmin({
        orderId: normalizedOrderId,
        planCode: currentPlan.code,
        companyName: currentForm.companyName,
        companySlug: currentForm.companySlug,
        adminUsername: currentForm.adminUsername,
        adminFullName: currentForm.adminFullName,
        adminEmail: currentForm.adminEmail,
        adminPassword: currentForm.adminPassword,
      });

      const loginData = await loginRequest({
        username: currentForm.adminUsername,
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

      sessionStorage.removeItem(APPROVED_ORDER_STORAGE_KEY);
      setApprovedOrderId('');
      setMessage('Subscription activated. Redirecting to your admin dashboard...');
      setMessageType('success');

      window.setTimeout(() => {
        navigate(getDashboardPathForRole(loginData.user?.role || 'company_admin'));
      }, 700);
    } catch (error) {
      capturedOrderIdsRef.current.delete(normalizedOrderId);
      setMessage(
        error.message ||
          'Payment was approved, but account creation failed. Try finalizing again without starting a new PayPal payment.'
      );
      setMessageType('error');
    } finally {
      isCaptureInFlightRef.current = false;
      setIsCapturing(false);
    }
  }, [form, navigate, selectedPlan]);

  useEffect(() => {
    const stored = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!stored) {
      navigate('/company-admin-checkout');
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (!parsed?.planCode || !parsed?.companyName || !parsed?.adminEmail) {
        navigate('/company-admin-checkout');
        return;
      }

      const derivedSlug = parsed.companySlug || slugify(parsed.companyName);
      setSelectedPlanCode(parsed.planCode);
      const nextForm = {
        companyName: parsed.companyName || '',
        companySlug: derivedSlug || '',
        adminUsername: parsed.adminUsername || '',
        adminFullName: parsed.adminFullName || '',
        adminEmail: parsed.adminEmail || '',
        adminPassword: parsed.adminPassword || '',
        adminPasswordConfirm: parsed.adminPassword || '',
      };
      setForm(nextForm);
      formRef.current = nextForm;
    } catch {
      navigate('/company-admin-checkout');
    }
  }, [navigate]);

  useEffect(() => {
    selectedPlanRef.current = selectedPlan;
  }, [selectedPlan]);

  useEffect(() => {
    if (!selectedPlan?.code) {
      setCheckoutMetadata(null);
      setIsCheckoutMetadataLoading(false);
      return undefined;
    }

    let isActive = true;
    setCheckoutMetadata(null);
    setIsCheckoutMetadataLoading(true);
    setIsPayPalSdkReady(false);

    const loadCheckoutMetadata = async () => {
      try {
        const metadata = await getPayPalCheckoutMetadata({
          planCode: selectedPlan.code,
        });

        if (!isActive) {
          return;
        }

        setCheckoutMetadata(metadata || null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setMessage(error.message || 'Unable to load PayPal checkout metadata.');
        setMessageType('error');
      } finally {
        if (isActive) {
          setIsCheckoutMetadataLoading(false);
        }
      }
    };

    loadCheckoutMetadata();

    return () => {
      isActive = false;
    };
  }, [selectedPlan?.code]);

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
  }, []);

  useEffect(() => {
    if (!paypalClientId || !selectedPlan || isCheckoutMetadataLoading || !paypalSdkCurrency) {
      setIsPayPalSdkReady(false);
      return undefined;
    }

    let isActive = true;
    const scriptId = 'paypal-js-sdk';
    const sdkSrc = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      paypalClientId
    )}&currency=${encodeURIComponent(paypalSdkCurrency)}&intent=capture&components=buttons`;

    const markReady = () => {
      if (isActive) {
        setIsPayPalSdkReady(true);
      }
    };

    const existingScripts = getPayPalSdkScripts();
    const hasMismatchedScript = existingScripts.some(
      (scriptElement) => String(scriptElement.getAttribute('src') || '') !== sdkSrc
    );
    const existingScript = hasMismatchedScript ? null : existingScripts[0];

    if (existingScript) {
      const currentSrc = String(existingScript.getAttribute('src') || '');

      if (currentSrc === sdkSrc) {
        if (window.paypal?.Buttons || existingScript.dataset.loaded === 'true') {
          markReady();
        } else {
          existingScript.addEventListener('load', markReady, { once: true });
          existingScript.addEventListener('error', () => {
            if (!isActive) {
              return;
            }

            setMessage('PayPal script failed to load. Check your PayPal client id.');
            setMessageType('error');
          }, { once: true });
        }

        return () => {
          isActive = false;
          existingScript.removeEventListener('load', markReady);
        };
      }
    }

    if (existingScripts.length > 0 || window.paypal) {
      clearPayPalSdk();
    }

    setIsPayPalSdkReady(false);

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = sdkSrc;
    script.dataset.currency = paypalSdkCurrency;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      markReady();
    };
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
  }, [isCheckoutMetadataLoading, paypalClientId, paypalSdkCurrency, selectedPlan]);

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

        const orderCurrency = String(order?.payment?.currencyCode || '').trim().toUpperCase();
        if (orderCurrency && orderCurrency !== paypalSdkCurrency) {
          throw new Error(
            `PayPal currency changed from ${paypalSdkCurrency} to ${orderCurrency}. Refresh and try again.`
          );
        }

        if (!order?.orderId) {
          throw new Error('PayPal order id was missing from API response.');
        }

        return order.orderId;
      },
      onApprove: async (data) => {
        const approvedOrderId = String(data?.orderID || '').trim();
        await finalizeApprovedOrder(approvedOrderId);
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
    finalizeApprovedOrder,
    navigate,
    paypalSdkCurrency,
    selectedPlan?.code,
  ]);

  return (
    <>
      <PageBackground />
      <Header showNav={false} />
      <main className="section section-shell checkout-main">
        <section className="checkout-wrap">
          <p className="eyebrow">Company Admin Subscription</p>
          <h1>Complete payment</h1>
          <p>
            Your payment confirms the company admin subscription and completes provisioning.
          </p>

          <ol className="checkout-stepper" role="list">
            {CHECKOUT_STEPS.map((step, index) => {
              const isComplete = index < activeStepIndex;
              const isActive = index === activeStepIndex;
              return (
                <li
                  key={step.key}
                  className={`checkout-step${isComplete ? ' is-complete' : ''}${isActive ? ' is-active' : ''}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className="checkout-step-index">{index + 1}</span>
                  <span className="checkout-step-label">{step.label}</span>
                </li>
              );
            })}
          </ol>

          <div className="checkout-grid checkout-grid-payment">
            <article className="checkout-panel checkout-panel-payment">
              <h2>Payment</h2>

              {!paypalClientId ? (
                <p className="form-message error">
                  Missing VITE_PAYPAL_CLIENT_ID. Add it to your frontend environment.
                </p>
              ) : null}

              <div className="checkout-paypal-panel" aria-busy={isCapturing}>
                <div className="checkout-paypal-slot" ref={paypalButtonsRef} />

                {!isPayPalSdkReady && paypalClientId ? (
                  <small className="checkout-paypal-hint">Loading PayPal checkout...</small>
                ) : null}
              </div>

              {approvedOrderId ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => finalizeApprovedOrder(approvedOrderId)}
                  disabled={isCapturing}
                >
                  Retry finalization
                </button>
              ) : null}
            </article>
          </div>

          <p className={`form-message ${messageType}`} aria-live="polite">
            {message}
          </p>
        </section>
      </main>
    </>
  );
}
