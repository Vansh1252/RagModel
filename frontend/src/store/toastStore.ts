import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

interface ToastState {
  toasts: Toast[]
  addToast: (message: string, type?: 'success' | 'error') => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'success') =>
    set((s) => ({ toasts: [...s.toasts, { id: Date.now().toString(), message, type }] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
