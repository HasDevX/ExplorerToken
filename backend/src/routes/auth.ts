import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { loginLimiter } from '@/middleware/rateLimiters';
import * as db from '@/services/db';
import { env } from '@/config/env';

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Login endpoint - returns JWT token
 */
authRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const loginSchema = z.object({
      username: z.string().trim().min(1, 'Username is required'),
      password: z.string().min(1, 'Password is required'),
    });

    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.format(),
      });
      return;
    }

    const { username, password } = result.data;

    const admin = await db.findAdminByUsername(username);
    if (!admin) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    await db.updateLastLogin(admin.id);

    const token = jwt.sign({ username: admin.username, role: admin.role }, env.JWT_SECRET, {
      algorithm: 'HS256',
      subject: admin.id,
      expiresIn: '24h',
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});
