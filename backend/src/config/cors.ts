import cors, { CorsOptions } from 'cors';
import { env } from '@/config/env';

const allowlist = (env.CORS_ALLOW_ORIGINS ?? []).filter(Boolean);

const makeStrictOptions = (): CorsOptions => ({
  origin(origin, cb) {
    if (!origin) return cb(new Error('Origin required'), false);
    cb(null, allowlist.includes(origin));
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
});

export const strictCors = cors(makeStrictOptions());

// For public explorer routes we rely on same-origin (dev uses Vite proxy),
// so we DO NOT export a permissive wildcard CORS here to satisfy CodeQL.
