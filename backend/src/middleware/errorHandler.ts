import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { RequestWithId } from './requestId';

/**
 * Centralized error handling middleware
 * Maps various error types to appropriate HTTP responses
 */
export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = (req as RequestWithId).requestId || 'unknown';

  // Log the error
  console.error(`[${requestId}] Error:`, error);

  // ZodError -> 400 with issues
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      issues: error.issues,
      requestId,
    });
    return;
  }

  // Rate limit error -> 429
  if (error.message?.includes('rate limit') || error.message?.includes('Too many requests')) {
    res.status(429).json({
      error: 'Too many requests',
      requestId,
    });
    return;
  }

  // Upstream provider error -> 502
  if (
    error.message?.includes('upstream') ||
    error.message?.includes('Etherscan') ||
    error.message?.includes('API error')
  ) {
    res.status(502).json({
      error: error.message || 'Upstream provider error',
      code: 'UPSTREAM_ERROR',
      requestId,
    });
    return;
  }

  // Fallback -> 500 with requestId
  res.status(500).json({
    error: 'Internal error',
    requestId,
  });
}
