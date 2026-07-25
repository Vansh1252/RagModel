import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  withCredentials: true,
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401
let refreshing: Promise<void> | null = null

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (!refreshing) {
        refreshing = api
          .post<{ accessToken: string }>('/api/auth/refresh')
          .then((res) => {
            useAuthStore.getState().setAccessToken(res.data.accessToken)
          })
          .catch(() => {
            useAuthStore.getState().logout()
          })
          .finally(() => {
            refreshing = null
          })
      }

      await refreshing

      const newToken = useAuthStore.getState().accessToken
      if (newToken) {
        original.headers = original.headers ?? {}
        original.headers['Authorization'] = `Bearer ${newToken}`
        return api(original)
      }
    }

    return Promise.reject(error)
  }
)
