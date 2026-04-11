import { verifyAccessToken } from '../lib/authJwt.js';
import { HttpError } from '../lib/httpError.js';
import { isAccessTokenRevoked } from '../lib/accessTokenBlacklist.js';

function readBearerToken(authorizationHeader) {
  const value = String(authorizationHeader || '').trim();

  if (!value || !value.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const token = value.slice(7).trim();
  return token || null;
}

export async function requireAuth(request, _response, next) {
  try {
    const token = readBearerToken(request.headers.authorization);

    if (!token) {
      throw new HttpError(401, 'AUTH_TOKEN_INVALID', 'Missing or invalid bearer token');
    }

    let claims;

    try {
      claims = verifyAccessToken(token);
    } catch (error) {
      if (error?.name === 'TokenExpiredError') {
        throw new HttpError(401, 'AUTH_TOKEN_EXPIRED', 'Token has expired');
      }

      throw new HttpError(401, 'AUTH_TOKEN_INVALID', 'Invalid access token');
    }

    if (!claims?.sub || !claims?.jti) {
      throw new HttpError(401, 'AUTH_TOKEN_INVALID', 'Invalid access token claims');
    }

    const revoked = await isAccessTokenRevoked(claims.jti);

    if (revoked) {
      throw new HttpError(401, 'AUTH_TOKEN_INVALID', 'Token is revoked');
    }

    request.auth = {
      userId: claims.sub,
      tokenId: claims.jti,
      scope: claims.scope,
      role: claims.role,
      companyId: claims.companyId || null,
      email: claims.email,
      rawClaims: claims,
    };

    next();
  } catch (error) {
    next(error);
  }
}
