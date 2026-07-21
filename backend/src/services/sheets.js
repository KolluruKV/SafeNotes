import crypto from 'crypto';
import { google } from 'googleapis';

const SHEETS = {
  USERS: 'Users',
  NOTES: 'Notes',
  OTPS: 'OTPs',
  SHARES: 'Shares',
};

const USER_HEADERS = ['mobile', 'passwordHash', 'email', 'status', 'createdAt'];
const NOTE_HEADERS = ['id', 'userId', 'encryptedTitle', 'encryptedDescription', 'color', 'createdAt', 'updatedAt'];
const OTP_HEADERS = ['id', 'mobile', 'otpHash', 'purpose', 'noteId', 'expiresAt', 'used'];
const SHARE_HEADERS = ['id', 'noteId', 'ownerMobile', 'sharedWithMobile', 'permissions', 'createdAt'];

let sheetsClient = null;

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheets() {
  if (!sheetsClient) {
    const auth = getAuth();
    sheetsClient = google.sheets({ version: 'v4', auth });
  }
  return sheetsClient;
}

function getSpreadsheetId() {
  return process.env.GOOGLE_SHEETS_ID;
}

async function ensureSheetExists(sheetName, headers) {
  const sheets = await getSheets();
  const spreadsheetId = getSpreadsheetId();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets?.find((s) => s.properties?.title === sheetName);

  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
  } else {
    // Update header row if schema has grown (e.g. new columns added)
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });
    const existingHeaders = headerRes.data.values?.[0] || [];
    if (existingHeaders.length < headers.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    }
  }
}

export async function initializeSheets() {
  await ensureSheetExists(SHEETS.USERS, USER_HEADERS);
  await ensureSheetExists(SHEETS.NOTES, NOTE_HEADERS);
  await ensureSheetExists(SHEETS.OTPS, OTP_HEADERS);
  await ensureSheetExists(SHEETS.SHARES, SHARE_HEADERS);
}

async function getAllRows(sheetName) {
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A:Z`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) return [];

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] || '';
    });
    return obj;
  });
}

async function appendRow(sheetName, values) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A:Z`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}

async function updateRow(sheetName, rowIndex, values) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A${rowIndex + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}

async function deleteRow(sheetName, rowIndex) {
  const sheets = await getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: getSpreadsheetId() });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === sheetName);
  const sheetId = sheet?.properties?.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex + 1, endIndex: rowIndex + 2 },
        },
      }],
    },
  });
}

export async function findUserByMobile(mobile) {
  const users = await getAllRows(SHEETS.USERS);
  return users.find((u) => u.mobile === mobile) || null;
}

export async function createUser(mobile, passwordHash, email) {
  await appendRow(SHEETS.USERS, [mobile, passwordHash, email, 'active', new Date().toISOString()]);
}

export async function getNotesByUser(userId) {
  const notes = await getAllRows(SHEETS.NOTES);
  return notes.filter((n) => n.userId === userId);
}

export async function getNoteById(noteId, userId) {
  const notes = await getAllRows(SHEETS.NOTES);
  return notes.find((n) => n.id === noteId && n.userId === userId) || null;
}

export async function createNote(note) {
  await appendRow(SHEETS.NOTES, [
    note.id,
    note.userId,
    note.encryptedTitle,
    note.encryptedDescription,
    note.color,
    note.createdAt,
    note.updatedAt,
  ]);
}

export async function updateNote(noteId, userId, updates) {
  const notes = await getAllRows(SHEETS.NOTES);
  const index = notes.findIndex((n) => n.id === noteId && n.userId === userId);
  if (index === -1) return false;

  const note = { ...notes[index], ...updates, updatedAt: new Date().toISOString() };
  await updateRow(SHEETS.NOTES, index, [
    note.id,
    note.userId,
    note.encryptedTitle,
    note.encryptedDescription,
    note.color,
    note.createdAt,
    note.updatedAt,
  ]);
  return true;
}

export async function deleteNote(noteId, userId) {
  const notes = await getAllRows(SHEETS.NOTES);
  const index = notes.findIndex((n) => n.id === noteId && n.userId === userId);
  if (index === -1) return false;

  await deleteRow(SHEETS.NOTES, index);
  return true;
}

export async function saveOTP(mobile, otpHash, purpose, noteId = '', expiresAt) {
  const id = crypto.randomUUID();
  await appendRow(SHEETS.OTPS, [id, mobile, otpHash, purpose, noteId, expiresAt, 'false']);
  return id;
}

export async function verifyOTP(mobile, otp, purpose, noteId = '') {
  const otps = await getAllRows(SHEETS.OTPS);
  const now = new Date();

  const match = otps.find((o) =>
    o.mobile === mobile &&
    o.purpose === purpose &&
    o.used === 'false' &&
    new Date(o.expiresAt) > now &&
    (noteId ? o.noteId === noteId : true)
  );

  if (!match) return false;

  const { hashOTP } = await import('./encryption.js');
  if (hashOTP(otp) !== match.otpHash) return false;

  const index = otps.indexOf(match);
  await updateRow(SHEETS.OTPS, index, [
    match.id, match.mobile, match.otpHash, match.purpose, match.noteId, match.expiresAt, 'true',
  ]);

  return true;
}

export async function getAllUsers() {
  const users = await getAllRows(SHEETS.USERS);
  return users.map((u) => ({ mobile: u.mobile, email: u.email || '' }));
}

function parsePermissions(raw) {
  // Guard against old rows where the permissions column held a date string
  if (!raw || /^\d{4}-/.test(raw)) return ['view'];
  return raw.split(',').filter(Boolean);
}

export async function getSharesByOwner(ownerMobile) {
  const shares = await getAllRows(SHEETS.SHARES);
  return shares.filter((s) => s.ownerMobile === ownerMobile);
}

export async function getSharesByNote(noteId, ownerMobile) {
  const shares = await getAllRows(SHEETS.SHARES);
  return shares
    .filter((s) => s.noteId === noteId && s.ownerMobile === ownerMobile)
    .map((s) => ({ mobile: s.sharedWithMobile, permissions: parsePermissions(s.permissions) }));
}

export async function setSharesForNote(noteId, ownerMobile, shares) {
  // shares = [{ mobile, permissions: ['view', 'edit', 'delete'] }]
  const allShares = await getAllRows(SHEETS.SHARES);
  const existing = allShares
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.noteId === noteId && s.ownerMobile === ownerMobile)
    .reverse();

  for (const { i } of existing) {
    await deleteRow(SHEETS.SHARES, i);
  }

  for (const share of shares) {
    const id = crypto.randomUUID();
    const perms = Array.isArray(share.permissions) ? share.permissions.join(',') : 'view';
    await appendRow(SHEETS.SHARES, [id, noteId, ownerMobile, share.mobile, perms, new Date().toISOString()]);
  }
}

export async function getSharedNotesByUser(mobile) {
  const shares = await getAllRows(SHEETS.SHARES);
  const userShares = shares.filter((s) => s.sharedWithMobile === mobile);
  if (userShares.length === 0) return [];

  const notes = await getAllRows(SHEETS.NOTES);
  return userShares
    .map((share) => {
      const note = notes.find((n) => n.id === share.noteId);
      if (!note) return null;
      return { ...note, ownerMobile: share.ownerMobile, permissions: parsePermissions(share.permissions) };
    })
    .filter(Boolean);
}

export async function getSharedNoteById(noteId, requestingMobile) {
  const shares = await getAllRows(SHEETS.SHARES);
  const share = shares.find((s) => s.noteId === noteId && s.sharedWithMobile === requestingMobile);
  if (!share) return null;

  const notes = await getAllRows(SHEETS.NOTES);
  const note = notes.find((n) => n.id === noteId);
  if (!note) return null;

  return { ...note, ownerMobile: share.ownerMobile, permissions: parsePermissions(share.permissions) };
}
