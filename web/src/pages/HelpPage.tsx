import { Link } from 'react-router-dom'
import { RulesHelpAssistant } from '../components/RulesHelpAssistant'
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
            'Add noreply@svtool.info to your contacts or safe-senders list. Event emails are sent as "Soccerverse Community Event <noreply@svtool.info>". If you still cannot find the email, check spam, promotions, and filtered folders.',
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
            'Füge noreply@svtool.info zu deinen Kontakten oder zur Liste sicherer Absender hinzu. Unsere Event-Mails kommen von "Soccerverse Community Event <noreply@svtool.info>". Wenn die Mail trotzdem nicht auftaucht, prüfe Spam, Werbung/Promotions und gefilterte Ordner.',
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

const spanishCopy: HelpCopy = {
  eyebrow: 'ayuda y faq',
  title: 'Ayuda',
  intro:
    'Una primera recopilación de respuestas prácticas sobre el registro, el acceso a la cuenta, los cambios de plantilla, la puntuación y el juego principal de Soccerverse.',
  discordCta: 'Abrir el Discord de Soccerverse',
  builderCta: 'Abrir el Builder',
  sections: [
    {
      eyebrow: 'administración y reglas',
      title: 'Administración y reglas',
      items: [
        {
          question: '¿Cuántas cuentas puedo tener?',
          answer: 'Una. No se permite tener varias cuentas y hacerlo puede conllevar la descalificación.',
        },
        {
          question: '¿Puedo formar una plantilla con un solo equipo?',
          answer:
            'No. Tu plantilla puede incluir como máximo 4 jugadores del mismo equipo del Grand Tournament. No es posible formar una plantilla compuesta únicamente por jugadores de Marruecos, de Brasil o de cualquier otro equipo único.',
        },
        {
          question: '¿Dónde consigo ayuda?',
          answer: 'Usa el Discord de Soccerverse. Es el mejor lugar para recibir soporte del evento y resolver dudas sobre tu cuenta.',
          links: [{ label: 'Discord de Soccerverse', href: soccerverseDiscordUrl }],
        },
        {
          question: '¿Cómo me registro?',
          answer:
            'Abre el registro, elige Rookie o Veteran, añade tu perfil y tus países, y luego confirma el correo que te enviamos.',
          links: [{ label: 'Registrarse', to: '/register' }],
        },
        {
          question: '¿Cómo establezco una contraseña?',
          answer:
            'Una vez confirmado tu correo, abre el panel del Builder. En el área de seguridad puedes establecer una contraseña para iniciar sesión más adelante con correo y contraseña.',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: '¿Dónde puedo solicitar de nuevo el correo de confirmación?',
          answer:
            'Justo después del registro, la pantalla de confirmación tiene un botón para reenviarlo. Si ya no tienes esa pantalla, pide ayuda al soporte en Discord.',
          links: [
            { label: 'Registrarse', to: '/register' },
            { label: 'Soporte en Discord', href: soccerverseDiscordUrl },
          ],
        },
        {
          question: '¿Cómo agrego el remitente del correo a la lista de permitidos?',
          answer:
            'Añade noreply@svtool.info a tus contactos o a tu lista de remitentes seguros. Los correos del evento se envían como "Soccerverse Community Event <noreply@svtool.info>". Si aun así no encuentras el correo, revisa las carpetas de spam, promociones y mensajes filtrados.',
        },
        {
          question: '¿Dónde puedo restablecer mi contraseña?',
          answer: 'Usa el formulario de recuperación en la página de inicio de sesión. Envía un enlace para restablecer la contraseña a tu correo electrónico.',
          links: [{ label: 'Iniciar sesión', to: '/login' }],
        },
        {
          question: '¿Puedo bajar a la Rookie League?',
          answer: 'Sí, pero solo a través del soporte en el Discord de Soccerverse.',
          links: [{ label: 'Soporte en Discord', href: soccerverseDiscordUrl }],
        },
      ],
    },
    {
      eyebrow: 'otras preguntas',
      title: 'Otras preguntas',
      items: [
        {
          question: '¿Puedo pasar de Rookie a Veteran más adelante?',
          answer:
            'Sí. Abre el Builder y usa "Link your Soccerverse account". El equipo podrá gestionar después el cambio a Veteran si fuera necesario.',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: '¿Cómo cambio mi presupuesto?',
          answer:
            'En el Builder, usa "Change cap" en el área de presupuesto y elige un nuevo límite de presupuesto. Solo puedes elegir un límite más bajo si tu plantilla actual ya cabe por debajo de él; de lo contrario, quita jugadores primero.',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: '¿Cuándo se publican los resultados?',
          answer:
            'Todavía no sabemos cuánto trabajo manual de seguimiento será necesario. El equipo de la comunidad intentará publicar los resultados lo antes posible.',
        },
        {
          question: '¿Cuándo puedo cambiar la alineación?',
          answer:
            'Solo dentro de las ventanas de cambios. La ventana 1 se abre después de que cada equipo haya completado su primer partido y se cierra antes de que empiece la ronda 2, con 2 swaps. La ventana 2 funciona igual, después del segundo partido y antes de la ronda 3, con 2 swaps. La ventana 3 va del 8 Jul 2026, 00:00 UTC al 9 Jul 2026, 00:00 UTC, con 4 swaps. Un cambio solo intercambia un suplente por un titular de la misma posición, solo afecta a las rondas futuras y nunca reescribe los puntos ya conseguidos.',
        },
        {
          question: '¿Por qué un equipo con más presupuesto recibe menos puntos?',
          answer:
            'El límite de presupuesto que elijas determina tu multiplicador de puntuación. Un presupuesto mayor facilita fichar estrellas caras, por lo que su multiplicador es más bajo. Un presupuesto menor es más difícil de gestionar y por eso obtiene un multiplicador mayor.',
        },
        {
          question: '¿Cómo funciona la puntuación?',
          answer:
            'Usa la calculadora de puntuación en la página de inicio para ver el cálculo exacto. Refleja los goles, las asistencias, los minutos, las Clean Sheets, el Performance Rating, el multiplicador de presupuesto y el Ownership Boost.',
          links: [{ label: 'Calculadora de puntuación', to: '/#score-calculator' }],
        },
        {
          question: '¿Cómo llego al juego principal?',
          answer:
            'Abre Soccerverse a través del enlace de afiliado de la comunidad de nuestra referencia de desarrollador.',
          links: [{ label: 'Jugar a Soccerverse', href: soccerversePlayAffiliateUrl }],
        },
      ],
    },
  ],
}

const italianCopy: HelpCopy = {
  eyebrow: 'aiuto & faq',
  title: 'Aiuto',
  intro:
    "Una prima raccolta di risposte pratiche su registrazione, accesso all'account, modifiche alla rosa, punteggi e il gioco principale Soccerverse.",
  discordCta: 'Apri il Discord di Soccerverse',
  builderCta: 'Apri il Builder',
  sections: [
    {
      eyebrow: 'amministrazione & regole',
      title: 'Amministrazione e regole',
      items: [
        {
          question: 'Quanti account posso avere?',
          answer: "Uno. Il multi-account non è consentito e può portare alla squalifica.",
        },
        {
          question: 'Posso costruire una rosa con una sola squadra?',
          answer:
            "No. La tua rosa può includere al massimo 4 giocatori della stessa squadra del Grand Tournament. Una rosa composta solo da giocatori del Marocco, del Brasile o di qualsiasi altra singola squadra non è possibile.",
        },
        {
          question: 'Dove posso ricevere aiuto?',
          answer: "Usa il Discord di Soccerverse. È il posto migliore per il supporto all'evento e le domande sull'account.",
          links: [{ label: 'Discord di Soccerverse', href: soccerverseDiscordUrl }],
        },
        {
          question: 'Come mi registro?',
          answer:
            "Apri la registrazione, scegli Rookie o Veteran, aggiungi il tuo profilo e i Paesi, poi conferma l'email che ti inviamo.",
          links: [{ label: 'Registrati', to: '/register' }],
        },
        {
          question: 'Come imposto una password?',
          answer:
            "Dopo aver confermato la tua email, apri la dashboard del Builder. Nell'area sicurezza puoi impostare una password per accedere in seguito con email e password.",
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: "Dove posso richiedere di nuovo l'email di conferma?",
          answer:
            "Subito dopo la registrazione, la schermata di conferma ha un pulsante per il rinvio. Se non hai più quella schermata, chiedi al supporto su Discord.",
          links: [
            { label: 'Registrati', to: '/register' },
            { label: 'Supporto Discord', href: soccerverseDiscordUrl },
          ],
        },
        {
          question: "Come aggiungo il mittente dell'email alla whitelist?",
          answer:
            'Aggiungi noreply@svtool.info ai tuoi contatti o alla lista dei mittenti sicuri. Le email dell\'evento vengono inviate come "Soccerverse Community Event <noreply@svtool.info>". Se ancora non trovi l\'email, controlla le cartelle spam, promozioni e quelle filtrate.',
        },
        {
          question: 'Dove posso reimpostare la mia password?',
          answer: "Usa il modulo di recupero nella pagina di Login. Invia un link per reimpostare la password al tuo indirizzo email.",
          links: [{ label: 'Login', to: '/login' }],
        },
        {
          question: 'Posso passare alla Rookie League?',
          answer: "Sì, ma solo tramite il supporto nel Discord di Soccerverse.",
          links: [{ label: 'Supporto Discord', href: soccerverseDiscordUrl }],
        },
      ],
    },
    {
      eyebrow: 'altre domande',
      title: 'Altre domande',
      items: [
        {
          question: 'Posso passare da Rookie a Veteran in seguito?',
          answer:
            'Sì. Apri il Builder e usa "Link your Soccerverse account". Il team può poi gestire il passaggio a Veteran se necessario.',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: 'Come cambio il mio budget?',
          answer:
            'Nel Builder, usa "Change cap" nell\'area budget e scegli un nuovo limite. Un limite più basso è disponibile solo se la tua rosa attuale rientra già al di sotto; altrimenti rimuovi prima dei giocatori.',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: 'Quando vengono pubblicati i risultati?',
          answer:
            "Non sappiamo ancora quanto lavoro manuale di verifica sarà necessario. Il team della community cercherà di pubblicare i risultati il più rapidamente possibile.",
        },
        {
          question: "Quando posso cambiare la formazione?",
          answer:
            "Solo durante le finestre di sostituzione. La Finestra 1 si apre dopo che ogni squadra ha completato la sua prima partita e si chiude prima dell'inizio del round 2, con 2 sostituzioni. La Finestra 2 funziona allo stesso modo dopo la seconda partita e prima del round 3, con 2 sostituzioni. La Finestra 3 va dall'8 lug 2026, 00:00 UTC al 9 lug 2026, 00:00 UTC, con 4 sostituzioni. Una sostituzione scambia solo una riserva con un titolare nello stesso ruolo, influisce solo sui round futuri e non riscrive mai i punti già ottenuti.",
        },
        {
          question: 'Perché una squadra con un budget più alto ottiene meno punti?',
          answer:
            "Il limite di budget che selezioni imposta il tuo moltiplicatore di punteggio. Un budget più alto rende più facile schierare star costose, quindi il suo moltiplicatore è più basso. Un budget più basso è più difficile da gestire e ottiene perciò un moltiplicatore maggiore.",
        },
        {
          question: 'Come funziona il punteggio?',
          answer:
            "Usa il calcolatore di punteggio nella home page per i calcoli esatti. Rispecchia gol, assist, minuti, Clean Sheets, Performance Rating, moltiplicatore di budget e Ownership Boost.",
          links: [{ label: 'Calcolatore di punteggio', to: '/#score-calculator' }],
        },
        {
          question: 'Come arrivo al gioco principale?',
          answer:
            'Apri Soccerverse tramite il link affiliato della community fornito dal nostro referral degli sviluppatori.',
          links: [{ label: 'Gioca a Soccerverse', href: soccerversePlayAffiliateUrl }],
        },
      ],
    },
  ],
}

const frenchCopy: HelpCopy = {
  eyebrow: "aide & faq",
  title: "Aide",
  intro:
    "Une première sélection de réponses pratiques pour l'inscription, l'accès au compte, les changements d'effectif, le calcul des points et le jeu principal Soccerverse.",
  discordCta: "Ouvrir le Discord Soccerverse",
  builderCta: "Ouvrir le Builder",
  sections: [
    {
      eyebrow: "administration & règles",
      title: "Administration et règles",
      items: [
        {
          question: "Combien de comptes puis-je avoir ?",
          answer: "Un seul. Le multi-comptes n'est pas autorisé et peut entraîner une disqualification.",
        },
        {
          question: "Puis-je composer un effectif avec une seule équipe ?",
          answer:
            "Non. Votre effectif peut inclure au maximum 4 joueurs d'une même équipe du Grand Tournament. Un effectif composé uniquement de joueurs du Maroc, du Brésil ou de toute autre équipe unique n'est pas possible.",
        },
        {
          question: "Où puis-je obtenir de l'aide ?",
          answer: "Utilisez le Discord Soccerverse. C'est le meilleur endroit pour le support de l'événement et les questions sur votre compte.",
          links: [{ label: "Discord Soccerverse", href: soccerverseDiscordUrl }],
        },
        {
          question: "Comment puis-je m'inscrire ?",
          answer:
            "Ouvrez l'inscription, choisissez Rookie ou Veteran, ajoutez votre profil et vos pays, puis confirmez l'e-mail que nous vous envoyons.",
          links: [{ label: "S'inscrire", to: '/register' }],
        },
        {
          question: "Comment puis-je définir un mot de passe ?",
          answer:
            "Une fois votre e-mail confirmé, ouvrez le tableau de bord du Builder. Dans la zone de sécurité, vous pouvez définir un mot de passe pour une connexion ultérieure par e-mail et mot de passe.",
          links: [{ label: "Builder", to: '/builder' }],
        },
        {
          question: "Où puis-je redemander l'e-mail de confirmation ?",
          answer:
            "Juste après l'inscription, l'écran de confirmation comporte un bouton de renvoi. Si vous n'avez plus cet écran, contactez le support sur Discord.",
          links: [
            { label: "S'inscrire", to: '/register' },
            { label: "Support Discord", href: soccerverseDiscordUrl },
          ],
        },
        {
          question: "Comment ajouter l'expéditeur à ma liste blanche ?",
          answer:
            "Ajoutez noreply@svtool.info à vos contacts ou à votre liste d'expéditeurs sûrs. Les e-mails de l'événement sont envoyés depuis \"Soccerverse Community Event <noreply@svtool.info>\". Si vous ne trouvez toujours pas l'e-mail, vérifiez les dossiers spam, promotions et messages filtrés.",
        },
        {
          question: "Où puis-je réinitialiser mon mot de passe ?",
          answer: "Utilisez le formulaire de récupération sur la page de connexion. Il envoie un lien de réinitialisation du mot de passe à votre adresse e-mail.",
          links: [{ label: "Connexion", to: '/login' }],
        },
        {
          question: "Puis-je rétrograder vers la Rookie League ?",
          answer: "Oui, mais uniquement via le support sur le Discord Soccerverse.",
          links: [{ label: "Support Discord", href: soccerverseDiscordUrl }],
        },
      ],
    },
    {
      eyebrow: "autres questions",
      title: "Autres questions",
      items: [
        {
          question: "Puis-je passer de Rookie à Veteran plus tard ?",
          answer:
            "Oui. Ouvrez le Builder et utilisez \"Link your Soccerverse account\". L'équipe peut ensuite gérer le passage en Veteran si nécessaire.",
          links: [{ label: "Builder", to: '/builder' }],
        },
        {
          question: "Comment puis-je modifier mon budget ?",
          answer:
            "Dans le Builder, utilisez \"Change cap\" dans la zone de budget et choisissez un nouveau plafond. Un plafond plus bas n'est disponible que si votre effectif actuel y rentre déjà ; sinon, retirez d'abord des joueurs.",
          links: [{ label: "Builder", to: '/builder' }],
        },
        {
          question: "Quand les résultats sont-ils publiés ?",
          answer:
            "Nous ne savons pas encore quelle quantité de travail manuel de suivi sera nécessaire. L'équipe communautaire s'efforcera de publier les résultats aussi rapidement que possible.",
        },
        {
          question: "Quand puis-je modifier la composition ?",
          answer:
            "Uniquement pendant les fenêtres de changement. La fenêtre 1 s'ouvre une fois que chaque équipe a terminé son premier match et se ferme avant le début du round 2, avec 2 changements. La fenêtre 2 fonctionne de la même manière après le deuxième match et avant le round 3, avec 2 changements. La fenêtre 3 se déroule du 8 Jul 2026, 00:00 UTC au 9 Jul 2026, 00:00 UTC, avec 4 changements. Un changement échange uniquement un remplaçant contre un titulaire au même poste, n'affecte que les rounds à venir et ne modifie jamais les points déjà acquis.",
        },
        {
          question: "Pourquoi une équipe avec un budget plus élevé obtient-elle moins de points ?",
          answer:
            "Le budget cap que vous choisissez détermine votre multiplicateur de points. Un budget plus élevé facilite le recrutement de stars coûteuses, son multiplicateur est donc plus faible. Un budget plus petit est plus difficile à exploiter et bénéficie par conséquent d'un multiplicateur plus élevé.",
        },
        {
          question: "Comment fonctionne le calcul des points ?",
          answer:
            "Utilisez le calculateur de points sur la page d'accueil pour le calcul exact. Il reflète les buts, les passes décisives, les minutes, les Clean Sheets, la Performance Rating, le multiplicateur de budget et l'Ownership Boost.",
          links: [{ label: "Calculateur de points", to: '/#score-calculator' }],
        },
        {
          question: "Comment accéder au jeu principal ?",
          answer:
            "Ouvrez Soccerverse via le lien d'affiliation communautaire issu de notre parrainage développeur.",
          links: [{ label: "Jouer à Soccerverse", href: soccerversePlayAffiliateUrl }],
        },
      ],
    },
  ],
}

const portugueseCopy: HelpCopy = {
  eyebrow: 'ajuda & faq',
  title: 'Ajuda',
  intro:
    'Uma primeira coleção de respostas práticas sobre registo, acesso à conta, alterações de plantel, pontuação e o jogo principal Soccerverse.',
  discordCta: 'Abrir o Discord do Soccerverse',
  builderCta: 'Abrir o Builder',
  sections: [
    {
      eyebrow: 'administração & regras',
      title: 'Administração e regras',
      items: [
        {
          question: 'Quantas contas posso ter?',
          answer: 'Uma. Ter várias contas não é permitido e pode levar à desqualificação.',
        },
        {
          question: 'Posso montar um plantel só com uma equipa?',
          answer:
            'Não. O teu plantel pode incluir no máximo 4 jogadores da mesma equipa do Grand Tournament. Um plantel feito apenas de jogadores de Marrocos, do Brasil ou de qualquer outra equipa única não é possível.',
        },
        {
          question: 'Onde posso obter ajuda?',
          answer: 'Usa o Discord do Soccerverse. É o melhor sítio para apoio ao evento e questões sobre a conta.',
          links: [{ label: 'Discord do Soccerverse', href: soccerverseDiscordUrl }],
        },
        {
          question: 'Como me registo?',
          answer:
            'Abre o registo, escolhe Rookie ou Veteran, adiciona o teu perfil e países, e depois confirma o email que te enviamos.',
          links: [{ label: 'Registar', to: '/register' }],
        },
        {
          question: 'Como defino uma palavra-passe?',
          answer:
            'Depois de o teu email estar confirmado, abre o painel do Builder. Na área de segurança podes definir uma palavra-passe para iniciar sessão mais tarde com email e palavra-passe.',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: 'Onde posso pedir novamente o email de confirmação?',
          answer:
            'Logo após o registo, o ecrã de confirmação tem um botão para reenviar. Se já não tiveres esse ecrã, pede apoio no Discord.',
          links: [
            { label: 'Registar', to: '/register' },
            { label: 'Apoio no Discord', href: soccerverseDiscordUrl },
          ],
        },
        {
          question: 'Como coloco o remetente do email na lista de permitidos?',
          answer:
            'Adiciona noreply@svtool.info aos teus contactos ou à lista de remetentes seguros. Os emails do evento são enviados como "Soccerverse Community Event <noreply@svtool.info>". Se mesmo assim não encontrares o email, verifica o spam, as promoções e as pastas filtradas.',
        },
        {
          question: 'Onde posso repor a minha palavra-passe?',
          answer: 'Usa o formulário de recuperação na página de início de sessão. Ele envia um link de redefinição de palavra-passe para o teu endereço de email.',
          links: [{ label: 'Iniciar sessão', to: '/login' }],
        },
        {
          question: 'Posso descer para a Rookie League?',
          answer: 'Sim, mas apenas através do apoio no Discord do Soccerverse.',
          links: [{ label: 'Apoio no Discord', href: soccerverseDiscordUrl }],
        },
      ],
    },
    {
      eyebrow: 'outras questões',
      title: 'Outras questões',
      items: [
        {
          question: 'Posso passar de Rookie para Veteran mais tarde?',
          answer:
            'Sim. Abre o Builder e usa "Link your Soccerverse account". A equipa pode depois tratar da mudança para Veteran, se necessário.',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: 'Como altero o meu orçamento?',
          answer:
            'No Builder, usa "Change cap" na área do orçamento e escolhe um novo limite de orçamento. Um limite mais baixo só está disponível se o teu plantel atual já couber dentro dele; caso contrário, remove jogadores primeiro.',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: 'Quando são publicados os resultados?',
          answer:
            'Ainda não sabemos quanto trabalho manual de acompanhamento será necessário. A equipa da comunidade vai tentar publicar os resultados o mais rapidamente possível.',
        },
        {
          question: 'Quando posso alterar o onze?',
          answer:
            'Apenas dentro das janelas de troca. A janela 1 abre depois de cada equipa ter completado o seu primeiro jogo e fecha antes do início da ronda 2, com 2 trocas. A janela 2 funciona da mesma forma após o segundo jogo e antes da ronda 3, com 2 trocas. A janela 3 decorre de 8 jul 2026, 00:00 UTC até 9 jul 2026, 00:00 UTC, com 4 trocas. Uma troca apenas substitui um suplente por um titular na mesma posição, só afeta as rondas futuras e nunca reescreve os pontos já obtidos.',
        },
        {
          question: 'Porque é que uma equipa com mais orçamento recebe menos pontos?',
          answer:
            'O limite de orçamento que escolheres define o teu multiplicador de pontuação. Um orçamento maior torna mais fácil recrutar estrelas caras, por isso o seu multiplicador é menor. Um orçamento menor é mais difícil de gerir e, por isso, recebe um multiplicador maior.',
        },
        {
          question: 'Como funciona a pontuação?',
          answer:
            'Usa a calculadora de pontuação na página inicial para o cálculo exato. Ela reflete golos, assistências, minutos, Clean Sheets, Performance Rating, multiplicador de orçamento e Ownership Boost.',
          links: [{ label: 'Calculadora de pontuação', to: '/#score-calculator' }],
        },
        {
          question: 'Como chego ao jogo principal?',
          answer:
            'Abre o Soccerverse através do link de afiliado da comunidade, a partir da referência do nosso programador.',
          links: [{ label: 'Jogar Soccerverse', href: soccerversePlayAffiliateUrl }],
        },
      ],
    },
  ],
}

const russianCopy: HelpCopy = {
  eyebrow: 'помощь и faq',
  title: 'Помощь',
  intro:
    'Первая подборка практических ответов о регистрации, доступе к аккаунту, изменениях состава, начислении очков и об основной игре Soccerverse.',
  discordCta: 'Открыть Soccerverse Discord',
  builderCta: 'Открыть Builder',
  sections: [
    {
      eyebrow: 'администрирование и правила',
      title: 'Администрирование и правила',
      items: [
        {
          question: 'Сколько аккаунтов мне разрешено иметь?',
          answer: 'Один. Использование нескольких аккаунтов запрещено и может привести к дисквалификации.',
        },
        {
          question: 'Могу ли я собрать состав только из одной команды?',
          answer:
            'Нет. В вашем составе может быть не более 4 игроков из одной команды Grand Tournament. Состав только из игроков Марокко, Бразилии или любой другой одной команды невозможен.',
        },
        {
          question: 'Где я могу получить помощь?',
          answer: 'Используйте Soccerverse Discord. Это лучшее место для поддержки по событию и вопросов об аккаунте.',
          links: [{ label: 'Soccerverse Discord', href: soccerverseDiscordUrl }],
        },
        {
          question: 'Как мне зарегистрироваться?',
          answer:
            'Откройте регистрацию, выберите Rookie или Veteran, добавьте свой профиль и страны, затем подтвердите письмо, которое мы вам отправим.',
          links: [{ label: 'Регистрация', to: '/register' }],
        },
        {
          question: 'Как мне задать пароль?',
          answer:
            'После подтверждения письма откройте панель Builder. В разделе безопасности вы можете задать пароль для последующего входа по email и паролю.',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: 'Где я могу повторно запросить письмо с подтверждением?',
          answer:
            'Сразу после регистрации на экране подтверждения есть кнопка повторной отправки. Если этого экрана у вас больше нет, обратитесь в поддержку в Discord.',
          links: [
            { label: 'Регистрация', to: '/register' },
            { label: 'Поддержка в Discord', href: soccerverseDiscordUrl },
          ],
        },
        {
          question: 'Как добавить отправителя письма в белый список?',
          answer:
            'Добавьте noreply@svtool.info в свои контакты или в список безопасных отправителей. Письма о событии отправляются как "Soccerverse Community Event <noreply@svtool.info>". Если письмо всё равно не находится, проверьте папки спама, промоакций и отфильтрованные папки.',
        },
        {
          question: 'Где я могу сбросить свой пароль?',
          answer: 'Используйте форму восстановления на странице входа (Login). Она отправит ссылку для сброса пароля на ваш email.',
          links: [{ label: 'Login', to: '/login' }],
        },
        {
          question: 'Могу ли я перейти вниз в Rookie League?',
          answer: 'Да, но только через поддержку в Soccerverse Discord.',
          links: [{ label: 'Поддержка в Discord', href: soccerverseDiscordUrl }],
        },
      ],
    },
    {
      eyebrow: 'другие вопросы',
      title: 'Другие вопросы',
      items: [
        {
          question: 'Могу ли я позже перейти с Rookie на Veteran?',
          answer:
            'Да. Откройте Builder и используйте "Link your Soccerverse account". После этого команда сможет при необходимости выполнить переход на Veteran.',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: 'Как мне изменить свой бюджет?',
          answer:
            'В Builder используйте "Change cap" в разделе бюджета и выберите новый лимит бюджета. Более низкий лимит доступен только в том случае, если ваш текущий состав уже укладывается в него; иначе сначала уберите игроков.',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: 'Когда публикуются результаты?',
          answer:
            'Мы пока не знаем, сколько ручной работы потребуется в дальнейшем. Команда сообщества постарается опубликовать результаты как можно быстрее.',
        },
        {
          question: 'Когда я могу менять состав на поле?',
          answer:
            'Только внутри окон замен. Окно 1 открывается после того, как каждая команда завершила свой первый матч, и закрывается перед началом 2-го тура; в нём доступно 2 замены. Окно 2 работает так же после второго матча и перед 3-м туром; в нём 2 замены. Окно 3 длится с 8 Jul 2026, 00:00 UTC до 9 Jul 2026, 00:00 UTC; в нём 4 замены. Замена лишь меняет местами запасного и игрока стартового состава на той же позиции, влияет только на будущие туры и никогда не переписывает уже набранные очки.',
        },
        {
          question: 'Почему команда с большим бюджетом получает меньше очков?',
          answer:
            'Выбранный вами лимит бюджета задаёт ваш множитель очков. Большой бюджет упрощает набор дорогих звёзд, поэтому его множитель ниже. С меньшим бюджетом собрать состав сложнее, поэтому он получает больший множитель.',
        },
        {
          question: 'Как работает начисление очков?',
          answer:
            'Используйте калькулятор очков на главной странице для точного расчёта. Он отражает голы, ассисты, минуты, Clean Sheets, Performance Rating, множитель бюджета и Ownership Boost.',
          links: [{ label: 'Калькулятор очков', to: '/#score-calculator' }],
        },
        {
          question: 'Как мне попасть в основную игру?',
          answer:
            'Откройте Soccerverse по партнёрской ссылке сообщества от нашего реферала разработчика.',
          links: [{ label: 'Играть в Soccerverse', href: soccerversePlayAffiliateUrl }],
        },
      ],
    },
  ],
}

const chineseCopy: HelpCopy = {
  eyebrow: '帮助 & 常见问题',
  title: '帮助',
  intro:
    '一份实用解答合集，涵盖注册、账号登录、阵容调整、计分以及 Soccerverse 主游戏等内容。',
  discordCta: '打开 Soccerverse Discord',
  builderCta: '打开 Builder',
  sections: [
    {
      eyebrow: '管理 & 规则',
      title: '管理与规则',
      items: [
        {
          question: '我可以拥有几个账号？',
          answer: '一个。不允许使用多个账号，违者可能被取消参赛资格。',
        },
        {
          question: '我可以只用同一支球队来组建阵容吗？',
          answer:
            '不可以。你的阵容中来自同一支 Grand Tournament（大赛）球队的球员最多只能有 4 名。因此，仅由摩洛哥球员、巴西球员或任何其他单一球队组成的阵容是不允许的。',
        },
        {
          question: '我在哪里可以获得帮助？',
          answer: '请使用 Soccerverse Discord。那里是获取赛事支持和账号问题帮助的最佳场所。',
          links: [{ label: 'Soccerverse Discord', href: soccerverseDiscordUrl }],
        },
        {
          question: '我该如何注册？',
          answer:
            '打开注册页面，选择 Rookie（新秀）或 Veteran（老将），填写你的个人资料和国家，然后确认我们发送给你的邮件。',
          links: [{ label: '注册', to: '/register' }],
        },
        {
          question: '我该如何设置密码？',
          answer:
            '邮箱确认完成后，打开 Builder 控制台。在安全区域中，你可以设置密码，以便日后使用邮箱加密码登录。',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: '我可以在哪里重新申请确认邮件？',
          answer:
            '注册完成后，确认页面上会有一个重新发送按钮。如果你已经离开了该页面，请在 Discord 上向客服求助。',
          links: [
            { label: '注册', to: '/register' },
            { label: 'Discord 支持', href: soccerverseDiscordUrl },
          ],
        },
        {
          question: '我该如何将邮件发件人加入白名单？',
          answer:
            '请将 noreply@svtool.info 添加到你的联系人或安全发件人列表中。赛事邮件以 "Soccerverse Community Event <noreply@svtool.info>" 的名义发送。如果你仍然找不到邮件，请检查垃圾邮件、推广邮件以及被过滤的文件夹。',
        },
        {
          question: '我可以在哪里重置密码？',
          answer: '请使用 Login（登录）页面上的找回表单。它会向你的邮箱发送一个密码重置链接。',
          links: [{ label: 'Login', to: '/login' }],
        },
        {
          question: '我可以降级到 Rookie League（新秀联赛）吗？',
          answer: '可以，但只能通过 Soccerverse Discord 上的客服来办理。',
          links: [{ label: 'Discord 支持', href: soccerverseDiscordUrl }],
        },
      ],
    },
    {
      eyebrow: '其他问题',
      title: '其他问题',
      items: [
        {
          question: '我之后可以从 Rookie 升级到 Veteran 吗？',
          answer:
            '可以。打开 Builder 并使用 "Link your Soccerverse account"（关联你的 Soccerverse 账号）。之后如有需要，团队可以为你办理 Veteran 升级。',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: '我该如何更改我的预算？',
          answer:
            '在 Builder 中，使用预算区域的 "Change cap"（更改预算上限）并选择一个新的预算上限。只有当你当前的阵容已经符合更低的预算上限时，才能选择它；否则请先移除部分球员。',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: '结果什么时候公布？',
          answer:
            '我们目前还不清楚需要多少人工跟进工作。社区团队会尽量以最快的速度公布结果。',
        },
        {
          question: '我什么时候可以更改首发阵容？',
          answer:
            '只能在换人窗口内进行。窗口 1 在每支球队完成各自首场比赛后开启，并在第 2 轮开始前关闭，提供 2 次换人。窗口 2 的规则相同，在第二场比赛之后、第 3 轮之前开启，提供 2 次换人。窗口 3 的开放时间为 2026 年 7 月 8 日 00:00 UTC 至 2026 年 7 月 9 日 00:00 UTC，提供 4 次换人。一次换人只能在同一位置上用一名替补换下一名首发，仅影响未来的轮次，绝不会改写已经获得的积分。',
        },
        {
          question: '为什么预算更高的阵容反而得分更少？',
          answer:
            '你所选择的预算上限决定了你的得分倍率。预算越高，越容易招募昂贵的球星，因此倍率更低。预算越低，组建阵容越困难，因此会获得更高的倍率。',
        },
        {
          question: '计分是如何运作的？',
          answer:
            '请使用主页上的得分计算器来了解精确算法。它会综合反映进球、助攻、上场时间、Clean Sheets（零封）、Performance Rating（表现评分）、预算倍率以及 Ownership Boost（持有加成）。',
          links: [{ label: '得分计算器', to: '/#score-calculator' }],
        },
        {
          question: '我该如何进入主游戏？',
          answer:
            '通过我们开发者推荐的社区联盟链接打开 Soccerverse。',
          links: [{ label: '畅玩 Soccerverse', href: soccerversePlayAffiliateUrl }],
        },
      ],
    },
  ],
}

const japaneseCopy: HelpCopy = {
  eyebrow: 'ヘルプ & FAQ',
  title: 'ヘルプ',
  intro:
    '登録、アカウントへのアクセス、スカッドの変更、スコア計算、そして本編の Soccerverse について、実用的な回答を最初にまとめたものです。',
  discordCta: 'Soccerverse Discord を開く',
  builderCta: 'Builder を開く',
  sections: [
    {
      eyebrow: '管理 & ルール',
      title: '管理とルール',
      items: [
        {
          question: 'アカウントはいくつ持てますか？',
          answer: '1つです。複数アカウントの利用は認められておらず、失格となる場合があります。',
        },
        {
          question: '1つのチームだけでスカッドを組めますか？',
          answer:
            'いいえ。スカッドに入れられるのは、同じ Grand Tournament チームの選手が最大4名までです。モロッコの選手だけ、ブラジルの選手だけ、あるいはその他の単一チームだけで構成されたスカッドは作れません。',
        },
        {
          question: 'どこでサポートを受けられますか？',
          answer: 'Soccerverse Discord をご利用ください。イベントのサポートやアカウントに関する質問には、そこが最適な場所です。',
          links: [{ label: 'Soccerverse Discord', href: soccerverseDiscordUrl }],
        },
        {
          question: '登録はどうすればよいですか？',
          answer:
            '登録ページを開き、Rookie または Veteran を選び、プロフィールと国を入力してから、お送りするメールで確認を完了してください。',
          links: [{ label: '登録する', to: '/register' }],
        },
        {
          question: 'パスワードはどうやって設定しますか？',
          answer:
            'メールの確認が完了したら、Builder のダッシュボードを開いてください。セキュリティのエリアで、後からメールとパスワードでログインするためのパスワードを設定できます。',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: '確認メールを再送するにはどこから依頼できますか？',
          answer:
            '登録の直後、確認画面に再送ボタンがあります。その画面がもう表示できない場合は、Discord でサポートにお問い合わせください。',
          links: [
            { label: '登録する', to: '/register' },
            { label: 'Discord サポート', href: soccerverseDiscordUrl },
          ],
        },
        {
          question: 'メール送信元をホワイトリストに登録するには？',
          answer:
            'noreply@svtool.info を連絡先または安全な送信元（セーフセンダー）リストに追加してください。イベントのメールは "Soccerverse Community Event <noreply@svtool.info>" として送信されます。それでもメールが見つからない場合は、迷惑メール、プロモーション、フィルタ済みのフォルダをご確認ください。',
        },
        {
          question: 'パスワードのリセットはどこでできますか？',
          answer: 'Login ページのリカバリーフォームをご利用ください。パスワードのリセットリンクをメールアドレス宛にお送りします。',
          links: [{ label: 'Login', to: '/login' }],
        },
        {
          question: 'Rookie League にダウングレードできますか？',
          answer: 'はい。ただし Soccerverse Discord のサポートを通じてのみ可能です。',
          links: [{ label: 'Discord サポート', href: soccerverseDiscordUrl }],
        },
      ],
    },
    {
      eyebrow: 'その他の質問',
      title: 'その他の質問',
      items: [
        {
          question: '後から Rookie から Veteran にアップグレードできますか？',
          answer:
            'はい。Builder を開き、"Link your Soccerverse account" をご利用ください。その後、必要に応じてチームが Veteran への移行を対応します。',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: '予算（budget）はどうやって変更しますか？',
          answer:
            'Builder の予算エリアで "Change cap" を使い、新しい予算上限を選んでください。低い予算上限は、現在のスカッドがすでにその上限内に収まっている場合にのみ選択できます。そうでない場合は、先に選手を外してください。',
          links: [{ label: 'Builder', to: '/builder' }],
        },
        {
          question: '結果はいつ公開されますか？',
          answer:
            '手作業でのフォローアップ作業がどれくらい必要になるかは、まだわかっていません。コミュニティチームが、できるだけ早く結果を公開できるよう努めます。',
        },
        {
          question: 'ラインアップはいつ変更できますか？',
          answer:
            'スワップウィンドウ（交代可能な期間）の間のみです。Window 1 は、すべてのチームが最初の試合を終えた後に開き、第2ラウンドが始まる前に閉じます。交代は2回までです。Window 2 も同様に、2試合目の後・第3ラウンドの前に開き、こちらも交代は2回までです。Window 3 は 2026年7月8日 00:00 UTC から 2026年7月9日 00:00 UTC まで開き、交代は4回までです。スワップは同じポジションの控え選手とスターターを入れ替えるだけで、影響するのは今後のラウンドのみであり、すでに獲得したポイントが書き換えられることは決してありません。',
        },
        {
          question: 'なぜ予算が多いチームの方が獲得ポイントが少なくなるのですか？',
          answer:
            '選択した予算上限（budget cap）が、あなたのスコア倍率を決めます。予算が多いほど高額なスター選手を編成しやすくなるため、倍率は低くなります。予算が少ないほど編成は難しくなるため、より大きな倍率が与えられます。',
        },
        {
          question: 'スコア計算はどのように行われますか？',
          answer:
            '正確な計算については、ホームページのスコア計算機をご利用ください。ゴール、アシスト、出場時間、Clean Sheets、Performance Rating、予算倍率、Ownership Boost を反映しています。',
          links: [{ label: 'スコア計算機', to: '/#score-calculator' }],
        },
        {
          question: '本編のゲームにはどうやって行けますか？',
          answer:
            '私たちのデベロッパー紹介によるコミュニティのアフィリエイトリンクから Soccerverse を開いてください。',
          links: [{ label: 'Soccerverse をプレイ', href: soccerversePlayAffiliateUrl }],
        },
      ],
    },
  ],
}

const copyByLocale: Partial<Record<LocaleCode, HelpCopy>> = {
  en: englishCopy,
  es: spanishCopy,
  it: italianCopy,
  de: germanCopy,
  fr: frenchCopy,
  pt: portugueseCopy,
  ru: russianCopy,
  zh: chineseCopy,
  ja: japaneseCopy,
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

      <RulesHelpAssistant />

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
