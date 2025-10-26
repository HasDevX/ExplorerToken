import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';
const WINDOW_MS = Number(process.env.RATE_WINDOW_MS ?? 60_000);
const LOGIN_MAX = Number(process.env.LOGIN_MAX ?? (isTest ? 100000 : 10));
const ADMIN_READ_MAX = Number(process.env.ADMIN_READ_MAX ?? (isTest ? 100000 : 120));
const ADMIN_WRITE_MAX = Number(process.env.ADMIN_WRITE_MAX ?? (isTest ? 100000 : 30));

/** Limit brute-force on login specifically */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
  handler: (req, res) => {
    res.set('Retry-After', String(Math.ceil(15 * 60))); // 15 minutes in seconds
    res.status(429).json({ error: 'Too many login attempts, please try again later.' });
  },
});

/** Admin reads (settings) */
export const adminReadLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: ADMIN_READ_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Admin writes (apikey/settings/cache clear) */
export const adminWriteLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: ADMIN_WRITE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests, slow down.' },
});
