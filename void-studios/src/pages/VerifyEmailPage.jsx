import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useSeo } from '../lib/seo'

// Activation landing page — the emailed link points here with ?token=…
// GET /auth/verify-email runs once on mount (StrictMode-safe via a ref guard).
export default function VerifyEmailPage() {
  useSeo({ title: 'Activate Account', path: '/verify-email', noindex: true })
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [state, setState] = useState(token ? 'working' : 'missing') // working | ok | error | missing
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendNote, setResendNote] = useState('')
  const ranRef = useRef(false)

  useEffect(() => {
    if (!token || ranRef.current) return
    ranRef.current = true
    api
      .verifyEmail(token)
      .then((data) => {
        setState('ok')
        setMessage(data?.email ? `${data.email} is activated.` : 'Your account is activated.')
      })
      .catch((err) => {
        setState('error')
        setMessage(err.message || 'This activation link is invalid or has expired.')
      })
  }, [token])

  const resend = async (e) => {
    e.preventDefault()
    setResendNote('')
    if (!/^\S+@\S+\.\S+$/.test(resendEmail)) return setResendNote('Enter a valid email address.')
    try {
      const data = await api.resendVerification(resendEmail)
      setResendNote(data?.delivered === false ? 'Could not send right now — try again shortly.' : 'New activation link sent — check your inbox.')
    } catch {
      setResendNote('Could not send right now — try again shortly.')
    }
  }

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell flex justify-center py-16 sm:py-20">
        <div className="w-full max-w-md border border-line-soft bg-white p-8 text-center sm:p-10">
          <h1 className="ak-section-title">Activate Account</h1>

          {state === 'working' && (
            <p className="mt-6 text-[13px] text-ink-soft">Checking your activation link…</p>
          )}

          {state === 'ok' && (
            <div className="mt-6 space-y-5">
              <p className="text-[13px] leading-relaxed">
                Done — {message} Your account is active and ready to shop the drop.
              </p>
              <Link to="/login" className="ak-btn-dark inline-flex w-full justify-center">Log In</Link>
            </div>
          )}

          {state === 'error' && (
            <div className="mt-6 space-y-5">
              <p className="text-[13px] leading-relaxed text-accent">{message}</p>
              <form onSubmit={resend} className="space-y-3 text-left">
                <label htmlFor="resend-email" className="ak-label">Your account email</label>
                <input
                  id="resend-email"
                  type="email"
                  className="ak-input"
                  placeholder="you@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                />
                {resendNote && <p className="text-[12px] font-medium text-ink">{resendNote}</p>}
                <button type="submit" className="ak-btn-dark w-full">Resend Activation Link</button>
              </form>
            </div>
          )}

          {state === 'missing' && (
            <p className="mt-6 text-[13px] text-ink-soft">
              This page needs an activation link from your welcome email.
            </p>
          )}

          <p className="mt-6 text-center text-[12px] text-ink-soft">
            <Link to="/" className="font-semibold text-ink underline underline-offset-4">Back to the store</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
