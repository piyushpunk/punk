import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useSeo } from '../lib/seo'
import { useStore } from '../context/StoreContext'

export default function ResetPasswordPage() {
  useSeo({ title: 'Reset Password', path: '/reset-password', noindex: true })
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const { toast } = useStore()

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    setBusy(true)
    setError('')
    try {
      await api.resetPassword(token, form.password)
      setDone(true)
      toast('Password reset — log in with your new password')
      setTimeout(() => navigate('/login'), 1800)
    } catch (err) {
      setError(err.message || 'Reset failed — the link may have expired.')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <div className="bg-bg-primary">
        <div className="ak-shell flex justify-center py-16 sm:py-20">
          <div className="w-full max-w-md border border-line-soft bg-white p-8 sm:p-10 text-center">
            <h1 className="ak-section-title">Invalid Link</h1>
            <p className="mt-3 text-[13px] text-ink-soft">
              This reset link is missing its token. Request a fresh one.
            </p>
            <Link to="/forgot-password" className="ak-btn-dark mt-6 inline-block">
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell flex justify-center py-16 sm:py-20">
        <div className="w-full max-w-md border border-line-soft bg-white p-8 sm:p-10">
          <h1 className="ak-section-title text-center">Reset Password</h1>
          <p className="mt-2 text-center text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            Choose a new password
          </p>

          {done ? (
            <p className="mt-8 text-center text-[13px]">
              Password updated. Redirecting you to log in…
            </p>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
              <div>
                <label htmlFor="reset-password" className="ak-label">New password</label>
                <input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="ak-input"
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label htmlFor="reset-confirm" className="ak-label">Confirm password</label>
                <input
                  id="reset-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  className="ak-input"
                  placeholder="Repeat it"
                />
              </div>

              {error && <p className="text-[12px] font-medium text-accent">{error}</p>}

              <button type="submit" disabled={busy} className="ak-btn-dark w-full disabled:opacity-50">
                {busy ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
