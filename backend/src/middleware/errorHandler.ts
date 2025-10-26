import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { RequestWithId } from './requestId';

/**
 * Check if error is an axios/HTTP error with status code
 */
function isHttpError(error: unknown): error is { response?: { status?: number } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: unknown }).response !== null
  );
}

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

  // Check for HTTP errors with status codes
  if (isHttpError(error) && error.response?.status) {
    const status = error.response.status;

    // Rate limit from upstream -> 429
    if (status === 429) {
      res.status(429).json({
        error: 'Too many requests',
        requestId,
      });
      return;
    }

    // Upstream errors (5xx) -> 502
    if (status >= 500) {
      res.status(502).json({
        error: error.message || 'Upstream provider error',
        code: 'UPSTREAM_ERROR',
        requestId,
      });
      return;
    }
  }

  // Fallback -> 500 with requestId
  res.status(500).json({
    error: 'Internal error',
    requestId,
  });
}
