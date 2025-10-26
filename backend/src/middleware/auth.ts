import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/services/auth';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const token = authHeader.substring(7);

    // Validate token is not empty
    if (!token || token.trim() === '') {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const payload = verifyToken(token);
    (req as AuthRequest).user = payload;
    next();
  } catch (error) {
    // Catch any errors and always return 401 (never throw)
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
}
