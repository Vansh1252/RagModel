import { create } from 'zustand'

interface AuthState {
  accessToken: string | null
  isAuthenticated: boolean
  role: 'user' | 'admin' | null
  setAccessToken: (token: string) => void
  logout: () => void
}

function parseRole(token: string): 'user' | 'admin' {
  try {
    const part = token.split('.')[1]
    if (!part) return 'user'
    const payload = JSON.parse(atob(part)) as { role?: string }
    return payload.role === 'admin' ? 'admin' : 'user'
  } catch {
    return 'user'
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isAuthenticated: false,
  role: null,

  setAccessToken: (token) =>
    set({ accessToken: token, isAuthenticated: true, role: parseRole(token) }),

  logout: () =>
    set({ accessToken: null, isAuthenticated: false, role: null }),
}))
