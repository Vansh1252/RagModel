import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/auth.service'
import { useAuthStore } from '../store/authStore'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const setAccessToken = useAuthStore((s) => s.setAccessToken)

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await authService.login(form)
      const token = res.data.accessToken

      // Decode role from JWT payload
      const part = token.split('.')[1]
      const role = part
        ? (JSON.parse(atob(part)) as { role?: string }).role
        : undefined

      if (role !== 'admin') {
        setError('Access denied — admin account required')
        setLoading(false)
        return
      }

      setAccessToken(token)
      navigate('/admin')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Login failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#FFD700]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="text-center mb-2">
              <div className="text-4xl font-black text-[#FFD700] tracking-tight mb-1">RAG AI</div>
              <p className="text-[#999] text-sm">Admin Access</p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#999] uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                placeholder="admin@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoFocus
                className="bg-[#111] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#FFD700]/50 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#999] uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="bg-[#111] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#FFD700]/50 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full bg-[#FFD700] hover:bg-[#B8960C] disabled:opacity-50 text-black font-bold rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign In as Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
