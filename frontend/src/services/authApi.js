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

async function fetchAuthEndpoint(path, options) {
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

  throw lastError || new Error('Unable to reach authentication service');
}

export async function loginRequest({ email, password, accountScope, companyId }) {
  const body = {
    email,
    password,
  };

  if (accountScope) {
    body.accountScope = accountScope;
  }

  if (companyId) {
    body.companyId = companyId;
  }

  const { response, payload } = await fetchAuthEndpoint('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Login failed'));
  }

  return payload?.data;
}

export async function googleLoginRequest({ idToken, accountScope, companyId }) {
  const body = {
    idToken,
  };

  if (accountScope) {
    body.accountScope = accountScope;
  }

  if (companyId) {
    body.companyId = companyId;
  }

  const { response, payload } = await fetchAuthEndpoint('/api/v1/auth/login/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Google login failed'));
  }

  return payload?.data;
}

export async function registerRequest({ companyId, fullName, email, password, role }) {
  const body = {
    companyId,
    fullName,
    email,
    password,
  };

  if (role) {
    body.role = role;
  }

  const { response, payload } = await fetchAuthEndpoint('/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Create account failed'));
  }

  return payload?.data;
}

export async function registerGoogleRequest({ idToken, companyId }) {
  const body = {
    idToken,
  };

  if (companyId) {
    body.companyId = companyId;
  }

  const { response, payload } = await fetchAuthEndpoint('/api/v1/auth/register/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Google sign-up failed'));
  }

  return payload?.data;
}

export async function logoutRequest({ accessToken, refreshToken }) {
  if (!accessToken) {
    return;
  }

  await fetchAuthEndpoint('/api/v1/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken }),
  });
}
