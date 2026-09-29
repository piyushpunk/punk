import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloseIcon, SearchIcon } from './Icons'
import { useStore } from '../context/StoreContext'
import { productHref } from '../lib/adapter'

// Fullscreen search overlay. Typing filters the catalog live;
// submitting routes to /search?q=… for the full results page.
export default function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { catalog } = useStore()

  useEffect(() => {
    if (open) {
      setQ('')
      setTimeout(() => inputRef.current?.focus(), 50)
      const onKey = (e) => e.key === 'Escape' && onClose()
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const suggestions = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    return catalog.filter((p) =>
      `${p.name} ${p.category} ${p.subcategory}`.toLowerCase().includes(term),
    ).slice(0, 6)
  }, [q, catalog])

  if (!open) return null

  const submit = (e) => {
    e.preventDefault()
    if (!q.trim()) return
    navigate(`/search?q=${encodeURIComponent(q.trim())}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] bg-bg-primary/95 backdrop-blur-sm">
      <div className="ak-shell flex h-full flex-col pt-8">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-ink-soft">
            Search AKUMA
          </span>
          <button type="button" onClick={onClose} aria-label="Close search" className="p-2 hover:opacity-60">
            <CloseIcon size={22} />
          </button>
        </div>

        <form onSubmit={submit} className="mt-10 flex items-center gap-4 border-b border-ink pb-4">
          <SearchIcon size={24} className="shrink-0 text-ink-soft" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            className="w-full bg-transparent text-2xl font-light tracking-wide placeholder:text-ink-soft/50 focus:outline-none sm:text-3xl"
          />
        </form>

        {suggestions.length > 0 && (
          <ul className="mt-6 max-w-xl divide-y divide-line-soft">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-3 text-left text-sm hover:opacity-60"
                  onClick={() => {
                    navigate(productHref(p))
                    onClose()
                  }}
                >
                  <span>{p.name}</span>
                  <span className="text-xs uppercase tracking-widest text-ink-soft">
                    {p.category}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
