import axios from 'axios';
import type { Note, NoteSummary, SharedNoteSummary, SharedNote, ShareEntry, UserItem, AuthResponse, PreAuthResponse, MessageResponse, AdminUser, AdminStats } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    // Retry once on 5xx (cold-start on Render free tier)
    if (status >= 500 && !error.config._retried) {
      error.config._retried = true;
      await new Promise((r) => setTimeout(r, 3000)); // wait 3s then retry
      return api(error.config);
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (mobile: string, password: string, email?: string) =>
    api.post<AuthResponse>('/auth/register', { mobile, password, email }),

  login: (mobile: string, password: string) =>
    api.post<PreAuthResponse>('/auth/login', { mobile, password }),

  completeLogin: (preAuthToken: string, otp: string) =>
    api.post<AuthResponse>('/auth/complete-login', { preAuthToken, otp }),
};

export const notesApi = {
  getAll: () => api.get<NoteSummary[]>('/notes'),

  getById: (id: string) => api.get<Note>(`/notes/${id}`),

  create: (title: string, description: string) =>
    api.post<Note>('/notes', { title, description }),

  update: (id: string, title: string, description: string) =>
    api.put<Note>(`/notes/${id}`, { title, description }),

  delete: (id: string) =>
    api.delete<MessageResponse>(`/notes/${id}`),

  getShares: (id: string) => api.get<ShareEntry[]>(`/notes/${id}/shares`),

  updateShares: (id: string, sharedWith: ShareEntry[]) =>
    api.put<{ sharedWith: ShareEntry[] }>(`/notes/${id}/shares`, { sharedWith }),

  getShared: () => api.get<SharedNoteSummary[]>('/notes/shared'),

  getSharedById: (id: string) => api.get<SharedNote>(`/notes/shared/${id}`),

  editShared: (id: string, title: string, description: string) =>
    api.put<SharedNote>(`/notes/shared/${id}`, { title, description }),

  deleteShared: (id: string) =>
    api.delete<MessageResponse>(`/notes/shared/${id}`),

  recolorAll: () =>
    api.post<{ message: string }>('/notes/recolor-all'),
};

export const usersApi = {
  getAll: () => api.get<UserItem[]>('/auth/users'),
};

export interface UserProfile {
  mobile: string;
  email: string;
  firstName: string;
  surname: string;
  address: string;
}

export const profileApi = {
  get: () => api.get<UserProfile>('/auth/profile'),
  update: (data: Partial<Pick<UserProfile, 'firstName' | 'surname' | 'address'>>) =>
    api.put<{ message: string }>('/auth/profile', data),
};

// ── Admin API (separate axios instance using sessionStorage token) ───────────
const adminAxios = axios.create({
  baseURL: '/api/admin',
  headers: { 'Content-Type': 'application/json' },
});

adminAxios.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const adminApi = {
  login: (pin: string) =>
    adminAxios.post<{ token: string; message: string }>('/login', { pin }),

  createUser: (mobile: string, password: string, email: string) =>
    adminAxios.post<MessageResponse>('/users', { mobile, password, email }),

  getUsers: () =>
    adminAxios.get<AdminUser[]>('/users'),

  updateUser: (mobile: string, updates: { email?: string; status?: string }) =>
    adminAxios.put<MessageResponse>(`/users/${encodeURIComponent(mobile)}`, updates),

  softDelete: (mobile: string) =>
    adminAxios.delete<MessageResponse>(`/users/${encodeURIComponent(mobile)}/soft`),

  restoreUser: (mobile: string) =>
    adminAxios.post<MessageResponse>(`/users/${encodeURIComponent(mobile)}/restore`),

  hardDelete: (mobile: string) =>
    adminAxios.delete<MessageResponse>(`/users/${encodeURIComponent(mobile)}/hard`),

  getStats: () =>
    adminAxios.get<AdminStats>('/stats'),
};

export default api;
