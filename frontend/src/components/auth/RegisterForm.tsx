import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import { useAuthStore } from '../../store/authStore'
import Button from '../ui/Button'
import Input from '../ui/Input'

function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']

  if (!password) return null

  return (
    <div className="flex gap-1 items-center mt-0.5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all ${
            i <= score ? (colors[score] ?? 'bg-[#3A3A3A]') : 'bg-[#2A2A2A]'
          }`}
        />
      ))}
      <span className="text-xs text-[#999] ml-1 w-12">{labels[score]}</span>
    </div>
  )
}

export default function RegisterForm() {
  const navigate = useNavigate()
  const setAccessToken = useAuthStore((s) => s.setAccessToken)

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const res = await authService.register({
        name: form.name,
        email: form.email,
        password: form.password,
      })
      setAccessToken(res.data.accessToken)
      navigate('/chat')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Registration failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="text-center mb-2">
        <div className="text-4xl font-black text-[#FFD700] tracking-tight mb-1">RAG AI</div>
        <p className="text-[#999] text-sm">Create your account</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Input
        label="Name"
        type="text"
        placeholder="Your name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        autoFocus
      />

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        required
      />

      <div className="flex flex-col gap-1.5">
        <Input
          label="Password"
          type="password"
          placeholder="Min 8 characters"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={8}
        />
        <PasswordStrength password={form.password} />
      </div>

      <Input
        label="Confirm Password"
        type="password"
        placeholder="Repeat password"
        value={form.confirm}
        onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        required
        error={form.confirm && form.password !== form.confirm ? 'Passwords do not match' : undefined}
      />

      <Button type="submit" loading={loading} className="w-full mt-1">
        Create Account
      </Button>

      <p className="text-center text-sm text-[#999]">
        Already have an account?{' '}
        <Link to="/login" className="text-[#FFD700] hover:text-[#B8960C] font-medium">
          Sign In
        </Link>
      </p>
    </form>
  )
}
