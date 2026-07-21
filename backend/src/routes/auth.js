import { Router } from 'express';
import { registerUser, loginUser } from '../services/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { getAllUsers } from '../services/sheets.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { mobile, password, email } = req.body;
    const result = await registerUser(mobile, password, email);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const result = await loginUser(mobile, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await getAllUsers();
    // Exclude the requesting user from the list
    const filtered = users.filter((u) => u.mobile !== req.user.mobile);
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
