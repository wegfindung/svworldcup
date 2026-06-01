import { Link } from 'react-router-dom'
import type { LocaleCode } from '../lib/types'

interface HelpPageProps {
  locale: LocaleCode
}

type HelpLink =
  | {
      label: string
      to: string
    }
  | {
      label: string
      href: string
    }

interface HelpQuestion {
  question: string
  answer: string
  links?: HelpLink[]
}

interface HelpSection {
  eyebrow: string
  title: string
  items: HelpQuestion[]
}

interface HelpCopy {
  eyebrow: string
  title: string
  intro: string
  discordCta: string
  builderCta: string
  sections: HelpSection[]
}

const soccerverseDiscordUrl = 'https://discord.com/invite/ze5xJgg7AM'
const soccerversePlayAffiliateUrl = 'https://play.soccerverse.com/?ref=Libertaerx'

const englishCopy: HelpCopy = {
  eyebrow: 'help & faq',
  title: 'Help',
  intro:
    'A first collection of practical answers for registration, account access, squad changes, scoring, and the main Soccerverse game.',
  discordCta: 'Open Soccerverse Discord',
  builderCta: 'Open Builder',
  sections: [
    {
      eyebrow: 'admin & rules',
      title: 'Administrative and rules',
      items: [
        {
          question: 'How many accounts may I have?',
          answer: 'One. Multi-accounting is not allowed and can lead to disqualification.',
        },
        {
          question: 'Can I build a squad from only one team?',
          answer:
            'No. Your squad may include at most 4 players from the same Grand Tournament team. A squad made only of Morocco players, Brazil players, or any other single team is not possible.',
        },
        {
          question: 'Where do I get help?',
          answer: 'Use the Soccerverse Discord. That is the best place for event support and account questions.',
          links: [{ label: 'Soccerverse Discord', href: soccerverseDiscordUrl }],
        },
        {
          question: 'How do I register?',
          answer:
            'Open registration, choose Rookie or Veteran, add your profile and countries, then confirm the email we send you.',
          links: [{ label: 'Register', to: '/register' }],
        },
        {
          question: 'How do I set a password?',
          answer:
            'After your email is confirmed, open the Builder dashboard. In the security area you can set a password for later email-and-password login.',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: 'Where can I request the confirmation email again?',
          answer:
            'Right after registration, the confirmation screen has a resend button. If you no longer have that screen, ask support in Discord.',
          links: [
            { label: 'Register', to: '/register' },
            { label: 'Discord support', href: soccerverseDiscordUrl },
          ],
        },
        {
          question: 'How do I whitelist the email sender?',
          answer:
            'Add noreply@svtool.info to your contacts or safe-senders list. Event emails are sent as "Soccerverse World Cup <noreply@svtool.info>". If you still cannot find the email, check spam, promotions, and filtered folders.',
        },
        {
          question: 'Where can I reset my password?',
          answer: 'Use the recovery form on the Login page. It sends a password-reset link to your email address.',
          links: [{ label: 'Login', to: '/login' }],
        },
        {
          question: 'Can I downgrade to the Rookie League?',
          answer: 'Yes, but only through support in the Soccerverse Discord.',
          links: [{ label: 'Discord support', href: soccerverseDiscordUrl }],
        },
      ],
    },
    {
      eyebrow: 'other questions',
      title: 'Other questions',
      items: [
        {
          question: 'Can I upgrade from Rookie to Veteran later?',
          answer:
            'Yes. Open the Builder and use "Link your Soccerverse account". The team can then handle the Veteran move if needed.',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: 'How do I change my budget?',
          answer:
            'In the Builder, use "Change cap" in the budget area and pick a new cap. A lower cap is only available if your current squad already fits under it; otherwise remove players first.',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: 'When are results published?',
          answer:
            'We do not yet know how much manual follow-up work will be needed. The community team will try to publish results as quickly as possible.',
        },
        {
          question: 'When can I change the lineup?',
          answer:
            'Only inside swap windows. Window 1 opens after every team has completed its first match and closes before round 2 starts, with 2 swaps. Window 2 works the same after the second match and before round 3, with 2 swaps. Window 3 runs from 8 Jul 2026, 00:00 UTC to 9 Jul 2026, 00:00 UTC, with 4 swaps. A swap only exchanges a reserve with a starter in the same position, only affects future rounds, and never rewrites points already earned.',
        },
        {
          question: 'Why does a team with a bigger budget get fewer points?',
          answer:
            'Your selected budget cap sets your score multiplier. A bigger budget makes it easier to draft expensive stars, so its multiplier is lower. A smaller budget is harder to build under and therefore gets a bigger multiplier.',
        },
        {
          question: 'How does scoring work?',
          answer:
            'Use the score calculator on the home page for the exact maths. It mirrors goals, assists, minutes, clean sheets, performance rating, budget multiplier, and ownership boost.',
          links: [{ label: 'Score calculator', to: '/#score-calculator' }],
        },
        {
          question: 'How do I get to the main game?',
          answer:
            'Open Soccerverse through the community affiliate link from our developer referral.',
          links: [{ label: 'Play Soccerverse', href: soccerversePlayAffiliateUrl }],
        },
      ],
    },
  ],
}

const germanCopy: HelpCopy = {
  eyebrow: 'hilfe & faq',
  title: 'Help',
  intro:
    'Eine erste Sammlung praktischer Antworten zu Registrierung, Account-Zugang, Kaderänderungen, Scoring und dem Soccerverse-Hauptspiel.',
  discordCta: 'Soccerverse Discord öffnen',
  builderCta: 'Builder öffnen',
  sections: [
    {
      eyebrow: 'administrativ & regeln',
      title: 'Administrativ und Regeln',
      items: [
        {
          question: 'Wie viele Accounts darf ich haben?',
          answer: 'Einen. Keine Multi-Accounts. Multi-Accounting führt zur Disqualifikation.',
        },
        {
          question: 'Kann ich meinen Kader nur aus einem Team bauen?',
          answer:
            'Nein. In deinem Kader dürfen maximal 4 Spieler aus demselben Grand Tournament Team stehen. Ein Kader nur mit Marokkanern, nur mit Brasilianern oder nur aus einem anderen Team ist also nicht möglich.',
        },
        {
          question: 'Wo bekomme ich Hilfe?',
          answer: 'Im Discord von Soccerverse. Dort ist der beste Ort für Event-Support und Account-Fragen.',
          links: [{ label: 'Soccerverse Discord', href: soccerverseDiscordUrl }],
        },
        {
          question: 'Wie registriere ich mich?',
          answer:
            'Öffne die Registrierung, wähle Rookie oder Veteran, trage Profil und Länder ein und bestätige danach die Mail, die wir dir senden.',
          links: [{ label: 'Zur Registrierung', to: '/register' }],
        },
        {
          question: 'Wie setze ich ein Passwort?',
          answer:
            'Nach der E-Mail-Bestätigung öffnest du den Builder. Im Sicherheitsbereich kannst du ein Passwort für spätere Logins setzen.',
          links: [{ label: 'Zum Builder', to: '/builder' }],
        },
        {
          question: 'Wo kann ich die Bestätigungsmail nochmal anfordern?',
          answer:
            'Direkt nach der Registrierung gibt es auf dem Bestätigungs-Screen den Button zum erneuten Senden. Wenn du diesen Screen nicht mehr hast, melde dich im Discord-Support.',
          links: [
            { label: 'Zur Registrierung', to: '/register' },
            { label: 'Discord-Support', href: soccerverseDiscordUrl },
          ],
        },
        {
          question: 'Wie whiteliste ich die E-Mail-Adresse?',
          answer:
            'Füge noreply@svtool.info zu deinen Kontakten oder zur Liste sicherer Absender hinzu. Unsere Event-Mails kommen von "Soccerverse World Cup <noreply@svtool.info>". Wenn die Mail trotzdem nicht auftaucht, prüfe Spam, Werbung/Promotions und gefilterte Ordner.',
        },
        {
          question: 'Wo kann ich mein Passwort zurücksetzen?',
          answer: 'Auf der Login-Seite gibt es den Recovery-Bereich. Dort forderst du einen Reset-Link per E-Mail an.',
          links: [{ label: 'Zum Login', to: '/login' }],
        },
        {
          question: 'Kann ich auch zur Rookie League downgraden?',
          answer: 'Ja, aber nur über den Support im Soccerverse Discord.',
          links: [{ label: 'Discord-Support', href: soccerverseDiscordUrl }],
        },
      ],
    },
    {
      eyebrow: 'sonstige fragen',
      title: 'Sonstige Fragen',
      items: [
        {
          question: 'Kann ich nachträglich von Rookie auf Veteran upgraden?',
          answer:
            'Ja. Öffne den Builder und nutze "Link your Soccerverse account". Das Team kann danach den Veteran-Wechsel vornehmen, falls nötig.',
          links: [{ label: 'Zum Builder', to: '/builder' }],
        },
        {
          question: 'Wie ändere ich mein Budget?',
          answer:
            'Im Builder klickst du im Budget-Bereich auf "Cap ändern" und wählst einen neuen Cap. Ein niedrigerer Cap ist nur möglich, wenn dein aktueller Kader darunter passt; sonst musst du zuerst Spieler entfernen.',
          links: [{ label: 'Zum Builder', to: '/builder' }],
        },
        {
          question: 'Wann werden die Resultate veröffentlicht?',
          answer:
            'Wir wissen noch nicht, wie viel manuelle Nacharbeit notwendig ist. Das Community Team gibt sich Mühe, die Resultate so zeitnah wie möglich zu veröffentlichen.',
        },
        {
          question: 'Wann kann ich die Aufstellung ändern?',
          answer:
            'Nur in den Wechselfenstern. Fenster 1 öffnet, nachdem jedes Team sein erstes Spiel abgeschlossen hat, und schließt vor Runde 2; dort hast du 2 Wechsel. Fenster 2 funktioniert genauso nach dem zweiten Spiel und vor Runde 3; dort hast du wieder 2 Wechsel. Fenster 3 läuft vom 8. Juli 2026, 00:00 UTC bis 9. Juli 2026, 00:00 UTC; dort hast du 4 Wechsel. Ein Wechsel tauscht nur Ersatzspieler und Starter derselben Position, gilt nur für zukünftige Runden und ändert keine bereits erzielten Punkte.',
        },
        {
          question: 'Warum bekommt ein Team mit viel Budget weniger Punkte?',
          answer:
            'Der gewählte Budget-Cap setzt deinen Score-Multiplikator. Viel Budget macht es leichter, teure Stars zu draften, deshalb ist der Multiplikator kleiner. Weniger Budget ist schwieriger und bekommt daher einen Boost.',
        },
        {
          question: 'Wie funktioniert die Punktevergabe?',
          answer:
            'Nutze den Rechner auf der Startseite für die genaue Rechnung. Er bildet Tore, Assists, Minuten, Clean Sheets, Performance Rating, Budget-Multiplikator und Ownership Boost ab.',
          links: [{ label: 'Zum Rechner', to: '/#score-calculator' }],
        },
        {
          question: 'Wie komme ich zum Hauptspiel?',
          answer:
            'Öffne Soccerverse über den Community-Affiliate-Link unserer Entwickler.',
          links: [{ label: 'Soccerverse öffnen', href: soccerversePlayAffiliateUrl }],
        },
      ],
    },
  ],
}

const copyByLocale: Partial<Record<LocaleCode, HelpCopy>> = {
  en: englishCopy,
  de: germanCopy,
}

function isExternalLink(link: HelpLink): link is Extract<HelpLink, { href: string }> {
  return 'href' in link
}

function HelpAction({ link }: { link: HelpLink }) {
  const className =
    'inline-flex items-center rounded-full border border-white/12 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]'

  if (isExternalLink(link)) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        {link.label}
      </a>
    )
  }

  return (
    <Link to={link.to} className={className}>
      {link.label}
    </Link>
  )
}

function QuestionItem({ item, index }: { item: HelpQuestion; index: number }) {
  return (
    <div className="surface-row rounded-[0.95rem] p-4">
      <div className="flex items-start gap-3">
        <span className="mono mt-1 text-[var(--color-accent)]">{String(index + 1).padStart(2, '0')}</span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white">{item.question}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{item.answer}</p>
          {item.links?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.links.map((link) => (
                <HelpAction key={`${link.label}-${isExternalLink(link) ? link.href : link.to}`} link={link} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function HelpPage({ locale }: HelpPageProps) {
  const copy = copyByLocale[locale] ?? englishCopy

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-12">
      <section className="hero-card rounded-[1.25rem] px-5 py-7 sm:px-7">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="section-title mt-4 max-w-[12ch] text-white">{copy.title}</h1>
        <p className="mt-5 max-w-[68ch] text-base leading-relaxed text-[var(--color-muted)]">{copy.intro}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={soccerverseDiscordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
          >
            {copy.discordCta}
          </a>
          <Link
            to="/builder"
            className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            {copy.builderCta}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {copy.sections.map((section) => (
          <article key={section.title} className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
            <p className="eyebrow">{section.eyebrow}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{section.title}</h2>
            <div className="mt-5 space-y-3">
              {section.items.map((item, index) => (
                <QuestionItem key={item.question} item={item} index={index} />
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
