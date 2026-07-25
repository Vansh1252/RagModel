import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import { useAuthStore } from '../../store/authStore'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function LoginForm() {
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
      setAccessToken(res.data.accessToken)
      navigate('/chat')
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="text-center mb-2">
        <div className="text-4xl font-black text-[#FFD700] tracking-tight mb-1">RAG AI</div>
        <p className="text-[#999] text-sm">Sign in to your account</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        required
        autoFocus
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        required
      />

      <Button type="submit" loading={loading} className="w-full mt-1">
        Sign In
      </Button>

      <p className="text-center text-sm text-[#999]">
        No account?{' '}
        <Link to="/register" className="text-[#FFD700] hover:text-[#B8960C] font-medium">
          Register
        </Link>
      </p>
    </form>
  )
}
