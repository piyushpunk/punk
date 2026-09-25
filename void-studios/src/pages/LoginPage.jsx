import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useSeo } from '../lib/seo'

export default function LoginPage() {
  useSeo({
    title: 'Log In',
    description: 'Log in to your AKUMA account to track orders, save your wishlist and check out faster.',
    path: '/login',
  })
  const { login, toast } = useStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    setBusy(true)
    setError('')
    try {
      const user = await login(form.email, form.password)
      toast(`Welcome back, ${user.name}`)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed — check your credentials.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell flex justify-center py-16 sm:py-20">
        <div className="w-full max-w-md border border-line-soft bg-white p-8 sm:p-10">
          <h1 className="ak-section-title text-center">Log In</h1>
          <p className="mt-2 text-center text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            Members see drops first
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="login-email" className="ak-label">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="ak-input"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="ak-label">Password</label>
                <Link to="/forgot-password" className="text-[10px] uppercase tracking-[0.16em] text-ink-soft underline-offset-4 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="ak-input"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-[12px] font-medium text-accent">{error}</p>}

            <button type="submit" disabled={busy} className="ak-btn-dark w-full disabled:opacity-50">
              {busy ? 'Logging in…' : 'Log In'}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-ink-soft">
            New here?{' '}
            <Link to="/register" className="font-semibold text-ink underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
