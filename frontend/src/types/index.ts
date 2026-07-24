export interface NoteSummary {
  id: string;
  title: string;
  preview?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  isShared?: boolean;
}

export interface Note extends NoteSummary {
  description: string;
}

export interface SharedNoteSummary extends NoteSummary {
  ownerMobile: string;
  permissions: string[];
}

export interface SharedNote extends Note {
  ownerMobile: string;
  permissions: string[];
}

export interface ShareEntry {
  mobile: string;
  permissions: string[];
}

export interface UserItem {
  mobile: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  message: string;
}

export interface PreAuthResponse {
  preAuthToken: string;
  email: string;
  message: string;
}

export interface MessageResponse {
  message: string;
}

export interface ApiError {
  error: string;
}

// ── Admin types ──────────────────────────────────────────────────────────────
export interface AdminUser {
  mobile: string;
  email: string;
  status: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  deletedUsers: number;
  totalNotes: number;
  totalShares: number;
}
