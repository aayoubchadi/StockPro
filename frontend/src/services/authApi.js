const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function resolveErrorMessage(payload, fallback) {
  return payload?.error?.message || fallback;
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

  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, 'Login failed'));
  }

  return payload?.data;
}

export async function logoutRequest({ accessToken, refreshToken }) {
  if (!accessToken) {
    return;
  }

  await fetch(`${API_BASE}/api/v1/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken }),
  });
}
