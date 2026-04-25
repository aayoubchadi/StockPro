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

  if (!contentType.includes('application/json') && !contentType.includes('text/csv')) {
    return true;
  }

  return !payload || (!payload.error && !payload.data);
}

async function fetchApiEndpoint(path, options, responseKind = 'json') {
  let lastResponse = null;
  let lastPayload = null;
  let lastError = null;

  for (let index = 0; index < API_BASE_CANDIDATES.length; index += 1) {
    const apiBase = API_BASE_CANDIDATES[index];
    const hasNextCandidate = index < API_BASE_CANDIDATES.length - 1;

    try {
      const response = await fetch(`${apiBase}${path}`, options);
      let payload = null;

      if (responseKind === 'json') {
        payload = await parseJsonSafe(response);
      } else if (responseKind === 'text') {
        payload = await response.text();
      }

      lastResponse = response;
      lastPayload = payload;

      if (
        hasNextCandidate &&
        responseKind === 'json' &&
        shouldRetryWithNextBase({ response, payload })
      ) {
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

function buildAuthHeaders(accessToken) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export async function getCompanyContext({ accessToken }) {
  const { response, payload } = await fetchApiEndpoint('/api/v1/company/context', {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to load company context'));
  }

  return payload?.data;
}

export async function getCompanyEmployees({ accessToken }) {
  const { response, payload } = await fetchApiEndpoint('/api/v1/company/employees', {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to load employees'));
  }

  return payload?.data;
}

export async function createCompanyEmployee({
  accessToken,
  fullName,
  email,
  password,
  presetKey,
  permissions,
}) {
  const { response, payload } = await fetchApiEndpoint('/api/v1/company/employees', {
    method: 'POST',
    headers: buildAuthHeaders(accessToken),
    body: JSON.stringify({
      fullName,
      email,
      password,
      presetKey,
      permissions,
    }),
  });

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to create employee'));
  }

  return payload?.data;
}

export async function updateCompanyEmployee({
  accessToken,
  employeeId,
  fullName,
  presetKey,
  permissions,
}) {
  const { response, payload } = await fetchApiEndpoint(
    `/api/v1/company/employees/${encodeURIComponent(employeeId)}`,
    {
      method: 'PATCH',
      headers: buildAuthHeaders(accessToken),
      body: JSON.stringify({
        fullName,
        presetKey,
        permissions,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to update employee'));
  }

  return payload?.data;
}

export async function updateCompanyEmployeeStatus({
  accessToken,
  employeeId,
  isActive,
}) {
  const { response, payload } = await fetchApiEndpoint(
    `/api/v1/company/employees/${encodeURIComponent(employeeId)}/status`,
    {
      method: 'PATCH',
      headers: buildAuthHeaders(accessToken),
      body: JSON.stringify({
        isActive,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to update employee status'));
  }

  return payload?.data;
}

export async function getCompanyProducts({ accessToken }) {
  const { response, payload } = await fetchApiEndpoint('/api/v1/company/products', {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to load products'));
  }

  return payload?.data;
}

export async function createCompanyProduct({
  accessToken,
  sku,
  name,
  description,
  unitPrice,
  quantityInStock,
  lowStockThreshold,
  isActive,
}) {
  const { response, payload } = await fetchApiEndpoint('/api/v1/company/products', {
    method: 'POST',
    headers: buildAuthHeaders(accessToken),
    body: JSON.stringify({
      sku,
      name,
      description,
      unitPrice,
      quantityInStock,
      lowStockThreshold,
      isActive,
    }),
  });

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to create product'));
  }

  return payload?.data;
}

export async function updateCompanyProduct({
  accessToken,
  productId,
  updates,
}) {
  const { response, payload } = await fetchApiEndpoint(
    `/api/v1/company/products/${encodeURIComponent(productId)}`,
    {
      method: 'PATCH',
      headers: buildAuthHeaders(accessToken),
      body: JSON.stringify(updates || {}),
    }
  );

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to update product'));
  }

  return payload?.data;
}

export async function moveCompanyProductStock({
  accessToken,
  productId,
  movementType,
  quantity,
  note,
  adjustmentMode,
}) {
  const { response, payload } = await fetchApiEndpoint(
    `/api/v1/company/products/${encodeURIComponent(productId)}/movements`,
    {
      method: 'POST',
      headers: buildAuthHeaders(accessToken),
      body: JSON.stringify({
        movementType,
        quantity,
        note,
        adjustmentMode,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to create stock movement'));
  }

  return payload?.data;
}

export async function exportCompanyProductsCsv({ accessToken }) {
  const { response, payload } = await fetchApiEndpoint(
    '/api/v1/company/products/export.csv',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    'text'
  );

  if (!response.ok) {
    let errorPayload = null;

    try {
      errorPayload = JSON.parse(payload || '{}');
    } catch {
      errorPayload = null;
    }

    throw new Error(resolveErrorMessage(errorPayload, 'Unable to export CSV'));
  }

  return payload || '';
}

export async function importCompanyProductsCsv({ accessToken, csvText }) {
  const { response, payload } = await fetchApiEndpoint('/api/v1/company/products/import.csv', {
    method: 'POST',
    headers: buildAuthHeaders(accessToken),
    body: JSON.stringify({
      csvText,
    }),
  });

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Unable to import CSV'));
  }

  return payload?.data;
}
