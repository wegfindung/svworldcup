import { Link } from 'react-router-dom'
import { ScoringCalculator } from '../components/ScoringCalculator'
import { budgetOptions as defaultBudgetOptions, defaultScoring } from '../data/eventConfig'
import { useBootstrap } from '../hooks/useBootstrap'
import { getMessages } from '../i18n/messages'
import type { LocaleCode } from '../lib/types'

interface RulesPageProps {
  locale: LocaleCode
}

// English is the source of truth. Every locale below translates all sections EXCEPT `coming`, which
// references englishCopy.coming on purpose (the "coming soon" notices stay in English by request).
// Unknown locales fall back to englishCopy. The embedded scoring calculator is localised via messages.ts.
const englishCopy = {
  eyebrow: 'how it works',
  title: 'Event rules, in full.',
  intro:
    'One squad. One lock. Forty-plus days of World Cup football moving your rank. Everything described on this page is live in the current build — only mechanics that already work are written as rules. Anything still in progress is listed under “Coming soon” at the end.',
  cta: 'Register your squad',

  squad: {
    eyebrow: 'registration & squad',
    title: 'Build one squad, then lock it',
    body:
      'You draft a single 15-player squad in a 4-3-3 with one reserve per position. Players come from the official World Cup team pools mapped into Soccerverse. It is set-and-forget: once you lock, there is no mid-tournament management.',
    formationTitle: 'Squad shape (15 players)',
    starters: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '4' },
      { label: 'MID', value: '3' },
      { label: 'FWD', value: '3' },
    ],
    subsTitle: 'Reserves (one per position)',
    subs: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '1' },
      { label: 'MID', value: '1' },
      { label: 'FWD', value: '1' },
    ],
    points: [
      'Register as a Veteran (you have a Soccerverse account) or a Rookie (you do not).',
      'Pick two nations — your home country and one free choice. They must be different, and they drive the Nation League.',
      'Every player is available to everyone. There is no exclusivity, and two managers may end up with identical squads.',
      'You cannot pick the same player twice in your squad.',
      'A verified email is required before you can enter the squad builder.',
    ],
  },

  salary: {
    eyebrow: 'salary cap & multiplier',
    title: 'Spend less, score more',
    body:
      'Every player has a wage in Soccerverse Coins (SVC) derived from their rating — the higher the rating, the steeper the wage. You choose a budget cap before you draft, and that cap sets a score multiplier applied to everything your squad earns. Pick a low cap and your points are boosted; load up on superstars under a high cap and your points are cut.',
    scaleLow: 'Spend less · bigger boost',
    scaleMid: 'Neutral ×1.0',
    scaleHigh: 'Spend more · bigger penalty',
    tiersTitle: 'Budget caps and their multipliers',
    boostLabel: 'Boost',
    neutralLabel: 'Neutral',
    penaltyLabel: 'Penalty',
    capExamplesTitle: 'Example wages by rating',
    capExamplesNote: 'Wage rises sharply with rating — a handful of superstars can swallow most of a high cap.',
    capExamples: [
      { rating: '70', cost: '9,288' },
      { rating: '80', cost: '57,506' },
      { rating: '90', cost: '356,064' },
      { rating: '97', cost: '1,275,843' },
    ],
    unit: 'SVC',
  },

  scoring: {
    eyebrow: 'scoring rubric',
    title: 'How points are earned',
    body:
      'A fixed rubric is applied to each player’s real World Cup performance, match by match. Clean-sheet value depends on position. On top of that, each player earns up to 2 performance points scaled from their match rating.',
    rubric: [
      { label: 'Goal', value: '+5', detail: 'per goal scored' },
      { label: 'Assist', value: '+3', detail: 'per assist' },
      { label: 'Appearance', value: '+1', detail: 'for any time on the pitch' },
      { label: '60+ minutes', value: '+1', detail: 'extra, for playing 60 minutes or more' },
      { label: 'Clean sheet', value: '+4 / +1 / 0', detail: 'GK & DEF +4, MID +1, FWD 0 — only if the player lasted 60+ minutes and their team conceded none' },
      { label: 'Performance', value: 'up to +2', detail: 'scaled from match rating (6.0→0.5, 8.0→1.0, 9.5→1.5, 10.0→2.0)' },
    ],
    calculatorIntro: 'Try the exact maths yourself — adjust a player, your cap, and your boost:',
  },

  example: {
    eyebrow: 'worked example',
    title: 'One match, one player',
    intro:
      'A midfielder in your starting XI plays 78 minutes, scores 1 goal and 1 assist, keeps a clean sheet, and earns a match rating of 8.0.',
    steps: [
      { label: 'Goal', value: '+5' },
      { label: 'Assist', value: '+3' },
      { label: 'Appearance', value: '+1' },
      { label: '60+ minutes', value: '+1' },
      { label: 'Clean sheet (MID)', value: '+1' },
      { label: 'Performance (8.0)', value: '+1' },
    ],
    baseLabel: 'Base points',
    baseValue: '12',
    boostLabel: 'With +5% ownership boost',
    boostValue: '12.6',
    finalLabel: 'Under the 1,500,000 SVC cap (×1.3)',
    finalValue: '16.38',
  },

  subs: {
    eyebrow: 'substitutes',
    title: 'Reserves always chip in at 50%',
    body:
      'Your squad runs itself — there is nothing to manage on matchday. Every reserve always banks 50% of the points it earns from its own real performances, every match. Your starters always count at full points.',
    points: [
      'All four reserves score every match — no activation, no dependency on whether a starter played.',
      'A reserve earns half of what it generates on the normal rubric: goals, assists, minutes, clean sheets, and performance.',
      'A reserve that does not feature in a match simply earns nothing for it.',
    ],
  },

  boost: {
    eyebrow: 'ownership boost',
    title: 'Reward for backing your players',
    scaleZero: 'no boost',
    scaleCaption: '+1% per 10 net shares',
    scaleCap: '+10% cap',
    body:
      'If you link a Soccerverse account, influence you buy in your own squad’s players during the event adds a small multiplier to the points those players earn for you. It rewards conviction without letting big pre-existing portfolios dominate.',
    points: [
      'Only influence bought during the event window counts — holdings you owned before the event started do not.',
      'The boost is +1% per 10 net shares bought, capped at +10% per player.',
      'It is measured per player, per match, and applied before your squad multiplier.',
      'Purchases never apply retroactively to a match that has already kicked off.',
      'Available to any manager with a linked Soccerverse account — Veteran or Rookie.',
    ],
  },

  leagues: {
    eyebrow: 'the three leagues',
    title: 'Where you compete',
    items: [
      { name: 'Veteran League', body: 'Veterans ranked individually against each other.' },
      { name: 'Rookie League', body: 'Rookies ranked individually against each other.' },
      {
        name: 'Nation League',
        body:
          'Everyone represents both nations they picked. A nation needs at least 2 members to qualify, and nations are ranked by the average score of their members.',
      },
    ],
  },

  timing: {
    eyebrow: 'dates & locks',
    title: 'When things happen',
    items: [
      { label: 'World Cup', value: '11 Jun – 19 Jul 2026', detail: 'Every official match moves the tables.' },
      { label: 'Registration closes', value: '4 Jul 2026, 00:00 UTC', detail: 'No new entries or squad changes after this instant.' },
      {
        label: 'Squad lock',
        value: 'On submission',
        detail: 'You lock once all 15 players are drafted; edits also freeze once the competition starts.',
      },
      {
        label: 'No retroactive points',
        value: 'Lock before kickoff',
        detail: 'A squad only scores from matches that kick off after it was locked.',
      },
    ],
  },

  coming: {
    eyebrow: 'coming soon',
    title: 'Not final yet',
    note: 'These parts are either provisional or still being built. They are listed here so nothing is hidden.',
    items: [
      'Performance points currently come from match data entered by the event team. Automatic API-Football match ratings are planned.',
      'Reserves currently bank a flat 50% of their points as a failsafe. A richer model — for example activating a reserve when a starter is confirmed out — may replace it later if a reliable player-availability feed is added.',
      'The salary multiplier is set by the budget cap you choose today; a refinement tied to your squad’s actual total wage is under consideration.',
      'Prize amounts and payout logic are provisional — see the Prizes page.',
      'Official Soccerverse player photos are being added; some players currently show a placeholder.',
    ],
  },
}

type RulesCopy = typeof englishCopy

const copyByLocale: Partial<Record<LocaleCode, RulesCopy>> = {}
copyByLocale.en = englishCopy

copyByLocale.es = {
  eyebrow: 'cómo funciona',
  title: 'Reglas del evento, al completo.',
  intro:
    'Un equipo. Un bloqueo. Más de cuarenta días de fútbol del World Cup moviendo tu posición. Todo lo descrito en esta página está activo en la versión actual — solo se redactan como reglas las mecánicas que ya funcionan. Cualquier cosa todavía en desarrollo aparece en “Próximamente” al final.',
  cta: 'Registra tu equipo',

  squad: {
    eyebrow: 'registro y equipo',
    title: 'Construye un equipo y luego bloquéalo',
    body:
      'Eliges un único equipo de 15 jugadores en un 4-3-3 con un reserva por posición. Los jugadores provienen de los grupos oficiales de las selecciones del World Cup mapeados en Soccerverse. Es de configurar y olvidar: una vez que bloqueas, no hay gestión durante el torneo.',
    formationTitle: 'Forma del equipo (15 jugadores)',
    starters: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '4' },
      { label: 'MID', value: '3' },
      { label: 'FWD', value: '3' },
    ],
    subsTitle: 'Reservas (uno por posición)',
    subs: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '1' },
      { label: 'MID', value: '1' },
      { label: 'FWD', value: '1' },
    ],
    points: [
      'Regístrate como Veteran (tienes una cuenta de Soccerverse) o como Rookie (no la tienes).',
      'Elige dos naciones — tu país de origen y una de libre elección. Deben ser diferentes, y determinan la Nation League.',
      'Cada jugador está disponible para todos. No hay exclusividad, y dos mánagers pueden acabar con equipos idénticos.',
      'No puedes elegir al mismo jugador dos veces en tu equipo.',
      'Se requiere un correo verificado antes de poder acceder al creador de equipos.',
    ],
  },

  salary: {
    eyebrow: 'tope salarial y multiplicador',
    title: 'Gasta menos, puntúa más',
    body:
      'Cada jugador tiene un salario en Soccerverse Coins (SVC) derivado de su valoración — cuanto mayor es la valoración, más alto es el salario. Eliges un tope de presupuesto antes de fichar, y ese tope fija un multiplicador de puntuación que se aplica a todo lo que gana tu equipo. Elige un tope bajo y tus puntos se potencian; cárgate de superestrellas con un tope alto y tus puntos se recortan.',
    scaleLow: 'Gasta menos · mayor impulso',
    scaleMid: 'Neutral ×1.0',
    scaleHigh: 'Gasta más · mayor penalización',
    tiersTitle: 'Topes de presupuesto y sus multiplicadores',
    boostLabel: 'Impulso',
    neutralLabel: 'Neutral',
    penaltyLabel: 'Penalización',
    capExamplesTitle: 'Salarios de ejemplo por valoración',
    capExamplesNote: 'El salario sube bruscamente con la valoración — un puñado de superestrellas puede consumir la mayor parte de un tope alto.',
    capExamples: [
      { rating: '70', cost: '9,288' },
      { rating: '80', cost: '57,506' },
      { rating: '90', cost: '356,064' },
      { rating: '97', cost: '1,275,843' },
    ],
    unit: 'SVC',
  },

  scoring: {
    eyebrow: 'tabla de puntuación',
    title: 'Cómo se ganan los puntos',
    body:
      'Se aplica una tabla fija al rendimiento real de cada jugador en el World Cup, partido a partido. El valor de la portería a cero depende de la posición. Además, cada jugador gana hasta 2 puntos de rendimiento escalados a partir de su valoración del partido.',
    rubric: [
      { label: 'Gol', value: '+5', detail: 'por cada gol marcado' },
      { label: 'Asistencia', value: '+3', detail: 'por cada asistencia' },
      { label: 'Aparición', value: '+1', detail: 'por cualquier tiempo sobre el campo' },
      { label: '60+ minutos', value: '+1', detail: 'extra, por jugar 60 minutos o más' },
      { label: 'Portería a cero', value: '+4 / +1 / 0', detail: 'GK y DEF +4, MID +1, FWD 0 — solo si el jugador disputó 60+ minutos y su equipo no encajó goles' },
      { label: 'Rendimiento', value: 'up to +2', detail: 'escalado a partir de la valoración del partido (6.0→0.5, 8.0→1.0, 9.5→1.5, 10.0→2.0)' },
    ],
    calculatorIntro: 'Prueba tú mismo las cuentas exactas — ajusta un jugador, tu tope y tu impulso:',
  },

  example: {
    eyebrow: 'ejemplo resuelto',
    title: 'Un partido, un jugador',
    intro:
      'Un centrocampista de tu once titular juega 78 minutos, marca 1 gol y da 1 asistencia, mantiene la portería a cero y obtiene una valoración del partido de 8.0.',
    steps: [
      { label: 'Gol', value: '+5' },
      { label: 'Asistencia', value: '+3' },
      { label: 'Aparición', value: '+1' },
      { label: '60+ minutos', value: '+1' },
      { label: 'Portería a cero (MID)', value: '+1' },
      { label: 'Rendimiento (8.0)', value: '+1' },
    ],
    baseLabel: 'Puntos base',
    baseValue: '12',
    boostLabel: 'Con +5% de impulso por posesión',
    boostValue: '12.6',
    finalLabel: 'Bajo el tope de 1,500,000 SVC (×1.3)',
    finalValue: '16.38',
  },

  subs: {
    eyebrow: 'suplentes',
    title: 'Los reservas siempre aportan al 50%',
    body:
      'Tu equipo funciona solo — no hay nada que gestionar el día de partido. Cada reserva siempre acumula el 50% de los puntos que gana por sus propias actuaciones reales, en cada partido. Tus titulares siempre cuentan con puntos completos.',
    points: [
      'Los cuatro reservas puntúan en cada partido — sin activación, sin depender de si jugó un titular.',
      'Un reserva gana la mitad de lo que genera en la tabla normal: goles, asistencias, minutos, porterías a cero y rendimiento.',
      'Un reserva que no participa en un partido simplemente no gana nada por él.',
    ],
  },

  boost: {
    eyebrow: 'impulso por posesión',
    title: 'Recompensa por respaldar a tus jugadores',
    scaleZero: 'sin impulso',
    scaleCaption: '+1% por cada 10 acciones netas',
    scaleCap: '+10% de tope',
    body:
      'Si vinculas una cuenta de Soccerverse, la influencia que compres en los jugadores de tu propio equipo durante el evento añade un pequeño multiplicador a los puntos que esos jugadores ganan para ti. Recompensa la convicción sin permitir que las grandes carteras preexistentes dominen.',
    points: [
      'Solo cuenta la influencia comprada durante la ventana del evento — las posesiones que ya tenías antes de que empezara el evento no cuentan.',
      'El impulso es de +1% por cada 10 acciones netas compradas, con un tope de +10% por jugador.',
      'Se mide por jugador, por partido, y se aplica antes del multiplicador de tu equipo.',
      'Las compras nunca se aplican de forma retroactiva a un partido que ya ha comenzado.',
      'Disponible para cualquier mánager con una cuenta de Soccerverse vinculada — Veteran o Rookie.',
    ],
  },

  leagues: {
    eyebrow: 'las tres ligas',
    title: 'Dónde compites',
    items: [
      { name: 'Veteran League', body: 'Veterans clasificados individualmente entre sí.' },
      { name: 'Rookie League', body: 'Rookies clasificados individualmente entre sí.' },
      {
        name: 'Nation League',
        body:
          'Todos representan a las dos naciones que eligieron. Una nación necesita al menos 2 miembros para clasificarse, y las naciones se clasifican por la puntuación media de sus miembros.',
      },
    ],
  },

  timing: {
    eyebrow: 'fechas y bloqueos',
    title: 'Cuándo ocurren las cosas',
    items: [
      { label: 'World Cup', value: '11 Jun – 19 Jul 2026', detail: 'Cada partido oficial mueve las tablas.' },
      { label: 'Cierre del registro', value: '4 Jul 2026, 00:00 UTC', detail: 'No se admiten nuevas inscripciones ni cambios de equipo después de este instante.' },
      {
        label: 'Bloqueo del equipo',
        value: 'On submission',
        detail: 'Bloqueas una vez que los 15 jugadores están fichados; las ediciones también se congelan cuando empieza la competición.',
      },
      {
        label: 'Sin puntos retroactivos',
        value: 'Lock before kickoff',
        detail: 'Un equipo solo puntúa en los partidos que comienzan después de haber sido bloqueado.',
      },
    ],
  },

  coming: englishCopy.coming,
}

copyByLocale.it = {
  eyebrow: 'come funziona',
  title: 'Le regole dell’evento, per intero.',
  intro:
    'Una sola rosa. Un solo blocco. Oltre quaranta giorni di calcio del World Cup che fanno muovere la tua posizione. Tutto ciò che è descritto in questa pagina è attivo nella build attuale — solo le meccaniche che già funzionano sono scritte come regole. Tutto ciò che è ancora in lavorazione è elencato in “In arrivo” alla fine.',
  cta: 'Registra la tua rosa',

  squad: {
    eyebrow: 'registrazione e rosa',
    title: 'Costruisci una rosa, poi bloccala',
    body:
      'Componi un’unica rosa di 15 giocatori in un 4-3-3 con una riserva per ruolo. I giocatori provengono dai pool ufficiali delle squadre del World Cup mappati in Soccerverse. È imposta e dimentica: una volta bloccata, non c’è alcuna gestione durante il torneo.',
    formationTitle: 'Schema della rosa (15 giocatori)',
    starters: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '4' },
      { label: 'MID', value: '3' },
      { label: 'FWD', value: '3' },
    ],
    subsTitle: 'Riserve (una per ruolo)',
    subs: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '1' },
      { label: 'MID', value: '1' },
      { label: 'FWD', value: '1' },
    ],
    points: [
      'Registrati come Veteran (hai un account Soccerverse) o come Rookie (non ce l’hai).',
      'Scegli due nazioni — il tuo paese d’origine e una a scelta libera. Devono essere diverse, e determinano la Nation League.',
      'Ogni giocatore è disponibile per tutti. Non c’è esclusività, e due manager possono ritrovarsi con rose identiche.',
      'Non puoi scegliere lo stesso giocatore due volte nella tua rosa.',
      'È richiesta un’email verificata prima di poter accedere al costruttore della rosa.',
    ],
  },

  salary: {
    eyebrow: 'tetto salariale e moltiplicatore',
    title: 'Spendi meno, segna di più',
    body:
      'Ogni giocatore ha un ingaggio in Soccerverse Coins (SVC) derivato dalla sua valutazione — più alta la valutazione, più ripido l’ingaggio. Scegli un tetto di budget prima di comporre la rosa, e quel tetto stabilisce un moltiplicatore di punteggio applicato a tutto ciò che la tua rosa guadagna. Scegli un tetto basso e i tuoi punti vengono potenziati; carica la rosa di superstar sotto un tetto alto e i tuoi punti vengono ridotti.',
    scaleLow: 'Spendi meno · boost maggiore',
    scaleMid: 'Neutro ×1.0',
    scaleHigh: 'Spendi di più · penalità maggiore',
    tiersTitle: 'Tetti di budget e relativi moltiplicatori',
    boostLabel: 'Boost',
    neutralLabel: 'Neutro',
    penaltyLabel: 'Penalità',
    capExamplesTitle: 'Esempi di ingaggi per valutazione',
    capExamplesNote: 'L’ingaggio cresce bruscamente con la valutazione — una manciata di superstar può divorare gran parte di un tetto alto.',
    capExamples: [
      { rating: '70', cost: '9,288' },
      { rating: '80', cost: '57,506' },
      { rating: '90', cost: '356,064' },
      { rating: '97', cost: '1,275,843' },
    ],
    unit: 'SVC',
  },

  scoring: {
    eyebrow: 'criterio di punteggio',
    title: 'Come si guadagnano i punti',
    body:
      'Un criterio fisso viene applicato alla prestazione reale al World Cup di ogni giocatore, partita per partita. Il valore della porta inviolata dipende dal ruolo. In aggiunta, ogni giocatore guadagna fino a 2 punti prestazione scalati dalla sua valutazione di partita.',
    rubric: [
      { label: 'Gol', value: '+5', detail: 'per gol segnato' },
      { label: 'Assist', value: '+3', detail: 'per assist' },
      { label: 'Presenza', value: '+1', detail: 'per qualsiasi tempo in campo' },
      { label: '60+ minuti', value: '+1', detail: 'extra, per aver giocato 60 minuti o più' },
      { label: 'Porta inviolata', value: '+4 / +1 / 0', detail: 'GK e DEF +4, MID +1, FWD 0 — solo se il giocatore è rimasto in campo 60+ minuti e la sua squadra non ha subito gol' },
      { label: 'Prestazione', value: 'up to +2', detail: 'scalata dalla valutazione di partita (6.0→0.5, 8.0→1.0, 9.5→1.5, 10.0→2.0)' },
    ],
    calculatorIntro: 'Prova tu stesso i calcoli esatti — modifica un giocatore, il tuo tetto e il tuo boost:',
  },

  example: {
    eyebrow: 'esempio svolto',
    title: 'Una partita, un giocatore',
    intro:
      'Un centrocampista nel tuo undici titolare gioca 78 minuti, segna 1 gol e 1 assist, mantiene la porta inviolata e ottiene una valutazione di partita di 8.0.',
    steps: [
      { label: 'Gol', value: '+5' },
      { label: 'Assist', value: '+3' },
      { label: 'Presenza', value: '+1' },
      { label: '60+ minuti', value: '+1' },
      { label: 'Porta inviolata (MID)', value: '+1' },
      { label: 'Prestazione (8.0)', value: '+1' },
    ],
    baseLabel: 'Punti base',
    baseValue: '12',
    boostLabel: 'Con boost di possesso del +5%',
    boostValue: '12.6',
    finalLabel: 'Sotto il tetto di 1,500,000 SVC (×1.3)',
    finalValue: '16.38',
  },

  subs: {
    eyebrow: 'riserve',
    title: 'Le riserve contribuiscono sempre al 50%',
    body:
      'La tua rosa funziona da sé — non c’è nulla da gestire nel giorno della partita. Ogni riserva incassa sempre il 50% dei punti che guadagna dalle proprie prestazioni reali, ogni partita. I tuoi titolari contano sempre a punti pieni.',
    points: [
      'Tutte e quattro le riserve segnano ogni partita — nessuna attivazione, nessuna dipendenza dal fatto che un titolare abbia giocato.',
      'Una riserva guadagna metà di ciò che genera secondo il criterio normale: gol, assist, minuti, porte inviolate e prestazione.',
      'Una riserva che non scende in campo in una partita semplicemente non guadagna nulla per essa.',
    ],
  },

  boost: {
    eyebrow: 'boost di possesso',
    title: 'Ricompensa per aver sostenuto i tuoi giocatori',
    scaleZero: 'nessun boost',
    scaleCaption: '+1% ogni 10 quote nette',
    scaleCap: 'tetto +10%',
    body:
      'Se colleghi un account Soccerverse, l’influenza che acquisti nei giocatori della tua rosa durante l’evento aggiunge un piccolo moltiplicatore ai punti che quei giocatori guadagnano per te. Premia la convinzione senza lasciare che grandi portafogli preesistenti dominino.',
    points: [
      'Conta solo l’influenza acquistata durante la finestra dell’evento — le partecipazioni che possedevi prima dell’inizio dell’evento non contano.',
      'Il boost è +1% ogni 10 quote nette acquistate, con un tetto del +10% per giocatore.',
      'Viene misurato per giocatore, per partita, e applicato prima del moltiplicatore della tua rosa.',
      'Gli acquisti non si applicano mai retroattivamente a una partita già iniziata.',
      'Disponibile per qualsiasi manager con un account Soccerverse collegato — Veteran o Rookie.',
    ],
  },

  leagues: {
    eyebrow: 'le tre leghe',
    title: 'Dove competi',
    items: [
      { name: 'Veteran League', body: 'Veteran classificati individualmente l’uno contro l’altro.' },
      { name: 'Rookie League', body: 'Rookie classificati individualmente l’uno contro l’altro.' },
      {
        name: 'Nation League',
        body:
          'Tutti rappresentano entrambe le nazioni che hanno scelto. Una nazione ha bisogno di almeno 2 membri per qualificarsi, e le nazioni sono classificate in base al punteggio medio dei loro membri.',
      },
    ],
  },

  timing: {
    eyebrow: 'date e blocchi',
    title: 'Quando accadono le cose',
    items: [
      { label: 'World Cup', value: '11 Jun – 19 Jul 2026', detail: 'Ogni partita ufficiale fa muovere le classifiche.' },
      { label: 'Chiusura registrazioni', value: '4 Jul 2026, 00:00 UTC', detail: 'Nessuna nuova iscrizione o modifica alla rosa dopo questo istante.' },
      {
        label: 'Blocco della rosa',
        value: 'All’invio',
        detail: 'Blocchi una volta che tutti e 15 i giocatori sono stati composti; anche le modifiche si congelano una volta iniziata la competizione.',
      },
      {
        label: 'Nessun punto retroattivo',
        value: 'Blocca prima del fischio d’inizio',
        detail: 'Una rosa segna solo dalle partite che iniziano dopo il suo blocco.',
      },
    ],
  },

  coming: englishCopy.coming,
}

copyByLocale.de = {
  eyebrow: 'so funktioniert es',
  title: 'Die Eventregeln, vollständig.',
  intro:
    'Ein Kader. Eine Festlegung. Über vierzig Tage World-Cup-Fußball, die deine Platzierung bewegen. Alles, was auf dieser Seite beschrieben wird, ist im aktuellen Build live — nur Mechaniken, die bereits funktionieren, sind als Regeln formuliert. Was sich noch in Arbeit befindet, ist am Ende unter „Demnächst“ aufgeführt.',
  cta: 'Registriere deinen Kader',

  squad: {
    eyebrow: 'registrierung & kader',
    title: 'Baue einen Kader und lege ihn dann fest',
    body:
      'Du stellst einen einzigen Kader aus 15 Spielern in einem 4-3-3 mit einem Reservespieler pro Position zusammen. Die Spieler stammen aus den offiziellen World-Cup-Teampools, die in Soccerverse abgebildet sind. Es gilt das Prinzip „einstellen und vergessen“: Sobald du festlegst, gibt es kein Management während des Turniers.',
    formationTitle: 'Kaderaufbau (15 Spieler)',
    starters: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '4' },
      { label: 'MID', value: '3' },
      { label: 'FWD', value: '3' },
    ],
    subsTitle: 'Reserve (eine pro Position)',
    subs: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '1' },
      { label: 'MID', value: '1' },
      { label: 'FWD', value: '1' },
    ],
    points: [
      'Registriere dich als Veteran (du hast ein Soccerverse-Konto) oder als Rookie (du hast keines).',
      'Wähle zwei Nationen — dein Heimatland und eine freie Wahl. Sie müssen unterschiedlich sein und bestimmen die Nation League.',
      'Jeder Spieler steht jedem zur Verfügung. Es gibt keine Exklusivität, und zwei Manager können am Ende identische Kader haben.',
      'Du kannst denselben Spieler nicht zweimal in deinem Kader auswählen.',
      'Eine verifizierte E-Mail-Adresse ist erforderlich, bevor du den Kader-Builder betreten kannst.',
    ],
  },

  salary: {
    eyebrow: 'gehaltsobergrenze & multiplikator',
    title: 'Gib weniger aus, hole mehr Punkte',
    body:
      'Jeder Spieler hat ein Gehalt in Soccerverse Coins (SVC), das sich aus seinem Rating ableitet — je höher das Rating, desto steiler das Gehalt. Du wählst vor dem Zusammenstellen eine Budgetgrenze, und diese Grenze legt einen Punktemultiplikator fest, der auf alles angewendet wird, was dein Kader erzielt. Wähle eine niedrige Grenze, und deine Punkte werden verstärkt; lade dich unter einer hohen Grenze mit Superstars voll, und deine Punkte werden gekürzt.',
    scaleLow: 'Weniger ausgeben · größerer Boost',
    scaleMid: 'Neutral ×1.0',
    scaleHigh: 'Mehr ausgeben · größere Strafe',
    tiersTitle: 'Budgetgrenzen und ihre Multiplikatoren',
    boostLabel: 'Boost',
    neutralLabel: 'Neutral',
    penaltyLabel: 'Strafe',
    capExamplesTitle: 'Beispielgehälter nach Rating',
    capExamplesNote: 'Das Gehalt steigt stark mit dem Rating — eine Handvoll Superstars kann den Großteil einer hohen Grenze verschlingen.',
    capExamples: [
      { rating: '70', cost: '9,288' },
      { rating: '80', cost: '57,506' },
      { rating: '90', cost: '356,064' },
      { rating: '97', cost: '1,275,843' },
    ],
    unit: 'SVC',
  },

  scoring: {
    eyebrow: 'punktesystem',
    title: 'Wie Punkte verdient werden',
    body:
      'Ein festes Punktesystem wird auf die echte World-Cup-Leistung jedes Spielers angewendet, Spiel für Spiel. Der Wert für ein zu Null gehaltenes Spiel hängt von der Position ab. Darüber hinaus verdient jeder Spieler bis zu 2 Leistungspunkte, skaliert nach seinem Spiel-Rating.',
    rubric: [
      { label: 'Tor', value: '+5', detail: 'pro erzieltem Tor' },
      { label: 'Vorlage', value: '+3', detail: 'pro Vorlage' },
      { label: 'Einsatz', value: '+1', detail: 'für jede Zeit auf dem Platz' },
      { label: '60+ Minuten', value: '+1', detail: 'zusätzlich, für 60 Minuten oder mehr Spielzeit' },
      { label: 'Zu Null', value: '+4 / +1 / 0', detail: 'GK & DEF +4, MID +1, FWD 0 — nur wenn der Spieler 60+ Minuten durchhielt und sein Team kein Gegentor kassierte' },
      { label: 'Leistung', value: 'up to +2', detail: 'skaliert nach dem Spiel-Rating (6.0→0.5, 8.0→1.0, 9.5→1.5, 10.0→2.0)' },
    ],
    calculatorIntro: 'Probiere die genaue Rechnung selbst aus — passe einen Spieler, deine Grenze und deinen Boost an:',
  },

  example: {
    eyebrow: 'durchgerechnetes beispiel',
    title: 'Ein Spiel, ein Spieler',
    intro:
      'Ein Mittelfeldspieler in deiner Start-XI spielt 78 Minuten, erzielt 1 Tor und 1 Vorlage, hält zu Null und erhält ein Spiel-Rating von 8.0.',
    steps: [
      { label: 'Tor', value: '+5' },
      { label: 'Vorlage', value: '+3' },
      { label: 'Einsatz', value: '+1' },
      { label: '60+ Minuten', value: '+1' },
      { label: 'Zu Null (MID)', value: '+1' },
      { label: 'Leistung (8.0)', value: '+1' },
    ],
    baseLabel: 'Basispunkte',
    baseValue: '12',
    boostLabel: 'Mit +5% Ownership-Boost',
    boostValue: '12.6',
    finalLabel: 'Unter der Grenze von 1,500,000 SVC (×1.3)',
    finalValue: '16.38',
  },

  subs: {
    eyebrow: 'auswechselspieler',
    title: 'Reservespieler steuern immer 50% bei',
    body:
      'Dein Kader läuft von allein — am Spieltag gibt es nichts zu managen. Jeder Reservespieler verbucht immer 50% der Punkte, die er aus seinen eigenen echten Leistungen erzielt, in jedem Spiel. Deine Stammspieler zählen immer mit vollen Punkten.',
    points: [
      'Alle vier Reservespieler punkten in jedem Spiel — keine Aktivierung, keine Abhängigkeit davon, ob ein Stammspieler gespielt hat.',
      'Ein Reservespieler verdient die Hälfte dessen, was er nach dem normalen Punktesystem generiert: Tore, Vorlagen, Minuten, Spiele zu Null und Leistung.',
      'Ein Reservespieler, der in einem Spiel nicht zum Einsatz kommt, verdient dafür einfach nichts.',
    ],
  },

  boost: {
    eyebrow: 'ownership-boost',
    title: 'Belohnung für das Setzen auf deine Spieler',
    scaleZero: 'kein Boost',
    scaleCaption: '+1% pro 10 Netto-Anteile',
    scaleCap: '+10% Obergrenze',
    body:
      'Wenn du ein Soccerverse-Konto verknüpfst, fügt der Einfluss, den du während des Events in den Spielern deines eigenen Kaders kaufst, einen kleinen Multiplikator zu den Punkten hinzu, die diese Spieler für dich erzielen. Es belohnt Überzeugung, ohne große bereits bestehende Portfolios dominieren zu lassen.',
    points: [
      'Nur Einfluss, der während des Eventzeitraums gekauft wurde, zählt — Bestände, die du vor dem Eventstart besaßest, zählen nicht.',
      'Der Boost beträgt +1% pro 10 gekaufter Netto-Anteile, begrenzt auf +10% pro Spieler.',
      'Er wird pro Spieler und pro Spiel gemessen und vor deinem Kader-Multiplikator angewendet.',
      'Käufe wirken sich niemals rückwirkend auf ein Spiel aus, das bereits angepfiffen wurde.',
      'Verfügbar für jeden Manager mit einem verknüpften Soccerverse-Konto — Veteran oder Rookie.',
    ],
  },

  leagues: {
    eyebrow: 'die drei ligen',
    title: 'Wo du antrittst',
    items: [
      { name: 'Veteran League', body: 'Veteranen werden einzeln gegeneinander gewertet.' },
      { name: 'Rookie League', body: 'Rookies werden einzeln gegeneinander gewertet.' },
      {
        name: 'Nation League',
        body:
          'Jeder vertritt beide Nationen, die er gewählt hat. Eine Nation braucht mindestens 2 Mitglieder, um sich zu qualifizieren, und Nationen werden nach der durchschnittlichen Punktzahl ihrer Mitglieder gewertet.',
      },
    ],
  },

  timing: {
    eyebrow: 'termine & festlegungen',
    title: 'Wann was passiert',
    items: [
      { label: 'World Cup', value: '11 Jun – 19 Jul 2026', detail: 'Jedes offizielle Spiel bewegt die Tabellen.' },
      { label: 'Registrierung schließt', value: '4 Jul 2026, 00:00 UTC', detail: 'Nach diesem Zeitpunkt keine neuen Anmeldungen oder Kaderänderungen mehr.' },
      {
        label: 'Kader-Festlegung',
        value: 'Bei Einreichung',
        detail: 'Du legst fest, sobald alle 15 Spieler ausgewählt sind; Bearbeitungen werden außerdem eingefroren, sobald der Wettbewerb beginnt.',
      },
      {
        label: 'Keine rückwirkenden Punkte',
        value: 'Vor Anpfiff festlegen',
        detail: 'Ein Kader punktet nur aus Spielen, die nach seiner Festlegung angepfiffen werden.',
      },
    ],
  },

  coming: englishCopy.coming,
}

copyByLocale.fr = {
  eyebrow: 'comment ça marche',
  title: 'Le règlement de l’événement, en intégralité.',
  intro:
    'Un effectif. Un verrouillage. Plus de quarante jours de football de World Cup qui font bouger votre classement. Tout ce qui est décrit sur cette page est actif dans la version actuelle — seules les mécaniques qui fonctionnent déjà sont rédigées comme des règles. Tout ce qui est encore en cours est listé sous « Bientôt disponible » à la fin.',
  cta: 'Inscrivez votre effectif',

  squad: {
    eyebrow: 'inscription & effectif',
    title: 'Constituez un effectif, puis verrouillez-le',
    body:
      'Vous composez un seul effectif de 15 joueurs en 4-3-3 avec un remplaçant par poste. Les joueurs proviennent des viviers officiels des équipes du World Cup mappés dans Soccerverse. C’est « réglez et oubliez » : une fois verrouillé, il n’y a aucune gestion en cours de tournoi.',
    formationTitle: 'Composition de l’effectif (15 joueurs)',
    starters: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '4' },
      { label: 'MID', value: '3' },
      { label: 'FWD', value: '3' },
    ],
    subsTitle: 'Remplaçants (un par poste)',
    subs: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '1' },
      { label: 'MID', value: '1' },
      { label: 'FWD', value: '1' },
    ],
    points: [
      'Inscrivez-vous en tant que Veteran (vous avez un compte Soccerverse) ou Rookie (vous n’en avez pas).',
      'Choisissez deux nations — votre pays d’origine et un choix libre. Elles doivent être différentes, et elles alimentent la Nation League.',
      'Chaque joueur est disponible pour tout le monde. Il n’y a aucune exclusivité, et deux managers peuvent se retrouver avec des effectifs identiques.',
      'Vous ne pouvez pas choisir deux fois le même joueur dans votre effectif.',
      'Une adresse e-mail vérifiée est requise avant de pouvoir accéder au constructeur d’effectif.',
    ],
  },

  salary: {
    eyebrow: 'plafond salarial & multiplicateur',
    title: 'Dépensez moins, marquez plus',
    body:
      'Chaque joueur a un salaire en Soccerverse Coins (SVC) dérivé de sa note — plus la note est élevée, plus le salaire grimpe. Vous choisissez un plafond de budget avant de composer, et ce plafond définit un multiplicateur de score appliqué à tout ce que votre effectif rapporte. Choisissez un plafond bas et vos points sont boostés ; accumulez des superstars sous un plafond élevé et vos points sont réduits.',
    scaleLow: 'Dépensez moins · boost plus important',
    scaleMid: 'Neutre ×1.0',
    scaleHigh: 'Dépensez plus · pénalité plus importante',
    tiersTitle: 'Plafonds de budget et leurs multiplicateurs',
    boostLabel: 'Boost',
    neutralLabel: 'Neutre',
    penaltyLabel: 'Pénalité',
    capExamplesTitle: 'Exemples de salaires par note',
    capExamplesNote: 'Le salaire augmente fortement avec la note — une poignée de superstars peut engloutir l’essentiel d’un plafond élevé.',
    capExamples: [
      { rating: '70', cost: '9,288' },
      { rating: '80', cost: '57,506' },
      { rating: '90', cost: '356,064' },
      { rating: '97', cost: '1,275,843' },
    ],
    unit: 'SVC',
  },

  scoring: {
    eyebrow: 'barème de points',
    title: 'Comment les points sont gagnés',
    body:
      'Un barème fixe est appliqué à la performance réelle de chaque joueur au World Cup, match par match. La valeur du clean sheet dépend du poste. En plus de cela, chaque joueur gagne jusqu’à 2 points de performance calculés à partir de sa note de match.',
    rubric: [
      { label: 'But', value: '+5', detail: 'par but marqué' },
      { label: 'Passe décisive', value: '+3', detail: 'par passe décisive' },
      { label: 'Apparition', value: '+1', detail: 'pour tout temps de jeu sur le terrain' },
      { label: '60+ minutes', value: '+1', detail: 'en plus, pour avoir joué 60 minutes ou plus' },
      { label: 'Clean sheet', value: '+4 / +1 / 0', detail: 'GK & DEF +4, MID +1, FWD 0 — uniquement si le joueur a tenu 60+ minutes et que son équipe n’a rien encaissé' },
      { label: 'Performance', value: 'up to +2', detail: 'calculé à partir de la note de match (6.0→0.5, 8.0→1.0, 9.5→1.5, 10.0→2.0)' },
    ],
    calculatorIntro: 'Essayez vous-même le calcul exact — ajustez un joueur, votre plafond et votre boost :',
  },

  example: {
    eyebrow: 'exemple détaillé',
    title: 'Un match, un joueur',
    intro:
      'Un milieu de votre onze de départ joue 78 minutes, marque 1 but et délivre 1 passe décisive, garde un clean sheet et obtient une note de match de 8.0.',
    steps: [
      { label: 'But', value: '+5' },
      { label: 'Passe décisive', value: '+3' },
      { label: 'Apparition', value: '+1' },
      { label: '60+ minutes', value: '+1' },
      { label: 'Clean sheet (MID)', value: '+1' },
      { label: 'Performance (8.0)', value: '+1' },
    ],
    baseLabel: 'Points de base',
    baseValue: '12',
    boostLabel: 'Avec un boost de possession de +5%',
    boostValue: '12.6',
    finalLabel: 'Sous le plafond de 1,500,000 SVC (×1.3)',
    finalValue: '16.38',
  },

  subs: {
    eyebrow: 'remplaçants',
    title: 'Les remplaçants contribuent toujours à 50%',
    body:
      'Votre effectif se gère tout seul — il n’y a rien à gérer le jour du match. Chaque remplaçant engrange toujours 50% des points qu’il gagne grâce à ses propres performances réelles, à chaque match. Vos titulaires comptent toujours en points pleins.',
    points: [
      'Les quatre remplaçants marquent à chaque match — sans activation, sans dépendre du fait qu’un titulaire ait joué ou non.',
      'Un remplaçant gagne la moitié de ce qu’il génère selon le barème normal : buts, passes décisives, minutes, clean sheets et performance.',
      'Un remplaçant qui ne figure pas dans un match ne gagne tout simplement rien pour celui-ci.',
    ],
  },

  boost: {
    eyebrow: 'boost de possession',
    title: 'Récompense pour avoir soutenu vos joueurs',
    scaleZero: 'aucun boost',
    scaleCaption: '+1% par 10 parts nettes',
    scaleCap: 'plafond +10%',
    body:
      'Si vous liez un compte Soccerverse, l’influence que vous achetez dans les joueurs de votre propre effectif pendant l’événement ajoute un petit multiplicateur aux points que ces joueurs vous rapportent. Cela récompense la conviction sans laisser les gros portefeuilles préexistants dominer.',
    points: [
      'Seule l’influence achetée pendant la fenêtre de l’événement compte — les avoirs que vous déteniez avant le début de l’événement ne comptent pas.',
      'Le boost est de +1% par 10 parts nettes achetées, plafonné à +10% par joueur.',
      'Il est mesuré par joueur, par match, et appliqué avant votre multiplicateur d’effectif.',
      'Les achats ne s’appliquent jamais rétroactivement à un match déjà commencé.',
      'Disponible pour tout manager ayant un compte Soccerverse lié — Veteran ou Rookie.',
    ],
  },

  leagues: {
    eyebrow: 'les trois ligues',
    title: 'Où vous concourez',
    items: [
      { name: 'Veteran League', body: 'Les Veterans classés individuellement les uns contre les autres.' },
      { name: 'Rookie League', body: 'Les Rookies classés individuellement les uns contre les autres.' },
      {
        name: 'Nation League',
        body:
          'Chacun représente les deux nations qu’il a choisies. Une nation a besoin d’au moins 2 membres pour se qualifier, et les nations sont classées selon le score moyen de leurs membres.',
      },
    ],
  },

  timing: {
    eyebrow: 'dates & verrouillages',
    title: 'Quand les choses se passent',
    items: [
      { label: 'World Cup', value: '11 Jun – 19 Jul 2026', detail: 'Chaque match officiel fait bouger les classements.' },
      { label: 'Clôture des inscriptions', value: '4 Jul 2026, 00:00 UTC', detail: 'Aucune nouvelle inscription ni modification d’effectif après cet instant.' },
      {
        label: 'Verrouillage de l’effectif',
        value: 'À la soumission',
        detail: 'Vous verrouillez une fois les 15 joueurs composés ; les modifications gèlent aussi dès le début de la compétition.',
      },
      {
        label: 'Aucun point rétroactif',
        value: 'Verrouillez avant le coup d’envoi',
        detail: 'Un effectif ne marque que pour les matchs dont le coup d’envoi a lieu après son verrouillage.',
      },
    ],
  },

  coming: englishCopy.coming,
}

copyByLocale.pt = {
  eyebrow: 'como funciona',
  title: 'Regras do evento, na íntegra.',
  intro:
    'Uma única equipa. Um bloqueio. Mais de quarenta dias de futebol do World Cup a mexer no teu ranking. Tudo o que está descrito nesta página está ativo na versão atual — só as mecânicas que já funcionam estão escritas como regras. Tudo o que ainda está em desenvolvimento está listado em “Em breve” no final.',
  cta: 'Regista a tua equipa',

  squad: {
    eyebrow: 'registo & equipa',
    title: 'Monta uma equipa e depois bloqueia-a',
    body:
      'Montas uma única equipa de 15 jogadores num 4-3-3 com um reserva por posição. Os jogadores vêm dos lotes oficiais das seleções do World Cup mapeados para o Soccerverse. É montar e esquecer: depois de bloqueares, não há gestão a meio do torneio.',
    formationTitle: 'Estrutura da equipa (15 jogadores)',
    starters: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '4' },
      { label: 'MID', value: '3' },
      { label: 'FWD', value: '3' },
    ],
    subsTitle: 'Reservas (um por posição)',
    subs: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '1' },
      { label: 'MID', value: '1' },
      { label: 'FWD', value: '1' },
    ],
    points: [
      'Regista-te como Veteran (tens uma conta Soccerverse) ou como Rookie (não tens).',
      'Escolhe duas nações — o teu país de origem e uma escolha livre. Têm de ser diferentes, e são elas que alimentam a Nation League.',
      'Todos os jogadores estão disponíveis para todos. Não há exclusividade, e dois treinadores podem acabar com equipas idênticas.',
      'Não podes escolher o mesmo jogador duas vezes na tua equipa.',
      'É necessário um email verificado antes de poderes entrar no construtor de equipa.',
    ],
  },

  salary: {
    eyebrow: 'limite salarial & multiplicador',
    title: 'Gasta menos, pontua mais',
    body:
      'Cada jogador tem um salário em Soccerverse Coins (SVC) derivado da sua avaliação — quanto maior a avaliação, mais alto o salário. Escolhes um limite de orçamento antes de montar a equipa, e esse limite define um multiplicador de pontuação aplicado a tudo o que a tua equipa ganha. Escolhe um limite baixo e os teus pontos são impulsionados; enche-te de superestrelas com um limite alto e os teus pontos são cortados.',
    scaleLow: 'Gasta menos · maior impulso',
    scaleMid: 'Neutro ×1.0',
    scaleHigh: 'Gasta mais · maior penalização',
    tiersTitle: 'Limites de orçamento e os seus multiplicadores',
    boostLabel: 'Impulso',
    neutralLabel: 'Neutro',
    penaltyLabel: 'Penalização',
    capExamplesTitle: 'Exemplos de salários por avaliação',
    capExamplesNote: 'O salário sobe acentuadamente com a avaliação — um punhado de superestrelas pode engolir a maior parte de um limite alto.',
    capExamples: [
      { rating: '70', cost: '9,288' },
      { rating: '80', cost: '57,506' },
      { rating: '90', cost: '356,064' },
      { rating: '97', cost: '1,275,843' },
    ],
    unit: 'SVC',
  },

  scoring: {
    eyebrow: 'critério de pontuação',
    title: 'Como se ganham pontos',
    body:
      'Um critério fixo é aplicado ao desempenho real de cada jogador no World Cup, jogo a jogo. O valor da baliza imbatida depende da posição. Além disso, cada jogador ganha até 2 pontos de desempenho escalonados a partir da sua avaliação do jogo.',
    rubric: [
      { label: 'Golo', value: '+5', detail: 'por golo marcado' },
      { label: 'Assistência', value: '+3', detail: 'por assistência' },
      { label: 'Presença', value: '+1', detail: 'por qualquer tempo em campo' },
      { label: '60+ minutos', value: '+1', detail: 'extra, por jogar 60 minutos ou mais' },
      { label: 'Baliza imbatida', value: '+4 / +1 / 0', detail: 'GK & DEF +4, MID +1, FWD 0 — só se o jogador aguentou 60+ minutos e a sua equipa não sofreu golos' },
      { label: 'Desempenho', value: 'up to +2', detail: 'escalonado a partir da avaliação do jogo (6.0→0.5, 8.0→1.0, 9.5→1.5, 10.0→2.0)' },
    ],
    calculatorIntro: 'Experimenta as contas exatas tu mesmo — ajusta um jogador, o teu limite e o teu impulso:',
  },

  example: {
    eyebrow: 'exemplo prático',
    title: 'Um jogo, um jogador',
    intro:
      'Um médio no teu onze inicial joga 78 minutos, marca 1 golo e 1 assistência, mantém a baliza imbatida e obtém uma avaliação de jogo de 8.0.',
    steps: [
      { label: 'Golo', value: '+5' },
      { label: 'Assistência', value: '+3' },
      { label: 'Presença', value: '+1' },
      { label: '60+ minutos', value: '+1' },
      { label: 'Baliza imbatida (MID)', value: '+1' },
      { label: 'Desempenho (8.0)', value: '+1' },
    ],
    baseLabel: 'Pontos base',
    baseValue: '12',
    boostLabel: 'Com impulso de propriedade de +5%',
    boostValue: '12.6',
    finalLabel: 'Sob o limite de 1,500,000 SVC (×1.3)',
    finalValue: '16.38',
  },

  subs: {
    eyebrow: 'suplentes',
    title: 'Os reservas contribuem sempre a 50%',
    body:
      'A tua equipa gere-se sozinha — não há nada para gerir no dia de jogo. Cada reserva acumula sempre 50% dos pontos que ganha dos seus próprios desempenhos reais, todos os jogos. Os teus titulares contam sempre com pontos completos.',
    points: [
      'Os quatro reservas pontuam em todos os jogos — sem ativação, sem dependência de se um titular jogou.',
      'Um reserva ganha metade do que gera no critério normal: golos, assistências, minutos, balizas imbatidas e desempenho.',
      'Um reserva que não participa num jogo simplesmente não ganha nada por isso.',
    ],
  },

  boost: {
    eyebrow: 'impulso de propriedade',
    title: 'Recompensa por apostares nos teus jogadores',
    scaleZero: 'sem impulso',
    scaleCaption: '+1% por cada 10 ações líquidas',
    scaleCap: 'limite de +10%',
    body:
      'Se ligares uma conta Soccerverse, a influência que compras nos jogadores da tua própria equipa durante o evento adiciona um pequeno multiplicador aos pontos que esses jogadores ganham para ti. Recompensa a convicção sem deixar que grandes carteiras pré-existentes dominem.',
    points: [
      'Só conta a influência comprada durante a janela do evento — as participações que possuías antes de o evento começar não contam.',
      'O impulso é de +1% por cada 10 ações líquidas compradas, limitado a +10% por jogador.',
      'É medido por jogador, por jogo, e aplicado antes do multiplicador da tua equipa.',
      'As compras nunca se aplicam retroativamente a um jogo que já começou.',
      'Disponível para qualquer treinador com uma conta Soccerverse ligada — Veteran ou Rookie.',
    ],
  },

  leagues: {
    eyebrow: 'as três ligas',
    title: 'Onde competes',
    items: [
      { name: 'Veteran League', body: 'Veterans classificados individualmente uns contra os outros.' },
      { name: 'Rookie League', body: 'Rookies classificados individualmente uns contra os outros.' },
      {
        name: 'Nation League',
        body:
          'Todos representam ambas as nações que escolheram. Uma nação precisa de pelo menos 2 membros para se qualificar, e as nações são classificadas pela pontuação média dos seus membros.',
      },
    ],
  },

  timing: {
    eyebrow: 'datas & bloqueios',
    title: 'Quando as coisas acontecem',
    items: [
      { label: 'World Cup', value: '11 Jun – 19 Jul 2026', detail: 'Cada jogo oficial mexe nas tabelas.' },
      { label: 'Encerramento do registo', value: '4 Jul 2026, 00:00 UTC', detail: 'Não há novas inscrições nem alterações à equipa após este instante.' },
      {
        label: 'Bloqueio da equipa',
        value: 'Na submissão',
        detail: 'Bloqueias assim que todos os 15 jogadores estiverem montados; as edições também congelam assim que a competição começa.',
      },
      {
        label: 'Sem pontos retroativos',
        value: 'Bloqueia antes do apito inicial',
        detail: 'Uma equipa só pontua a partir de jogos que começam depois de ter sido bloqueada.',
      },
    ],
  },

  coming: englishCopy.coming,
}

copyByLocale.ru = {
  eyebrow: 'как это работает',
  title: 'Правила события, полностью.',
  intro:
    'Один состав. Одна фиксация. Более сорока дней футбола World Cup, меняющего ваш ранг. Всё, что описано на этой странице, уже работает в текущей сборке — правилами записаны только те механики, которые уже функционируют. Всё, что ещё в разработке, перечислено в разделе «Скоро» в конце.',
  cta: 'Зарегистрируйте свой состав',

  squad: {
    eyebrow: 'регистрация и состав',
    title: 'Соберите один состав, затем зафиксируйте его',
    body:
      'Вы набираете единый состав из 15 игроков по схеме 4-3-3 с одним запасным на каждую позицию. Игроки берутся из официальных пулов команд World Cup, перенесённых в Soccerverse. Это принцип «настроил и забыл»: после фиксации никакого управления в ходе турнира нет.',
    formationTitle: 'Структура состава (15 игроков)',
    starters: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '4' },
      { label: 'MID', value: '3' },
      { label: 'FWD', value: '3' },
    ],
    subsTitle: 'Запасные (по одному на позицию)',
    subs: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '1' },
      { label: 'MID', value: '1' },
      { label: 'FWD', value: '1' },
    ],
    points: [
      'Зарегистрируйтесь как Veteran (у вас есть аккаунт Soccerverse) или как Rookie (его нет).',
      'Выберите две нации — вашу родную страну и одну свободную на выбор. Они должны различаться и определяют Nation League.',
      'Каждый игрок доступен всем. Эксклюзивности нет, и у двух менеджеров могут оказаться одинаковые составы.',
      'Нельзя выбрать одного и того же игрока в составе дважды.',
      'Перед входом в конструктор состава требуется подтверждённый адрес электронной почты.',
    ],
  },

  salary: {
    eyebrow: 'потолок зарплат и множитель',
    title: 'Трать меньше, набирай больше',
    body:
      'У каждого игрока есть зарплата в Soccerverse Coins (SVC), вычисляемая из его рейтинга — чем выше рейтинг, тем круче растёт зарплата. Перед набором вы выбираете потолок бюджета, и этот потолок задаёт множитель очков, применяемый ко всему, что зарабатывает ваш состав. Выберите низкий потолок — и ваши очки получают надбавку; наберите суперзвёзд под высоким потолком — и ваши очки урезаются.',
    scaleLow: 'Трать меньше · больше надбавка',
    scaleMid: 'Нейтрально ×1.0',
    scaleHigh: 'Трать больше · больше штраф',
    tiersTitle: 'Потолки бюджета и их множители',
    boostLabel: 'Надбавка',
    neutralLabel: 'Нейтрально',
    penaltyLabel: 'Штраф',
    capExamplesTitle: 'Примеры зарплат по рейтингу',
    capExamplesNote: 'Зарплата резко растёт с рейтингом — горстка суперзвёзд может поглотить бо́льшую часть высокого потолка.',
    capExamples: [
      { rating: '70', cost: '9,288' },
      { rating: '80', cost: '57,506' },
      { rating: '90', cost: '356,064' },
      { rating: '97', cost: '1,275,843' },
    ],
    unit: 'SVC',
  },

  scoring: {
    eyebrow: 'система начисления очков',
    title: 'Как зарабатываются очки',
    body:
      'К реальной игре каждого игрока на World Cup применяется фиксированная система, матч за матчем. Ценность сухого матча зависит от позиции. Помимо этого, каждый игрок зарабатывает до 2 очков за игру, масштабируемых от его рейтинга за матч.',
    rubric: [
      { label: 'Гол', value: '+5', detail: 'за каждый забитый гол' },
      { label: 'Голевая передача', value: '+3', detail: 'за каждую голевую передачу' },
      { label: 'Появление', value: '+1', detail: 'за любое время на поле' },
      { label: '60+ минут', value: '+1', detail: 'дополнительно, за 60 и более сыгранных минут' },
      { label: 'Сухой матч', value: '+4 / +1 / 0', detail: 'GK и DEF +4, MID +1, FWD 0 — только если игрок провёл 60+ минут, а его команда не пропустила' },
      { label: 'Игра', value: 'up to +2', detail: 'масштабируется от рейтинга за матч (6.0→0.5, 8.0→1.0, 9.5→1.5, 10.0→2.0)' },
    ],
    calculatorIntro: 'Попробуйте точные расчёты сами — измените игрока, ваш потолок и вашу надбавку:',
  },

  example: {
    eyebrow: 'разобранный пример',
    title: 'Один матч, один игрок',
    intro:
      'Полузащитник в вашей стартовой одиннадцатке играет 78 минут, забивает 1 гол и отдаёт 1 голевую передачу, сохраняет сухой матч и получает рейтинг за матч 8.0.',
    steps: [
      { label: 'Гол', value: '+5' },
      { label: 'Голевая передача', value: '+3' },
      { label: 'Появление', value: '+1' },
      { label: '60+ минут', value: '+1' },
      { label: 'Сухой матч (MID)', value: '+1' },
      { label: 'Игра (8.0)', value: '+1' },
    ],
    baseLabel: 'Базовые очки',
    baseValue: '12',
    boostLabel: 'С надбавкой за владение +5%',
    boostValue: '12.6',
    finalLabel: 'Под потолком 1,500,000 SVC (×1.3)',
    finalValue: '16.38',
  },

  subs: {
    eyebrow: 'запасные',
    title: 'Запасные всегда вносят вклад на 50%',
    body:
      'Ваш состав работает сам по себе — в день матча управлять нечем. Каждый запасной всегда забирает 50% очков, заработанных за собственную реальную игру, в каждом матче. Ваши игроки старта всегда учитываются по полным очкам.',
    points: [
      'Все четыре запасных набирают очки в каждом матче — без активации и без зависимости от того, играл ли кто-то из старта.',
      'Запасной зарабатывает половину того, что он набирает по обычной системе: голы, голевые передачи, минуты, сухие матчи и игра.',
      'Запасной, который не появился в матче, просто ничего за него не зарабатывает.',
    ],
  },

  boost: {
    eyebrow: 'надбавка за владение',
    title: 'Награда за поддержку своих игроков',
    scaleZero: 'без надбавки',
    scaleCaption: '+1% за каждые 10 чистых долей',
    scaleCap: 'потолок +10%',
    body:
      'Если вы привяжете аккаунт Soccerverse, влияние, которое вы покупаете в игроках своего состава во время события, добавляет небольшой множитель к очкам, которые эти игроки зарабатывают для вас. Это вознаграждает за убеждённость, не позволяя крупным заранее накопленным портфелям доминировать.',
    points: [
      'Учитывается только влияние, купленное в течение окна события — активы, которыми вы владели до начала события, не считаются.',
      'Надбавка составляет +1% за каждые 10 купленных чистых долей, с потолком +10% на игрока.',
      'Она измеряется для каждого игрока в каждом матче и применяется до множителя вашего состава.',
      'Покупки никогда не применяются задним числом к матчу, который уже стартовал.',
      'Доступна любому менеджеру с привязанным аккаунтом Soccerverse — Veteran или Rookie.',
    ],
  },

  leagues: {
    eyebrow: 'три лиги',
    title: 'Где вы соревнуетесь',
    items: [
      { name: 'Veteran League', body: 'Veteran-игроки ранжируются индивидуально друг против друга.' },
      { name: 'Rookie League', body: 'Rookie-игроки ранжируются индивидуально друг против друга.' },
      {
        name: 'Nation League',
        body:
          'Каждый представляет обе выбранные им нации. Нации нужно минимум 2 участника, чтобы пройти квалификацию, и нации ранжируются по среднему счёту их участников.',
      },
    ],
  },

  timing: {
    eyebrow: 'даты и фиксации',
    title: 'Когда что происходит',
    items: [
      { label: 'World Cup', value: '11 Jun – 19 Jul 2026', detail: 'Каждый официальный матч двигает таблицы.' },
      { label: 'Регистрация закрывается', value: '4 Jul 2026, 00:00 UTC', detail: 'После этого момента никаких новых заявок или изменений состава.' },
      {
        label: 'Фиксация состава',
        value: 'При отправке',
        detail: 'Вы фиксируете состав, как только набраны все 15 игроков; правки также замораживаются с началом соревнования.',
      },
      {
        label: 'Никаких очков задним числом',
        value: 'Зафиксируйте до старта',
        detail: 'Состав набирает очки только в матчах, которые стартовали после его фиксации.',
      },
    ],
  },

  coming: englishCopy.coming,
}

copyByLocale.zh = {
  eyebrow: '运作方式',
  title: '完整赛事规则。',
  intro:
    '一套阵容。一次锁定。四十多天的 World Cup 足球赛事牵动你的排名。本页所述的一切都已在当前版本中上线——只有已经生效的机制才会写成规则。仍在开发中的内容都列在末尾的“即将推出”部分。',
  cta: '注册你的阵容',

  squad: {
    eyebrow: '注册与阵容',
    title: '组建一套阵容，然后锁定它',
    body:
      '你以 4-3-3 阵型选出一套 15 名球员的阵容，每个位置配一名替补。球员来自映射进 Soccerverse 的官方 World Cup 球队名单。设定后即可放手不管：一旦锁定，赛事进行中便无需任何管理。',
    formationTitle: '阵容结构（15 名球员）',
    starters: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '4' },
      { label: 'MID', value: '3' },
      { label: 'FWD', value: '3' },
    ],
    subsTitle: '替补（每个位置一名）',
    subs: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '1' },
      { label: 'MID', value: '1' },
      { label: 'FWD', value: '1' },
    ],
    points: [
      '以 Veteran 身份（你拥有 Soccerverse 账户）或 Rookie 身份（你没有）注册。',
      '选择两个国家——你的祖国和一个自由选择。两者必须不同，它们决定 Nation League。',
      '每名球员对所有人开放。不存在独占，两位经理也可能最终拥有完全相同的阵容。',
      '你不能在阵容中重复选择同一名球员。',
      '进入阵容构建器之前，必须先验证电子邮箱。',
    ],
  },

  salary: {
    eyebrow: '薪资上限与乘数',
    title: '花得越少，得分越多',
    body:
      '每名球员都有一份以 Soccerverse Coins（SVC）计的薪资，由其评分推算得出——评分越高，薪资涨得越陡。你在选秀前选定一个预算上限，该上限决定一个得分乘数，应用于你的阵容赚取的一切分数。选低上限，你的分数会被提升；在高上限下堆满巨星，你的分数则会被削减。',
    scaleLow: '花得更少 · 提升更大',
    scaleMid: '中性 ×1.0',
    scaleHigh: '花得更多 · 惩罚更大',
    tiersTitle: '预算上限及其乘数',
    boostLabel: '提升',
    neutralLabel: '中性',
    penaltyLabel: '惩罚',
    capExamplesTitle: '按评分划分的薪资示例',
    capExamplesNote: '薪资随评分急剧上升——少数几名巨星就能吞掉高上限的大部分。',
    capExamples: [
      { rating: '70', cost: '9,288' },
      { rating: '80', cost: '57,506' },
      { rating: '90', cost: '356,064' },
      { rating: '97', cost: '1,275,843' },
    ],
    unit: 'SVC',
  },

  scoring: {
    eyebrow: '计分细则',
    title: '如何赚取分数',
    body:
      '一套固定的细则会逐场比赛地应用于每名球员在 World Cup 中的真实表现。零封价值取决于位置。在此之上，每名球员还能根据其比赛评分换算出最多 2 个表现分。',
    rubric: [
      { label: '进球', value: '+5', detail: '每打进一球' },
      { label: '助攻', value: '+3', detail: '每次助攻' },
      { label: '出场', value: '+1', detail: '只要踏上球场即可获得' },
      { label: '60 分钟以上', value: '+1', detail: '出场 60 分钟或以上额外获得' },
      { label: '零封', value: '+4 / +1 / 0', detail: 'GK 与 DEF +4，MID +1，FWD 0——仅当该球员踢满 60 分钟以上且其球队未失球时' },
      { label: '表现', value: 'up to +2', detail: '根据比赛评分换算（6.0→0.5, 8.0→1.0, 9.5→1.5, 10.0→2.0）' },
    ],
    calculatorIntro: '亲自试试精确的算法——调整一名球员、你的上限和你的提升：',
  },

  example: {
    eyebrow: '实例演算',
    title: '一场比赛，一名球员',
    intro:
      '你首发 XI 中的一名中场出场 78 分钟，打进 1 球并完成 1 次助攻，保持零封，并获得 8.0 的比赛评分。',
    steps: [
      { label: '进球', value: '+5' },
      { label: '助攻', value: '+3' },
      { label: '出场', value: '+1' },
      { label: '60 分钟以上', value: '+1' },
      { label: '零封（MID）', value: '+1' },
      { label: '表现（8.0）', value: '+1' },
    ],
    baseLabel: '基础分',
    baseValue: '12',
    boostLabel: '加上 +5% 持股提升',
    boostValue: '12.6',
    finalLabel: '在 1,500,000 SVC 上限下（×1.3）',
    finalValue: '16.38',
  },

  subs: {
    eyebrow: '替补',
    title: '替补始终以 50% 贡献分数',
    body:
      '你的阵容自行运转——比赛日没有任何需要管理的事。每名替补每场比赛始终能从自己的真实表现中存入所赚分数的 50%。你的首发始终以全额分数计算。',
    points: [
      '全部四名替补每场比赛都得分——无需激活，也不取决于首发是否出场。',
      '替补按常规细则赚取其所产生分数的一半：进球、助攻、出场时间、零封和表现。',
      '某场比赛未出场的替补，该场便不得分。',
    ],
  },

  boost: {
    eyebrow: '持股提升',
    title: '支持你的球员可获回报',
    scaleZero: '无提升',
    scaleCaption: '每 10 股净持仓 +1%',
    scaleCap: '+10% 上限',
    body:
      '如果你关联一个 Soccerverse 账户，赛事期间你在自己阵容球员上买入的影响力，会为那些球员为你赚取的分数增加一个小幅乘数。它奖励信念，同时不让庞大的既有持仓占据主导。',
    points: [
      '只有赛事窗口期内买入的影响力才计入——赛事开始前你已持有的部分不计。',
      '提升为每 10 股净持仓 +1%，每名球员上限为 +10%。',
      '它按每名球员、每场比赛计量，并在你的阵容乘数之前应用。',
      '买入绝不会追溯应用于已经开球的比赛。',
      '任何关联了 Soccerverse 账户的经理均可享有——无论 Veteran 还是 Rookie。',
    ],
  },

  leagues: {
    eyebrow: '三大联赛',
    title: '你竞争的舞台',
    items: [
      { name: 'Veteran League', body: 'Veteran 之间逐一进行个人排名。' },
      { name: 'Rookie League', body: 'Rookie 之间逐一进行个人排名。' },
      {
        name: 'Nation League',
        body:
          '每个人都代表自己所选的两个国家。一个国家需至少 2 名成员才有资格，国家按其成员的平均得分排名。',
      },
    ],
  },

  timing: {
    eyebrow: '日期与锁定',
    title: '各项事件的时间',
    items: [
      { label: 'World Cup', value: '11 Jun – 19 Jul 2026', detail: '每一场官方比赛都会牵动排行榜。' },
      { label: '注册截止', value: '4 Jul 2026, 00:00 UTC', detail: '此刻之后不再接受新参赛或阵容变更。' },
      {
        label: '阵容锁定',
        value: '提交时',
        detail: '一旦 15 名球员全部选定，你便锁定；比赛一开始，编辑同样冻结。',
      },
      {
        label: '不追溯计分',
        value: '开球前锁定',
        detail: '阵容只从其锁定之后开球的比赛中得分。',
      },
    ],
  },

  coming: englishCopy.coming,
}

function getRulesCopy(locale: LocaleCode): RulesCopy {
  return copyByLocale[locale] ?? englishCopy
}

function FormationGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((slot) => (
        <div key={slot.label} className="surface-row grid place-items-center gap-1 rounded-[0.9rem] p-3 text-center">
          <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{slot.label}</span>
          <strong className="text-xl font-semibold text-white">{slot.value}</strong>
        </div>
      ))}
    </div>
  )
}

export function RulesPage({ locale }: RulesPageProps) {
  const copy = getRulesCopy(locale)
  const messages = getMessages(locale)
  const { data: bootstrap } = useBootstrap()
  const scoring = bootstrap?.scoring ?? defaultScoring
  const budgetOptions = bootstrap?.budgetOptions ?? defaultBudgetOptions

  function multiplierTag(multiplier: number) {
    if (multiplier > 1) {
      return { label: copy.salary.boostLabel, className: 'text-[var(--color-accent)]' }
    }
    if (multiplier < 1) {
      return { label: copy.salary.penaltyLabel, className: 'text-[var(--color-sand)]' }
    }
    return { label: copy.salary.neutralLabel, className: 'text-[var(--color-muted)]' }
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Intro */}
      <section className="hero-card rounded-[1.25rem] p-5 sm:p-6 lg:p-7">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="section-title mt-4 max-w-[18ch] text-white">{copy.title}</h1>
        <p className="mt-5 max-w-[70ch] text-base leading-relaxed text-[var(--color-muted)]">{copy.intro}</p>
        <Link to="/register" className="premium-button mt-6 px-6 py-3 text-sm font-semibold">
          {copy.cta}
        </Link>
      </section>

      {/* Registration & squad */}
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <p className="eyebrow">{copy.squad.eyebrow}</p>
          <h2 className="section-title mt-4 text-white">{copy.squad.title}</h2>
          <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.squad.body}</p>
          <ul className="mt-5 space-y-2.5">
            {copy.squad.points.map((point, index) => (
              <li key={point} className="surface-row rounded-[0.9rem] p-3 text-sm leading-relaxed text-[var(--color-paper)]">
                <span className="mono mr-2 text-[var(--color-accent)]">{String(index + 1).padStart(2, '0')}</span>
                {point}
              </li>
            ))}
          </ul>
        </article>

        <article className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.squad.formationTitle}</p>
          <div className="mt-4">
            <FormationGrid items={copy.squad.starters} />
          </div>
          <p className="mono mt-6 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.squad.subsTitle}</p>
          <div className="mt-4">
            <FormationGrid items={copy.squad.subs} />
          </div>
        </article>
      </section>

      {/* Salary cap & multiplier */}
      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">{copy.salary.eyebrow}</p>
        <h2 className="section-title mt-4 text-white">{copy.salary.title}</h2>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.salary.body}</p>

        <div className="mt-6">
          <div className="h-3 rounded-full bg-gradient-to-r from-[var(--color-accent)] via-white/25 to-[var(--color-sand)]" />
          <div className="mono mt-2 flex justify-between text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
            <span className="text-[var(--color-accent)]">{copy.salary.scaleLow}</span>
            <span className="hidden sm:inline">{copy.salary.scaleMid}</span>
            <span className="text-[var(--color-sand)]">{copy.salary.scaleHigh}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.salary.tiersTitle}</p>
            <div className="mt-4 space-y-2">
              {budgetOptions.map((option) => {
                const tag = multiplierTag(option.scoreMultiplier)
                return (
                  <div key={option.budgetLimit} className="surface-row flex items-center justify-between gap-3 rounded-[0.9rem] p-3">
                    <span className="mono text-sm text-white">
                      {option.budgetLimit.toLocaleString('en-US')} {copy.salary.unit}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className={['mono text-[10px] uppercase tracking-[0.16em]', tag.className].join(' ')}>{tag.label}</span>
                      <span className="mono text-lg font-semibold text-white">×{option.scoreMultiplier}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.salary.capExamplesTitle}</p>
            <div className="mt-4 space-y-2">
              {copy.salary.capExamples.map((example) => (
                <div key={example.rating} className="surface-row flex items-center justify-between gap-3 rounded-[0.9rem] p-3">
                  <span className="text-sm text-[var(--color-muted)]">
                    <span className="mono text-[var(--color-accent)]">{example.rating}</span> rated
                  </span>
                  <span className="mono text-sm text-white">
                    {example.cost} {copy.salary.unit}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted)]">{copy.salary.capExamplesNote}</p>
          </div>
        </div>
      </section>

      {/* Scoring rubric + interactive calculator */}
      <section className="space-y-4">
        <div className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <p className="eyebrow">{copy.scoring.eyebrow}</p>
          <h2 className="section-title mt-4 text-white">{copy.scoring.title}</h2>
          <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.scoring.body}</p>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {copy.scoring.rubric.map((item) => (
              <div key={item.label} className="surface-row rounded-[0.9rem] p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-white">{item.label}</span>
                  <span className="mono text-base text-[var(--color-accent)]">{item.value}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{item.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-[var(--color-muted)]">{copy.scoring.calculatorIntro}</p>
        </div>

        <ScoringCalculator budgetOptions={budgetOptions} copy={messages.scoringCalculator} scoring={scoring} />
      </section>

      {/* Worked example */}
      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">{copy.example.eyebrow}</p>
        <h2 className="section-title mt-4 text-white">{copy.example.title}</h2>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.example.intro}</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-2 sm:grid-cols-2">
            {copy.example.steps.map((step) => (
              <div key={step.label} className="surface-row flex items-center justify-between gap-3 rounded-[0.9rem] p-3">
                <span className="text-sm text-[var(--color-paper)]">{step.label}</span>
                <span className="mono text-base text-[var(--color-accent)]">{step.value}</span>
              </div>
            ))}
          </div>
          <aside className="rounded-[1rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 p-4">
            <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-2 text-sm">
              <span className="text-[var(--color-muted)]">{copy.example.baseLabel}</span>
              <span className="mono text-white">{copy.example.baseValue}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 border-b border-white/8 pb-2 text-sm">
              <span className="text-[var(--color-muted)]">{copy.example.boostLabel}</span>
              <span className="mono text-white">{copy.example.boostValue}</span>
            </div>
            <div className="mt-4">
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">{copy.example.finalLabel}</p>
              <p className="mono mt-2 text-4xl text-white">{copy.example.finalValue}</p>
            </div>
          </aside>
        </div>
      </section>

      {/* Substitutes */}
      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">{copy.subs.eyebrow}</p>
        <h2 className="section-title mt-4 text-white">{copy.subs.title}</h2>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.subs.body}</p>
        <ul className="mt-5 grid gap-2.5 md:grid-cols-3">
          {copy.subs.points.map((point) => (
            <li key={point} className="surface-row rounded-[0.9rem] p-3 text-sm leading-relaxed text-[var(--color-paper)]">
              {point}
            </li>
          ))}
        </ul>
      </section>

      {/* Ownership boost */}
      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">{copy.boost.eyebrow}</p>
        <h2 className="section-title mt-4 text-white">{copy.boost.title}</h2>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.boost.body}</p>
        <div className="mt-6 max-w-[34rem]">
          <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-black/30">
            <div className="h-full w-full bg-gradient-to-r from-[var(--color-accent)]/25 to-[var(--color-accent)]" />
          </div>
          <div className="mono mt-2 flex justify-between text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
            <span>{copy.boost.scaleZero}</span>
            <span className="hidden sm:inline">{copy.boost.scaleCaption}</span>
            <span className="text-[var(--color-accent)]">{copy.boost.scaleCap}</span>
          </div>
        </div>
        <ul className="mt-5 space-y-2.5">
          {copy.boost.points.map((point, index) => (
            <li key={point} className="surface-row rounded-[0.9rem] p-3 text-sm leading-relaxed text-[var(--color-paper)]">
              <span className="mono mr-2 text-[var(--color-accent)]">{String(index + 1).padStart(2, '0')}</span>
              {point}
            </li>
          ))}
        </ul>
      </section>

      {/* Leagues + timing */}
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <p className="eyebrow">{copy.leagues.eyebrow}</p>
          <h2 className="section-title mt-4 text-white">{copy.leagues.title}</h2>
          <div className="mt-5 space-y-2.5">
            {copy.leagues.items.map((item) => (
              <div key={item.name} className="surface-row rounded-[0.9rem] p-3">
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{item.body}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <p className="eyebrow">{copy.timing.eyebrow}</p>
          <h2 className="section-title mt-4 text-white">{copy.timing.title}</h2>
          <div className="mt-5 space-y-2.5">
            {copy.timing.items.map((item) => (
              <div key={item.label} className="surface-row rounded-[0.9rem] p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-white">{item.label}</span>
                  <span className="mono text-sm text-[var(--color-accent)]">{item.value}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{item.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Coming soon */}
      <section className="glass-panel rounded-[1.25rem] border border-[var(--color-sand)]/20 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="eyebrow">{copy.coming.eyebrow}</p>
          <span className="mono rounded-full border border-[var(--color-sand)]/25 bg-[var(--color-sand)]/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-sand)]">
            {copy.coming.title}
          </span>
        </div>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.coming.note}</p>
        <ul className="mt-5 space-y-2.5">
          {copy.coming.items.map((item) => (
            <li key={item} className="surface-row rounded-[0.9rem] p-3 text-sm leading-relaxed text-[var(--color-paper)]">
              <span className="mono mr-2 text-[var(--color-sand)]">›</span>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
