import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword, generateOTP, hashOTP } from './encryption.js';
import { findUserByMobile, createUser, saveOTP, verifyOTP } from './sheets.js';
import { sendOTP } from './email.js';

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

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await saveOTP(mobile, hashOTP(otp), 'register', '', expiresAt);
  await sendOTP(email || process.env.OWNER_EMAIL, otp, 'register');

  return { message: 'OTP sent to your email for registration verification' };
}

export async function verifyRegistration(mobile, password, email, otp) {
  const valid = await verifyOTP(mobile, otp, 'register');
  if (!valid) {
    throw new Error('Invalid or expired OTP');
  }

  const passwordHash = hashPassword(password);
  await createUser(mobile, passwordHash, email || process.env.OWNER_EMAIL);
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

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await saveOTP(mobile, hashOTP(otp), 'login', '', expiresAt);
  await sendOTP(user.email || process.env.OWNER_EMAIL, otp, 'login');

  return { message: 'OTP sent to your email for login verification' };
}

export async function verifyLogin(mobile, otp) {
  const valid = await verifyOTP(mobile, otp, 'login');
  if (!valid) {
    throw new Error('Invalid or expired OTP');
  }

  const token = generateToken(mobile);
  return { token, message: 'Login successful' };
}

export async function requestDeleteOTP(mobile, noteId) {
  const user = await findUserByMobile(mobile);
  if (!user) throw new Error('User not found');

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await saveOTP(mobile, hashOTP(otp), 'delete', noteId, expiresAt);
  await sendOTP(user.email || process.env.OWNER_EMAIL, otp, 'delete');

  return { message: 'Delete OTP sent to your email' };
}

export async function verifyDeleteOTP(mobile, noteId, otp) {
  return verifyOTP(mobile, otp, 'delete', noteId);
}
