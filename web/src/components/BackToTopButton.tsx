import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// Floating "back to top" control for long, window-scrolled boards (Tables + every Stats tab/sub-tab and its
// paginated pages). Self-manages visibility off the window scroll position and portals to document.body so the
// fixed positioning is relative to the viewport — `<main>` keeps a lingering `reveal-in` transform, which would
// otherwise make a `fixed` child position against that ancestor instead of the viewport. Mount one instance per
// page; it only suits window-scrolled content (not an internally-scrolled, fixed-height table).
export function BackToTopButton({ label }: { label: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) {
    return null
  }

  return createPortal(
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-[rgba(7,16,14,0.92)] text-[var(--color-accent)] shadow-[0_14px_44px_-14px_rgba(0,0,0,0.95)] backdrop-blur-md transition hover:-translate-y-[2px] hover:border-[var(--color-accent)]/50 active:scale-95"
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
        <path d="M10 15.5V5M5.5 9 10 4.5 14.5 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>,
    document.body,
  )
}
