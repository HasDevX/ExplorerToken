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

### First-Run Setup

On initial deployment, a setup wizard guides you through:

1. Enter Etherscan API key
2. Select supported chains
3. Create admin user
4. Configure cache TTL settings

## Roadmap

- [x] 1. Bootstrap Monorepo & CI
- [x] 2. Backend Skeleton
- [x] 3. DB Schema & Migrations
- [x] 4. Etherscan v2 Client (paths-driven)
- [x] 5. Explorer API Routes
- [x] 6. Cache & Rate-Limit
- [x] 7. Frontend Scaffold
- [x] 8. Setup Wizard & Admin
- [ ] 9. Docker & Compose
- [ ] 10. Deploy Workflow (SSH)
- [ ] 11. Polish & Security

## First-Time Setup

ExplorerToken includes a built-in setup wizard that runs on first launch:

1. **Start the application** (backend and frontend)
2. **Navigate to the setup wizard** - You'll be automatically redirected to `/setup`
3. **Complete the 4-step wizard**:
   - **Step 1**: Enter your Etherscan API key
   - **Step 2**: Select which blockchain chains to support (10 default EVM chains available)
   - **Step 3**: Create your admin account (username and password, minimum 8 characters)
   - **Step 4**: Configure cache TTL (default: 60 seconds, minimum: 10 seconds)
4. **Submit the setup** - This creates the admin user and initializes the database
5. **Login** - You'll be redirected to `/login` to sign in with your new credentials
6. **Access the dashboard** - Manage your explorer from `/dashboard`

### Admin Dashboard Features

After logging in, the admin dashboard provides:

- **Settings Tab**: Configure supported chains and cache TTL
- **API Key Tab**: Update your Etherscan API key
- **Cache Tab**: Clear the application cache to force fresh data fetching
- **Metrics Tab**: View API usage statistics and analytics

All admin routes are protected with JWT authentication. The JWT token is automatically attached to requests and stored in localStorage.

### Setup State Guard

The application includes a global route guard that:
- Checks `/api/setup/state` on initialization
- Redirects all routes to `/setup` if setup is incomplete
- Allows access to all routes once setup is complete
- No server restart required after completing setup

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
