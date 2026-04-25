import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import {
  createDemoVerificationOrder,
  verifyDemoPayPalOrder,
} from '../services/platformApi';
import { saveSession, getDashboardPathForRole } from '../lib/authStore';

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export default function DemoOnboardingPage() {
  const navigate = useNavigate();
  const paypalButtonsRef = useRef(null);
  const paypalButtonsInstanceRef = useRef(null);
  const formRef = useRef(null);
  const [isPayPalReady, setIsPayPalReady] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [form, setForm] = useState({
    companyName: '',
    companySlug: '',
    adminFullName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const paypalClientId = String(import.meta.env.VITE_PAYPAL_CLIENT_ID || '').trim();
  const isFormReady = useMemo(
    () =>
      Boolean(
        form.companyName.trim() &&
        form.adminFullName.trim() &&
        form.adminEmail.trim() &&
        form.adminPassword
      ),
    [form]
  );

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    if (!paypalClientId) {
      return undefined;
    }

    let isActive = true;
    const scriptId = 'paypal-js-sdk-demo';
    const sdkSrc = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      paypalClientId
    )}&currency=USD&intent=authorize&components=buttons`;

    const markReady = () => {
      if (isActive) {
        setIsPayPalReady(true);
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
      setMessage('Failed to load PayPal SDK.');
      setMessageType('error');
    };

    document.head.appendChild(script);

    return () => {
      isActive = false;
    };
  }, [paypalClientId]);

  useEffect(() => {
    if (!isPayPalReady || !window.paypal?.Buttons || !paypalButtonsRef.current) {
      return undefined;
    }

    if (paypalButtonsInstanceRef.current?.close) {
      paypalButtonsInstanceRef.current.close();
    }

    paypalButtonsRef.current.innerHTML = '';

    const buttons = window.paypal.Buttons({
      style: {
        shape: 'pill',
        layout: 'vertical',
        label: 'paypal',
        height: 44,
      },
      onClick: (_data, actions) => {
        if (!isFormReady) {
          setMessage('Complete all form fields before verification.');
          setMessageType('error');
          return actions.reject();
        }

        setMessage('');
        setMessageType('');
        return actions.resolve();
      },
      createOrder: async () => {
        const order = await createDemoVerificationOrder();
        if (!order?.orderId) {
          throw new Error('Missing PayPal demo order id.');
        }
        return order.orderId;
      },
      onApprove: async (data) => {
        const orderId = String(data?.orderID || '').trim();
        if (!orderId) {
          setMessage('PayPal did not return an order id.');
          setMessageType('error');
          return;
        }

        setIsVerifying(true);
        setMessage('Verifying your $1 hold and creating demo workspace...');
        setMessageType('');

        try {
          const currentForm = formRef.current || form;
          const verified = await verifyDemoPayPalOrder({
            orderId,
            companyName: currentForm.companyName,
            companySlug: currentForm.companySlug || slugify(currentForm.companyName),
            adminFullName: currentForm.adminFullName,
            adminEmail: currentForm.adminEmail.trim().toLowerCase(),
            adminPassword: currentForm.adminPassword,
          });

          saveSession({
            accessToken: verified.accessToken,
            refreshToken: verified.refreshToken,
            tokenType: verified.tokenType,
            expiresIn: verified.expiresIn,
            refreshExpiresIn: verified.refreshExpiresIn,
            user: verified.user,
            email: verified.user?.email || currentForm.adminEmail.trim().toLowerCase(),
            fullName: verified.user?.fullName || currentForm.adminFullName,
            role: verified.user?.role || 'company_admin',
            scope: verified.user?.scope || 'tenant',
            companyId: verified.user?.companyId || verified.company?.id || null,
            permissions: verified.user?.permissions || {},
            effectivePermissions: verified.user?.effectivePermissions || {},
          });

          setMessage('Demo workspace is ready. Redirecting...');
          setMessageType('success');

          window.setTimeout(() => {
            navigate(getDashboardPathForRole(verified.user?.role || 'company_admin'));
          }, 700);
        } catch (error) {
          setMessage(error.message || 'Demo verification failed.');
          setMessageType('error');
        } finally {
          setIsVerifying(false);
        }
      },
      onError: (error) => {
        setMessage(error?.message || 'PayPal verification failed.');
        setMessageType('error');
        setIsVerifying(false);
      },
      onCancel: () => {
        setMessage('Demo verification was canceled.');
        setMessageType('error');
        setIsVerifying(false);
      },
    });

    buttons.render(paypalButtonsRef.current);
    paypalButtonsInstanceRef.current = buttons;

    return () => {
      if (paypalButtonsInstanceRef.current?.close) {
        paypalButtonsInstanceRef.current.close();
      }
      paypalButtonsInstanceRef.current = null;
    };
  }, [form, isFormReady, isPayPalReady, navigate]);

  return (
    <>
      <PageBackground />
      <Header showNav={false} />
      <main className="section section-shell checkout-main">
        <section className="checkout-wrap">
          <p className="eyebrow">Free Demo</p>
          <h1>Start your 14-day demo workspace</h1>
          <p>
            Demo access is free. A temporary <strong>$1 authorization</strong> is used for anti-bot verification and released immediately after verification.
          </p>

          <div className="checkout-grid">
            <article className="checkout-panel">
              <h2>Company and admin setup</h2>
              <form className="checkout-form" onSubmit={(event) => event.preventDefault()}>
                <label>
                  Company name
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, companyName: event.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  Company slug (optional)
                  <input
                    type="text"
                    value={form.companySlug}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, companySlug: slugify(event.target.value) }))
                    }
                  />
                </label>
                <label>
                  Admin full name
                  <input
                    type="text"
                    value={form.adminFullName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, adminFullName: event.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  Admin email
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, adminEmail: event.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  Admin password
                  <input
                    type="password"
                    value={form.adminPassword}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, adminPassword: event.target.value }))
                    }
                    required
                  />
                </label>
              </form>
            </article>

            <aside className="checkout-panel checkout-summary-panel">
              <h2>Demo verification</h2>
              <div className="checkout-summary-row">
                <span>Plan price</span>
                <strong>$0.00</strong>
              </div>
              <div className="checkout-summary-row">
                <span>Verification hold</span>
                <strong>$1.00 temporary</strong>
              </div>
              <div className="checkout-summary-row">
                <span>Demo duration</span>
                <strong>14 days</strong>
              </div>

              <div className="checkout-paypal-slot" ref={paypalButtonsRef} aria-busy={isVerifying} />
              {!paypalClientId ? (
                <small className="checkout-paypal-hint">
                  Missing `VITE_PAYPAL_CLIENT_ID` in frontend environment.
                </small>
              ) : null}
              {!isPayPalReady && paypalClientId ? (
                <small className="checkout-paypal-hint">Loading PayPal checkout...</small>
              ) : null}
            </aside>
          </div>

          {message ? <p className={`form-message ${messageType}`}>{message}</p> : null}
        </section>
      </main>
    </>
  );
}
