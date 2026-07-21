import type { LocaleCode } from '../lib/types'

interface PrivacyPageProps {
  locale: LocaleCode
}

interface PrivacySection {
  title: string
  paragraphs?: string[]
  items?: string[]
}

interface PrivacyCopy {
  eyebrow: string
  title: string
  updated: string
  intro: string
  controllerEyebrow: string
  controllerTitle: string
  controllerBody: string
  contactLabel: string
  sections: PrivacySection[]
}

const privacyEmail = 'privacy@svtool.info'
const soccerverseFifproUrl = 'https://soccerverse.com/news/soccerverse-secures-fifpro-license/'
const soccerversePlayUrl = 'https://play.soccerverse.com/'

const englishCopy: PrivacyCopy = {
  eyebrow: 'privacy notice',
  title: 'Privacy Policy',
  updated: 'Last updated: July 21, 2026',
  intro:
    'This notice explains how The Grant Tournament processes personal data for registration, squad building, scoring, support, anti-abuse checks, and event communication.',
  controllerEyebrow: 'controller',
  controllerTitle: 'Who is responsible',
  controllerBody:
    'Libertaerx, Compañia Loma Clavel, 060114 Caazapá, Paraguay is responsible for this community event and the processing described here.',
  contactLabel: 'Privacy contact',
  sections: [
    {
      title: 'Project context',
      paragraphs: [
        'The Grant Tournament is a fan-made community project. It is not an official Soccerverse product, but it uses Soccerverse-related data so participants can draft and score squads around the tournament.',
        'Soccerverse has announced an official FIFPRO partnership. According to Soccerverse, licensed players can feature authentic likenesses, real stats, and verified career data, with more than 65,000 professional players from 193 countries represented in the main game. Where this event references Soccerverse player data, that context belongs to Soccerverse and its licensors, not to this community event.',
      ],
    },
    {
      title: 'Data we process',
      items: [
        'Registration data such as email address, display name, selected league type, selected nations, Soccerverse username if provided, and registration status.',
        'Account access data such as verification tokens, password-reset tokens, session cookies, CSRF tokens, and password hashes. We do not store plain-text passwords.',
        'Squad and competition data such as budget cap, selected players, lineups, swap history, points, rankings, public profile slug, and reveal settings.',
        'Communication data such as marketing consent, unsubscribe status, support context you send us, and email delivery metadata needed to operate event mails.',
        'For eligible physical-prize winners only, delivery data such as recipient name and postal address. We use it solely to arrange prize delivery and do not display it publicly.',
        'Security and fairness data such as IP-derived request context, user agent, basic browser/device fingerprint fields, timestamps, referral parameters, and audit logs used to detect multi-accounting, abuse, or technical issues.',
      ],
    },
    {
      title: 'Why we process data',
      items: [
        'To register participants, verify emails, provide login, password recovery, and the squad builder.',
        'To run the event, calculate scores, publish leaderboards, show public profiles when revealed, and enforce the rules.',
        'To send necessary transactional emails and, if you opted in, event news, reminders, and marketing messages.',
        'To protect the event against multi-accounts, fraud, spam, abuse, and operational failures.',
        'To understand referral performance for community links and developer referrals.',
      ],
    },
    {
      title: 'Public information',
      paragraphs: [
        'Leaderboards, public profiles, nation rankings, revealed squads, display names, selected countries, and scoring results may be visible to other users. Some squad data stays hidden until you reveal it or until event rules allow a global reveal.',
        'Do not use a display name that contains private information you do not want to show publicly.',
      ],
    },
    {
      title: 'Cookies, local storage, and referral links',
      paragraphs: [
        'We use necessary cookies for participant and admin sessions and CSRF protection. The browser may also store your selected language, participant readiness state, and referral parameters in local or session storage.',
        'Footer and event links to Soccerverse may include an affiliate or referral parameter for one of the community developers. When you leave this site, Soccerverse or Discord process your activity under their own terms and privacy notices.',
      ],
    },
    {
      title: 'Email',
      paragraphs: [
        'Transactional emails include verification, password recovery, and event-critical account messages. Marketing or reminder emails are sent only where the system records a corresponding opt-in, unless a message is required for account or event operation.',
        'Every marketing email should include an unsubscribe option. You can also contact us at privacy@svtool.info.',
      ],
    },
    {
      title: 'Sharing and service providers',
      paragraphs: [
        'We use hosting, database, email, logging, and deployment infrastructure to run the event. These providers process data only as needed to provide the service. We do not sell participant data.',
        'External services linked from this site, including Soccerverse, Discord, FIFPRO, X, Twitch, or community tools, are separate services. Their own privacy rules apply when you open them.',
      ],
    },
    {
      title: 'Retention',
      paragraphs: [
        'We keep data for as long as needed to run the event, maintain leaderboards and auditability, handle support, prevent abuse, and meet legal or operational requirements. Marketing consent and unsubscribe records may be retained so we can respect your choice.',
        'Some deletion requests may be limited where records are needed for scoring integrity, fraud prevention, security, or legal reasons.',
      ],
    },
    {
      title: 'Your choices and rights',
      paragraphs: [
        'You can ask for access, correction, deletion, restriction, objection, or withdrawal of consent where applicable. Contact privacy@svtool.info and include enough information for us to identify your event account.',
        'If you use Discord or Soccerverse support, do not post sensitive account details publicly. Use the appropriate private support flow when needed.',
      ],
    },
    {
      title: 'Security and changes',
      paragraphs: [
        'We use reasonable technical and organizational measures such as hashed passwords, session protection, CSRF checks, and limited admin access. No internet service can be guaranteed to be risk-free.',
        'We may update this notice as the event, email system, or data flows change. The date at the top shows the current version.',
      ],
    },
  ],
}

const germanCopy: PrivacyCopy = {
  eyebrow: 'datenschutz',
  title: 'Datenschutzerklärung',
  updated: 'Stand: 21. Juli 2026',
  intro:
    'Diese Datenschutzerklärung erklärt, wie The Grant Tournament personenbezogene Daten für Registrierung, Squad Builder, Scoring, Support, Missbrauchsschutz und Event-Kommunikation verarbeitet.',
  controllerEyebrow: 'verantwortlicher',
  controllerTitle: 'Wer verantwortlich ist',
  controllerBody:
    'Libertaerx, Compañia Loma Clavel, 060114 Caazapá, Paraguay ist verantwortlich für dieses Community-Event und die hier beschriebene Verarbeitung.',
  contactLabel: 'Datenschutzkontakt',
  sections: [
    {
      title: 'Projektkontext',
      paragraphs: [
        'The Grant Tournament ist ein fan-gemachtes Community-Projekt. Es ist kein offizielles Soccerverse-Produkt, nutzt aber Soccerverse-bezogene Daten, damit Teilnehmer rund um das Turnier Kader bauen und Punkte sammeln können.',
        'Soccerverse hat eine offizielle Partnerschaft mit FIFPRO bekanntgegeben. Laut Soccerverse können lizenzierte Spieler im Hauptspiel mit authentischen Abbildungen, echten Statistiken und verifizierten Karrieredaten erscheinen; außerdem umfasst das Hauptspiel mehr als 65.000 Profispieler aus 193 Ländern. Wenn dieses Event Soccerverse-Spielerdaten verwendet oder erwähnt, liegt dieser Datenkontext bei Soccerverse und seinen Lizenzgebern, nicht bei diesem Community-Event.',
      ],
    },
    {
      title: 'Welche Daten wir verarbeiten',
      items: [
        'Registrierungsdaten wie E-Mail-Adresse, Anzeigename, gewählte League, ausgewählte Nationen, optionaler Soccerverse-Benutzername und Registrierungsstatus.',
        'Zugangsdaten wie Bestätigungs-Tokens, Passwort-Reset-Tokens, Session-Cookies, CSRF-Tokens und Passwort-Hashes. Klartext-Passwörter speichern wir nicht.',
        'Squad- und Wettbewerbsdaten wie Budget-Cap, ausgewählte Spieler, Lineups, Wechselhistorie, Punkte, Ranglisten, öffentlicher Profil-Slug und Reveal-Einstellungen.',
        'Kommunikationsdaten wie Marketing-Einwilligung, Abmeldestatus, Support-Inhalte, die du uns sendest, und technische E-Mail-Metadaten, die für Event-Mails nötig sind.',
        'Nur bei berechtigten Gewinnern physischer Preise: Versanddaten wie Empfängername und Postadresse. Wir verwenden sie ausschließlich für den Preisversand und zeigen sie nicht öffentlich an.',
        'Sicherheits- und Fairness-Daten wie anfragebezogener IP-Kontext, User Agent, einfache Browser-/Geräte-Fingerprint-Felder, Zeitstempel, Referral-Parameter und Audit-Logs zur Erkennung von Multi-Accounting, Missbrauch oder technischen Problemen.',
      ],
    },
    {
      title: 'Wofür wir Daten verarbeiten',
      items: [
        'Zur Registrierung, E-Mail-Bestätigung, Anmeldung, Passwort-Wiederherstellung und Bereitstellung des Squad Builders.',
        'Zur Durchführung des Events, Berechnung von Punkten, Veröffentlichung von Leaderboards, Anzeige öffentlicher Profile nach Reveal und Durchsetzung der Regeln.',
        'Zum Versand notwendiger Transaktionsmails und, wenn du zugestimmt hast, Event-News, Erinnerungen und Marketing-Mails.',
        'Zum Schutz des Events vor Multi-Accounts, Betrug, Spam, Missbrauch und Betriebsfehlern.',
        'Zur Auswertung von Referral-Performance für Community-Links und Entwickler-Referrals.',
      ],
    },
    {
      title: 'Öffentliche Informationen',
      paragraphs: [
        'Leaderboards, öffentliche Profile, Nation-Rankings, gerevealte Kader, Anzeigenamen, ausgewählte Länder und Scoring-Ergebnisse können für andere Nutzer sichtbar sein. Manche Squad-Daten bleiben verborgen, bis du sie selbst revealst oder bis die Event-Regeln einen globalen Reveal erlauben.',
        'Verwende keinen Anzeigenamen, der private Informationen enthält, die du nicht öffentlich zeigen möchtest.',
      ],
    },
    {
      title: 'Cookies, lokaler Speicher und Referral-Links',
      paragraphs: [
        'Wir verwenden notwendige Cookies für Teilnehmer- und Admin-Sessions sowie CSRF-Schutz. Im Browser können außerdem deine Spracheinstellung, Teilnehmerstatus und Referral-Parameter in Local Storage oder Session Storage gespeichert werden.',
        'Footer- und Event-Links zu Soccerverse können einen Affiliate- oder Referral-Parameter eines Community-Entwicklers enthalten. Wenn du diese Website verlässt, verarbeiten Soccerverse oder Discord deine Aktivität nach ihren eigenen Bedingungen und Datenschutzhinweisen.',
      ],
    },
    {
      title: 'E-Mail',
      paragraphs: [
        'Transaktionsmails umfassen Bestätigung, Passwort-Wiederherstellung und wichtige Account- oder Event-Nachrichten. Marketing- oder Erinnerungs-E-Mails senden wir nur, wenn im System eine entsprechende Einwilligung vorliegt, sofern die Nachricht nicht für Account- oder Event-Betrieb erforderlich ist.',
        'Jede Marketing-Mail sollte eine Abmeldemöglichkeit enthalten. Du kannst uns außerdem unter privacy@svtool.info kontaktieren.',
      ],
    },
    {
      title: 'Weitergabe und Dienstleister',
      paragraphs: [
        'Wir nutzen Hosting-, Datenbank-, E-Mail-, Logging- und Deployment-Infrastruktur, um das Event zu betreiben. Diese Dienstleister verarbeiten Daten nur, soweit es für den Betrieb nötig ist. Wir verkaufen keine Teilnehmerdaten.',
        'Externe Dienste, die von dieser Website verlinkt werden, darunter Soccerverse, Discord, FIFPRO, X, Twitch oder Community-Tools, sind eigenständige Angebote. Dort gelten deren eigene Datenschutzregeln.',
      ],
    },
    {
      title: 'Speicherdauer',
      paragraphs: [
        'Wir speichern Daten so lange, wie es für Event-Betrieb, Leaderboards, Nachvollziehbarkeit, Support, Missbrauchsschutz und rechtliche oder operative Anforderungen nötig ist. Marketing-Einwilligungen und Abmeldungen können gespeichert bleiben, damit wir deine Auswahl respektieren können.',
        'Löschanfragen können eingeschränkt sein, wenn Daten für Scoring-Integrität, Betrugsprävention, Sicherheit oder rechtliche Gründe benötigt werden.',
      ],
    },
    {
      title: 'Deine Auswahlmöglichkeiten und Rechte',
      paragraphs: [
        'Du kannst, soweit anwendbar, Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch oder Widerruf einer Einwilligung verlangen. Kontaktiere privacy@svtool.info und gib genügend Informationen an, damit wir deinen Event-Account identifizieren können.',
        'Wenn du Discord- oder Soccerverse-Support nutzt, poste keine sensiblen Account-Daten öffentlich. Nutze bei Bedarf den passenden privaten Support-Weg.',
      ],
    },
    {
      title: 'Sicherheit und Änderungen',
      paragraphs: [
        'Wir nutzen angemessene technische und organisatorische Maßnahmen wie gehashte Passwörter, Session-Schutz, CSRF-Prüfungen und begrenzten Admin-Zugriff. Kein Internetdienst kann vollständig risikofrei garantiert werden.',
        'Wir können diese Erklärung aktualisieren, wenn sich Event, E-Mail-System oder Datenflüsse ändern. Das Datum oben zeigt die aktuelle Version.',
      ],
    },
  ],
}

const spanishCopy: PrivacyCopy = {
  eyebrow: 'privacidad',
  title: 'Política de privacidad',
  updated: 'Última actualización: 1 de junio de 2026',
  intro:
    'Este aviso explica cómo The Grant Tournament trata datos personales para registro, squad builder, scoring, soporte, controles antiabuso y comunicación del evento.',
  controllerEyebrow: 'responsable',
  controllerTitle: 'Quién es responsable',
  controllerBody:
    'Libertaerx, Compañia Loma Clavel, 060114 Caazapá, Paraguay es responsable de este evento comunitario y del tratamiento descrito aquí.',
  contactLabel: 'Contacto de privacidad',
  sections: [
    {
      title: 'Contexto del proyecto',
      paragraphs: [
        'The Grant Tournament es un proyecto comunitario hecho por fans. No es un producto oficial de Soccerverse, pero usa datos relacionados con Soccerverse para que los participantes puedan construir plantillas y sumar puntos durante el torneo.',
        'Soccerverse ha anunciado una colaboración oficial con FIFPRO. Según Soccerverse, los jugadores licenciados pueden incluir apariencias auténticas, estadísticas reales y datos de carrera verificados, con más de 65,000 futbolistas profesionales de 193 países representados en el juego principal. Cuando este evento referencia datos de jugadores de Soccerverse, ese contexto pertenece a Soccerverse y sus licenciantes, no a este evento comunitario.',
      ],
    },
    {
      title: 'Datos que tratamos',
      items: [
        'Datos de registro como email, nombre visible, tipo de liga elegido, naciones seleccionadas, usuario de Soccerverse si se proporciona y estado de registro.',
        'Datos de acceso como tokens de verificación, tokens de recuperación de contraseña, cookies de sesión, tokens CSRF y hashes de contraseña. No almacenamos contraseñas en texto plano.',
        'Datos de plantilla y competición como budget cap, jugadores seleccionados, lineups, historial de cambios, puntos, rankings, slug de perfil público y ajustes de reveal.',
        'Datos de comunicación como consentimiento de marketing, estado de baja, contexto de soporte que nos envíes y metadatos técnicos de email necesarios para operar los correos del evento.',
        'Datos de seguridad y fair play como contexto de solicitud derivado de IP, user agent, campos básicos de huella de navegador/dispositivo, marcas de tiempo, parámetros referral y audit logs usados para detectar multi-accounting, abuso o problemas técnicos.',
      ],
    },
    {
      title: 'Por qué tratamos datos',
      items: [
        'Para registrar participantes, verificar emails, ofrecer login, recuperación de contraseña y squad builder.',
        'Para ejecutar el evento, calcular puntos, publicar leaderboards, mostrar perfiles públicos cuando se revelan y hacer cumplir las reglas.',
        'Para enviar emails transaccionales necesarios y, si aceptaste, noticias, recordatorios y mensajes de marketing del evento.',
        'Para proteger el evento contra multi-accounts, fraude, spam, abuso y fallos operativos.',
        'Para entender el rendimiento de referrals en enlaces comunitarios y referrals de desarrolladores.',
      ],
    },
    {
      title: 'Información pública',
      paragraphs: [
        'Leaderboards, perfiles públicos, rankings de naciones, plantillas reveladas, nombres visibles, países seleccionados y resultados de scoring pueden ser visibles para otros usuarios. Algunos datos de plantilla permanecen ocultos hasta que los reveles o hasta que las reglas permitan un reveal global.',
        'No uses un nombre visible que contenga información privada que no quieras mostrar públicamente.',
      ],
    },
    {
      title: 'Cookies, almacenamiento local y enlaces referral',
      paragraphs: [
        'Usamos cookies necesarias para sesiones de participantes y administradores y protección CSRF. El navegador también puede guardar tu idioma, estado de participante y parámetros referral en local storage o session storage.',
        'Los enlaces del footer y del evento hacia Soccerverse pueden incluir un parámetro affiliate o referral de uno de los desarrolladores de la comunidad. Cuando sales de este sitio, Soccerverse o Discord tratan tu actividad según sus propias condiciones y avisos de privacidad.',
      ],
    },
    {
      title: 'Email',
      paragraphs: [
        'Los emails transaccionales incluyen verificación, recuperación de contraseña y mensajes críticos de cuenta o evento. Los emails de marketing o recordatorios se envían solo cuando el sistema registra el opt-in correspondiente, salvo que el mensaje sea necesario para la cuenta o el funcionamiento del evento.',
        'Cada email de marketing debería incluir una opción de baja. También puedes contactarnos en privacy@svtool.info.',
      ],
    },
    {
      title: 'Compartición y proveedores',
      paragraphs: [
        'Usamos infraestructura de hosting, base de datos, email, logging y despliegue para operar el evento. Estos proveedores procesan datos solo en la medida necesaria para prestar el servicio. No vendemos datos de participantes.',
        'Los servicios externos enlazados desde este sitio, incluidos Soccerverse, Discord, FIFPRO, X, Twitch o herramientas comunitarias, son servicios separados. Sus propias reglas de privacidad aplican cuando los abres.',
      ],
    },
    {
      title: 'Conservación',
      paragraphs: [
        'Conservamos datos mientras sea necesario para operar el evento, mantener leaderboards y trazabilidad, atender soporte, prevenir abusos y cumplir requisitos legales u operativos. Los consentimientos y bajas de marketing pueden conservarse para respetar tu elección.',
        'Algunas solicitudes de eliminación pueden estar limitadas cuando los registros sean necesarios para integridad del scoring, prevención de fraude, seguridad o razones legales.',
      ],
    },
    {
      title: 'Tus opciones y derechos',
      paragraphs: [
        'Puedes solicitar acceso, corrección, eliminación, restricción, oposición o retirada de consentimiento cuando corresponda. Contacta con privacy@svtool.info e incluye información suficiente para identificar tu cuenta del evento.',
        'Si usas soporte en Discord o Soccerverse, no publiques datos sensibles de cuenta en público. Usa el canal privado adecuado cuando sea necesario.',
      ],
    },
    {
      title: 'Seguridad y cambios',
      paragraphs: [
        'Usamos medidas técnicas y organizativas razonables como contraseñas hasheadas, protección de sesión, controles CSRF y acceso admin limitado. Ningún servicio de internet puede garantizarse libre de riesgos.',
        'Podemos actualizar este aviso si cambian el evento, el sistema de email o los flujos de datos. La fecha superior muestra la versión actual.',
      ],
    },
  ],
}

const italianCopy: PrivacyCopy = {
  eyebrow: 'privacy',
  title: 'Informativa privacy',
  updated: 'Ultimo aggiornamento: 1 giugno 2026',
  intro:
    'Questa informativa spiega come The Grant Tournament tratta dati personali per registrazione, squad builder, scoring, supporto, controlli antiabuso e comunicazioni evento.',
  controllerEyebrow: 'titolare',
  controllerTitle: 'Chi è responsabile',
  controllerBody:
    'Libertaerx, Compañia Loma Clavel, 060114 Caazapá, Paraguay è responsabile di questo evento community e del trattamento descritto qui.',
  contactLabel: 'Contatto privacy',
  sections: [
    {
      title: 'Contesto del progetto',
      paragraphs: [
        'The Grant Tournament è un progetto community fatto dai fan. Non è un prodotto ufficiale Soccerverse, ma usa dati collegati a Soccerverse per permettere ai partecipanti di creare rose e ottenere punti durante il torneo.',
        'Soccerverse ha annunciato una partnership ufficiale con FIFPRO. Secondo Soccerverse, i giocatori con licenza possono avere likeness autentiche, statistiche reali e dati carriera verificati, con oltre 65,000 professionisti da 193 paesi rappresentati nel gioco principale. Quando questo evento cita dati giocatore Soccerverse, quel contesto appartiene a Soccerverse e ai suoi licenzianti, non a questo evento community.',
      ],
    },
    {
      title: 'Dati che trattiamo',
      items: [
        'Dati di registrazione come email, nome visualizzato, tipo di lega scelto, nazioni selezionate, username Soccerverse se fornito e stato della registrazione.',
        'Dati di accesso come token di verifica, token reset password, cookie di sessione, token CSRF e hash delle password. Non salviamo password in chiaro.',
        'Dati di rosa e competizione come budget cap, giocatori selezionati, lineups, storico swap, punti, classifiche, slug profilo pubblico e impostazioni reveal.',
        'Dati di comunicazione come consenso marketing, stato di unsubscribe, contenuti di supporto che ci invii e metadati email necessari a gestire le email evento.',
        'Dati di sicurezza e fairness come contesto richiesta derivato da IP, user agent, campi base di fingerprint browser/dispositivo, timestamp, parametri referral e audit log usati per rilevare multi-accounting, abusi o problemi tecnici.',
      ],
    },
    {
      title: 'Perché trattiamo i dati',
      items: [
        'Per registrare partecipanti, verificare email, fornire login, recupero password e squad builder.',
        'Per gestire l’evento, calcolare punti, pubblicare leaderboard, mostrare profili pubblici quando rivelati e far rispettare le regole.',
        'Per inviare email transazionali necessarie e, se hai dato consenso, news, promemoria e messaggi marketing dell’evento.',
        'Per proteggere l’evento da multi-account, frodi, spam, abusi e guasti operativi.',
        'Per capire la performance dei referral per link community e referral degli sviluppatori.',
      ],
    },
    {
      title: 'Informazioni pubbliche',
      paragraphs: [
        'Leaderboard, profili pubblici, ranking nazioni, rose rivelate, nomi visualizzati, paesi selezionati e risultati di scoring possono essere visibili ad altri utenti. Alcuni dati rosa restano nascosti finché non li riveli o finché le regole consentono un reveal globale.',
        'Non usare un nome visualizzato che contenga informazioni private che non vuoi mostrare pubblicamente.',
      ],
    },
    {
      title: 'Cookie, storage locale e referral link',
      paragraphs: [
        'Usiamo cookie necessari per sessioni partecipante e admin e protezione CSRF. Il browser può anche salvare lingua selezionata, stato partecipante e parametri referral in local storage o session storage.',
        'I link nel footer e nell’evento verso Soccerverse possono includere un parametro affiliate o referral di uno degli sviluppatori community. Quando lasci questo sito, Soccerverse o Discord trattano la tua attività secondo i propri termini e informative privacy.',
      ],
    },
    {
      title: 'Email',
      paragraphs: [
        'Le email transazionali includono verifica, recupero password e messaggi critici per account o evento. Email marketing o promemoria sono inviati solo quando il sistema registra il relativo opt-in, salvo messaggi necessari per account o operatività evento.',
        'Ogni email marketing dovrebbe includere un’opzione di unsubscribe. Puoi anche contattarci a privacy@svtool.info.',
      ],
    },
    {
      title: 'Condivisione e fornitori',
      paragraphs: [
        'Usiamo infrastruttura di hosting, database, email, logging e deploy per gestire l’evento. Questi fornitori trattano dati solo quanto necessario per fornire il servizio. Non vendiamo dati dei partecipanti.',
        'I servizi esterni linkati da questo sito, inclusi Soccerverse, Discord, FIFPRO, X, Twitch o strumenti community, sono servizi separati. Le loro regole privacy si applicano quando li apri.',
      ],
    },
    {
      title: 'Conservazione',
      paragraphs: [
        'Conserviamo i dati finché necessario per gestire l’evento, mantenere leaderboard e auditabilità, offrire supporto, prevenire abusi e soddisfare requisiti legali o operativi. Consensi e unsubscribe marketing possono essere conservati per rispettare la tua scelta.',
        'Alcune richieste di cancellazione possono essere limitate se i record servono per integrità dello scoring, prevenzione frodi, sicurezza o motivi legali.',
      ],
    },
    {
      title: 'Le tue scelte e i tuoi diritti',
      paragraphs: [
        'Puoi chiedere accesso, correzione, cancellazione, limitazione, opposizione o revoca del consenso dove applicabile. Contatta privacy@svtool.info e includi informazioni sufficienti per identificare il tuo account evento.',
        'Se usi supporto Discord o Soccerverse, non pubblicare dettagli sensibili dell’account. Usa il canale privato appropriato quando serve.',
      ],
    },
    {
      title: 'Sicurezza e modifiche',
      paragraphs: [
        'Usiamo misure tecniche e organizzative ragionevoli come password hashate, protezione sessione, controlli CSRF e accesso admin limitato. Nessun servizio internet può essere garantito privo di rischi.',
        'Possiamo aggiornare questa informativa se cambiano evento, sistema email o flussi dati. La data in alto indica la versione corrente.',
      ],
    },
  ],
}

const frenchCopy: PrivacyCopy = {
  eyebrow: 'confidentialité',
  title: 'Politique de confidentialité',
  updated: 'Dernière mise à jour : 1 juin 2026',
  intro:
    'Cette notice explique comment The Grant Tournament traite les données personnelles pour l’inscription, le squad builder, le scoring, le support, les contrôles anti-abus et les communications de l’événement.',
  controllerEyebrow: 'responsable',
  controllerTitle: 'Qui est responsable',
  controllerBody:
    'Libertaerx, Compañia Loma Clavel, 060114 Caazapá, Paraguay est responsable de cet événement communautaire et du traitement décrit ici.',
  contactLabel: 'Contact confidentialité',
  sections: [
    {
      title: 'Contexte du projet',
      paragraphs: [
        'The Grant Tournament est un projet communautaire fait par des fans. Ce n’est pas un produit officiel Soccerverse, mais il utilise des données liées à Soccerverse pour permettre aux participants de créer des squads et de marquer des points pendant le tournoi.',
        'Soccerverse a annoncé un partenariat officiel avec FIFPRO. Selon Soccerverse, les joueurs licenciés peuvent avoir des apparences authentiques, de vraies statistiques et des données de carrière vérifiées, avec plus de 65,000 professionnels issus de 193 pays représentés dans le jeu principal. Quand cet événement référence des données de joueurs Soccerverse, ce contexte appartient à Soccerverse et à ses concédants, pas à cet événement communautaire.',
      ],
    },
    {
      title: 'Données que nous traitons',
      items: [
        'Données d’inscription comme l’adresse email, le nom affiché, le type de ligue choisi, les nations sélectionnées, le nom Soccerverse si fourni et le statut d’inscription.',
        'Données d’accès comme les tokens de vérification, tokens de réinitialisation de mot de passe, cookies de session, tokens CSRF et hashes de mots de passe. Nous ne stockons pas les mots de passe en clair.',
        'Données de squad et compétition comme budget cap, joueurs sélectionnés, lineups, historique des swaps, points, classements, slug de profil public et paramètres de reveal.',
        'Données de communication comme consentement marketing, statut de désinscription, contexte de support que tu nous envoies et métadonnées email nécessaires aux emails événement.',
        'Données de sécurité et fairness comme contexte de requête dérivé d’IP, user agent, champs basiques de fingerprint navigateur/appareil, horodatages, paramètres referral et audit logs utilisés pour détecter multi-accounting, abus ou problèmes techniques.',
      ],
    },
    {
      title: 'Pourquoi nous traitons les données',
      items: [
        'Pour inscrire les participants, vérifier les emails, fournir login, récupération de mot de passe et squad builder.',
        'Pour faire fonctionner l’événement, calculer les points, publier les leaderboards, afficher les profils publics lorsqu’ils sont révélés et appliquer les règles.',
        'Pour envoyer les emails transactionnels nécessaires et, si tu as opt-in, les news, rappels et messages marketing de l’événement.',
        'Pour protéger l’événement contre multi-accounts, fraude, spam, abus et défaillances opérationnelles.',
        'Pour comprendre la performance des referrals sur les liens communautaires et referrals de développeurs.',
      ],
    },
    {
      title: 'Informations publiques',
      paragraphs: [
        'Leaderboards, profils publics, classements nationaux, squads révélés, noms affichés, pays sélectionnés et résultats de scoring peuvent être visibles par d’autres utilisateurs. Certaines données de squad restent cachées jusqu’à ton reveal ou jusqu’à ce que les règles permettent un reveal global.',
        'N’utilise pas un nom affiché contenant des informations privées que tu ne veux pas montrer publiquement.',
      ],
    },
    {
      title: 'Cookies, stockage local et liens referral',
      paragraphs: [
        'Nous utilisons des cookies nécessaires pour les sessions participant et admin et la protection CSRF. Le navigateur peut aussi stocker ta langue, l’état participant et les paramètres referral en local storage ou session storage.',
        'Les liens du footer et de l’événement vers Soccerverse peuvent inclure un paramètre affiliate ou referral d’un développeur communautaire. Quand tu quittes ce site, Soccerverse ou Discord traitent ton activité selon leurs propres conditions et notices de confidentialité.',
      ],
    },
    {
      title: 'Email',
      paragraphs: [
        'Les emails transactionnels incluent vérification, récupération de mot de passe et messages critiques pour le compte ou l’événement. Les emails marketing ou rappels sont envoyés seulement si le système enregistre l’opt-in correspondant, sauf message nécessaire au compte ou au fonctionnement de l’événement.',
        'Chaque email marketing devrait inclure une option de désinscription. Tu peux aussi nous contacter à privacy@svtool.info.',
      ],
    },
    {
      title: 'Partage et prestataires',
      paragraphs: [
        'Nous utilisons une infrastructure d’hébergement, base de données, email, logs et déploiement pour faire fonctionner l’événement. Ces prestataires traitent les données uniquement si nécessaire pour fournir le service. Nous ne vendons pas les données des participants.',
        'Les services externes liés depuis ce site, notamment Soccerverse, Discord, FIFPRO, X, Twitch ou des outils communautaires, sont des services séparés. Leurs propres règles de confidentialité s’appliquent quand tu les ouvres.',
      ],
    },
    {
      title: 'Conservation',
      paragraphs: [
        'Nous conservons les données aussi longtemps que nécessaire pour gérer l’événement, maintenir leaderboards et auditabilité, traiter le support, prévenir les abus et répondre aux exigences légales ou opérationnelles. Les consentements et désinscriptions marketing peuvent être conservés pour respecter ton choix.',
        'Certaines demandes de suppression peuvent être limitées lorsque les enregistrements sont nécessaires à l’intégrité du scoring, la prévention de fraude, la sécurité ou des raisons légales.',
      ],
    },
    {
      title: 'Tes choix et droits',
      paragraphs: [
        'Tu peux demander accès, correction, suppression, limitation, opposition ou retrait de consentement lorsque applicable. Contacte privacy@svtool.info et inclus assez d’informations pour identifier ton compte événement.',
        'Si tu utilises le support Discord ou Soccerverse, ne poste pas de détails sensibles de compte publiquement. Utilise le canal privé approprié si nécessaire.',
      ],
    },
    {
      title: 'Sécurité et changements',
      paragraphs: [
        'Nous utilisons des mesures techniques et organisationnelles raisonnables comme mots de passe hashés, protection de session, contrôles CSRF et accès admin limité. Aucun service internet ne peut être garanti sans risque.',
        'Nous pouvons mettre à jour cette notice si l’événement, le système email ou les flux de données changent. La date en haut indique la version actuelle.',
      ],
    },
  ],
}

const portugueseCopy: PrivacyCopy = {
  eyebrow: 'privacidade',
  title: 'Política de privacidade',
  updated: 'Última atualização: 1 de junho de 2026',
  intro:
    'Este aviso explica como The Grant Tournament trata dados pessoais para registo, squad builder, scoring, suporte, controlos antiabuso e comunicação do evento.',
  controllerEyebrow: 'responsável',
  controllerTitle: 'Quem é responsável',
  controllerBody:
    'Libertaerx, Compañia Loma Clavel, 060114 Caazapá, Paraguay é responsável por este evento comunitário e pelo tratamento aqui descrito.',
  contactLabel: 'Contacto de privacidade',
  sections: [
    {
      title: 'Contexto do projeto',
      paragraphs: [
        'The Grant Tournament é um projeto comunitário feito por fãs. Não é um produto oficial Soccerverse, mas usa dados relacionados com Soccerverse para permitir que participantes criem plantéis e pontuem durante o torneio.',
        'Soccerverse anunciou uma parceria oficial com FIFPRO. Segundo Soccerverse, jogadores licenciados podem incluir likenesses autênticas, estatísticas reais e dados de carreira verificados, com mais de 65,000 profissionais de 193 países representados no jogo principal. Quando este evento referencia dados de jogadores Soccerverse, esse contexto pertence à Soccerverse e aos seus licenciadores, não a este evento comunitário.',
      ],
    },
    {
      title: 'Dados que tratamos',
      items: [
        'Dados de registo como email, nome exibido, tipo de liga escolhido, nações selecionadas, username Soccerverse se fornecido e estado de registo.',
        'Dados de acesso como tokens de verificação, tokens de reset de password, cookies de sessão, tokens CSRF e hashes de password. Não guardamos passwords em texto simples.',
        'Dados de plantel e competição como budget cap, jogadores selecionados, lineups, histórico de swaps, pontos, rankings, slug de perfil público e definições de reveal.',
        'Dados de comunicação como consentimento de marketing, estado de unsubscribe, contexto de suporte que nos envias e metadados técnicos de email necessários para operar emails do evento.',
        'Dados de segurança e fairness como contexto de pedido derivado de IP, user agent, campos básicos de fingerprint de browser/dispositivo, timestamps, parâmetros referral e audit logs usados para detetar multi-accounting, abuso ou problemas técnicos.',
      ],
    },
    {
      title: 'Porque tratamos dados',
      items: [
        'Para registar participantes, verificar emails, fornecer login, recuperação de password e squad builder.',
        'Para gerir o evento, calcular pontos, publicar leaderboards, mostrar perfis públicos quando revelados e aplicar as regras.',
        'Para enviar emails transacionais necessários e, se deste opt-in, notícias, lembretes e mensagens de marketing do evento.',
        'Para proteger o evento contra multi-accounts, fraude, spam, abuso e falhas operacionais.',
        'Para compreender a performance de referrals em links comunitários e referrals de developers.',
      ],
    },
    {
      title: 'Informação pública',
      paragraphs: [
        'Leaderboards, perfis públicos, rankings de nações, plantéis revelados, nomes exibidos, países selecionados e resultados de scoring podem ficar visíveis para outros utilizadores. Alguns dados de plantel ficam ocultos até ao teu reveal ou até as regras permitirem um reveal global.',
        'Não uses um nome exibido que contenha informação privada que não queiras mostrar publicamente.',
      ],
    },
    {
      title: 'Cookies, armazenamento local e links referral',
      paragraphs: [
        'Usamos cookies necessários para sessões de participante e admin e proteção CSRF. O browser também pode guardar idioma selecionado, estado de participante e parâmetros referral em local storage ou session storage.',
        'Links no footer e no evento para Soccerverse podem incluir um parâmetro affiliate ou referral de um developer da comunidade. Quando sais deste site, Soccerverse ou Discord tratam a tua atividade segundo os seus próprios termos e avisos de privacidade.',
      ],
    },
    {
      title: 'Email',
      paragraphs: [
        'Emails transacionais incluem verificação, recuperação de password e mensagens críticas de conta ou evento. Emails de marketing ou lembretes são enviados apenas quando o sistema regista o respetivo opt-in, salvo mensagem necessária para conta ou operação do evento.',
        'Cada email de marketing deve incluir uma opção de unsubscribe. Também podes contactar-nos em privacy@svtool.info.',
      ],
    },
    {
      title: 'Partilha e fornecedores',
      paragraphs: [
        'Usamos infraestrutura de hosting, base de dados, email, logging e deploy para gerir o evento. Estes fornecedores tratam dados apenas quando necessário para prestar o serviço. Não vendemos dados de participantes.',
        'Serviços externos ligados a partir deste site, incluindo Soccerverse, Discord, FIFPRO, X, Twitch ou ferramentas comunitárias, são serviços separados. As suas próprias regras de privacidade aplicam-se quando os abres.',
      ],
    },
    {
      title: 'Retenção',
      paragraphs: [
        'Guardamos dados enquanto for necessário para gerir o evento, manter leaderboards e auditabilidade, dar suporte, prevenir abuso e cumprir requisitos legais ou operacionais. Consentimentos e unsubscribes de marketing podem ser guardados para respeitar a tua escolha.',
        'Alguns pedidos de eliminação podem ser limitados quando os registos são necessários para integridade do scoring, prevenção de fraude, segurança ou razões legais.',
      ],
    },
    {
      title: 'As tuas escolhas e direitos',
      paragraphs: [
        'Podes pedir acesso, correção, eliminação, restrição, oposição ou retirada de consentimento quando aplicável. Contacta privacy@svtool.info e inclui informação suficiente para identificarmos a tua conta do evento.',
        'Se usares suporte no Discord ou Soccerverse, não publiques detalhes sensíveis da conta em público. Usa o canal privado adequado quando necessário.',
      ],
    },
    {
      title: 'Segurança e alterações',
      paragraphs: [
        'Usamos medidas técnicas e organizacionais razoáveis como passwords com hash, proteção de sessão, controlos CSRF e acesso admin limitado. Nenhum serviço de internet pode ser garantido como livre de riscos.',
        'Podemos atualizar este aviso se o evento, sistema de email ou fluxos de dados mudarem. A data no topo mostra a versão atual.',
      ],
    },
  ],
}

const russianCopy: PrivacyCopy = {
  eyebrow: 'конфиденциальность',
  title: 'Политика конфиденциальности',
  updated: 'Последнее обновление: 1 июня 2026',
  intro:
    'Это уведомление объясняет, как The Grant Tournament обрабатывает персональные данные для регистрации, squad builder, scoring, поддержки, антиабуз-проверок и коммуникаций события.',
  controllerEyebrow: 'ответственный',
  controllerTitle: 'Кто отвечает',
  controllerBody:
    'Libertaerx, Compañia Loma Clavel, 060114 Caazapá, Paraguay отвечает за это событие сообщества и обработку, описанную здесь.',
  contactLabel: 'Контакт по приватности',
  sections: [
    {
      title: 'Контекст проекта',
      paragraphs: [
        'The Grant Tournament — фанатский проект сообщества. Это не официальный продукт Soccerverse, но он использует данные, связанные с Soccerverse, чтобы участники могли собирать составы и набирать очки во время турнира.',
        'Soccerverse объявил об официальном партнерстве с FIFPRO. По информации Soccerverse, лицензированные игроки могут иметь аутентичные likenesses, реальные статистики и проверенные карьерные данные, а в основной игре представлены более 65,000 профессиональных игроков из 193 стран. Когда событие ссылается на данные игроков Soccerverse, этот контекст принадлежит Soccerverse и его лицензиарам, а не этому событию сообщества.',
      ],
    },
    {
      title: 'Какие данные мы обрабатываем',
      items: [
        'Регистрационные данные, такие как email, отображаемое имя, выбранный тип лиги, выбранные нации, имя пользователя Soccerverse при наличии и статус регистрации.',
        'Данные доступа, такие как токены подтверждения, токены сброса пароля, session cookies, CSRF-токены и хэши паролей. Мы не храним пароли в открытом виде.',
        'Данные состава и соревнования, такие как budget cap, выбранные игроки, lineups, история swaps, очки, рейтинги, публичный profile slug и настройки reveal.',
        'Коммуникационные данные, такие как согласие на маркетинг, статус отписки, контекст поддержки, который ты отправляешь, и технические email-метаданные, нужные для писем события.',
        'Данные безопасности и fairness, такие как контекст запроса на основе IP, user agent, базовые поля browser/device fingerprint, временные метки, referral-параметры и audit logs для выявления multi-accounting, злоупотреблений или технических проблем.',
      ],
    },
    {
      title: 'Зачем мы обрабатываем данные',
      items: [
        'Чтобы регистрировать участников, подтверждать email, предоставлять login, восстановление пароля и squad builder.',
        'Чтобы проводить событие, считать очки, публиковать leaderboards, показывать публичные профили после reveal и применять правила.',
        'Чтобы отправлять необходимые транзакционные письма и, если есть opt-in, новости, напоминания и маркетинговые сообщения события.',
        'Чтобы защищать событие от multi-accounts, мошенничества, спама, злоупотреблений и операционных сбоев.',
        'Чтобы понимать эффективность referrals для ссылок сообщества и developer referrals.',
      ],
    },
    {
      title: 'Публичная информация',
      paragraphs: [
        'Leaderboards, публичные профили, рейтинги наций, раскрытые составы, отображаемые имена, выбранные страны и результаты scoring могут быть видны другим пользователям. Некоторые данные состава остаются скрытыми до твоего reveal или до глобального reveal по правилам события.',
        'Не используй отображаемое имя с приватной информацией, которую не хочешь показывать публично.',
      ],
    },
    {
      title: 'Cookies, local storage и referral links',
      paragraphs: [
        'Мы используем необходимые cookies для сессий участников и администраторов и CSRF-защиты. Браузер также может хранить выбранный язык, состояние участника и referral-параметры в local storage или session storage.',
        'Ссылки в footer и событии на Soccerverse могут включать affiliate или referral параметр одного из разработчиков сообщества. Когда ты покидаешь этот сайт, Soccerverse или Discord обрабатывают активность по своим условиям и privacy notices.',
      ],
    },
    {
      title: 'Email',
      paragraphs: [
        'Транзакционные письма включают подтверждение, восстановление пароля и важные сообщения по аккаунту или событию. Маркетинговые письма или напоминания отправляются только если система записала соответствующий opt-in, кроме случаев, когда сообщение нужно для аккаунта или работы события.',
        'Каждое маркетинговое письмо должно включать возможность отписки. Также можно написать нам на privacy@svtool.info.',
      ],
    },
    {
      title: 'Передача и поставщики',
      paragraphs: [
        'Мы используем hosting, database, email, logging и deployment инфраструктуру для работы события. Эти поставщики обрабатывают данные только насколько это нужно для сервиса. Мы не продаем данные участников.',
        'Внешние сервисы, на которые ведут ссылки с сайта, включая Soccerverse, Discord, FIFPRO, X, Twitch или инструменты сообщества, являются отдельными сервисами. При открытии действуют их собственные правила приватности.',
      ],
    },
    {
      title: 'Хранение',
      paragraphs: [
        'Мы храним данные столько, сколько нужно для работы события, leaderboards и auditability, поддержки, предотвращения злоупотреблений и выполнения правовых или операционных требований. Согласия и отписки от маркетинга могут храниться, чтобы соблюдать твой выбор.',
        'Некоторые запросы на удаление могут быть ограничены, если записи нужны для целостности scoring, предотвращения мошенничества, безопасности или юридических причин.',
      ],
    },
    {
      title: 'Твой выбор и права',
      paragraphs: [
        'Ты можешь запросить доступ, исправление, удаление, ограничение, возражение или отзыв согласия, где применимо. Напиши на privacy@svtool.info и добавь достаточно информации, чтобы мы идентифицировали твой аккаунт события.',
        'Если пользуешься поддержкой Discord или Soccerverse, не публикуй чувствительные данные аккаунта публично. При необходимости используй подходящий приватный канал поддержки.',
      ],
    },
    {
      title: 'Безопасность и изменения',
      paragraphs: [
        'Мы используем разумные технические и организационные меры, включая хэшированные пароли, защиту сессий, CSRF-проверки и ограниченный admin-доступ. Ни один интернет-сервис не может быть гарантированно безрисковым.',
        'Мы можем обновлять это уведомление при изменении события, email-системы или потоков данных. Дата сверху показывает текущую версию.',
      ],
    },
  ],
}

const chineseCopy: PrivacyCopy = {
  eyebrow: '隐私说明',
  title: '隐私政策',
  updated: '最后更新：2026 年 6 月 1 日',
  intro:
    '本说明解释 The Grant Tournament 如何为注册、squad builder、scoring、支持、反滥用检查和活动沟通处理个人数据。',
  controllerEyebrow: '负责人',
  controllerTitle: '谁负责',
  controllerBody:
    'Libertaerx, Compañia Loma Clavel, 060114 Caazapá, Paraguay 负责本社区活动以及此处描述的数据处理。',
  contactLabel: '隐私联系',
  sections: [
    {
      title: '项目背景',
      paragraphs: [
        'The Grant Tournament 是由粉丝制作的社区项目。它不是 Soccerverse 官方产品，但会使用与 Soccerverse 相关的数据，让参与者可以围绕赛事组建阵容并获得积分。',
        'Soccerverse 已宣布与 FIFPRO 建立官方合作。根据 Soccerverse 的说明，授权球员可以拥有真实肖像、真实统计和经过验证的职业数据，主游戏中包含来自 193 个国家的超过 65,000 名职业球员。当本活动引用 Soccerverse 球员数据时，该数据背景属于 Soccerverse 及其授权方，而非本社区活动。',
      ],
    },
    {
      title: '我们处理的数据',
      items: [
        '注册数据，例如邮箱、显示名称、选择的联赛类型、选择的国家、如提供则包括 Soccerverse 用户名，以及注册状态。',
        '账户访问数据，例如验证 token、密码重置 token、session cookies、CSRF tokens 和密码 hash。我们不存储明文密码。',
        '阵容和竞赛数据，例如 budget cap、已选球员、lineups、swap 历史、积分、排名、公开 profile slug 和 reveal 设置。',
        '沟通数据，例如 marketing consent、退订状态、你发送给我们的支持内容，以及运营活动邮件所需的技术 email metadata。',
        '安全和公平性数据，例如基于 IP 的请求上下文、user agent、基础 browser/device fingerprint 字段、时间戳、referral 参数和 audit logs，用于发现 multi-accounting、滥用或技术问题。',
      ],
    },
    {
      title: '我们为什么处理数据',
      items: [
        '用于注册参与者、验证邮箱、提供 login、密码恢复和 squad builder。',
        '用于运行活动、计算积分、发布 leaderboards、在 reveal 后展示公开 profiles，并执行规则。',
        '用于发送必要的交易邮件；如果你已 opt-in，也用于发送活动新闻、提醒和 marketing messages。',
        '用于保护活动免受 multi-accounts、欺诈、spam、滥用和运营故障影响。',
        '用于了解社区链接和开发者 referrals 的表现。',
      ],
    },
    {
      title: '公开信息',
      paragraphs: [
        'Leaderboards、公开 profiles、国家排名、已 reveal 阵容、显示名称、选择的国家和 scoring 结果可能对其他用户可见。某些阵容数据会保持隐藏，直到你 reveal，或活动规则允许 global reveal。',
        '请不要使用包含你不想公开展示的私人信息的显示名称。',
      ],
    },
    {
      title: 'Cookies、本地存储和 referral links',
      paragraphs: [
        '我们使用必要 cookies 来处理参与者和 admin sessions 以及 CSRF 保护。浏览器也可能在 local storage 或 session storage 中保存你的语言、参与者状态和 referral 参数。',
        'Footer 和活动中指向 Soccerverse 的链接可能包含某位社区开发者的 affiliate 或 referral 参数。当你离开本站时，Soccerverse 或 Discord 会根据其自己的条款和隐私说明处理你的活动。',
      ],
    },
    {
      title: 'Email',
      paragraphs: [
        '交易邮件包括验证、密码恢复和账户或活动关键消息。Marketing 或提醒邮件只在系统记录相应 opt-in 时发送，除非该消息是账户或活动运营所必需。',
        '每封 marketing email 都应包含退订选项。你也可以通过 privacy@svtool.info 联系我们。',
      ],
    },
    {
      title: '共享和服务提供商',
      paragraphs: [
        '我们使用 hosting、database、email、logging 和 deployment infrastructure 来运行活动。这些服务提供商仅在提供服务所需范围内处理数据。我们不会出售参与者数据。',
        '本站链接到的外部服务，包括 Soccerverse、Discord、FIFPRO、X、Twitch 或社区工具，均为独立服务。你打开它们时适用其自身隐私规则。',
      ],
    },
    {
      title: '保留期限',
      paragraphs: [
        '我们会在运行活动、维护 leaderboards 和 auditability、处理支持、防止滥用以及满足法律或运营要求所需期间保存数据。Marketing consent 和退订记录可能会被保留，以便尊重你的选择。',
        '如果记录对于 scoring integrity、防欺诈、安全或法律原因是必要的，某些删除请求可能会受到限制。',
      ],
    },
    {
      title: '你的选择和权利',
      paragraphs: [
        '在适用情况下，你可以请求访问、更正、删除、限制、反对或撤回同意。请联系 privacy@svtool.info，并提供足够信息以便我们识别你的活动账户。',
        '如果你使用 Discord 或 Soccerverse 支持，请不要公开发布敏感账户信息。需要时请使用合适的私密支持渠道。',
      ],
    },
    {
      title: '安全和变更',
      paragraphs: [
        '我们采取合理的技术和组织措施，例如 hashed passwords、session protection、CSRF checks 和有限 admin access。任何互联网服务都无法保证完全无风险。',
        '如果活动、email system 或数据流发生变化，我们可能会更新本说明。顶部日期显示当前版本。',
      ],
    },
  ],
}

const japaneseCopy: PrivacyCopy = {
  eyebrow: 'プライバシー',
  title: 'プライバシーポリシー',
  updated: '最終更新日: 2026年6月1日',
  intro:
    'この通知は、The Grant Tournament が登録、squad builder、scoring、サポート、不正対策チェック、イベント連絡のために個人データをどのように処理するかを説明します。',
  controllerEyebrow: '管理者',
  controllerTitle: '責任者',
  controllerBody:
    'Libertaerx, Compañia Loma Clavel, 060114 Caazapá, Paraguay は、このコミュニティイベントおよびここに記載された処理について責任を負います。',
  contactLabel: 'プライバシー連絡先',
  sections: [
    {
      title: 'プロジェクトの背景',
      paragraphs: [
        'The Grant Tournament はファンによるコミュニティプロジェクトです。Soccerverse 公式製品ではありませんが、参加者がトーナメント中にスカッドを作成し得点できるよう、Soccerverse 関連データを使用します。',
        'Soccerverse は FIFPRO との公式パートナーシップを発表しています。Soccerverse によると、ライセンス選手には本物に近い likeness、実データ、検証済みキャリアデータが含まれ、メインゲームには 193 か国から 65,000 人以上のプロ選手が登場します。このイベントが Soccerverse 選手データを参照する場合、そのデータ文脈は Soccerverse とそのライセンサーに属し、このコミュニティイベントに属するものではありません。',
      ],
    },
    {
      title: '処理するデータ',
      items: [
        'メールアドレス、表示名、選択リーグ、選択国、提供された場合の Soccerverse ユーザー名、登録ステータスなどの登録データ。',
        '確認 token、password reset token、session cookies、CSRF tokens、password hash などのアクセスデータ。平文パスワードは保存しません。',
        'Budget cap、選択選手、lineups、swap 履歴、ポイント、ランキング、公開 profile slug、reveal 設定などのスカッドおよび競技データ。',
        'Marketing consent、unsubscribe 状態、あなたが送るサポート内容、イベントメール運用に必要な技術的 email metadata などの連絡データ。',
        'IP に基づくリクエスト文脈、user agent、基本的な browser/device fingerprint 項目、timestamp、referral parameters、multi-accounting、不正、技術問題を検出するための audit logs などの安全性と公平性データ。',
      ],
    },
    {
      title: 'データを処理する理由',
      items: [
        '参加者登録、メール確認、login、password recovery、squad builder の提供のため。',
        'イベント運営、得点計算、leaderboards 公開、reveal 後の公開 profiles 表示、ルール適用のため。',
        '必要な transactional emails と、あなたが opt-in した場合のイベント news、reminders、marketing messages の送信のため。',
        'Multi-accounts、fraud、spam、abuse、運用障害からイベントを保護するため。',
        'コミュニティリンクと developer referrals の referral performance を理解するため。',
      ],
    },
    {
      title: '公開情報',
      paragraphs: [
        'Leaderboards、公開 profiles、nation rankings、revealed squads、表示名、選択国、scoring results は他のユーザーに見える場合があります。一部の squad data は、あなたが reveal するかイベントルールが global reveal を許可するまで非公開です。',
        '公開したくない個人情報を表示名に含めないでください。',
      ],
    },
    {
      title: 'Cookies、local storage、referral links',
      paragraphs: [
        '参加者および admin sessions、CSRF protection のために必要な cookies を使用します。ブラウザは選択言語、参加者状態、referral parameters を local storage または session storage に保存する場合もあります。',
        'Footer やイベント内の Soccerverse へのリンクには、コミュニティ developer の affiliate または referral parameter が含まれる場合があります。このサイトを離れると、Soccerverse または Discord はそれぞれの terms と privacy notices に基づきあなたの活動を処理します。',
      ],
    },
    {
      title: 'Email',
      paragraphs: [
        'Transactional emails には確認、password recovery、アカウントまたはイベントに重要なメッセージが含まれます。Marketing または reminder emails は、対応する opt-in が記録されている場合にのみ送信されます。ただしアカウントまたはイベント運営に必要なメッセージは例外です。',
        'すべての marketing email には unsubscribe option が含まれるべきです。privacy@svtool.info に連絡することもできます。',
      ],
    },
    {
      title: '共有とサービス提供者',
      paragraphs: [
        'イベント運営のため、hosting、database、email、logging、deployment infrastructure を使用します。これらの提供者はサービス提供に必要な範囲でのみデータを処理します。参加者データを販売することはありません。',
        'このサイトからリンクされる Soccerverse、Discord、FIFPRO、X、Twitch、コミュニティツールなどの外部サービスは別個のサービスです。開いた場合、それぞれの privacy rules が適用されます。',
      ],
    },
    {
      title: '保持期間',
      paragraphs: [
        'イベント運営、leaderboards と auditability の維持、サポート対応、不正防止、法的または運用上の要件のために必要な期間、データを保持します。Marketing consent と unsubscribe records は、あなたの選択を尊重するため保持される場合があります。',
        'Scoring integrity、fraud prevention、security、legal reasons のために記録が必要な場合、一部の削除リクエストは制限されることがあります。',
      ],
    },
    {
      title: 'あなたの選択と権利',
      paragraphs: [
        '適用される場合、アクセス、訂正、削除、制限、異議、同意撤回を求めることができます。privacy@svtool.info に連絡し、イベントアカウントを識別できる十分な情報を含めてください。',
        'Discord または Soccerverse support を使う場合、機密性の高いアカウント情報を公開投稿しないでください。必要に応じて適切な private support flow を使用してください。',
      ],
    },
    {
      title: 'セキュリティと変更',
      paragraphs: [
        'Hashed passwords、session protection、CSRF checks、limited admin access など、合理的な技術的および組織的措置を使用します。インターネットサービスにリスクゼロを保証することはできません。',
        'イベント、email system、data flows が変わる場合、この通知を更新することがあります。上部の日付が現在のバージョンです。',
      ],
    },
  ],
}

const copyByLocale: Partial<Record<LocaleCode, PrivacyCopy>> = {
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

export function PrivacyPage({ locale }: PrivacyPageProps) {
  const copy = copyByLocale[locale] ?? englishCopy

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-12">
      <section className="hero-card rounded-[1.25rem] px-5 py-7 sm:px-7">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="section-title mt-4 max-w-[13ch] text-white">{copy.title}</h1>
        <p className="mono mt-4 text-[11px] uppercase tracking-[0.18em] text-[var(--color-sand)]">{copy.updated}</p>
        <p className="mt-5 max-w-[68ch] text-base leading-relaxed text-[var(--color-muted)]">{copy.intro}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <p className="eyebrow">{copy.controllerEyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{copy.controllerTitle}</h2>
          <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">{copy.controllerBody}</p>
          <div className="mt-5 rounded-[0.95rem] border border-white/10 bg-black/18 p-4 text-sm leading-relaxed">
            <p className="font-semibold text-white">Libertaerx</p>
            <p className="mt-1 text-[var(--color-muted)]">Compañia Loma Clavel</p>
            <p className="text-[var(--color-muted)]">060114 Caazapá, Paraguay</p>
            <p className="mono mt-4 text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">{copy.contactLabel}</p>
            <a className="mt-1 inline-block text-white hover:text-[var(--color-accent)]" href={`mailto:${privacyEmail}`}>
              {privacyEmail}
            </a>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={soccerverseFifproUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/12 px-3 py-2 text-xs font-semibold text-white hover:bg-white/6 active:scale-[0.98]"
            >
              Soccerverse FIFPRO
            </a>
            <a
              href={soccerversePlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/12 px-3 py-2 text-xs font-semibold text-white hover:bg-white/6 active:scale-[0.98]"
            >
              Soccerverse
            </a>
          </div>
        </aside>

        <div className="space-y-3">
          {copy.sections.map((section, index) => (
            <article key={section.title} className="surface-row rounded-[1.05rem] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="mono mt-1 text-[var(--color-accent)]">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight text-white">{section.title}</h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
                      {paragraph}
                    </p>
                  ))}
                  {section.items?.length ? (
                    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
