import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

/**
 * Generate a simple request ID using crypto
 */
function generateRequestId(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Extended Request with requestId
 */
export interface RequestWithId extends Request {
  requestId: string;
}

/**
 * Middleware to attach a unique request ID to each request
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  (req as RequestWithId).requestId = generateRequestId();
  next();
}
