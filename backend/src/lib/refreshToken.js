import { createHash, randomBytes } from 'node:crypto';

export function generateRefreshToken() {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token) {
  return createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}
