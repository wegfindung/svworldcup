import { useEffect } from 'react'
import type { LocaleCode } from '../lib/types'

const zoomRoomUrl = 'https://us06web.zoom.us/j/2222610155?pwd=eFgxcFAxSENaYU5YQlJPRG9yRjZudz09'

export function LiveRedirectPage({ locale }: { locale: LocaleCode }) {
  const isGerman = locale === 'de'

  useEffect(() => {
    window.location.replace(zoomRoomUrl)
  }, [])

  return (
    <section className="glass-panel mx-auto max-w-2xl rounded-[1.25rem] p-6 sm:p-9">
      <p className="eyebrow">Livestream</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
        {isGerman ? 'Weiterleitung zum Zoom-Raum' : 'Redirecting to the Zoom room'}
      </h1>
      <p className="mt-3 text-[var(--color-muted)]">
        {isGerman ? 'Falls die Weiterleitung nicht automatisch startet, öffne den Raum direkt.' : 'If the redirect does not start automatically, open the room directly.'}
      </p>
      <a href={zoomRoomUrl} className="premium-button mt-6 inline-flex px-6 py-3 text-sm font-semibold">
        {isGerman ? 'Zoom-Raum öffnen' : 'Open Zoom room'}
      </a>
    </section>
  )
}
