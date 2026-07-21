import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword } from './encryption.js';
import { findUserByMobile, createUser } from './sheets.js';

const JWT_SECRET = () => process.env.JWT_SECRET || 'fallback-secret';
const TOKEN_EXPIRY = '24h';

export function generateToken(mobile) {
  return jwt.sign({ mobile }, JWT_SECRET(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET());
  } catch {
    return null;
  }
}

export async function registerUser(mobile, password, email) {
  if (!/^\d{10}$/.test(mobile)) {
    throw new Error('Mobile number must be 10 digits');
  }
  if (!/^\d{4}$/.test(password)) {
    throw new Error('Password must be exactly 4 digits');
  }

  const existing = await findUserByMobile(mobile);
  if (existing) {
    throw new Error('Mobile number already registered');
  }

  const passwordHash = hashPassword(password);
  await createUser(mobile, passwordHash, email || '');
  const token = generateToken(mobile);

  return { token, message: 'Registration successful' };
}

export async function loginUser(mobile, password) {
  if (!/^\d{10}$/.test(mobile)) {
    throw new Error('Mobile number must be 10 digits');
  }
  if (!/^\d{4}$/.test(password)) {
    throw new Error('Password must be exactly 4 digits');
  }

  const user = await findUserByMobile(mobile);
  if (!user) {
    throw new Error('User not found. Please register first.');
  }

  if (user.status === 'inactive') {
    throw new Error('Your account has been disabled. Contact the administrator.');
  }

  if (!verifyPassword(password, user.passwordHash)) {
    throw new Error('Invalid password');
  }

  const token = generateToken(mobile);
  return { token, message: 'Login successful' };
}
