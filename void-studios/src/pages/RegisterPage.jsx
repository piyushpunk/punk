import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useSeo } from '../lib/seo'

export default function RegisterPage() {
  useSeo({
    title: 'Create Account',
    description: 'Create an AKUMA account — first access to limited drops, order tracking and a saved wishlist.',
    path: '/register',
  })
  const { register, toast } = useStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', terms: false })
  const [error, setError] = useState('')

  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Enter your name.')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (form.password !== form.confirm) return setError('Passwords don’t match.')
    if (!form.terms) return setError('Please accept the terms to continue.')
    setBusy(true)
    setError('')
    try {
      await register(form.name.trim(), form.email, form.password)
      toast(`Welcome to AKUMA, ${form.name.split(' ')[0]}`)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Could not create your account.')
    } finally {
      setBusy(false)
    }
  }

  const field = (id, label, type, extra = {}) => (
    <div>
      <label htmlFor={id} className="ak-label">{label}</label>
      <input
        id={id}
        type={type}
        className="ak-input"
        value={form[extra.key]}
        onChange={(e) => setForm({ ...form, [extra.key]: e.target.value })}
        {...extra.props}
      />
    </div>
  )

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell flex justify-center py-16 sm:py-20">
        <div className="w-full max-w-md border border-line-soft bg-white p-8 sm:p-10">
          <h1 className="ak-section-title text-center">Create Account</h1>
          <p className="mt-2 text-center text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            First access to limited drops
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            {field('reg-name', 'Name', 'text', { key: 'name', props: { autoComplete: 'name', placeholder: 'Your name' } })}
            {field('reg-email', 'Email', 'email', { key: 'email', props: { autoComplete: 'email', placeholder: 'you@example.com' } })}
            {field('reg-password', 'Password', 'password', { key: 'password', props: { autoComplete: 'new-password', placeholder: '6+ characters' } })}
            {field('reg-confirm', 'Confirm Password', 'password', { key: 'confirm', props: { autoComplete: 'new-password', placeholder: 'Repeat password' } })}

            <label className="flex items-start gap-3 text-[12px] text-ink-soft">
              <input
                type="checkbox"
                checked={form.terms}
                onChange={(e) => setForm({ ...form, terms: e.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
              />
              <span>
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-4">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-4">
                  Privacy Policy
                </a>.
              </span>
            </label>

            {error && <p className="text-[12px] font-medium text-accent">{error}</p>}

            <button type="submit" disabled={busy} className="ak-btn-dark w-full disabled:opacity-50">
              {busy ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-ink-soft">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-ink underline underline-offset-4">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
