import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useSeo } from '../lib/seo'

export default function ForgotPasswordPage() {
  useSeo({ title: 'Forgot Password', path: '/forgot-password', noindex: true })
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.')
    setBusy(true)
    setError('')
    try {
      await api.forgotPassword(email)
      setSent(true) // same response whether or not the email exists — never leak it
    } catch (err) {
      setError(err.message || 'Something went wrong — try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell flex justify-center py-16 sm:py-20">
        <div className="w-full max-w-md border border-line-soft bg-white p-8 sm:p-10">
          <h1 className="ak-section-title text-center">Forgot Password</h1>
          <p className="mt-2 text-center text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            We&apos;ll send you a reset link
          </p>

          {sent ? (
            <div className="mt-8 space-y-4 text-center">
              <p className="text-[13px] leading-relaxed">
                If that email is registered, a password reset link is on its way.
                It expires in <strong>15 minutes</strong>.
              </p>
              <p className="text-[12px] text-ink-soft">
                Didn&apos;t get it? Check spam, or{' '}
                <button type="button" onClick={() => setSent(false)} className="font-semibold text-ink underline underline-offset-4">
                  try again
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
              <div>
                <label htmlFor="forgot-email" className="ak-label">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ak-input"
                  placeholder="you@example.com"
                />
              </div>

              {error && <p className="text-[12px] font-medium text-accent">{error}</p>}

              <button type="submit" disabled={busy} className="ak-btn-dark w-full disabled:opacity-50">
                {busy ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-[12px] text-ink-soft">
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-ink underline underline-offset-4">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
