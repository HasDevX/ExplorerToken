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
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized - No token provided' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyToken(token);
    (req as AuthRequest).user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
}
