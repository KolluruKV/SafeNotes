import axios from 'axios';
import type { Note, NoteSummary, SharedNoteSummary, SharedNote, ShareEntry, UserItem, AuthResponse, PreAuthResponse, MessageResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
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
};

export const usersApi = {
  getAll: () => api.get<UserItem[]>('/auth/users'),
};

export default api;
