import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getTokenTransfers,
  getTxDetails,
  getTokenInfo,
  getTokenHolders,
  EtherscanError,
  ProviderFeatureUnavailableError,
} from '@/services/etherscanClient';
import * as cache from '@/services/cache';
import { rateLimit } from '@/middleware/rateLimit';
import { SUPPORTED_CHAINS, SUPPORTED_CHAIN_IDS } from '@/config/chains';

export const explorerRouter = Router();

// Apply rate limiting to all routes
explorerRouter.use(rateLimit);

// ============================================================================
// In-Memory Usage Logging
// ============================================================================

type UsageKey = string; // Format: "YYYY-MM-DD:endpoint:chainId"

const usageLog = new Map<UsageKey, number>();

/**
 * Record a usage event for analytics
 */
function recordUsage(endpoint: string, chainId?: number): void {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const key = `${date}:${endpoint}:${chainId ?? 'n/a'}`;
  const current = usageLog.get(key) ?? 0;
  usageLog.set(key, current + 1);
}

/**
 * Flush usage logs (returns and clears the current logs)
 * @returns Map of usage data
 */
export function flushUsageLogs(): Map<UsageKey, number> {
  const snapshot = new Map(usageLog);
  usageLog.clear();
  return snapshot;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

const ChainIdParamSchema = z.object({
  chainId: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n > 0, {
      message: 'chainId must be a positive integer',
    }),
});

const AddressParamSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, {
    message: 'address must be 0x followed by 40 hex characters',
  }),
});

const TxHashParamSchema = z.object({
  hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, {
    message: 'hash must be 0x followed by 64 hex characters',
  }),
});

const TransfersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .refine((n) => n > 0, {
      message: 'page must be a positive integer',
    }),
  offset: z
    .string()
    .optional()
    .default('25')
    .transform(Number)
    .refine((n) => n > 0 && n <= 100, {
      message: 'offset must be between 1 and 100',
    }),
  sort: z.enum(['asc', 'desc']).optional().default('desc'),
});

const HoldersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .refine((n) => n > 0, {
      message: 'page must be a positive integer',
    }),
  offset: z
    .string()
    .optional()
    .default('25')
    .transform(Number)
    .refine((n) => n > 0 && n <= 100, {
      message: 'offset must be between 1 and 100',
    }),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate that a chain ID is supported
 */
function isSupportedChain(chainId: number): boolean {
  return SUPPORTED_CHAIN_IDS.includes(chainId);
}

/**
 * Handle errors from async route handlers
 * Returns appropriate HTTP status and error response
 */
function handleRouteError(res: Response, error: unknown): void {
  // Check if error is an EtherscanError by looking for its unique properties
  if (
    error instanceof EtherscanError ||
    (error && typeof error === 'object' && 'endpoint' in error)
  ) {
    res.status(502).json({
      error: 'Upstream error',
      code: 'ETHERSCAN_ERROR',
      details: (error as EtherscanError).message,
    });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
  });
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/chains
 * Returns a curated list of supported EVM chains
 */
explorerRouter.get('/chains', (_req: Request, res: Response) => {
  recordUsage('chains');

  res.json({ chains: SUPPORTED_CHAINS });
});

/**
 * GET /api/address/:chainId/:address/transfers
 * Returns token transfers for an address on a specific chain
 */
explorerRouter.get('/address/:chainId/:address/transfers', async (req: Request, res: Response) => {
  try {
    // Validate params
    const paramsResult = ChainIdParamSchema.merge(AddressParamSchema).safeParse(req.params);
    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: paramsResult.error.format(),
      });
    }

    // Validate query
    const queryResult = TransfersQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: queryResult.error.format(),
      });
    }

    const { chainId, address } = paramsResult.data;
    const { page, offset, sort } = queryResult.data;

    // Validate chain is supported
    if (!isSupportedChain(chainId)) {
      return res.status(400).json({
        error: 'Unsupported chain',
        message: `Chain ID ${chainId} is not supported. Check /api/chains for supported chains.`,
      });
    }

    recordUsage('address/transfers', chainId);

    // Try to get from cache
    const cacheKey = `transfers:${chainId}:${address}:${page}:${offset}:${sort}`;
    const cached = await cache.get(cacheKey);
    if (cached !== null) {
      return res.json(cached);
    }

    // Call Etherscan client
    const data = await getTokenTransfers({
      chainId,
      address,
      page,
      offset,
      sort,
    });

    const response = {
      chainId,
      address,
      page,
      offset,
      sort,
      data,
    };

    // Cache the response for 30 seconds
    await cache.set(cacheKey, response, 30);

    res.json(response);
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * GET /api/token/:chainId/:address/info
 * Returns token information for a contract address
 */
explorerRouter.get('/token/:chainId/:address/info', async (req: Request, res: Response) => {
  try {
    // Validate params
    const paramsResult = ChainIdParamSchema.merge(AddressParamSchema).safeParse(req.params);
    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: paramsResult.error.format(),
      });
    }

    const { chainId, address } = paramsResult.data;

    // Validate chain is supported
    if (!isSupportedChain(chainId)) {
      return res.status(400).json({
        error: 'Unsupported chain',
        message: `Chain ID ${chainId} is not supported. Check /api/chains for supported chains.`,
      });
    }

    recordUsage('token/info', chainId);

    // Try to get from cache
    const cacheKey = `tokeninfo:${chainId}:${address}`;
    const cached = await cache.get(cacheKey);
    if (cached !== null) {
      return res.json(cached);
    }

    // Call Etherscan client
    const data = await getTokenInfo({
      chainId,
      contractAddress: address,
    });

    // Cache the response for 300 seconds (5 minutes)
    await cache.set(cacheKey, data, 300);

    res.json(data);
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * GET /api/tx/:chainId/:hash
 * Returns transaction details for a specific transaction hash
 */
explorerRouter.get('/tx/:chainId/:hash', async (req: Request, res: Response) => {
  try {
    // Validate params
    const paramsResult = ChainIdParamSchema.merge(TxHashParamSchema).safeParse(req.params);
    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: paramsResult.error.format(),
      });
    }

    const { chainId, hash } = paramsResult.data;

    // Validate chain is supported
    if (!isSupportedChain(chainId)) {
      return res.status(400).json({
        error: 'Unsupported chain',
        message: `Chain ID ${chainId} is not supported. Check /api/chains for supported chains.`,
      });
    }

    recordUsage('tx', chainId);

    // Try to get from cache
    const cacheKey = `tx:${chainId}:${hash}`;
    const cached = await cache.get(cacheKey);
    if (cached !== null) {
      return res.json(cached);
    }

    // Call Etherscan client
    const data = await getTxDetails({
      chainId,
      txHash: hash,
    });

    // Cache the response for 60 seconds
    await cache.set(cacheKey, data, 60);

    res.json(data);
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * GET /api/token/:chainId/:address/holders
 * Returns token holders with pagination
 */
explorerRouter.get('/token/:chainId/:address/holders', async (req: Request, res: Response) => {
  try {
    // Validate params
    const paramsResult = ChainIdParamSchema.merge(AddressParamSchema).safeParse(req.params);
    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: paramsResult.error.format(),
      });
    }

    // Validate query
    const queryResult = HoldersQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: queryResult.error.format(),
      });
    }

    const { chainId, address } = paramsResult.data;
    const { page, offset } = queryResult.data;

    // Validate chain is supported
    if (!isSupportedChain(chainId)) {
      return res.status(400).json({
        error: 'Unsupported chain',
        message: `Chain ID ${chainId} is not supported. Check /api/chains for supported chains.`,
      });
    }

    recordUsage('token/holders', chainId);

    // Try to get from cache
    const cacheKey = `holders:${chainId}:${address}:${page}:${offset}`;
    const cached = await cache.get(cacheKey);
    if (cached !== null) {
      // Add Cache-Control header
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.json(cached);
    }

    try {
      // Call Etherscan client
      const data = await getTokenHolders({
        chainId,
        contractAddress: address,
        page,
        offset,
      });

      const response = {
        page,
        offset,
        total: null,
        result: data,
      };

      // Cache the response for 180 seconds (3 minutes)
      await cache.set(cacheKey, response, 180);

      // Add Cache-Control header
      res.setHeader('Cache-Control', 'public, max-age=60');

      res.json(response);
    } catch (error) {
      // Check for ProviderFeatureUnavailableError
      if (
        error instanceof ProviderFeatureUnavailableError ||
        (error &&
          typeof error === 'object' &&
          error.constructor?.name === 'ProviderFeatureUnavailableError')
      ) {
        // Return 200 with unavailable flag instead of error
        const response = {
          page,
          offset,
          total: null,
          unavailable: true,
          reason: 'Holders not available on this chain/plan',
          result: [],
        };

        // Cache the unavailable response for 180 seconds as well
        await cache.set(cacheKey, response, 180);

        // Add Cache-Control header
        res.setHeader('Cache-Control', 'public, max-age=60');

        return res.status(200).json(response);
      }

      // For other errors, delegate to handleRouteError
      throw error;
    }
  } catch (error) {
    handleRouteError(res, error);
  }
});
