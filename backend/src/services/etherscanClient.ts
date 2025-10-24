import axios from 'axios';
import { z } from 'zod';
import { BASE_URL, makeParams } from '@/config/etherscan';

// ============================================================================
// Constants
// ============================================================================

// Known success messages from Etherscan API when status is '0' but not an error
const NO_ERROR_MESSAGES = ['No records found', 'No transactions found'];

// ============================================================================
// Custom Error Class
// ============================================================================

export class EtherscanError extends Error {
  constructor(
    message: string,
    public endpoint: string,
    public chainId: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'EtherscanError';
  }
}

// ============================================================================
// Common Types
// ============================================================================

export type PageOpts = { page?: number; offset?: number; sort?: 'asc' | 'desc' };
export type ChainScoped = { chainId: number };

// ============================================================================
// Normalized DTOs
// ============================================================================

export type NormalizedTransfer = {
  hash: string;
  blockNumber: number;
  timeStamp: number;
  from: string;
  to: string;
  contractAddress: string;
  valueRaw: string; // as string from API
  tokenSymbol?: string;
  tokenName?: string;
  tokenDecimal?: number;
};

export type NormalizedHolder = {
  address: string;
  balanceRaw: string; // string of integer units
  percent?: number; // if provided by API
};

export type NormalizedTx = {
  hash: string;
  blockNumber: number | null;
  from: string;
  to: string | null;
  valueWei: string;
  input: string;
  status?: 'success' | 'fail' | 'pending';
  receipt?: {
    gasUsed?: string;
    effectiveGasPrice?: string;
    logs?: Array<{ address: string; topics: string[]; data: string }>;
  };
};

export type NormalizedTokenInfo = {
  contractAddress: string;
  totalSupplyRaw?: string;
  name?: string;
  symbol?: string;
  decimals?: number;
};

// ============================================================================
// Zod Schemas for API Responses
// ============================================================================

// Generic Etherscan response wrapper
const EtherscanResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  result: z.unknown(),
});

// Token transfer schema
const TokenTransferSchema = z.object({
  blockNumber: z.string(),
  timeStamp: z.string(),
  hash: z.string(),
  from: z.string(),
  to: z.string(),
  contractAddress: z.string(),
  value: z.string(),
  tokenName: z.string().optional(),
  tokenSymbol: z.string().optional(),
  tokenDecimal: z.string().optional(),
});

// Top holder schema
const TopHolderSchema = z.object({
  TokenHolderAddress: z.string(),
  TokenHolderQuantity: z.string(),
  Share: z.string().optional(),
});

// Transaction schema (from eth_getTransactionByHash)
const TransactionSchema = z.object({
  hash: z.string(),
  blockNumber: z.string().nullable(),
  from: z.string(),
  to: z.string().nullable(),
  value: z.string(),
  input: z.string(),
});

// Transaction receipt schema (from eth_getTransactionReceipt)
const TransactionReceiptSchema = z.object({
  gasUsed: z.string().optional(),
  effectiveGasPrice: z.string().optional(),
  logs: z
    .array(
      z.object({
        address: z.string(),
        topics: z.array(z.string()),
        data: z.string(),
      })
    )
    .optional(),
});

// Transaction status schema (from getstatus)
const TransactionStatusSchema = z.object({
  isError: z.string(),
  errDescription: z.string().optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Make a GET request to Etherscan API and validate the response
 */
async function makeRequest<T>(
  url: string,
  params: URLSearchParams,
  chainId: number,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const response = await axios.get(url, { params });

    // Validate response structure
    const parsed = EtherscanResponseSchema.safeParse(response.data);

    if (!parsed.success) {
      throw new EtherscanError(
        'Invalid response format from Etherscan API',
        url,
        chainId,
        parsed.error
      );
    }

    // Check status - allow certain messages even with status '0'
    if (parsed.data.status === '0' && !NO_ERROR_MESSAGES.includes(parsed.data.message)) {
      throw new EtherscanError(`Etherscan API error: ${parsed.data.message}`, url, chainId);
    }

    // Validate and return result
    const resultParsed = schema.safeParse(parsed.data.result);

    if (!resultParsed.success) {
      throw new EtherscanError(
        'Invalid result format from Etherscan API',
        url,
        chainId,
        resultParsed.error
      );
    }

    return resultParsed.data;
  } catch (error) {
    if (error instanceof EtherscanError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      throw new EtherscanError(`Network error: ${error.message}`, url, chainId, error);
    }

    throw new EtherscanError('Unexpected error during Etherscan API request', url, chainId, error);
  }
}

// ============================================================================
// Public API Methods
// ============================================================================

/**
 * Get ERC-20 token transfers by address and/or contract
 * @param opts - Options including chainId, address, contractAddress, and pagination
 * @returns Array of normalized transfers
 */
export async function getTokenTransfers(
  opts: ChainScoped & { address?: string; contractAddress?: string } & PageOpts
): Promise<NormalizedTransfer[]> {
  const { chainId, address, contractAddress, page, offset, sort } = opts;

  const params = makeParams('account', 'tokentx', chainId, {
    address,
    contractaddress: contractAddress,
    page,
    offset,
    sort,
  });

  const result = await makeRequest(BASE_URL, params, chainId, z.array(TokenTransferSchema));

  // Normalize the result
  return result.map((tx) => ({
    hash: tx.hash,
    blockNumber: parseInt(tx.blockNumber, 10),
    timeStamp: parseInt(tx.timeStamp, 10),
    from: tx.from,
    to: tx.to,
    contractAddress: tx.contractAddress,
    valueRaw: tx.value,
    tokenSymbol: tx.tokenSymbol,
    tokenName: tx.tokenName,
    tokenDecimal: tx.tokenDecimal ? parseInt(tx.tokenDecimal, 10) : undefined,
  }));
}

/**
 * Get top token holders for a specific token
 * @param opts - Options including chainId, contractAddress, and limit
 * @returns Array of normalized holders
 */
export async function getTopTokenHolders(
  opts: ChainScoped & { contractAddress: string; limit?: number }
): Promise<NormalizedHolder[]> {
  const { chainId, contractAddress, limit } = opts;

  const params = makeParams('token', 'topholders', chainId, {
    contractaddress: contractAddress,
    offset: limit, // limit maps to offset parameter
  });

  const result = await makeRequest(BASE_URL, params, chainId, z.array(TopHolderSchema));

  // Normalize the result
  return result.map((holder) => ({
    address: holder.TokenHolderAddress,
    balanceRaw: holder.TokenHolderQuantity,
    percent: holder.Share ? parseFloat(holder.Share) : undefined,
  }));
}

/**
 * Get transaction details by hash (aggregates transaction, receipt, and status)
 * @param opts - Options including chainId and txHash
 * @returns Normalized transaction details
 */
export async function getTxDetails(opts: ChainScoped & { txHash: string }): Promise<NormalizedTx> {
  const { chainId, txHash } = opts;

  // Make three parallel requests
  const [txData, receiptData, statusData] = await Promise.all([
    // 1. Get transaction by hash
    makeRequest(
      BASE_URL,
      makeParams('proxy', 'eth_getTransactionByHash', chainId, { txhash: txHash }),
      chainId,
      TransactionSchema
    ),
    // 2. Get transaction receipt
    makeRequest(
      BASE_URL,
      makeParams('proxy', 'eth_getTransactionReceipt', chainId, { txhash: txHash }),
      chainId,
      TransactionReceiptSchema.nullable()
    ),
    // 3. Get transaction status
    makeRequest(
      BASE_URL,
      makeParams('transaction', 'getstatus', chainId, { txhash: txHash }),
      chainId,
      TransactionStatusSchema
    ),
  ]);

  // Determine status
  let status: 'success' | 'fail' | 'pending' | undefined;
  if (txData.blockNumber === null) {
    status = 'pending';
  } else if (statusData.isError === '0') {
    status = 'success';
  } else if (statusData.isError === '1') {
    status = 'fail';
  }

  // Normalize the result
  return {
    hash: txData.hash,
    blockNumber: txData.blockNumber ? parseInt(txData.blockNumber, 16) : null,
    from: txData.from,
    to: txData.to,
    valueWei: txData.value,
    input: txData.input,
    status,
    receipt: receiptData
      ? {
          gasUsed: receiptData.gasUsed,
          effectiveGasPrice: receiptData.effectiveGasPrice,
          logs: receiptData.logs,
        }
      : undefined,
  };
}

/**
 * Get minimal token information (supply, name, symbol, decimals)
 * @param opts - Options including chainId and contractAddress
 * @returns Normalized token info
 */
export async function getTokenInfo(
  opts: ChainScoped & { contractAddress: string }
): Promise<NormalizedTokenInfo> {
  const { chainId, contractAddress } = opts;

  // Get token supply
  const supplyParams = makeParams('stats', 'tokensupply', chainId, {
    contractaddress: contractAddress,
  });

  let totalSupplyRaw: string | undefined;
  try {
    totalSupplyRaw = await makeRequest(BASE_URL, supplyParams, chainId, z.string());
  } catch (error) {
    // Token supply might not be available for all tokens
    totalSupplyRaw = undefined;
  }

  // Return normalized token info
  // Note: name, symbol, and decimals are not readily available from these endpoints
  // They would typically come from contract ABI calls or other endpoints
  return {
    contractAddress,
    totalSupplyRaw,
    name: undefined,
    symbol: undefined,
    decimals: undefined,
  };
}
