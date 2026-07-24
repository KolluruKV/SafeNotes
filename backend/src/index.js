import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';
import adminRoutes from './routes/admin.js';
import { initializeSheets } from './services/sheets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
const PORT = process.env.PORT || 5000;

// Allow the frontend origin in both dev and prod (now separate services).
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/admin', adminRoutes);

// Serve built frontend in production
if (IS_PROD) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    console.log('Connecting to Google Sheets...');
    await Promise.race([
      initializeSheets(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Google Sheets connection timed out after 15s. Check GOOGLE_SHEETS_ID and service account permissions.')), 15000)),
    ]);
    console.log('Google Sheets initialized');

    app.listen(PORT, () => {
      console.log(`SafeNotes running on http://localhost:${PORT} [${IS_PROD ? 'production' : 'development'}]`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
