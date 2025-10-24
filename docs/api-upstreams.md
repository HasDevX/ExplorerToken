# API Upstreams

This document describes the external APIs used by the ExplorerToken backend.

## Etherscan V2 Client

The Etherscan V2 client provides a reusable interface for interacting with the Etherscan API v2 endpoints.

### Overview

- **Base URL**: `https://api.etherscan.io/v2/api`
- **Authentication**: API key via `apikey` query parameter
- **Chain Selection**: Uses `chainid` query parameter to select blockchain network

### API Endpoints Used

#### 1. Token Transfers (ERC-20)

**Endpoint**: `module=account&action=tokentx`

Retrieves ERC-20 token transfer events for a given address and/or contract address.

- **Documentation**: https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
- **Parameters**:
  - `address` (optional): User address to filter transfers
  - `contractaddress` (optional): Token contract address to filter
  - `page`, `offset`, `sort`: Pagination controls
- **Returns**: Array of token transfer events with transaction hash, addresses, value, and token metadata

#### 2. Top Token Holders

**Endpoint**: `module=token&action=topholders`

Gets the top holders for a specific token contract.

- **Documentation**: https://docs.etherscan.io/api-endpoints/tokens#get-token-holder-list-by-contract-address
- **Parameters**:
  - `contractaddress` (required): Token contract address
  - `offset`: Limit number of results (max 1000)
- **Returns**: Array of holder addresses with balances and ownership percentages

#### 3. Transaction Details

Aggregates data from three endpoints to provide complete transaction information:

**a) Transaction Data**: `module=proxy&action=eth_getTransactionByHash`

- **Documentation**: https://docs.etherscan.io/api-endpoints/geth-parity-proxy#eth_gettransactionbyhash
- **Parameters**: `txhash`
- **Returns**: Transaction object with basic details

**b) Transaction Receipt**: `module=proxy&action=eth_getTransactionReceipt`

- **Documentation**: https://docs.etherscan.io/api-endpoints/geth-parity-proxy#eth_gettransactionreceipt
- **Parameters**: `txhash`
- **Returns**: Receipt with gas usage and logs

**c) Execution Status**: `module=transaction&action=getstatus`

- **Documentation**: https://docs.etherscan.io/api-endpoints/stats-1#get-transaction-receipt-status
- **Parameters**: `txhash`
- **Returns**: Success/fail status of contract execution

#### 4. Token Information

**Endpoint**: `module=stats&action=tokensupply`

Retrieves basic token metadata, primarily the total supply.

- **Documentation**: https://docs.etherscan.io/api-endpoints/tokens#get-erc20-token-totalsupply-by-contractaddress
- **Parameters**:
  - `contractaddress` (required): Token contract address
- **Returns**: Total supply as a string (in base units)

**Note**: Additional token metadata (name, symbol, decimals) is not directly available from these endpoints and would typically require contract ABI calls or other data sources.

### Features

- **Typed DTOs**: All responses are validated with Zod schemas and normalized to consistent TypeScript types
- **Error Handling**: Custom `EtherscanError` class with endpoint and chain ID context
- **Defensive Parsing**: Handles missing optional fields gracefully
- **No Secret Logging**: API key is never logged or exposed in error messages

### Rate Limiting

**Important**: The client does not implement automatic retry or rate limiting. Rate limit handling and caching will be implemented at the API route layer in future PRs.

- Free tier: 5 requests/second
- Consider implementing caching and request throttling at the application level
- Monitor response headers for rate limit information

### Usage Example

```typescript
import {
  getTokenTransfers,
  getTopTokenHolders,
  getTxDetails,
  getTokenInfo,
} from '@/services/etherscanClient';

// Get recent USDT transfers on Ethereum mainnet
const transfers = await getTokenTransfers({
  chainId: 1,
  contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  page: 1,
  offset: 100,
  sort: 'desc',
});

// Get top 100 USDT holders
const holders = await getTopTokenHolders({
  chainId: 1,
  contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  limit: 100,
});

// Get transaction details
const txDetails = await getTxDetails({
  chainId: 1,
  txHash: '0x...',
});

// Get token metadata
const tokenInfo = await getTokenInfo({
  chainId: 1,
  contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
});
```

### Supported Chains

The client accepts any numeric `chainId`. Common chains include:

- 1: Ethereum Mainnet
- 56: BNB Smart Chain
- 137: Polygon
- 42161: Arbitrum One
- 10: Optimism
- 43114: Avalanche C-Chain
- 250: Fantom Opera
- 8453: Base
- 100: Gnosis Chain
- 59144: Linea

Refer to the Etherscan API documentation for the complete list of supported networks.
