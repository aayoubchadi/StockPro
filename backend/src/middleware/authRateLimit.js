import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const loginRateLimiter = rateLimit({
  windowMs: env.authRateLimitLoginWindowMs,
  max: env.authRateLimitLoginMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'AUTH_RATE_LIMITED',
      message: 'Too many login attempts. Please try again later.',
      details: [],
    },
  },
});

export const registerRateLimiter = rateLimit({
  windowMs: env.authRateLimitRegisterWindowMs,
  max: env.authRateLimitRegisterMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'AUTH_RATE_LIMITED',
      message: 'Too many register attempts. Please try again later.',
      details: [],
    },
  },
});

export const refreshRateLimiter = rateLimit({
  windowMs: env.authRateLimitRefreshWindowMs,
  max: env.authRateLimitRefreshMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'AUTH_RATE_LIMITED',
      message: 'Too many refresh attempts. Please try again later.',
      details: [],
    },
  },
});
