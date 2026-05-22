import { clearSession } from '../lib/authStore';

const API_BASE_CANDIDATES = Array.from(
  new Set(
    [
      import.meta.env.VITE_API_BASE_URL,
      'http://localhost:5001',
      'http://localhost:5010',
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  )
);

const FALLBACK_STATUS_CODES = new Set([404, 502, 503, 504]);
const AUTH_ERROR_CODES = new Set(['AUTH_TOKEN_EXPIRED', 'AUTH_TOKEN_INVALID']);
let isHandlingAuthFailure = false;

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function resolveErrorMessage(payload, fallback) {
  const baseMessage = payload?.error?.message || fallback;
  const details = Array.isArray(payload?.error?.details)
    ? payload.error.details.filter(Boolean)
    : [];

  if (details.length === 0) {
    return baseMessage;
  }

  return `${baseMessage}: ${details.join(', ')}`;
}

function readAuthHeader(headers) {
  if (!headers) {
    return '';
  }

  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return String(headers.get('Authorization') || headers.get('authorization') || '');
  }

  if (typeof headers === 'object') {
    return String(headers.Authorization || headers.authorization || '');
  }

  return '';
}

function extractErrorCode(payload) {
  if (!payload) {
    return '';
  }

  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      return String(parsed?.error?.code || '');
    } catch {
      return '';
    }
  }

  return String(payload?.error?.code || '');
}

function handleAuthFailure({ response, payload, options }) {
  if (response.status !== 401) {
    return;
  }

  const authHeader = readAuthHeader(options?.headers);
  if (!authHeader) {
    return;
  }

  const errorCode = extractErrorCode(payload);
  if (!AUTH_ERROR_CODES.has(errorCode)) {
    return;
  }

  if (isHandlingAuthFailure) {
    return;
  }

  isHandlingAuthFailure = true;
  clearSession();
  if (typeof window !== 'undefined') {
    window.location.replace('/login');
  }
}

function shouldRetryWithNextBase({ response, payload }) {
  if (response.ok) {
    return false;
  }

  if (FALLBACK_STATUS_CODES.has(response.status)) {
    return true;
  }

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();

  if (!contentType.includes('application/json')) {
    return true;
  }

  return !payload || (!payload.error && !payload.data);
}

async function fetchApiEndpoint(path, options) {
  let lastResponse = null;
  let lastPayload = null;
  let lastError = null;

  for (let index = 0; index < API_BASE_CANDIDATES.length; index += 1) {
    const apiBase = API_BASE_CANDIDATES[index];
    const hasNextCandidate = index < API_BASE_CANDIDATES.length - 1;

    try {
      const response = await fetch(`${apiBase}${path}`, options);
      const payload = await parseJsonSafe(response);

      handleAuthFailure({ response, payload, options });

      lastResponse = response;
      lastPayload = payload;

      if (hasNextCandidate && shouldRetryWithNextBase({ response, payload })) {
        continue;
      }

      return {
        response,
        payload,
      };
    } catch (error) {
      lastError = error;

      if (!hasNextCandidate) {
        throw error;
      }
    }
  }

  if (lastResponse) {
    return {
      response: lastResponse,
      payload: lastPayload,
    };
  }

  throw lastError || new Error('Unable to reach API service');
}

export async function getBillingPlans() {
  const { response, payload } = await fetchApiEndpoint('/api/v1/billing/plans', {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to load billing plans'));
  }

  return payload?.data?.plans || [];
}

export async function createPayPalOrder({ planCode }) {
  const { response, payload } = await fetchApiEndpoint('/api/v1/billing/paypal/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ planCode }),
  });

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to create PayPal order'));
  }

  return payload?.data;
}

export async function getPayPalCheckoutMetadata({ planCode }) {
  const normalizedPlanCode = String(planCode || '').trim();

  if (!normalizedPlanCode) {
    throw new Error('Plan code is required');
  }

  const { response, payload } = await fetchApiEndpoint(
    `/api/v1/billing/paypal/checkout-metadata?planCode=${encodeURIComponent(normalizedPlanCode)}`,
    {
      method: 'GET',
    }
  );

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to load PayPal checkout metadata'));
  }

  return payload?.data;
}

export async function capturePayPalOrderAndCreateAdmin({
  orderId,
  planCode,
  companyName,
  companySlug,
  adminUsername,
  adminFullName,
  adminEmail,
  adminPassword,
}) {
  const { response, payload } = await fetchApiEndpoint(
    `/api/v1/billing/paypal/orders/${encodeURIComponent(orderId)}/capture`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planCode,
        companyName,
        companySlug,
        adminUsername,
        adminFullName,
        adminEmail,
        adminPassword,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to capture PayPal payment'));
  }

  return payload?.data;
}

export async function getDashboardOverview({ accessToken }) {
  const headers = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const { response, payload } = await fetchApiEndpoint('/api/v1/dashboard/overview', {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to load dashboard data'));
  }

  return payload?.data;
}

export async function approveJoinRequest({ accessToken, requestId }) {
  if (!requestId) {
    throw new Error('Request id is required');
  }

  const { response, payload } = await fetchApiEndpoint(
    `/api/v1/company/join-requests/${encodeURIComponent(requestId)}/approve`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to approve request'));
  }

  return payload?.data;
}

export async function rejectJoinRequest({ accessToken, requestId }) {
  if (!requestId) {
    throw new Error('Request id is required');
  }

  const { response, payload } = await fetchApiEndpoint(
    `/api/v1/company/join-requests/${encodeURIComponent(requestId)}/reject`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to reject request'));
  }

  return payload?.data;
}


export async function createDemoVerificationOrder() {
  const { response, payload } = await fetchApiEndpoint('/api/v1/billing/demo/paypal/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to create demo verification order'));
  }

  return payload?.data;
}

export async function verifyDemoPayPalOrder({
  orderId,
  companyName,
  companySlug,
  adminUsername,
  adminFullName,
  adminEmail,
  adminPassword,
}) {
  const { response, payload } = await fetchApiEndpoint(
    `/api/v1/billing/demo/paypal/orders/${encodeURIComponent(orderId)}/verify`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyName,
        companySlug,
        adminUsername,
        adminFullName,
        adminEmail,
        adminPassword,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to verify demo checkout'));
  }

  return payload?.data;
}
