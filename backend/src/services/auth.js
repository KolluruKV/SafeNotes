import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword } from './encryption.js';
import { findUserByMobile, createUser } from './sheets.js';
import { sendLoginOtpEmail } from './email.js';

const JWT_SECRET = () => process.env.JWT_SECRET || 'fallback-secret';
const TOKEN_EXPIRY = '24h';

// ── In-memory OTP store: preAuthToken -> { otp, expiresAt } ──
const otpStore = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of otpStore) {
    if (val.expiresAt < now) otpStore.delete(key);
  }
}, 60_000);

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

  // Issue a short-lived pre-auth token; real JWT is issued after OTP verification
  const preAuthToken = jwt.sign(
    { mobile, preAuth: true },
    JWT_SECRET(),
    { expiresIn: '5m' }
  );

  // Generate OTP, send via backend (no CORS), store server-side
  const otp = generateOtp();
  await sendLoginOtpEmail(user.email, otp);
  otpStore.set(preAuthToken, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

  return { preAuthToken, email: user.email, message: 'OTP sent' };
}

export async function completeLogin(preAuthToken, otp) {
  let payload;
  try {
    payload = jwt.verify(preAuthToken, JWT_SECRET());
  } catch {
    throw new Error('OTP session expired. Please login again.');
  }

  if (!payload.preAuth) {
    throw new Error('Invalid token.');
  }

  const stored = otpStore.get(preAuthToken);
  if (!stored || stored.expiresAt < Date.now()) {
    otpStore.delete(preAuthToken);
    throw new Error('OTP has expired. Please login again.');
  }
  if (stored.otp !== otp) {
    throw new Error('Invalid OTP. Please try again.');
  }

  otpStore.delete(preAuthToken); // single-use
  const token = generateToken(payload.mobile);
  return { token, message: 'Login successful' };
}
