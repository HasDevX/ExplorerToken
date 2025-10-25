# API Documentation

This document describes the Explorer API endpoints provided by the ExplorerToken backend.

## Base URL

All API endpoints are served under the `/api` prefix.

Example: `http://localhost:4000/api`

## Endpoints

### GET /api/chains

Returns a curated list of supported EVM chains.

**Parameters:** None

**Response:**

```json
[
  { "id": 1, "name": "Ethereum" },
  { "id": 10, "name": "Optimism" },
  { "id": 56, "name": "BNB Smart Chain" },
  { "id": 100, "name": "Gnosis" },
  { "id": 137, "name": "Polygon" },
  { "id": 250, "name": "Fantom" },
  { "id": 43114, "name": "Avalanche C-Chain" },
  { "id": 42161, "name": "Arbitrum One" },
  { "id": 8453, "name": "Base" },
  { "id": 59144, "name": "Linea" }
]
```

**Status Codes:**

- `200 OK` - Success

**Notes:**

- Chain IDs are from widely used registries like [Chainlist](https://chainlist.org)
- These chains are supported by Etherscan V2 API with multi-chain support via the `chainid` parameter

---

### GET /api/address/:chainId/:address/transfers

Returns ERC-20 token transfer events for a specific address on a given chain.

**Path Parameters:**

- `chainId` (integer) - The blockchain chain ID (must be a positive integer)
- `address` (string) - Ethereum address (must be `0x` followed by 40 hexadecimal characters)

**Query Parameters:**

- `page` (integer, optional) - Page number for pagination (default: 1)
- `offset` (integer, optional) - Number of results per page, between 1-100 (default: 25)
- `sort` (string, optional) - Sort order: `asc` or `desc` (default: `desc`)

**Example Request:**

```
GET /api/address/1/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0/transfers?page=1&offset=10&sort=desc
```

**Response:**

```json
{
  "chainId": 1,
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  "page": 1,
  "offset": 10,
  "sort": "desc",
  "data": [
    {
      "hash": "0xabc123...",
      "blockNumber": 12345678,
      "timeStamp": 1609459200,
      "from": "0x123...",
      "to": "0x456...",
      "contractAddress": "0x789...",
      "valueRaw": "1000000000000000000",
      "tokenSymbol": "TEST",
      "tokenName": "Test Token",
      "tokenDecimal": 18
    }
  ]
}
```

**Status Codes:**

- `200 OK` - Success
- `400 Bad Request` - Invalid parameters (invalid chainId, address format, or query parameters)
- `502 Bad Gateway` - Upstream Etherscan API error

**Upstream Mapping:**

- Maps to Etherscan V2 endpoint: `module=account&action=tokentx`
- [Documentation](https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address)

---

### GET /api/token/:chainId/:address/info

Returns token information for a specific contract address.

**Path Parameters:**

- `chainId` (integer) - The blockchain chain ID (must be a positive integer)
- `address` (string) - Token contract address (must be `0x` followed by 40 hexadecimal characters)

**Example Request:**

```
GET /api/token/1/0xdAC17F958D2ee523a2206206994597C13D831ec7/info
```

**Response:**

```json
{
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "totalSupplyRaw": "1000000000000000000000000",
  "name": "Tether USD",
  "symbol": "USDT",
  "decimals": 6
}
```

**Response Fields:**

- `contractAddress` (string) - The token contract address
- `totalSupplyRaw` (string, optional) - Total supply in base units
- `name` (string, optional) - Token name
- `symbol` (string, optional) - Token symbol
- `decimals` (number, optional) - Number of decimal places

**Status Codes:**

- `200 OK` - Success
- `400 Bad Request` - Invalid parameters (invalid chainId or address format)
- `502 Bad Gateway` - Upstream Etherscan API error

**Upstream Mapping:**

- Maps to Etherscan V2 endpoint: `module=stats&action=tokensupply`
- [Documentation](https://docs.etherscan.io/api-endpoints/tokens#get-erc20-token-totalsupply-by-contractaddress)

**Notes:**

- Token metadata (name, symbol, decimals) may not be available for all tokens from the current endpoints
- Additional metadata will be enhanced in future iterations

---

### GET /api/tx/:chainId/:hash

Returns detailed transaction information for a specific transaction hash.

**Path Parameters:**

- `chainId` (integer) - The blockchain chain ID (must be a positive integer)
- `hash` (string) - Transaction hash (must be `0x` followed by 64 hexadecimal characters)

**Example Request:**

```
GET /api/tx/1/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

**Response:**

```json
{
  "hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "blockNumber": 12345678,
  "from": "0x123...",
  "to": "0x456...",
  "valueWei": "1000000000000000000",
  "input": "0x",
  "status": "success",
  "receipt": {
    "gasUsed": "21000",
    "effectiveGasPrice": "1000000000",
    "logs": []
  }
}
```

**Response Fields:**

- `hash` (string) - Transaction hash
- `blockNumber` (number | null) - Block number (null if pending)
- `from` (string) - Sender address
- `to` (string | null) - Recipient address (null for contract creation)
- `valueWei` (string) - Transaction value in wei
- `input` (string) - Transaction input data
- `status` (string, optional) - Transaction status: `success`, `fail`, or `pending`
- `receipt` (object, optional) - Transaction receipt details
  - `gasUsed` (string, optional) - Gas used
  - `effectiveGasPrice` (string, optional) - Effective gas price
  - `logs` (array, optional) - Event logs

**Status Codes:**

- `200 OK` - Success
- `400 Bad Request` - Invalid parameters (invalid chainId or hash format)
- `502 Bad Gateway` - Upstream Etherscan API error

**Upstream Mapping:**
This endpoint aggregates data from three Etherscan V2 endpoints:

1. `module=proxy&action=eth_getTransactionByHash` - Basic transaction data
   - [Documentation](https://docs.etherscan.io/api-endpoints/geth-parity-proxy#eth_gettransactionbyhash)
2. `module=proxy&action=eth_getTransactionReceipt` - Receipt with gas usage and logs
   - [Documentation](https://docs.etherscan.io/api-endpoints/geth-parity-proxy#eth_gettransactionreceipt)
3. `module=transaction&action=getstatus` - Transaction execution status
   - [Documentation](https://docs.etherscan.io/api-endpoints/stats-1#get-transaction-receipt-status)

---

### GET /api/token/:chainId/:address/holders

Returns token holders with pagination for a specific token contract.

**Path Parameters:**

- `chainId` (integer) - The blockchain chain ID (must be a positive integer)
- `address` (string) - Token contract address (must be `0x` followed by 40 hexadecimal characters)

**Query Parameters:**

- `page` (integer, optional) - Page number for pagination (default: 1)
- `offset` (integer, optional) - Number of results per page, between 1-100 (default: 25)

**Example Request:**

```
GET /api/token/1/0xdAC17F958D2ee523a2206206994597C13D831ec7/holders?page=1&offset=25
```

**Response:**

```json
{
  "chainId": 1,
  "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "page": 1,
  "offset": 25,
  "data": [
    {
      "address": "0x1234567890123456789012345678901234567890",
      "balanceRaw": "1000000000000000000000",
      "percent": 10.5
    },
    {
      "address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      "balanceRaw": "500000000000000000000",
      "percent": 5.25
    }
  ]
}
```

**Response Fields:**

- `chainId` (number) - The blockchain chain ID
- `address` (string) - The token contract address
- `page` (number) - Current page number
- `offset` (number) - Number of results per page
- `data` (array) - Array of holder objects
  - `address` (string) - Holder's address
  - `balanceRaw` (string) - Token balance in base units (raw value)
  - `percent` (number, optional) - Percentage of total supply held

**Status Codes:**

- `200 OK` - Success
- `400 Bad Request` - Invalid parameters (invalid chainId, address format, or query parameters)
- `502 Bad Gateway` - Upstream Etherscan API error (including rate limit exceeded)

**Upstream Mapping:**

This endpoint uses a path resolver that:
1. First tries `module=token&action=tokenholderlist` with pagination support
2. Falls back to `module=token&action=topholders` if the vendor expects it

Documentation references:
- Primary endpoint: [tokenholderlist](https://docs.etherscan.io/api-endpoints/tokens#get-token-holder-list-by-contract-address)
- Fallback endpoint: [topholders](https://docs.etherscan.io/api-endpoints/tokens#get-token-holder-list-by-contract-address)

**Cache:**

- Responses are cached for 180 seconds (3 minutes)
- Cache key includes chainId, address, page, and offset for proper pagination

---

## Authentication & Admin Endpoints

The following endpoints require JWT authentication. Include the JWT token in the `Authorization` header as `Bearer <token>`.

### POST /api/setup/complete

Complete the initial setup wizard. This endpoint is only available when setup is not yet complete.

**Request Body:**

```json
{
  "apiKey": "string (required)",
  "chains": [1, 137, ...] (array of positive integers, min 1, max 20),
  "adminUsername": "string (required, min 3 chars, max 50 chars)",
  "adminPassword": "string (required, min 8 chars)",
  "cacheTtl": 60 (number, optional, default 60, min 10)
}
```

**Response:**

```json
{
  "success": true,
  "message": "Setup completed successfully"
}
```

**Status Codes:**

- `200 OK` - Setup completed successfully
- `400 Bad Request` - Invalid data or setup already complete
- `500 Internal Server Error` - Server error

---

### GET /api/setup/state

Check if initial setup has been completed.

**Parameters:** None

**Response:**

```json
{
  "setupComplete": true
}
```

**Status Codes:**

- `200 OK` - Success

---

### POST /api/auth/login

Authenticate an admin user and receive a JWT token.

**Request Body:**

```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin"
  }
}
```

**Note:** The login response returns the user `id` directly from the database. The JWT token payload (used by `/api/auth/me`) contains `userId` mapped from this `id` field.

**Status Codes:**

- `200 OK` - Authentication successful
- `401 Unauthorized` - Invalid credentials
- `400 Bad Request` - Invalid request data

---

### POST /api/auth/logout

Logout the current user. (Client-side token removal)

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Status Codes:**

- `200 OK` - Success

---

### GET /api/auth/me

Get current authenticated user information.

**Headers:**

- `Authorization: Bearer <token>` (required)

**Response:**

```json
{
  "user": {
    "userId": "uuid",
    "username": "admin",
    "role": "admin"
  }
}
```

**Status Codes:**

- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing token

---

### GET /api/admin/settings

Get current application settings.

**Headers:**

- `Authorization: Bearer <token>` (required)

**Response:**

```json
{
  "chains": [1, 10, 137],
  "cacheTtl": 60,
  "apiKeySet": true,
  "apiKeyLastValidated": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**

- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Settings not found

---

### PUT /api/admin/settings

Update application settings.

**Headers:**

- `Authorization: Bearer <token>` (required)

**Request Body:**

```json
{
  "chains": [1, 10, 137, 42161] (optional),
  "cacheTtl": 120 (optional, min 10)
}
```

**Response:**

```json
{
  "success": true,
  "settings": {
    "chains": [1, 10, 137, 42161],
    "cacheTtl": 120
  }
}
```

**Status Codes:**

- `200 OK` - Success
- `400 Bad Request` - Invalid data
- `401 Unauthorized` - Invalid or missing token

---

### PUT /api/admin/api-key

Update the Etherscan API key.

**Headers:**

- `Authorization: Bearer <token>` (required)

**Request Body:**

```json
{
  "apiKey": "new-api-key-string"
}
```

**Response:**

```json
{
  "success": true,
  "message": "API key updated successfully"
}
```

**Status Codes:**

- `200 OK` - Success
- `400 Bad Request` - Invalid or empty API key
- `401 Unauthorized` - Invalid or missing token

---

### POST /api/admin/cache/clear

Clear the application cache.

**Headers:**

- `Authorization: Bearer <token>` (required)

**Response:**

```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

**Status Codes:**

- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing token

---

### GET /api/admin/metrics

Get API usage metrics.

**Headers:**

- `Authorization: Bearer <token>` (required)

**Response:**

```json
{
  "usage": {
    "2024-01-15:chains:n/a": 42,
    "2024-01-15:address/transfers:1": 15,
    "2024-01-15:token/info:137": 8
  },
  "timestamp": "2024-01-15T14:30:00Z"
}
```

**Status Codes:**

- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing token

---

---

## Error Responses

### 400 Bad Request

Returned when request parameters fail validation.

**Example:**

```json
{
  "error": "Invalid parameters",
  "details": {
    "address": {
      "_errors": ["address must be 0x followed by 40 hex characters"]
    }
  }
}
```

### 502 Bad Gateway

Returned when upstream Etherscan API fails.

**Example:**

```json
{
  "error": "API rate limit exceeded",
  "endpoint": "https://api.etherscan.io/v2/api"
}
```

### 500 Internal Server Error

Returned for unexpected server errors.

**Example:**

```json
{
  "error": "Internal server error"
}
```

---

## Implementation Notes

### Multi-Chain Support

The API leverages Etherscan V2's multi-chain support using a single API key:

- Base URL: `https://api.etherscan.io/v2/api`
- Chain selection via `chainid` query parameter
- [Etherscan V2 Documentation](https://docs.etherscan.io)

### Validation

All endpoints use [Zod](https://github.com/colinhacks/zod) for input validation:

- Chain IDs must be positive integers
- Addresses must be exactly `0x` + 40 hexadecimal characters (case-insensitive)
- Transaction hashes must be exactly `0x` + 64 hexadecimal characters (case-insensitive)
- Query parameters have sensible defaults and limits

### Rate Limiting

The API proxies requests to Etherscan's API. Be aware of their rate limits:

- Free tier: 5 requests/second
- Consider implementing client-side caching for frequently accessed data
- Future versions will include server-side caching and rate limit handling

### CORS Configuration

The API uses route-specific CORS policies for security:

- **Public Explorer Routes** (`/api/chains`, `/api/address/*`, `/api/token/*`, `/api/tx/*`):
  - CORS: `origin: '*'` - Open to all origins
  - Allows public access from any domain
  
- **Setup Routes** (`/api/setup/*`):
  - CORS: `origin: '*'` - Public access for initial setup
  
- **Auth Routes** (`/api/auth/*`):
  - CORS: Strict origin policy (configurable via `FRONTEND_URL` env variable)
  - Credentials: enabled
  - Default: `origin: '*'` if `FRONTEND_URL` not set
  
- **Admin Routes** (`/api/admin/*`):
  - CORS: Strict origin policy (configurable via `FRONTEND_URL` env variable)
  - Credentials: enabled
  - Requires JWT authentication
  - Default: `origin: '*'` if `FRONTEND_URL` not set

In production, set `FRONTEND_URL` environment variable to restrict `/api/auth/*` and `/api/admin/*` access to your frontend domain only.

### JWT Authentication

Protected routes require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

- Tokens expire after 7 days
- Generated using the `JWT_SECRET` environment variable
- Include user ID, username, and role in the payload
- Client should store token in localStorage or secure cookie

### Usage Analytics

The API includes minimal in-memory usage logging that tracks:

- Date (YYYY-MM-DD)
- Endpoint accessed
- Chain ID

This data can be flushed for analytics purposes. Persistent storage will be added in a future release.
