import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import { encrypt, decrypt } from '../services/encryption.js';
import {
  getNotesByUser,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  getSharesByOwner,
  getSharesByNote,
  setSharesForNote,
  getSharedNotesByUser,
  getSharedNoteById,
} from '../services/sheets.js';
import { requestDeleteOTP, verifyDeleteOTP } from '../services/auth.js';

const router = Router();

const NOTE_COLORS = [
  '#3b9eff', // sky blue  (logo accent)
  '#f5a623', // amber gold (logo lock)
  '#a855f7', // violet
  '#10d98a', // emerald
  '#f97316', // sunset orange
  '#e879a4', // rose pink
  '#06b6d4', // cyan teal
  '#facc15', // golden yellow
];

function pickColor() {
  return NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
}

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const [notes, ownerShares] = await Promise.all([
      getNotesByUser(req.user.mobile),
      getSharesByOwner(req.user.mobile),
    ]);
    const sharedNoteIds = new Set(ownerShares.map((s) => s.noteId));
    const decrypted = notes.map((note) => ({
      id: note.id,
      title: decrypt(note.encryptedTitle),
      color: note.color,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      isShared: sharedNoteIds.has(note.id),
    }));
    res.json(decrypted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Shared-with-me routes (must come before /:id) ──────────────────────────

router.get('/shared', async (req, res) => {
  try {
    const notes = await getSharedNotesByUser(req.user.mobile);
    const decrypted = notes.map((note) => ({
      id: note.id,
      title: decrypt(note.encryptedTitle),
      color: note.color,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      ownerMobile: note.ownerMobile,
      permissions: note.permissions,
    }));
    res.json(decrypted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/shared/:id', async (req, res) => {
  try {
    const note = await getSharedNoteById(req.params.id, req.user.mobile);
    if (!note) return res.status(404).json({ error: 'Shared note not found' });

    res.json({
      id: note.id,
      title: decrypt(note.encryptedTitle),
      description: decrypt(note.encryptedDescription),
      color: note.color,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      ownerMobile: note.ownerMobile,
      permissions: note.permissions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/shared/:id', async (req, res) => {
  try {
    const { title, description } = req.body;
    const note = await getSharedNoteById(req.params.id, req.user.mobile);
    if (!note) return res.status(404).json({ error: 'Shared note not found' });
    if (!note.permissions.includes('edit')) return res.status(403).json({ error: 'No edit permission' });

    const updates = {
      encryptedTitle: encrypt(title?.trim() || decrypt(note.encryptedTitle)),
      encryptedDescription: encrypt(description?.trim() ?? decrypt(note.encryptedDescription)),
    };
    await updateNote(req.params.id, note.ownerMobile, updates);
    res.json({
      id: note.id,
      title: title?.trim() || decrypt(note.encryptedTitle),
      description: description?.trim() ?? decrypt(note.encryptedDescription),
      color: note.color,
      createdAt: note.createdAt,
      updatedAt: new Date().toISOString(),
      ownerMobile: note.ownerMobile,
      permissions: note.permissions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/shared/:id', async (req, res) => {
  try {
    const note = await getSharedNoteById(req.params.id, req.user.mobile);
    if (!note) return res.status(404).json({ error: 'Shared note not found' });
    if (!note.permissions.includes('delete')) return res.status(403).json({ error: 'No delete permission' });

    await deleteNote(req.params.id, note.ownerMobile);
    await setSharesForNote(req.params.id, note.ownerMobile, []);
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const note = await getNoteById(req.params.id, req.user.mobile);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    res.json({
      id: note.id,
      title: decrypt(note.encryptedTitle),
      description: decrypt(note.encryptedDescription),
      color: note.color,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const now = new Date().toISOString();
    const note = {
      id: uuidv4(),
      userId: req.user.mobile,
      encryptedTitle: encrypt(title.trim()),
      encryptedDescription: encrypt(description?.trim() || ''),
      color: pickColor(),
      createdAt: now,
      updatedAt: now,
    };

    await createNote(note);
    res.status(201).json({
      id: note.id,
      title: title.trim(),
      description: description?.trim() || '',
      color: note.color,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description } = req.body;
    const note = await getNoteById(req.params.id, req.user.mobile);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const updates = {
      encryptedTitle: encrypt(title?.trim() || decrypt(note.encryptedTitle)),
      encryptedDescription: encrypt(description?.trim() ?? decrypt(note.encryptedDescription)),
    };

    await updateNote(req.params.id, req.user.mobile, updates);
    res.json({
      id: note.id,
      title: title?.trim() || decrypt(note.encryptedTitle),
      description: description?.trim() ?? decrypt(note.encryptedDescription),
      color: note.color,
      createdAt: note.createdAt,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/delete-otp', async (req, res) => {
  try {
    const note = await getNoteById(req.params.id, req.user.mobile);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const result = await requestDeleteOTP(req.user.mobile, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: 'OTP is required to delete' });

    const valid = await verifyDeleteOTP(req.user.mobile, req.params.id, otp);
    if (!valid) return res.status(403).json({ error: 'Invalid or expired OTP' });

    const deleted = await deleteNote(req.params.id, req.user.mobile);
    if (!deleted) return res.status(404).json({ error: 'Note not found' });

    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Share management ────────────────────────────────────────────────────────

router.get('/:id/shares', async (req, res) => {
  try {
    const note = await getNoteById(req.params.id, req.user.mobile);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const shares = await getSharesByNote(req.params.id, req.user.mobile);
    res.json(shares); // [{ mobile, permissions }]
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/shares', async (req, res) => {
  try {
    const { sharedWith } = req.body;
    if (!Array.isArray(sharedWith)) return res.status(400).json({ error: 'sharedWith must be an array' });

    const note = await getNoteById(req.params.id, req.user.mobile);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    // Each entry: { mobile, permissions }
    const filtered = sharedWith.filter((s) => s.mobile !== req.user.mobile);
    await setSharesForNote(req.params.id, req.user.mobile, filtered);
    res.json({ sharedWith: filtered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
