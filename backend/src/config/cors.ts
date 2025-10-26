import cors, { CorsOptions, CorsOptionsDelegate, CorsRequest } from 'cors';

// Example: allowlist from env CSV (e.g., "https://haswork.dev,https://www.haswork.dev")
const ALLOWLIST = (process.env.FRONTEND_URL ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowSet = new Set(ALLOWLIST);

// Delegate lets us decide per-request
export const corsOptionsDelegate: CorsOptionsDelegate<CorsRequest> = (req, callback) => {
  const originHeader = typeof req.headers?.origin === 'string' ? req.headers.origin : undefined;

  // Accept requests with no Origin (curl/cron/server-to-server)
  if (!originHeader) {
    const opts: CorsOptions = { origin: true, credentials: true };
    return callback(null, opts);
  }

  // Browser requests: allow only allow-listed origins
  const allowed = allowSet.size === 0 || allowSet.has(originHeader);
  const opts: CorsOptions = { origin: allowed ? originHeader : false, credentials: true };
  return callback(null, opts);
};

// Strict CORS for admin/auth routes
export const strictCors = cors(corsOptionsDelegate);

// Public/open CORS for explorer routes (chains, token, tx, address) if needed
export const publicCors = cors({ origin: true });
