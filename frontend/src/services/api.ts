import axios from 'axios';
import type { Note, NoteSummary, SharedNoteSummary, SharedNote, ShareEntry, UserItem, AuthResponse, MessageResponse } from '../types';

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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (mobile: string, password: string, email?: string) =>
    api.post<MessageResponse>('/auth/register', { mobile, password, email }),

  verifyRegister: (mobile: string, password: string, otp: string, email?: string) =>
    api.post<AuthResponse>('/auth/register/verify', { mobile, password, email, otp }),

  login: (mobile: string, password: string) =>
    api.post<MessageResponse>('/auth/login', { mobile, password }),

  verifyLogin: (mobile: string, otp: string) =>
    api.post<AuthResponse>('/auth/login/verify', { mobile, otp }),
};

export const notesApi = {
  getAll: () => api.get<NoteSummary[]>('/notes'),

  getById: (id: string) => api.get<Note>(`/notes/${id}`),

  create: (title: string, description: string) =>
    api.post<Note>('/notes', { title, description }),

  update: (id: string, title: string, description: string) =>
    api.put<Note>(`/notes/${id}`, { title, description }),

  requestDeleteOtp: (id: string) =>
    api.post<MessageResponse>(`/notes/${id}/delete-otp`),

  delete: (id: string, otp: string) =>
    api.delete<MessageResponse>(`/notes/${id}`, { data: { otp } }),

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
