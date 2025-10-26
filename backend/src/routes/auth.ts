import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser, generateToken } from '@/services/auth';
import { requireAuth, AuthRequest } from '@/middleware/auth';
import { loginLimiter } from '@/middleware/rateLimiters';
import { logger } from '@/lib/logger';

export const authRouter = Router();

// Schema for login request
const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/login
 * Authenticate admin user and return JWT token
 */
authRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = LoginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid credentials',
        details: validation.error.format(),
      });
      return;
    }

    const { username, password } = validation.data;

    // Authenticate user
    const user = await authenticateUser(username, password);

    if (!user) {
      logger.warn('Invalid credentials', { username });
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Generate token
    const token = generateToken(user);

    logger.info('Login success', { username });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token removal)
 */
authRouter.post('/logout', (_req: Request, res: Response) => {
  // JWT tokens are stateless, so logout is handled client-side
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  res.json({
    user: authReq.user,
  });
});
