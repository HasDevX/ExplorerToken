# ExplorerToken

A self-hosted, low-cost multi-chain token explorer with a PolygonScan-like UI for 10 EVM chains.

## Overview

ExplorerToken provides a lightweight token explorer solution that leverages Etherscan API v2 across multiple chains without the need for heavy indexers. The platform offers comprehensive token and transaction data with an intuitive user interface.

### Key Features

- **Multi-chain Support**: Explore tokens across 10 EVM-compatible chains
- **Comprehensive Data**: Transfers, Holders, Token Info, Contract details, Analytics, and full transaction details
- **Chain Badges**: Visual identification of different blockchain networks
- **Admin Dashboard**: Manage API keys, chains, cache settings, and view metrics
- **Low Resource Usage**: No heavy indexing infrastructure required

### Data Source

All blockchain data is fetched from Etherscan API v2 (https://api.etherscan.io/v2/api) using `chainid` and `apikey` query parameters. No local indexing or blockchain nodes required.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│              (React + Vite + TypeScript + Tailwind)         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Pages: Home/Search, Address View, Tx Details,       │  │
│  │         Admin Login, Dashboard                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
│              (Node.js + Express + TypeScript)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • Etherscan API v2 Proxy & Normalizer              │  │
│  │  • JWT Authentication (Admin)                        │  │
│  │  • Rate Limiting (Per-IP)                            │  │
│  │  • Caching Layer (Redis/NodeCache)                   │  │
│  │  • Basic Metrics & Usage Logging                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │                           │
          │                           │
          ▼                           ▼
┌──────────────────────┐    ┌──────────────────────┐
│    PostgreSQL        │    │    Redis Cache       │
│                      │    │    (Optional)        │
│  • Settings          │    │                      │
│  • Admin Users       │    │  Fallback:           │
│  • API Usage Logs    │    │  NodeCache           │
│  • Analytics Cache   │    │  (In-Process)        │
└──────────────────────┘    └──────────────────────┘
```

### Component Responsibilities

**Backend**

- Acts as a proxy to Etherscan API v2
- Normalizes upstream responses into consistent DTOs
- Implements JWT-based admin authentication
- Provides caching (Redis preferred, NodeCache fallback)
- Enforces per-IP rate limiting
- Tracks basic usage metrics

**Frontend**

- Explorer UI for viewing token transfers, holders, and details
- Admin dashboard for configuration management
- Chain-aware interface with visual badges
- React Query for efficient data fetching

**Database (PostgreSQL)**

- Stores application settings and configuration
- Manages admin user credentials
- Logs API usage metrics
- Caches analytics data
- Schema migrations are plain SQL files in `backend/migrations/` executed in order

**Cache Layer**

- Redis (optional, recommended for production)
- NodeCache (in-process fallback)
- TTL configured via admin dashboard

### First-Run Setup (Backend)

The backend requires initial configuration before it can serve explorer endpoints. On first deployment:

#### 1. Database Setup

Run the database migrations to create required tables:

```bash
cd backend
npm run migrate
```

This creates:
- `settings` table: Stores Etherscan API key, enabled chains, and cache configuration
- `admin_users` table: Stores admin credentials (bcrypt-hashed passwords)
- Other supporting tables for analytics and logging

#### 2. Environment Variables

Ensure your `backend/.env` file has the required variables (see `backend/.env.sample`):

```bash
PORT=4000
JWT_SECRET=your-secure-random-secret-at-least-16-chars
DATABASE_URL=postgresql://user:password@localhost:5432/explorer
REDIS_URL=redis://localhost:6379  # Optional
CACHE_DEFAULT_TTL=60
RATE_LIMIT_PER_MIN=60
ETHERSCAN_API_KEY=__set_in_runtime_or_secrets__
```

**Important:** `ETHERSCAN_API_KEY` can be left as a placeholder in the `.env` file—you'll configure it via the setup API.

#### 3. Start the Backend

```bash
npm run dev
# Server starts on http://localhost:4000
```

#### 4. Complete Setup via API

Before the setup is complete, only the `/api/setup/*` and `/health` endpoints are available.

**Check setup status:**
```bash
curl http://localhost:4000/api/setup/state
# Response: { "setup": false }
```

**Complete setup:**
```bash
curl -X POST http://localhost:4000/api/setup/complete \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_ETHERSCAN_API_KEY",
    "chains": [
      { "id": 1, "name": "Ethereum" },
      { "id": 137, "name": "Polygon" }
    ],
    "admin": {
      "username": "admin",
      "password": "SecurePassword123"
    },
    "cacheTtl": 60
  }'
# Response: { "message": "Setup completed successfully" }
```

After successful setup:
- The `setup_complete` flag is set to `true`
- All API endpoints become available
- The admin user can log in to manage settings

#### 5. Admin Login

After setup, log in to get a JWT token:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "SecurePassword123"
  }'
# Response: { "token": "eyJhbGciOiJIUzI1NiIs..." }
```

Use the token in subsequent admin requests:

```bash
# Get settings
curl http://localhost:4000/api/admin/settings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update API key
curl -X PUT http://localhost:4000/api/admin/apikey \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "apiKey": "NEW_API_KEY" }'

# Clear cache
curl -X POST http://localhost:4000/api/admin/cache/clear \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Note:** The frontend Setup Wizard (coming in the next PR) will provide a UI for these steps.

## Roadmap

- [x] 1. Bootstrap Monorepo & CI
- [ ] 2. Backend Skeleton
- [ ] 3. DB Schema & Migrations
- [ ] 4. Etherscan v2 Client (paths-driven)
- [ ] 5. Explorer API Routes
- [ ] 6. Cache & Rate-Limit
- [ ] 7. Frontend Scaffold
- [ ] 8. Setup Wizard & Admin
- [ ] 9. Docker & Compose
- [ ] 10. Deploy Workflow (SSH)
- [ ] 11. Polish & Security

## Development

### Prerequisites

- Node.js >= 20 (specified in `.nvmrc`)
- npm (comes with Node.js)
- PostgreSQL (for local development)
- Redis (optional, for caching)

### Quick Start

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run linting
npm run lint

# Run tests
npm test

# Run database migrations (see docs/db.md for details)
cd backend
npm run migrate

# Start development servers
npm run dev
```

### Frontend Quick Start

To run the frontend in development mode:

```bash
cd frontend
cp .env.sample .env
npm i
npm run dev
# Frontend will be available at http://localhost:5173
# The Vite proxy forwards /api → http://localhost:4000
```

**Note:** The backend should be running on port 4000 before starting the frontend.

To start the backend:

```bash
cd backend
npm i
cp .env.sample .env
# Put your Etherscan API key in backend/.env (ETHERSCAN_API_KEY)
npm run dev
```

### Workspace Structure

```
/
├── backend/          # Backend API server
├── frontend/         # React frontend application
├── scripts/          # Deployment and utility scripts
├── docs/             # Additional documentation
├── .github/          # GitHub Actions workflows
└── package.json      # Root workspace configuration
```

### Environment Configuration

Both backend and frontend have `.env.sample` files. Copy these to `.env` and configure:

**Backend** (see `backend/.env.sample`):

- `PORT`: Server port
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string (optional)
- `ETHERSCAN_API_KEY`: Your Etherscan API key
- `JWT_SECRET`: Secret for JWT token generation

**Frontend** (see `frontend/.env.sample`):

- `VITE_API_URL`: API base URL (defaults to `/api` which proxies to backend in dev mode)

## Deployment

Deployment is handled via GitHub Actions to a VPS using Docker Compose. See the Deploy Workflow milestone for details.

### Production Environment

- **VPS**: Deployed via SSH (configured in GitHub secrets)
- **Reverse Proxy**: Nginx with SSL
- **Containers**: Docker Compose orchestration
- **Database**: PostgreSQL container with backup scripts
- **Cache**: Redis container (optional)

## Contributing

1. Create a focused branch for your changes
2. Ensure all tests pass: `npm test`
3. Lint your code: `npm run lint:fix`
4. Build successfully: `npm run build`
5. Open a PR with clear description

## License

MIT License - see [LICENSE](LICENSE) file for details

## Security

- Never commit secrets or API keys
- Use `.env` files for local configuration
- Review `.env.sample` files for required variables
- All secrets are managed via environment variables or GitHub Actions secrets
