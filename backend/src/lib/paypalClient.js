import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from './httpError.js';

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

function ensurePayPalConfigured() {
  if (!env.isPayPalConfigured) {
    throw new HttpError(
      503,
      'PAYPAL_NOT_CONFIGURED',
      'PayPal integration is not configured on the server'
    );
  }
}

function formatPayPalError(payload, fallbackMessage) {
  const details = [];

  if (payload?.name) {
    details.push(`name=${payload.name}`);
  }

  if (payload?.debug_id) {
    details.push(`debug_id=${payload.debug_id}`);
  }

  if (Array.isArray(payload?.details) && payload.details.length > 0) {
    const firstIssue = payload.details[0];

    if (firstIssue?.issue) {
      details.push(`issue=${firstIssue.issue}`);
    }

    if (firstIssue?.description) {
      details.push(firstIssue.description);
    }
  }

  return {
    message: payload?.message || fallbackMessage,
    details,
  };
}

function errorHasPayPalIssue(error, issueCode) {
  const normalizedIssueCode = String(issueCode || '').trim().toUpperCase();

  if (!normalizedIssueCode || !Array.isArray(error?.details)) {
    return false;
  }

  return error.details.some((detail) => {
    const normalizedDetail = String(detail || '').trim().toUpperCase();
    return normalizedDetail === `ISSUE=${normalizedIssueCode}`;
  });
}

async function fetchPayPalAccessToken() {
  ensurePayPalConfigured();

  const now = Date.now();

  if (cachedAccessToken && cachedAccessTokenExpiresAt - 30_000 > now) {
    return cachedAccessToken;
  }

  const basicAuth = Buffer.from(
    `${env.paypalClientId}:${env.paypalClientSecret}`
  ).toString('base64');

  const response = await fetch(`${env.paypalApiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.access_token) {
    const parsed = formatPayPalError(payload, 'Unable to authenticate with PayPal');

    throw new HttpError(502, 'PAYPAL_AUTH_FAILED', parsed.message, parsed.details);
  }

  const expiresInSeconds = Number(payload.expires_in || 0);
  cachedAccessToken = payload.access_token;
  cachedAccessTokenExpiresAt = now + Math.max(30_000, expiresInSeconds * 1000);

  return cachedAccessToken;
}

async function paypalApiRequest(path, { method = 'GET', body, requestId } = {}) {
  const accessToken = await fetchPayPalAccessToken();

  const response = await fetch(`${env.paypalApiBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': requestId || randomUUID(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = formatPayPalError(payload, 'PayPal request failed');

    throw new HttpError(502, 'PAYPAL_API_ERROR', parsed.message, parsed.details);
  }

  return payload;
}

export async function createPayPalOrder({
  amountCents,
  currencyCode = 'EUR',
  description,
  customId,
  intent = 'CAPTURE',
}) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new HttpError(
      400,
      'PAYPAL_ORDER_INVALID_AMOUNT',
      'amountCents must be a positive integer'
    );
  }

  const normalizedIntent = String(intent || 'CAPTURE').toUpperCase();
  if (normalizedIntent !== 'CAPTURE' && normalizedIntent !== 'AUTHORIZE') {
    throw new HttpError(
      400,
      'PAYPAL_ORDER_INVALID_INTENT',
      'intent must be CAPTURE or AUTHORIZE'
    );
  }

  const normalizedCurrencyCode = String(currencyCode || 'EUR').toUpperCase();
  const orderAmount = (amountCents / 100).toFixed(2);

  const payload = await paypalApiRequest('/v2/checkout/orders', {
    method: 'POST',
    body: {
      intent: normalizedIntent,
      purchase_units: [
        {
          custom_id: customId,
          description,
          amount: {
            currency_code: normalizedCurrencyCode,
            value: orderAmount,
          },
        },
      ],
      application_context: {
        brand_name: 'StockPro',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    },
  });

  const approveLink = Array.isArray(payload?.links)
    ? payload.links.find((link) => link?.rel === 'approve')?.href || null
    : null;

  return {
    id: payload?.id || null,
    status: payload?.status || null,
    approveLink,
    raw: payload,
  };
}

export async function authorizePayPalOrder(orderId) {
  const normalizedOrderId = String(orderId || '').trim();

  if (!normalizedOrderId) {
    throw new HttpError(400, 'PAYPAL_ORDER_ID_REQUIRED', 'orderId is required');
  }

  const payload = await paypalApiRequest(
    `/v2/checkout/orders/${encodeURIComponent(normalizedOrderId)}/authorize`,
    {
      method: 'POST',
      body: {},
      requestId: normalizedOrderId,
    }
  );

  return {
    id: payload?.id || normalizedOrderId,
    status: payload?.status || null,
    raw: payload,
  };
}

export async function voidPayPalAuthorization(authorizationId) {
  const normalizedAuthorizationId = String(authorizationId || '').trim();

  if (!normalizedAuthorizationId) {
    throw new HttpError(
      400,
      'PAYPAL_AUTHORIZATION_ID_REQUIRED',
      'authorizationId is required'
    );
  }

  const accessToken = await fetchPayPalAccessToken();

  const response = await fetch(
    `${env.paypalApiBase}/v2/payments/authorizations/${encodeURIComponent(
      normalizedAuthorizationId
    )}/void`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': randomUUID(),
      },
      body: '{}',
    }
  );

  if (response.status === 204) {
    return {
      status: 'VOIDED',
      raw: null,
    };
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = formatPayPalError(payload, 'Failed to void PayPal authorization');

    throw new HttpError(502, 'PAYPAL_API_ERROR', parsed.message, parsed.details);
  }

  return {
    status: payload?.status || 'VOIDED',
    raw: payload,
  };
}

export async function getPayPalOrder(orderId) {
  const normalizedOrderId = String(orderId || '').trim();

  if (!normalizedOrderId) {
    throw new HttpError(400, 'PAYPAL_ORDER_ID_REQUIRED', 'orderId is required');
  }

  const payload = await paypalApiRequest(
    `/v2/checkout/orders/${encodeURIComponent(normalizedOrderId)}`,
    {
      method: 'GET',
    }
  );

  return {
    id: payload?.id || normalizedOrderId,
    status: payload?.status || null,
    raw: payload,
  };
}

export async function capturePayPalOrder(orderId) {
  const normalizedOrderId = String(orderId || '').trim();

  if (!normalizedOrderId) {
    throw new HttpError(400, 'PAYPAL_ORDER_ID_REQUIRED', 'orderId is required');
  }

  let payload;

  try {
    payload = await paypalApiRequest(
      `/v2/checkout/orders/${encodeURIComponent(normalizedOrderId)}/capture`,
      {
        method: 'POST',
        body: {},
        requestId: normalizedOrderId,
      }
    );
  } catch (error) {
    if (
      error?.code === 'PAYPAL_API_ERROR' &&
      errorHasPayPalIssue(error, 'ORDER_ALREADY_CAPTURED')
    ) {
      const existingOrder = await getPayPalOrder(normalizedOrderId);

      return {
        id: existingOrder.id,
        status: existingOrder.status,
        raw: existingOrder.raw,
      };
    }

    throw error;
  }

  return {
    id: payload?.id || normalizedOrderId,
    status: payload?.status || null,
    raw: payload,
  };
}
