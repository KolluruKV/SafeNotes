import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { registerUser } from '../services/auth.js';
import {
  getAllUsersAdmin,
  updateUserField,
  hardDeleteUser,
  getAdminStats,
} from '../services/sheets.js';

const router = Router();

const ADMIN_PIN = () => process.env.ADMIN_PIN || '000000';
const JWT_SECRET = () => process.env.JWT_SECRET || 'fallback-secret';
const ADMIN_TOKEN_EXPIRY = '2h';

// ── Admin middleware ────────────────────────────────────────────────────────
function adminMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET());
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

// ── Routes ──────────────────────────────────────────────────────────────────

// POST /api/admin/login — verify 6-digit PIN, return admin JWT
router.post('/login', (req, res) => {
  const { pin } = req.body;
  if (!pin || !/^\d{6}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be exactly 6 digits' });
  }
  if (pin !== ADMIN_PIN()) {
    return res.status(401).json({ error: 'Invalid admin PIN' });
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET(), { expiresIn: ADMIN_TOKEN_EXPIRY });
  return res.json({ token, message: 'Admin login successful' });
});

// POST /api/admin/users — admin creates a new user
router.post('/users', adminMiddleware, async (req, res) => {
  try {
    const { mobile, password, email } = req.body;
    // Reuse the same registration logic (validates, hashes, saves)
    await registerUser(mobile, password, email);
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/admin/users — list all users (admin only)
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await getAllUsersAdmin();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:mobile — update email and/or status
router.put('/users/:mobile', adminMiddleware, async (req, res) => {
  try {
    const { mobile } = req.params;
    const { email, status } = req.body;

    if (email !== undefined) {
      await updateUserField(mobile, 'email', email.trim());
    }
    if (status !== undefined) {
      const allowed = ['active', 'inactive'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Status must be active or inactive' });
      }
      await updateUserField(mobile, 'status', status);
    }
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:mobile/soft — soft delete (status → deleted)
router.delete('/users/:mobile/soft', adminMiddleware, async (req, res) => {
  try {
    await updateUserField(req.params.mobile, 'status', 'deleted');
    res.json({ message: 'User soft deleted — data preserved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:mobile/restore — restore soft-deleted user
router.post('/users/:mobile/restore', adminMiddleware, async (req, res) => {
  try {
    await updateUserField(req.params.mobile, 'status', 'active');
    res.json({ message: 'User restored successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:mobile/hard — permanently delete user + all data
router.delete('/users/:mobile/hard', adminMiddleware, async (req, res) => {
  try {
    await hardDeleteUser(req.params.mobile);
    res.json({ message: 'User and all associated data permanently deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats — app statistics
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
