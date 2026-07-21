# SafeNotes - Secure Encrypted Notes App

A mobile-responsive React TypeScript application for storing encrypted notes (keys, passkeys, important data) with Google Sheets as the database.

## Features

- **AES-256-GCM Encryption** - All note titles and descriptions are encrypted before storage
- **Sticky Note Dashboard** - Notes displayed as colorful sticky notes on a whiteboard
- **Google Sheets Database** - All data stored in your own Google Sheet
- **Email OTP Authentication** - Login with mobile + 4-digit password, verified via email OTP
- **Secure Delete** - Deleting notes requires email OTP verification
- **Mobile Responsive** - Works on phones, tablets, and desktops

## Project Structure

```
SafeNote_App/
├── backend/          # Node.js Express API
│   └── src/
│       ├── services/ # Encryption, Google Sheets, Email, Auth
│       ├── routes/   # API endpoints
│       └── middleware/
├── frontend/         # React TypeScript UI
│   └── src/
│       ├── pages/    # Login, Dashboard
│       ├── components/
│       └── services/
└── package.json      # Root scripts
```

## Setup Instructions

### 1. Google Sheets Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable **Google Sheets API**
4. Create a **Service Account**:
   - IAM & Admin → Service Accounts → Create
   - Download the JSON key file
5. Create a new Google Sheet
6. Share the sheet with the service account email (Editor access)
7. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`

### 2. Gmail App Password (for OTP emails)

1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account → Security → App Passwords
3. Generate an app password for "Mail"
4. Use this password in `SMTP_PASS`

### 3. Environment Configuration

Copy the example env file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PORT=5000
ENCRYPTION_KEY=your-super-secret-encryption-key-min-32-chars!!
JWT_SECRET=your-jwt-secret-key-change-this-in-production

GOOGLE_SHEETS_ID=your-sheet-id-from-url
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=kollurukv@gmail.com
SMTP_PASS=your-gmail-app-password

OWNER_EMAIL=kollurukv@gmail.com
FRONTEND_URL=http://localhost:5173
```

**Important:** Choose a strong `ENCRYPTION_KEY` (minimum 32 characters). This is your personal key used to encrypt/decrypt all notes. Never share it.

### 4. Install & Run

```bash
# Install all dependencies
npm run install:all

# Run both frontend and backend
npm run dev
```

Or run separately:

```bash
# Terminal 1 - Backend API (port 5000)
npm run dev:backend

# Terminal 2 - Frontend (port 5173)
npm run dev:frontend
```

Open http://localhost:5173 in your browser.

## Usage

1. **Register** - Enter your 10-digit mobile number, 4-digit password, and email
2. **Verify OTP** - Check your email for the 6-digit OTP
3. **Create Notes** - Click "+ New Note" on the dashboard
4. **View Notes** - Click any sticky note tile to view decrypted content
5. **Edit/Delete** - Use the edit and delete icons in view mode
6. **Delete OTP** - Deleting requires email OTP verification

## Security

| Feature | Implementation |
|---------|---------------|
| Encryption | AES-256-GCM with PBKDF2 key derivation (100,000 iterations) |
| Password Storage | PBKDF2-SHA512 hashed with random salt |
| OTP Storage | SHA-256 hashed, 10-minute expiry, single use |
| Session | JWT tokens with 24-hour expiry |
| Delete Protection | Email OTP required before deletion |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with mobile + password |
| POST | `/api/auth/register/verify` | Verify registration OTP |
| POST | `/api/auth/login` | Login with mobile + password |
| POST | `/api/auth/login/verify` | Verify login OTP |
| GET | `/api/notes` | List all notes (titles only) |
| GET | `/api/notes/:id` | Get single note (decrypted) |
| POST | `/api/notes` | Create new note |
| PUT | `/api/notes/:id` | Update note |
| POST | `/api/notes/:id/delete-otp` | Request delete OTP |
| DELETE | `/api/notes/:id` | Delete note (requires OTP) |

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, React Router
- **Backend:** Node.js, Express
- **Database:** Google Sheets API
- **Encryption:** Node.js crypto (AES-256-GCM)
- **Email:** Nodemailer (Gmail SMTP)
