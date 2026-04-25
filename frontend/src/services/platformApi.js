const API_BASE_CANDIDATES = Array.from(
  new Set(
    [
      import.meta.env.VITE_API_BASE_URL,
      'http://localhost:5000',
      'http://localhost:5010',
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  )
);

const FALLBACK_STATUS_CODES = new Set([404, 502, 503, 504]);

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

export async function capturePayPalOrderAndCreateAdmin({
  orderId,
  planCode,
  companyName,
  companySlug,
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
