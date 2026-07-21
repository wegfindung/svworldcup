import { useEffect, useState, type FormEvent } from 'react'
import { fetchPrizeClaimStatus, linkSoccerverseAccount, savePrizeShippingAddress } from '../lib/api'
import { getDefaultShareReferrerSoccerverseUsername } from '../lib/referral'
import type { LocaleCode, ParticipantProfile, PrizeClaimStatus, ShippingAddressInput } from '../lib/types'

const initialAddress: ShippingAddressInput = {
  recipientName: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  city: '',
  region: '',
  countryCode: '',
}

const english = {
  accountEyebrow: 'Prize payout required action',
  accountTitle: 'Connect your Soccerverse account to receive your prize.',
  accountBody: 'Create a free Soccerverse account through the link below, then save the exact Soccerverse username here. We cannot pay your prize until the username is stored in your tournament account.',
  createAccount: 'Create Soccerverse account',
  username: 'Soccerverse username',
  usernamePlaceholder: 'Your exact account name',
  saveUsername: 'Save username',
  saving: 'Saving',
  usernameSaved: 'Your Soccerverse username has been saved for the payout.',
  shippingEyebrow: 'Physical prize',
  shippingTitle: 'Where should we send your prize?',
  shippingBody: 'Your address is stored privately and is only used to deliver your Grand Tournament prize.',
  recipientName: 'Full recipient name',
  addressLine1: 'Street and house number',
  addressLine2: 'Address line 2 (optional)',
  postalCode: 'Postal code',
  city: 'City',
  region: 'State / region (optional)',
  countryCode: 'Country code',
  countryHint: 'Two letters, for example DE, GB, US',
  saveAddress: 'Save shipping address',
  addressSaved: 'Your shipping address has been saved securely.',
  loadError: 'Prize details could not be loaded. Please refresh the page.',
}

const german: typeof english = {
  accountEyebrow: 'Für die Preisauszahlung erforderlich',
  accountTitle: 'Verknüpfe deinen Soccerverse-Account, um deinen Preis zu erhalten.',
  accountBody: 'Erstelle über den Link unten einen kostenlosen Soccerverse-Account und speichere anschließend hier den exakten Soccerverse-Namen. Ohne den gespeicherten Namen können wir deinen Preis nicht auszahlen.',
  createAccount: 'Soccerverse-Account erstellen',
  username: 'Soccerverse-Name',
  usernamePlaceholder: 'Dein exakter Accountname',
  saveUsername: 'Namen speichern',
  saving: 'Wird gespeichert',
  usernameSaved: 'Dein Soccerverse-Name wurde für die Auszahlung gespeichert.',
  shippingEyebrow: 'Physischer Preis',
  shippingTitle: 'Wohin dürfen wir deinen Preis senden?',
  shippingBody: 'Deine Adresse wird vertraulich gespeichert und ausschließlich für den Versand deines Grand-Tournament-Preises verwendet.',
  recipientName: 'Vollständiger Empfängername',
  addressLine1: 'Straße und Hausnummer',
  addressLine2: 'Adresszusatz (optional)',
  postalCode: 'Postleitzahl',
  city: 'Ort',
  region: 'Bundesland / Region (optional)',
  countryCode: 'Ländercode',
  countryHint: 'Zwei Buchstaben, zum Beispiel DE, GB, US',
  saveAddress: 'Versandadresse speichern',
  addressSaved: 'Deine Versandadresse wurde sicher gespeichert.',
  loadError: 'Die Preisinformationen konnten nicht geladen werden. Bitte lade die Seite neu.',
}

export function PrizeClaimPanel({
  locale,
  participant,
  onParticipantUpdate,
}: {
  locale: LocaleCode
  participant: ParticipantProfile
  onParticipantUpdate: (participant: ParticipantProfile) => void
}) {
  const copy = locale === 'de' ? german : english
  const [affiliateReferrer] = useState(() => getDefaultShareReferrerSoccerverseUsername())
  const [claim, setClaim] = useState<PrizeClaimStatus | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [username, setUsername] = useState('')
  const [usernameBusy, setUsernameBusy] = useState(false)
  const [usernameMessage, setUsernameMessage] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [address, setAddress] = useState<ShippingAddressInput>(initialAddress)
  const [addressBusy, setAddressBusy] = useState(false)
  const [addressMessage, setAddressMessage] = useState('')
  const [addressError, setAddressError] = useState('')

  useEffect(() => {
    let active = true
    void fetchPrizeClaimStatus()
      .then(({ claim: nextClaim }) => {
        if (!active) return
        setClaim(nextClaim)
        if (nextClaim.shippingAddress) setAddress(nextClaim.shippingAddress)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
    return () => {
      active = false
    }
  }, [participant.participantId])

  async function handleUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setUsernameBusy(true)
    setUsernameError('')
    setUsernameMessage('')
    try {
      const response = await linkSoccerverseAccount(username)
      onParticipantUpdate(response.participant)
      setUsernameMessage(copy.usernameSaved)
    } catch (error) {
      setUsernameError(error instanceof Error ? error.message : copy.loadError)
    } finally {
      setUsernameBusy(false)
    }
  }

  async function handleAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAddressBusy(true)
    setAddressError('')
    setAddressMessage('')
    try {
      const response = await savePrizeShippingAddress(address)
      setClaim(response.claim)
      setAddressMessage(copy.addressSaved)
    } catch (error) {
      setAddressError(error instanceof Error ? error.message : copy.loadError)
    } finally {
      setAddressBusy(false)
    }
  }

  const needsSoccerverseAccount = participant.leagueType === 'rookie' && !participant.soccerverseUsername
  if (!needsSoccerverseAccount && !claim?.physicalPrizeEligible && !loadError) return null

  const inputClass = 'min-w-0 rounded-[0.9rem] border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]'

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {needsSoccerverseAccount ? (
        <section className="hero-card rounded-[1.15rem] border border-[var(--color-sand)]/25 p-5 sm:p-6">
          <p className="eyebrow text-[var(--color-sand)]">{copy.accountEyebrow}</p>
          <h2 className="mt-3 max-w-[24ch] text-2xl font-semibold tracking-tight text-white">{copy.accountTitle}</h2>
          <p className="mt-3 max-w-[62ch] text-sm leading-6 text-[var(--color-muted)]">{copy.accountBody}</p>
          <a
            href={`https://play.soccerverse.com/?ref=${encodeURIComponent(affiliateReferrer)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center rounded-full border border-[var(--color-sand)]/35 bg-[var(--color-sand)]/10 px-5 py-3 text-sm font-semibold text-[var(--color-sand)] transition hover:-translate-y-[1px] hover:bg-[var(--color-sand)]/15"
          >
            {copy.createAccount}
          </a>
          <form onSubmit={handleUsername} className="mt-5 grid gap-3">
            <label className="grid gap-2">
              <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{copy.username}</span>
              <input required maxLength={60} value={username} onChange={(event) => setUsername(event.target.value)} placeholder={copy.usernamePlaceholder} className={inputClass} />
            </label>
            {usernameError ? <p className="text-sm text-amber-200">{usernameError}</p> : null}
            {usernameMessage ? <p className="text-sm text-[var(--color-accent)]">{usernameMessage}</p> : null}
            <button disabled={usernameBusy} className="w-fit rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-60">
              {usernameBusy ? copy.saving : copy.saveUsername}
            </button>
          </form>
        </section>
      ) : null}

      {claim?.physicalPrizeEligible ? (
        <section className="hero-card rounded-[1.15rem] border border-[var(--color-accent)]/25 p-5 sm:p-6">
          <p className="eyebrow">{copy.shippingEyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{copy.shippingTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{copy.shippingBody}</p>
          <form onSubmit={handleAddress} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input aria-label={copy.recipientName} required maxLength={120} value={address.recipientName} onChange={(event) => setAddress({ ...address, recipientName: event.target.value })} placeholder={copy.recipientName} className={`${inputClass} sm:col-span-2`} />
            <input aria-label={copy.addressLine1} required maxLength={160} value={address.addressLine1} onChange={(event) => setAddress({ ...address, addressLine1: event.target.value })} placeholder={copy.addressLine1} className={`${inputClass} sm:col-span-2`} />
            <input aria-label={copy.addressLine2} maxLength={160} value={address.addressLine2 ?? ''} onChange={(event) => setAddress({ ...address, addressLine2: event.target.value })} placeholder={copy.addressLine2} className={`${inputClass} sm:col-span-2`} />
            <input aria-label={copy.postalCode} required maxLength={24} value={address.postalCode} onChange={(event) => setAddress({ ...address, postalCode: event.target.value })} placeholder={copy.postalCode} className={inputClass} />
            <input aria-label={copy.city} required maxLength={100} value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} placeholder={copy.city} className={inputClass} />
            <input aria-label={copy.region} maxLength={100} value={address.region ?? ''} onChange={(event) => setAddress({ ...address, region: event.target.value })} placeholder={copy.region} className={inputClass} />
            <label className="grid gap-1">
              <input aria-label={copy.countryCode} required minLength={2} maxLength={2} value={address.countryCode} onChange={(event) => setAddress({ ...address, countryCode: event.target.value.toUpperCase() })} placeholder={copy.countryCode} className={inputClass} />
              <span className="px-1 text-[11px] text-[var(--color-muted)]">{copy.countryHint}</span>
            </label>
            {addressError ? <p className="text-sm text-amber-200 sm:col-span-2">{addressError}</p> : null}
            {addressMessage ? <p className="text-sm text-[var(--color-accent)] sm:col-span-2">{addressMessage}</p> : null}
            <button disabled={addressBusy} className="w-fit rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-60 sm:col-span-2">
              {addressBusy ? copy.saving : copy.saveAddress}
            </button>
          </form>
        </section>
      ) : null}

      {loadError ? <p className="text-sm text-amber-200 lg:col-span-2">{copy.loadError}</p> : null}
    </div>
  )
}
