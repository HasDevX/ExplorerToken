import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb } from '@/services/db';
import { env } from '@/config/env';

const SALT_ROUNDS = 10;

export interface AdminUser {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for a user
 */
export function generateToken(user: AdminUser): string {
  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

/**
 * Create an admin user
 */
export async function createAdminUser(username: string, password: string): Promise<AdminUser> {
  const db = getDb();
  const passwordHash = await hashPassword(password);

  const result = await db.query(
    `INSERT INTO admin_users (username, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, role, is_active`,
    [username, passwordHash, 'admin', true]
  );

  return result.rows[0] as AdminUser;
}

/**
 * Authenticate admin user
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<AdminUser | null> {
  const db = getDb();

  const result = await db.query(
    `SELECT id, username, password_hash, role, is_active
     FROM admin_users
     WHERE username = $1 AND is_active = true`,
    [username]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    return null;
  }

  // Update last login
  await db.query(`UPDATE admin_users SET last_login_at = now() WHERE id = $1`, [user.id]);

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    is_active: user.is_active,
  };
}
