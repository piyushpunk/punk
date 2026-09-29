import { useRef, useState } from 'react'
import { useStore } from '../context/StoreContext'
import { api } from '../lib/api'
import { compressImage } from '../lib/imageUpload'
import { SITE_MEDIA_SLOTS, resolveMedia } from '../content/content'

// ── Site Media manager ──────────────────────────────────────────────
// Lets the owner replace fixed storefront imagery (hero, campaign,
// editorial, menu tiles) without a code change. Uploads go through the
// backend to Cloudinary; applySiteMedia updates the store context so
// the whole storefront — header tiles included — reflects the change
// instantly, no reload.
export default function SiteMediaManager() {
  const { siteMedia, applySiteMedia, toast } = useStore()
  const [busyKey, setBusyKey] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const activeKeyRef = useRef(null)

  const pick = (key) => {
    activeKeyRef.current = key
    setError(null)
    inputRef.current?.click()
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file later
    const key = activeKeyRef.current
    if (!file || !key) return
    setBusyKey(key)
    setError(null)
    try {
      const data = await api.setSiteMedia(key, await compressImage(file))
      applySiteMedia(key, data?.url)
      toast('Image updated — live on the store now')
    } catch (err) {
      setError(`${err.message || 'Upload failed'} (slot: ${key})`)
    } finally {
      setBusyKey(null)
    }
  }

  const reset = async (key) => {
    setBusyKey(key)
    setError(null)
    try {
      await api.resetSiteMedia(key)
      applySiteMedia(key, null)
      toast('Reset to the built-in default image')
    } catch (err) {
      setError(err.message || 'Reset failed')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <section className="border border-ink bg-bg-primary p-6 lg:p-8">
      <div>
        <h2 className="text-lg font-semibold uppercase tracking-[0.14em]">Site Media</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Post or edit the images in fixed spots — hero banner, campaign, archive
          editorial and the menu tiles. Uploads go live instantly.
        </p>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {error && (
        <p className="mt-4 border border-accent bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {SITE_MEDIA_SLOTS.map((s) => {
          const current = resolveMedia(siteMedia, s.key)
          const isCustom = Boolean(siteMedia[s.key])
          const busy = busyKey === s.key
          return (
            <div key={s.key} className="border border-line-soft bg-bg-primary">
              <div className="aspect-[4/3] overflow-hidden bg-bg-secondary">
                {current ? (
                  <img src={current} alt={s.label} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                    No image yet
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em]">{s.label}</p>
                  {isCustom && (
                    <span className="bg-olive px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-bg-primary">
                      Custom
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-soft">{s.hint}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busyKey !== null}
                    onClick={() => pick(s.key)}
                    className="ak-btn-dark flex-1 px-3 py-2 text-[11px] disabled:opacity-40"
                  >
                    {busy ? 'Uploading…' : isCustom ? 'Replace' : 'Upload'}
                  </button>
                  {isCustom && (
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() => reset(s.key)}
                      className="ak-btn-outline px-3 py-2 text-[11px] disabled:opacity-40"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
