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
  recolorAllNotes,
} from '../services/sheets.js';

const router = Router();

// 64 vivid colors — no yellows/limes/pastels so white text is always readable
const NOTE_COLORS = [
  // Reds
  '#f44336','#e53935','#ef5350','#ff1744','#d32f2f','#c62828','#b71c1c','#d50000',
  // Pinks
  '#e91e63','#ec407a','#f06292','#ff4081','#c2185b','#ad1457','#880e4f','#f50057',
  // Purples
  '#9c27b0','#ab47bc','#ba68c8','#e040fb','#7b1fa2','#6a1b9a','#aa00ff','#d500f9',
  // Deep Purples
  '#673ab7','#7e57c2','#9575cd','#651fff','#512da8','#4527a0','#311b92','#6200ea',
  // Indigos & Blues
  '#3f51b5','#5c6bc0','#283593','#304ffe','#2196f3','#1e88e5','#1976d2','#2979ff',
  // Cyans & Teals
  '#00bcd4','#00acc1','#0097a7','#00838f','#009688','#00897b','#00796b','#00695c',
  // Greens
  '#43a047','#388e3c','#2e7d32','#1b5e20',
  // Deep Oranges
  '#ff5722','#f4511e','#e64a19','#d84315','#ff3d00','#dd2c00','#bf360c','#e65100',
  // Warm Oranges (deep only)
  '#ff8f00','#ff6f00','#f57c00','#fb8c00',
];

// Pick color by cycling through palette — avoids repeats for sequential notes
function pickColor(index = 0) {
  // Shuffle the order using a step that is coprime to palette length (64)
  // step=19 ensures all 64 colors are visited before repeating
  const STEP = 19;
  return NOTE_COLORS[(index * STEP) % NOTE_COLORS.length];
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
      preview: decrypt(note.encryptedDescription).slice(0, 120),
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
      preview: decrypt(note.encryptedDescription).slice(0, 120),
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

router.post('/recolor-all', async (req, res) => {
  try {
    const updated = await recolorAllNotes(req.user.mobile, NOTE_COLORS);
    res.json({ message: `Recolored ${updated} notes` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    // Count existing notes so new note gets the next color in the rotation
    const existingNotes = await getNotesByUser(req.user.mobile);
    const now = new Date().toISOString();
    const note = {
      id: uuidv4(),
      userId: req.user.mobile,
      encryptedTitle: encrypt(title.trim()),
      encryptedDescription: encrypt(description?.trim() || ''),
      color: pickColor(existingNotes.length),
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

router.delete('/:id', async (req, res) => {
  try {
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
