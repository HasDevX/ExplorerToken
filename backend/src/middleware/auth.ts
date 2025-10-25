import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';

/**
 * Extended Express Request interface with user property
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

/**
 * JWT payload interface
 */
interface JwtPayload {
  sub: string; // subject (user id)
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Middleware to require authentication via JWT
 * Verifies Authorization: Bearer <token> header
 * Populates req.user with { id, username, role }
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    // Get Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Missing authorization header' });
      return;
    }

    // Check for Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ error: 'Invalid authorization header format' });
      return;
    }

    const token = parts[1];

    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Populate req.user
    req.user = {
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    res.status(500).json({ error: 'Authentication error' });
  }
}
