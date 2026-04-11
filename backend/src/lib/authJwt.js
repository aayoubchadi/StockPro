import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

export function signAccessToken({ sub, role, scope, companyId = null, email }) {
  const payload = {
    scope,
    role,
    email,
  };

  if (companyId) {
    payload.companyId = companyId;
  }

  return jwt.sign(payload, env.jwtAccessSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtAccessTtlSeconds,
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
    subject: sub,
    jwtid: randomUUID(),
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret, {
    algorithms: ['HS256'],
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
  });
}
