import { api } from './api'

interface AuthResponse {
  accessToken: string
}

export const authService = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post<AuthResponse>('/api/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/api/auth/login', data),

  logout: () => api.delete('/api/auth/logout'),

  refresh: () => api.post<AuthResponse>('/api/auth/refresh'),
}
