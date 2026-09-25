import { useEffect, useState } from 'react'

// Full-screen branded preloader. Shows the AKUMA wordmark with a
// sharpening animation plus a thin progress bar. Rendered on top of the
// app for one beat (or until fonts + hero art are decoded), then fades.
export default function Preloader() {
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    let disposed = false
    const timers = []

    const finish = () => {
      if (disposed || timers.locked) return
      timers.locked = true
      timers.push(
        setTimeout(() => !disposed && setLeaving(true), 250), // hold a beat
        setTimeout(() => !disposed && setGone(true), 1050), // fade 600ms, then unmount
      )
    }

    // Minimum splash time; extend if fonts are still swapping in.
    const min = setTimeout(finish, 900)
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        // fonts done — allow the earliest of (font settle + 350ms, min timer)
        setTimeout(finish, 350)
      })
    }

    return () => {
      disposed = true
      clearTimeout(min)
      timers.forEach(clearTimeout)
    }
  }, [])

  if (gone) return null

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-7 bg-ink transition-opacity duration-700 ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <p className="ak-preloader-wordmark font-wordmark text-5xl text-bg-primary sm:text-6xl">AKUMA</p>
      <div className="h-px w-40 overflow-hidden bg-bg-primary/20 sm:w-52">
        <div className="ak-preloader-bar h-full bg-bg-primary" />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-bg-primary/50">
        Limited units · No restocks
      </p>
    </div>
  )
}
