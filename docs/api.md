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

## Future Endpoints

The following endpoints are planned for future releases:

### GET /api/token/:chainId/:address/holders

Returns top token holders for a specific token contract.

**Upstream Mapping:**
- Will use `module=token&action=topholders`
- [Documentation](https://docs.etherscan.io/api-endpoints/tokens#get-token-holder-list-by-contract-address)

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

### Usage Analytics

The API includes minimal in-memory usage logging that tracks:
- Date (YYYY-MM-DD)
- Endpoint accessed
- Chain ID

This data can be flushed for analytics purposes. Persistent storage will be added in a future release.
