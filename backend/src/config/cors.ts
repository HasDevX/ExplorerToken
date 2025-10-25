import cors from 'cors';
import { env } from '@/config/env';

// Build CORS configs
const allowlist = env.CORS_ALLOW_ORIGINS; // array from env

/** Public CORS for explorer endpoints (open to all origins) */
export const publicCors = cors({ origin: '*' });

/** Strict CORS for auth/admin endpoints (restricted to allowlist) */
export const strictCors = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow same-origin/dev tools
    return cb(null, allowlist.includes(origin));
  },
  credentials: false,
});
