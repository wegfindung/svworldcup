import { Link } from 'react-router-dom'
import { ScoringCalculator } from '../components/ScoringCalculator'
import { budgetOptions as defaultBudgetOptions, defaultScoring } from '../data/eventConfig'
import { useBootstrap } from '../hooks/useBootstrap'
import { getMessages } from '../i18n/messages'
import type { LocaleCode } from '../lib/types'

interface RulesPageProps {
  locale: LocaleCode
}

// English is the source of truth. Every locale below translates all sections, including the `coming`
// "good to know" disclaimer. Unknown locales fall back to englishCopy. The embedded scoring calculator
// is localised via messages.ts.
const englishCopy = {
  eyebrow: 'how it works',
  title: 'Event rules, in full.',
  intro:
    'One squad. One lock. Forty-plus days of Grand Tournament football moving your rank. Everything described on this page is live in the current build — only mechanics that already work are written as rules.',
  cta: 'Register your squad',

  squad: {
    eyebrow: 'registration & squad',
    title: 'Build one squad, then lock it',
    body:
      'You draft a single 15-player squad in a 4-3-3 with one reserve per position. Players come from the official Grand Tournament team pools mapped into Soccerverse. Once you lock, your squad is fixed — no transfers, no new players. The only mid-tournament change allowed is a limited reserve-for-starter swap inside timed windows (see Player swaps below).',
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
      'You can draft at most 4 players from the same national team across your 15 — starters and reserves combined. This counts a player’s Grand Tournament national team and is separate from the two nations you pick for the Nation League.',
      'A verified email is required before you can enter the squad builder.',
      'Your squad stays hidden by default — only you can reveal it, though an admin may reveal every squad at kickoff. Your manager name, score and rank still appear on the public leaderboards.',
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
      'A fixed rubric is applied to each player’s real Grand Tournament performance, match by match. Clean-sheet value depends on position. On top of that, each player earns up to 2 performance points scaled from their match rating.',
    rubric: [
      { label: 'Goal', value: '+5', detail: 'per goal scored' },
      { label: 'Assist', value: '+3', detail: 'per assist' },
      { label: 'Appearance', value: '+1', detail: 'for any time on the pitch' },
      { label: '60+ minutes', value: '+1', detail: 'extra, for playing 60 minutes or more' },
      { label: 'Clean sheet', value: '+4 / +3 / +1* / 0', detail: 'GK +4, DEF +3, MID +1 only if the player has DML/DMR/DMC/DM as a Soccerverse alt position, FWD 0 — and only if the player lasted 60+ minutes and their team conceded none' },
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
      { label: 'Clean sheet (MID with DM alt)', value: '+1' },
      { label: 'Performance (8.0)', value: '+1' },
    ],
    baseLabel: 'Base points',
    baseValue: '12',
    boostLabel: 'With +5% ownership boost',
    boostValue: '12.6',
    finalLabel: 'Under the 1,500,000 SVC cap (×1.5)',
    finalValue: '18.9',
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
      'If you swap a reserve into your starting XI in a swap window, it scores full points for the rounds it starts — and the starter you bench drops to 50%.',
    ],
  },

  swaps: {
    eyebrow: 'player swaps',
    title: 'Limited swaps inside timed windows',
    body:
      'Your squad is not fully set-and-forget. Inside a few timed windows you may swap a reserve for a starter — same position only, within the 15 players you already locked. No new players, and no change to your budget or wages; you are only changing who starts. Outside the windows your squad is frozen.',
    windowsTitle: 'Swap windows',
    windows: [
      { label: 'Window 1', value: '18 Jun', detail: '2 swaps' },
      { label: 'Window 2', value: '24 Jun', detail: '2 swaps' },
      { label: 'Window 3', value: '8–9 Jul', detail: '4 swaps' },
    ],
    points: [
      'A swap exchanges one reserve for the starter in the same position (GK, DEF, MID or FWD).',
      'Each window has its own swap allowance; unused swaps do not carry over, and undoing a swap spends another.',
      'A swap takes effect from the next round that has not yet kicked off — it never changes points already earned.',
      'From the round it applies, the player you bring in scores full points and the one you move to the bench scores 50%, until your next swap.',
      'Window 3 is the final chance to swap; after it closes your squad is locked for the rest of the tournament.',
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
      'Counting starts when you register — or, if you link a Soccerverse account later, when you link. Influence you held before that point never counts.',
      'The boost is +1% per 10 net shares — your buys minus your sells in that player — capped at +10% per player.',
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
          'Everyone represents both nations they picked and gives each their full score. A nation needs at least 2 members to qualify, and nations are ranked by the average score of their members. If two nations tie on average, the one with the highest individual member score wins, and a winning nation’s prize pool is shared equally among all its members.',
      },
    ],
  },

  timing: {
    eyebrow: 'dates & locks',
    title: 'When things happen',
    items: [
      { label: 'Grand Tournament', value: '11 Jun – 19 Jul 2026', detail: 'Every official match moves the tables.' },
      { label: 'Registration closes', value: '4 Jul 2026, 00:00 UTC', detail: 'No new entries after this instant, and your drafted squad is final — but limited reserve-for-starter swaps still run in their windows (see Player swaps).' },
      {
        label: 'Squad lock',
        value: 'On submission',
        detail: 'You lock once all 15 players are drafted; after the competition starts the only change allowed is a swap inside a window.',
      },
      {
        label: 'No retroactive points',
        value: 'Lock before kickoff',
        detail: 'A squad only scores from matches that kick off after it was locked.',
      },
    ],
  },

  coming: {
    eyebrow: 'good to know',
    title: 'Results & points',
    note: 'A few things to set expectations, so nothing here catches you off guard.',
    items: [
      'Results may not appear on the site the moment a match ends. Scores update once each match has been processed, so give it a little time after the first games before your points show up.',
      'Only locked squads are scored. A squad that has not been locked earns no points — points go to locked squads only.',
      'No points are awarded retroactively. A squad only scores from matches that kick off after it was locked, so entering late never picks up points for games already played.',
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
    'Un equipo. Un bloqueo. Más de cuarenta días de fútbol del Grand Tournament moviendo tu posición. Todo lo descrito en esta página está activo en la versión actual — solo se redactan como reglas las mecánicas que ya funcionan.',
  cta: 'Registra tu equipo',

  squad: {
    eyebrow: 'registro y equipo',
    title: 'Construye un equipo y luego bloquéalo',
    body:
      'Eliges un único equipo de 15 jugadores en un 4-3-3 con un reserva por posición. Los jugadores provienen de los grupos oficiales de las selecciones del Grand Tournament mapeados en Soccerverse. Una vez que bloqueas, tu equipo queda fijo — sin traspasos, sin nuevos jugadores. El único cambio permitido durante el torneo es un cambio limitado de reserva por titular dentro de ventanas programadas (consulta Cambios de jugadores más abajo).',
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
      'Puedes incluir como máximo 4 jugadores de la misma selección entre tus 15 — titulares y suplentes juntos. Esto cuenta la selección de Grand Tournament del jugador y es independiente de las dos naciones que eliges para la Nation League.',
      'Se requiere un correo verificado antes de poder acceder al creador de equipos.',
      'Tu equipo permanece oculto por defecto — solo tú puedes revelarlo, aunque un administrador puede revelar todos los equipos en el kickoff. Tu nombre de mánager, tu puntuación y tu posición siguen apareciendo en las tablas públicas.',
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
      'Se aplica una tabla fija al rendimiento real de cada jugador en el Grand Tournament, partido a partido. El valor de la portería a cero depende de la posición. Además, cada jugador gana hasta 2 puntos de rendimiento escalados a partir de su valoración del partido.',
    rubric: [
      { label: 'Gol', value: '+5', detail: 'por cada gol marcado' },
      { label: 'Asistencia', value: '+3', detail: 'por cada asistencia' },
      { label: 'Aparición', value: '+1', detail: 'por cualquier tiempo sobre el campo' },
      { label: '60+ minutos', value: '+1', detail: 'extra, por jugar 60 minutos o más' },
      { label: 'Portería a cero', value: '+4 / +3 / +1* / 0', detail: 'GK +4, DEF +3, MID +1 solo si el jugador tiene DML/DMR/DMC/DM como posición alternativa en Soccerverse, FWD 0 — y solo si el jugador disputó 60+ minutos y su equipo no encajó goles' },
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
      { label: 'Portería a cero (MID con DM alt)', value: '+1' },
      { label: 'Rendimiento (8.0)', value: '+1' },
    ],
    baseLabel: 'Puntos base',
    baseValue: '12',
    boostLabel: 'Con +5% de impulso por posesión',
    boostValue: '12.6',
    finalLabel: 'Bajo el tope de 1,500,000 SVC (×1.5)',
    finalValue: '18.9',
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
      'Si en una ventana de cambios pasas a un reserva a tu once titular, puntúa con puntos completos en las jornadas que sea titular — y el titular que mandas al banquillo baja al 50%.',
    ],
  },

  swaps: {
    eyebrow: 'cambios de jugadores',
    title: 'Cambios limitados dentro de ventanas programadas',
    body:
      'Tu equipo no es del todo de configurar y olvidar. Dentro de unas pocas ventanas programadas puedes cambiar un reserva por un titular — solo en la misma posición, entre los 15 jugadores que ya bloqueaste. Sin nuevos jugadores y sin cambios en tu presupuesto ni en los salarios; solo cambias quién es titular. Fuera de las ventanas tu equipo está congelado.',
    windowsTitle: 'Ventanas de cambios',
    windows: [
      { label: 'Ventana 1', value: '18 Jun', detail: '2 cambios' },
      { label: 'Ventana 2', value: '24 Jun', detail: '2 cambios' },
      { label: 'Ventana 3', value: '8–9 Jul', detail: '4 cambios' },
    ],
    points: [
      'Un cambio intercambia un reserva por el titular de la misma posición (GK, DEF, MID o FWD).',
      'Cada ventana tiene su propia asignación de cambios; los cambios no usados no se acumulan, y deshacer un cambio gasta otro.',
      'Un cambio surte efecto a partir de la siguiente jornada que aún no haya comenzado — nunca altera los puntos ya ganados.',
      'Desde la jornada en que se aplica, el jugador que incorporas puntúa con puntos completos y el que mandas al banquillo puntúa al 50%, hasta tu siguiente cambio.',
      'La Ventana 3 es la última oportunidad de cambiar; una vez que cierra, tu equipo queda bloqueado para el resto del torneo.',
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
      'El conteo empieza cuando te registras — o, si vinculas una cuenta de Soccerverse más tarde, cuando la vinculas. La influencia que tenías antes de ese momento nunca cuenta.',
      'El impulso es de +1% por cada 10 acciones netas — tus compras menos tus ventas de ese jugador — con un tope de +10% por jugador.',
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
          'Todos representan a las dos naciones que eligieron y aportan a cada una su puntuación completa. Una nación necesita al menos 2 miembros para clasificarse, y las naciones se clasifican por la puntuación media de sus miembros. Si dos naciones empatan en la media, gana la que tenga la mayor puntuación individual de un miembro, y el premio de la nación ganadora se reparte por igual entre todos sus miembros.',
      },
    ],
  },

  timing: {
    eyebrow: 'fechas y bloqueos',
    title: 'Cuándo ocurren las cosas',
    items: [
      { label: 'Grand Tournament', value: '11 Jun – 19 Jul 2026', detail: 'Cada partido oficial mueve las tablas.' },
      { label: 'Cierre del registro', value: '4 Jul 2026, 00:00 UTC', detail: 'No se admiten nuevas inscripciones después de este instante, y tu equipo fichado es definitivo — pero los cambios limitados de reserva por titular siguen funcionando en sus ventanas (consulta Cambios de jugadores).' },
      {
        label: 'Bloqueo del equipo',
        value: 'On submission',
        detail: 'Bloqueas una vez que los 15 jugadores están fichados; tras el inicio de la competición el único cambio permitido es un cambio dentro de una ventana.',
      },
      {
        label: 'Sin puntos retroactivos',
        value: 'Lock before kickoff',
        detail: 'Un equipo solo puntúa en los partidos que comienzan después de haber sido bloqueado.',
      },
    ],
  },

  coming: {
    eyebrow: 'conviene saber',
    title: 'Resultados y puntos',
    note: 'Algunas cosas para que sepas qué esperar y nada te tome por sorpresa.',
    items: [
      'Los resultados pueden no aparecer en el sitio en cuanto termina un partido. Los puntos se actualizan una vez procesado cada partido, así que dale algo de tiempo tras los primeros encuentros antes de que aparezcan tus puntos.',
      'Solo se puntúan los equipos bloqueados. Un equipo que no se ha bloqueado no recibe puntos: los puntos se otorgan únicamente a los equipos bloqueados.',
      'No se otorgan puntos de forma retroactiva. Un equipo solo puntúa en los partidos que comienzan después de bloquearlo, así que registrarte tarde nunca da puntos por partidos ya jugados.',
    ],
  },
}

copyByLocale.it = {
  eyebrow: 'come funziona',
  title: 'Le regole dell’evento, per intero.',
  intro:
    'Una sola rosa. Un solo blocco. Oltre quaranta giorni di calcio del Grand Tournament che fanno muovere la tua posizione. Tutto ciò che è descritto in questa pagina è attivo nella build attuale — solo le meccaniche che già funzionano sono scritte come regole.',
  cta: 'Registra la tua rosa',

  squad: {
    eyebrow: 'registrazione e rosa',
    title: 'Costruisci una rosa, poi bloccala',
    body:
      'Componi un’unica rosa di 15 giocatori in un 4-3-3 con una riserva per ruolo. I giocatori provengono dai pool ufficiali delle squadre del Grand Tournament mappati in Soccerverse. Una volta bloccata, la tua rosa è fissa — niente trasferimenti, niente nuovi giocatori. L’unica modifica consentita durante il torneo è un cambio limitato riserva-per-titolare all’interno di finestre programmate (vedi Cambi giocatori più sotto).',
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
      'Puoi schierare al massimo 4 giocatori della stessa nazionale tra i tuoi 15 — titolari e riserve insieme. Questo conta la nazionale del Grand Tournament del giocatore ed è indipendente dalle due nazioni che scegli per la Nation League.',
      'È richiesta un’email verificata prima di poter accedere al costruttore della rosa.',
      'La tua rosa resta nascosta per impostazione predefinita — solo tu puoi rivelarla, anche se un amministratore può rivelare tutte le rose al kickoff. Il tuo nome da manager, il punteggio e la posizione restano comunque visibili nelle classifiche pubbliche.',
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
      'Un criterio fisso viene applicato alla prestazione reale al Grand Tournament di ogni giocatore, partita per partita. Il valore della porta inviolata dipende dal ruolo. In aggiunta, ogni giocatore guadagna fino a 2 punti prestazione scalati dalla sua valutazione di partita.',
    rubric: [
      { label: 'Gol', value: '+5', detail: 'per gol segnato' },
      { label: 'Assist', value: '+3', detail: 'per assist' },
      { label: 'Presenza', value: '+1', detail: 'per qualsiasi tempo in campo' },
      { label: '60+ minuti', value: '+1', detail: 'extra, per aver giocato 60 minuti o più' },
      { label: 'Porta inviolata', value: '+4 / +3 / +1* / 0', detail: 'GK +4, DEF +3, MID +1 solo se il giocatore ha DML/DMR/DMC/DM come posizione alternativa Soccerverse, FWD 0 — e solo se il giocatore è rimasto in campo 60+ minuti e la sua squadra non ha subito gol' },
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
      { label: 'Porta inviolata (MID con DM alt)', value: '+1' },
      { label: 'Prestazione (8.0)', value: '+1' },
    ],
    baseLabel: 'Punti base',
    baseValue: '12',
    boostLabel: 'Con boost di possesso del +5%',
    boostValue: '12.6',
    finalLabel: 'Sotto il tetto di 1,500,000 SVC (×1.5)',
    finalValue: '18.9',
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
      'Se in una finestra di cambi inserisci una riserva nel tuo undici titolare, segna a punti pieni nelle giornate in cui è titolare — e il titolare che mandi in panchina scende al 50%.',
    ],
  },

  swaps: {
    eyebrow: 'cambi giocatori',
    title: 'Cambi limitati all’interno di finestre programmate',
    body:
      'La tua rosa non è del tutto imposta e dimentica. All’interno di alcune finestre programmate puoi scambiare una riserva con un titolare — solo nello stesso ruolo, tra i 15 giocatori che hai già bloccato. Nessun nuovo giocatore e nessuna variazione del tuo budget o degli ingaggi; cambi soltanto chi è titolare. Al di fuori delle finestre la tua rosa è congelata.',
    windowsTitle: 'Finestre di cambio',
    windows: [
      { label: 'Finestra 1', value: '18 Jun', detail: '2 cambi' },
      { label: 'Finestra 2', value: '24 Jun', detail: '2 cambi' },
      { label: 'Finestra 3', value: '8–9 Jul', detail: '4 cambi' },
    ],
    points: [
      'Un cambio scambia una riserva con il titolare dello stesso ruolo (GK, DEF, MID o FWD).',
      'Ogni finestra ha la propria dotazione di cambi; i cambi non utilizzati non si accumulano, e annullare un cambio ne consuma un altro.',
      'Un cambio ha effetto dalla giornata successiva non ancora iniziata — non altera mai i punti già guadagnati.',
      'Dalla giornata in cui si applica, il giocatore che inserisci segna a punti pieni e quello che mandi in panchina segna al 50%, fino al tuo prossimo cambio.',
      'La Finestra 3 è l’ultima occasione per cambiare; dopo la sua chiusura la tua rosa è bloccata per il resto del torneo.',
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
      'Il conteggio parte da quando ti registri — o, se colleghi un account Soccerverse più tardi, da quando lo colleghi. L’influenza che possedevi prima di quel momento non conta mai.',
      'Il boost è +1% ogni 10 quote nette — i tuoi acquisti meno le tue vendite su quel giocatore — con un tetto del +10% per giocatore.',
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
          'Tutti rappresentano entrambe le nazioni che hanno scelto e attribuiscono a ciascuna il proprio punteggio pieno. Una nazione ha bisogno di almeno 2 membri per qualificarsi, e le nazioni sono classificate in base al punteggio medio dei loro membri. Se due nazioni sono pari nella media, vince quella con il punteggio individuale più alto di un membro, e il montepremi della nazione vincitrice è diviso equamente tra tutti i suoi membri.',
      },
    ],
  },

  timing: {
    eyebrow: 'date e blocchi',
    title: 'Quando accadono le cose',
    items: [
      { label: 'Grand Tournament', value: '11 Jun – 19 Jul 2026', detail: 'Ogni partita ufficiale fa muovere le classifiche.' },
      { label: 'Chiusura registrazioni', value: '4 Jul 2026, 00:00 UTC', detail: 'Nessuna nuova iscrizione dopo questo istante, e la tua rosa composta è definitiva — ma i cambi limitati riserva-per-titolare restano attivi nelle loro finestre (vedi Cambi giocatori).' },
      {
        label: 'Blocco della rosa',
        value: 'All’invio',
        detail: 'Blocchi una volta che tutti e 15 i giocatori sono stati composti; dopo l’inizio della competizione l’unica modifica consentita è un cambio all’interno di una finestra.',
      },
      {
        label: 'Nessun punto retroattivo',
        value: 'Blocca prima del fischio d’inizio',
        detail: 'Una rosa segna solo dalle partite che iniziano dopo il suo blocco.',
      },
    ],
  },

  coming: {
    eyebrow: 'buono a sapersi',
    title: 'Risultati e punti',
    note: 'Alcune cose per chiarire cosa aspettarti, così nulla ti coglie di sorpresa.',
    items: [
      'I risultati potrebbero non comparire sul sito nel momento in cui una partita finisce. I punteggi si aggiornano una volta elaborata ogni partita, quindi concedi un po’ di tempo dopo le prime gare prima che i tuoi punti compaiano.',
      'Vengono conteggiate solo le rose bloccate. Una rosa che non è stata bloccata non riceve punti: i punti vengono assegnati esclusivamente alle rose bloccate.',
      'Non vengono assegnati punti in modo retroattivo. Una rosa segna punti solo nelle partite che iniziano dopo il suo blocco, quindi iscriversi in ritardo non fa mai recuperare punti per le partite già giocate.',
    ],
  },
}

copyByLocale.de = {
  eyebrow: 'so funktioniert es',
  title: 'Die Eventregeln, vollständig.',
  intro:
    'Ein Kader. Eine Festlegung. Über vierzig Tage Grand-Tournament-Fußball, die deine Platzierung bewegen. Alles, was auf dieser Seite beschrieben wird, ist im aktuellen Build live — nur Mechaniken, die bereits funktionieren, sind als Regeln formuliert.',
  cta: 'Registriere deinen Kader',

  squad: {
    eyebrow: 'registrierung & kader',
    title: 'Baue einen Kader und lege ihn dann fest',
    body:
      'Du stellst einen einzigen Kader aus 15 Spielern in einem 4-3-3 mit einem Reservespieler pro Position zusammen. Die Spieler stammen aus den offiziellen Grand-Tournament-Teampools, die in Soccerverse abgebildet sind. Sobald du festlegst, ist dein Kader fix — keine Transfers, keine neuen Spieler. Die einzige während des Turniers erlaubte Änderung ist ein begrenzter Tausch Reservespieler-gegen-Stammspieler innerhalb festgelegter Zeitfenster (siehe Spielertausch weiter unten).',
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
      'Du darfst höchstens 4 Spieler aus derselben Nationalmannschaft unter deinen 15 aufstellen — Stammspieler und Reservisten zusammen. Gezählt wird die Grand-Tournament-Nationalmannschaft des Spielers; das ist unabhängig von den beiden Nationen, die du für die Nation League wählst.',
      'Eine verifizierte E-Mail-Adresse ist erforderlich, bevor du den Kader-Builder betreten kannst.',
      'Dein Kader bleibt standardmäßig verborgen — nur du kannst ihn aufdecken, ein Admin kann jedoch beim Anpfiff alle Kader aufdecken. Dein Managername, deine Punktzahl und dein Rang erscheinen weiterhin in den öffentlichen Tabellen.',
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
      'Ein festes Punktesystem wird auf die echte Grand-Tournament-Leistung jedes Spielers angewendet, Spiel für Spiel. Der Wert für ein zu Null gehaltenes Spiel hängt von der Position ab. Darüber hinaus verdient jeder Spieler bis zu 2 Leistungspunkte, skaliert nach seinem Spiel-Rating.',
    rubric: [
      { label: 'Tor', value: '+5', detail: 'pro erzieltem Tor' },
      { label: 'Vorlage', value: '+3', detail: 'pro Vorlage' },
      { label: 'Einsatz', value: '+1', detail: 'für jede Zeit auf dem Platz' },
      { label: '60+ Minuten', value: '+1', detail: 'zusätzlich, für 60 Minuten oder mehr Spielzeit' },
      { label: 'Zu Null', value: '+4 / +3 / +1* / 0', detail: 'GK +4, DEF +3, MID +1 nur wenn der Spieler DML/DMR/DMC/DM als Soccerverse-Alternativposition hat, FWD 0 — und nur wenn der Spieler 60+ Minuten durchhielt und sein Team kein Gegentor kassierte' },
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
      { label: 'Zu Null (MID mit DM alt)', value: '+1' },
      { label: 'Leistung (8.0)', value: '+1' },
    ],
    baseLabel: 'Basispunkte',
    baseValue: '12',
    boostLabel: 'Mit +5% Ownership-Boost',
    boostValue: '12.6',
    finalLabel: 'Unter der Grenze von 1,500,000 SVC (×1.5)',
    finalValue: '18.9',
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
      'Wenn du in einem Tauschfenster einen Reservespieler in deine Start-XI tauschst, zählt er in den Runden, in denen er startet, mit vollen Punkten — und der Stammspieler, den du auf die Bank setzt, fällt auf 50%.',
    ],
  },

  swaps: {
    eyebrow: 'spielertausch',
    title: 'Begrenzte Wechsel innerhalb festgelegter Zeitfenster',
    body:
      'Dein Kader ist nicht vollständig „einstellen und vergessen“. Innerhalb einiger festgelegter Zeitfenster darfst du einen Reservespieler gegen einen Stammspieler tauschen — nur auf derselben Position, innerhalb der 15 Spieler, die du bereits festgelegt hast. Keine neuen Spieler und keine Änderung deines Budgets oder der Gehälter; du änderst nur, wer startet. Außerhalb der Fenster ist dein Kader eingefroren.',
    windowsTitle: 'Tauschfenster',
    windows: [
      { label: 'Fenster 1', value: '18 Jun', detail: '2 Wechsel' },
      { label: 'Fenster 2', value: '24 Jun', detail: '2 Wechsel' },
      { label: 'Fenster 3', value: '8–9 Jul', detail: '4 Wechsel' },
    ],
    points: [
      'Ein Tausch wechselt einen Reservespieler gegen den Stammspieler auf derselben Position (GK, DEF, MID oder FWD).',
      'Jedes Fenster hat sein eigenes Tauschkontingent; ungenutzte Wechsel werden nicht übertragen, und das Rückgängigmachen eines Tauschs verbraucht einen weiteren.',
      'Ein Tausch wirkt ab der nächsten Runde, die noch nicht angepfiffen wurde — er ändert niemals bereits erzielte Punkte.',
      'Ab der Runde, in der er greift, zählt der eingewechselte Spieler mit vollen Punkten und der auf die Bank gesetzte mit 50%, bis zu deinem nächsten Tausch.',
      'Fenster 3 ist die letzte Gelegenheit zum Tauschen; nach seinem Schließen ist dein Kader für den Rest des Turniers gesperrt.',
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
      'Die Zählung beginnt mit deiner Registrierung — oder, wenn du ein Soccerverse-Konto später verknüpfst, mit der Verknüpfung. Einfluss, den du davor besaßest, zählt nie.',
      'Der Boost beträgt +1% pro 10 Netto-Anteile — deine Käufe minus deine Verkäufe bei diesem Spieler — begrenzt auf +10% pro Spieler.',
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
          'Jeder vertritt beide Nationen, die er gewählt hat, und bringt jeder seine volle Punktzahl ein. Eine Nation braucht mindestens 2 Mitglieder, um sich zu qualifizieren, und Nationen werden nach der durchschnittlichen Punktzahl ihrer Mitglieder gewertet. Bei Gleichstand im Schnitt gewinnt die Nation mit der höchsten Einzelpunktzahl eines Mitglieds, und der Preispool der Siegernation wird zu gleichen Teilen unter allen ihren Mitgliedern aufgeteilt.',
      },
    ],
  },

  timing: {
    eyebrow: 'termine & festlegungen',
    title: 'Wann was passiert',
    items: [
      { label: 'Grand Tournament', value: '11 Jun – 19 Jul 2026', detail: 'Jedes offizielle Spiel bewegt die Tabellen.' },
      { label: 'Registrierung schließt', value: '4 Jul 2026, 00:00 UTC', detail: 'Nach diesem Zeitpunkt keine neuen Anmeldungen mehr, und dein zusammengestellter Kader ist endgültig — aber begrenzte Wechsel Reservespieler-gegen-Stammspieler laufen weiterhin in ihren Fenstern (siehe Spielertausch).' },
      {
        label: 'Kader-Festlegung',
        value: 'Bei Einreichung',
        detail: 'Du legst fest, sobald alle 15 Spieler ausgewählt sind; nach Beginn des Wettbewerbs ist die einzige erlaubte Änderung ein Tausch innerhalb eines Fensters.',
      },
      {
        label: 'Keine rückwirkenden Punkte',
        value: 'Vor Anpfiff festlegen',
        detail: 'Ein Kader punktet nur aus Spielen, die nach seiner Festlegung angepfiffen werden.',
      },
    ],
  },

  coming: {
    eyebrow: 'gut zu wissen',
    title: 'Ergebnisse & Punkte',
    note: 'Ein paar Dinge zur Einordnung, damit dich hier nichts überrascht.',
    items: [
      'Ergebnisse erscheinen möglicherweise nicht sofort auf der Seite, sobald ein Spiel endet. Die Punkte werden aktualisiert, sobald jedes Spiel verarbeitet wurde – gib ihm also nach den ersten Spielen etwas Zeit, bevor deine Punkte auftauchen.',
      'Nur festgelegte Kader werden gewertet. Ein Kader, der nicht festgelegt wurde, erhält keine Punkte – Punkte gibt es ausschließlich für festgelegte Kader.',
      'Es werden keine Punkte rückwirkend vergeben. Ein Kader punktet nur in Spielen, die nach seiner Festlegung angepfiffen werden – wer sich spät anmeldet, bekommt also nie Punkte für bereits gespielte Spiele.',
    ],
  },
}

copyByLocale.fr = {
  eyebrow: 'comment ça marche',
  title: 'Le règlement de l’événement, en intégralité.',
  intro:
    'Un effectif. Un verrouillage. Plus de quarante jours de football de Grand Tournament qui font bouger votre classement. Tout ce qui est décrit sur cette page est actif dans la version actuelle — seules les mécaniques qui fonctionnent déjà sont rédigées comme des règles.',
  cta: 'Inscrivez votre effectif',

  squad: {
    eyebrow: 'inscription & effectif',
    title: 'Constituez un effectif, puis verrouillez-le',
    body:
      'Vous composez un seul effectif de 15 joueurs en 4-3-3 avec un remplaçant par poste. Les joueurs proviennent des viviers officiels des équipes du Grand Tournament mappés dans Soccerverse. Une fois verrouillé, votre effectif est figé — aucun transfert, aucun nouveau joueur. La seule modification autorisée en cours de tournoi est un échange limité remplaçant-pour-titulaire dans des fenêtres programmées (voir Échanges de joueurs ci-dessous).',
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
      'Vous pouvez aligner au maximum 4 joueurs de la même sélection parmi vos 15 — titulaires et remplaçants confondus. Cela compte la sélection de Grand Tournament du joueur et est indépendant des deux nations que vous choisissez pour la Nation League.',
      'Une adresse e-mail vérifiée est requise avant de pouvoir accéder au constructeur d’effectif.',
      'Votre effectif reste masqué par défaut — vous seul pouvez le révéler, même si un administrateur peut révéler tous les effectifs au coup d’envoi. Votre nom de manager, votre score et votre rang apparaissent toujours dans les classements publics.',
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
      'Un barème fixe est appliqué à la performance réelle de chaque joueur au Grand Tournament, match par match. La valeur du clean sheet dépend du poste. En plus de cela, chaque joueur gagne jusqu’à 2 points de performance calculés à partir de sa note de match.',
    rubric: [
      { label: 'But', value: '+5', detail: 'par but marqué' },
      { label: 'Passe décisive', value: '+3', detail: 'par passe décisive' },
      { label: 'Apparition', value: '+1', detail: 'pour tout temps de jeu sur le terrain' },
      { label: '60+ minutes', value: '+1', detail: 'en plus, pour avoir joué 60 minutes ou plus' },
      { label: 'Clean sheet', value: '+4 / +3 / +1* / 0', detail: 'GK +4, DEF +3, MID +1 uniquement si le joueur a DML/DMR/DMC/DM en position alternative Soccerverse, FWD 0 — et uniquement si le joueur a tenu 60+ minutes et que son équipe n’a rien encaissé' },
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
      { label: 'Clean sheet (MID avec DM alt)', value: '+1' },
      { label: 'Performance (8.0)', value: '+1' },
    ],
    baseLabel: 'Points de base',
    baseValue: '12',
    boostLabel: 'Avec un boost de possession de +5%',
    boostValue: '12.6',
    finalLabel: 'Sous le plafond de 1,500,000 SVC (×1.5)',
    finalValue: '18.9',
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
      'Si vous faites entrer un remplaçant dans votre onze de départ lors d’une fenêtre d’échange, il marque en points pleins pour les journées où il est titulaire — et le titulaire que vous mettez sur le banc tombe à 50%.',
    ],
  },

  swaps: {
    eyebrow: 'échanges de joueurs',
    title: 'Échanges limités dans des fenêtres programmées',
    body:
      'Votre effectif n’est pas entièrement « réglez et oubliez ». Au cours de quelques fenêtres programmées, vous pouvez échanger un remplaçant contre un titulaire — uniquement au même poste, parmi les 15 joueurs que vous avez déjà verrouillés. Aucun nouveau joueur, et aucune modification de votre budget ou des salaires ; vous changez seulement qui est titulaire. En dehors des fenêtres, votre effectif est figé.',
    windowsTitle: 'Fenêtres d’échange',
    windows: [
      { label: 'Fenêtre 1', value: '18 Jun', detail: '2 échanges' },
      { label: 'Fenêtre 2', value: '24 Jun', detail: '2 échanges' },
      { label: 'Fenêtre 3', value: '8–9 Jul', detail: '4 échanges' },
    ],
    points: [
      'Un échange remplace un remplaçant par le titulaire du même poste (GK, DEF, MID ou FWD).',
      'Chaque fenêtre a sa propre allocation d’échanges ; les échanges non utilisés ne sont pas reportés, et annuler un échange en consomme un autre.',
      'Un échange prend effet à partir de la prochaine journée dont le coup d’envoi n’a pas encore eu lieu — il ne modifie jamais les points déjà gagnés.',
      'À partir de la journée où il s’applique, le joueur que vous faites entrer marque en points pleins et celui que vous mettez sur le banc marque à 50%, jusqu’à votre prochain échange.',
      'La Fenêtre 3 est la dernière occasion d’échanger ; une fois qu’elle se ferme, votre effectif est verrouillé pour le reste du tournoi.',
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
      'Le décompte commence à votre inscription — ou, si vous liez un compte Soccerverse plus tard, au moment où vous le liez. L’influence détenue avant ce moment ne compte jamais.',
      'Le boost est de +1% par 10 parts nettes — vos achats moins vos ventes sur ce joueur — plafonné à +10% par joueur.',
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
          'Chacun représente les deux nations qu’il a choisies et donne à chacune son score complet. Une nation a besoin d’au moins 2 membres pour se qualifier, et les nations sont classées selon le score moyen de leurs membres. En cas d’égalité de moyenne, la nation ayant le meilleur score individuel d’un membre l’emporte, et la cagnotte de la nation gagnante est partagée à parts égales entre tous ses membres.',
      },
    ],
  },

  timing: {
    eyebrow: 'dates & verrouillages',
    title: 'Quand les choses se passent',
    items: [
      { label: 'Grand Tournament', value: '11 Jun – 19 Jul 2026', detail: 'Chaque match officiel fait bouger les classements.' },
      { label: 'Clôture des inscriptions', value: '4 Jul 2026, 00:00 UTC', detail: 'Aucune nouvelle inscription après cet instant, et votre effectif composé est définitif — mais les échanges limités remplaçant-pour-titulaire continuent dans leurs fenêtres (voir Échanges de joueurs).' },
      {
        label: 'Verrouillage de l’effectif',
        value: 'À la soumission',
        detail: 'Vous verrouillez une fois les 15 joueurs composés ; après le début de la compétition, la seule modification autorisée est un échange dans une fenêtre.',
      },
      {
        label: 'Aucun point rétroactif',
        value: 'Verrouillez avant le coup d’envoi',
        detail: 'Un effectif ne marque que pour les matchs dont le coup d’envoi a lieu après son verrouillage.',
      },
    ],
  },

  coming: {
    eyebrow: 'bon à savoir',
    title: 'Résultats et points',
    note: 'Quelques précisions pour situer les attentes, afin que rien ne vous surprenne.',
    items: [
      'Les résultats peuvent ne pas apparaître sur le site dès la fin d’un match. Les points sont mis à jour une fois chaque match traité ; laissez donc un peu de temps après les premières rencontres avant que vos points s’affichent.',
      'Seuls les effectifs verrouillés sont comptabilisés. Un effectif non verrouillé ne reçoit aucun point : les points ne sont attribués qu’aux effectifs verrouillés.',
      'Aucun point n’est attribué rétroactivement. Un effectif ne marque que sur les matchs qui débutent après son verrouillage ; s’inscrire tard ne rapporte donc jamais de points pour des matchs déjà joués.',
    ],
  },
}

copyByLocale.pt = {
  eyebrow: 'como funciona',
  title: 'Regras do evento, na íntegra.',
  intro:
    'Uma única equipa. Um bloqueio. Mais de quarenta dias de futebol do Grand Tournament a mexer no teu ranking. Tudo o que está descrito nesta página está ativo na versão atual — só as mecânicas que já funcionam estão escritas como regras.',
  cta: 'Regista a tua equipa',

  squad: {
    eyebrow: 'registo & equipa',
    title: 'Monta uma equipa e depois bloqueia-a',
    body:
      'Montas uma única equipa de 15 jogadores num 4-3-3 com um reserva por posição. Os jogadores vêm dos lotes oficiais das seleções do Grand Tournament mapeados para o Soccerverse. Depois de bloqueares, a tua equipa fica fixa — sem transferências, sem novos jogadores. A única alteração permitida a meio do torneio é uma troca limitada de reserva por titular dentro de janelas programadas (vê Trocas de jogadores mais abaixo).',
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
      'Podes escalar no máximo 4 jogadores da mesma seleção entre os teus 15 — titulares e suplentes somados. Isto conta a seleção de Grand Tournament do jogador e é independente das duas nações que escolhes para a Nation League.',
      'É necessário um email verificado antes de poderes entrar no construtor de equipa.',
      'A tua equipa permanece oculta por predefinição — só tu a podes revelar, embora um administrador possa revelar todas as equipas no kickoff. O teu nome de treinador, pontuação e posição continuam a aparecer nas tabelas públicas.',
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
      'Um critério fixo é aplicado ao desempenho real de cada jogador no Grand Tournament, jogo a jogo. O valor da baliza imbatida depende da posição. Além disso, cada jogador ganha até 2 pontos de desempenho escalonados a partir da sua avaliação do jogo.',
    rubric: [
      { label: 'Golo', value: '+5', detail: 'por golo marcado' },
      { label: 'Assistência', value: '+3', detail: 'por assistência' },
      { label: 'Presença', value: '+1', detail: 'por qualquer tempo em campo' },
      { label: '60+ minutos', value: '+1', detail: 'extra, por jogar 60 minutos ou mais' },
      { label: 'Baliza imbatida', value: '+4 / +3 / +1* / 0', detail: 'GK +4, DEF +3, MID +1 só se o jogador tiver DML/DMR/DMC/DM como posição alternativa Soccerverse, FWD 0 — e só se o jogador aguentou 60+ minutos e a sua equipa não sofreu golos' },
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
      { label: 'Baliza imbatida (MID com DM alt)', value: '+1' },
      { label: 'Desempenho (8.0)', value: '+1' },
    ],
    baseLabel: 'Pontos base',
    baseValue: '12',
    boostLabel: 'Com impulso de propriedade de +5%',
    boostValue: '12.6',
    finalLabel: 'Sob o limite de 1,500,000 SVC (×1.5)',
    finalValue: '18.9',
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
      'Se numa janela de trocas colocares um reserva no teu onze inicial, pontua com pontos completos nas jornadas em que for titular — e o titular que mandas para o banco desce para 50%.',
    ],
  },

  swaps: {
    eyebrow: 'trocas de jogadores',
    title: 'Trocas limitadas dentro de janelas programadas',
    body:
      'A tua equipa não é totalmente montar e esquecer. Dentro de algumas janelas programadas podes trocar um reserva por um titular — apenas na mesma posição, entre os 15 jogadores que já bloqueaste. Sem novos jogadores e sem alteração ao teu orçamento ou aos salários; apenas mudas quem é titular. Fora das janelas a tua equipa está congelada.',
    windowsTitle: 'Janelas de troca',
    windows: [
      { label: 'Janela 1', value: '18 Jun', detail: '2 trocas' },
      { label: 'Janela 2', value: '24 Jun', detail: '2 trocas' },
      { label: 'Janela 3', value: '8–9 Jul', detail: '4 trocas' },
    ],
    points: [
      'Uma troca troca um reserva pelo titular da mesma posição (GK, DEF, MID ou FWD).',
      'Cada janela tem a sua própria quota de trocas; as trocas não usadas não transitam, e desfazer uma troca gasta outra.',
      'Uma troca produz efeito a partir da próxima jornada que ainda não começou — nunca altera os pontos já ganhos.',
      'A partir da jornada em que se aplica, o jogador que colocas pontua com pontos completos e o que mandas para o banco pontua a 50%, até à tua próxima troca.',
      'A Janela 3 é a última oportunidade de trocar; depois de fechar, a tua equipa fica bloqueada para o resto do torneio.',
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
      'A contagem começa quando te registas — ou, se ligares uma conta Soccerverse mais tarde, quando a ligas. A influência que possuías antes desse momento nunca conta.',
      'O impulso é de +1% por cada 10 ações líquidas — as tuas compras menos as tuas vendas nesse jogador — limitado a +10% por jogador.',
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
          'Todos representam ambas as nações que escolheram e atribuem a cada uma a sua pontuação completa. Uma nação precisa de pelo menos 2 membros para se qualificar, e as nações são classificadas pela pontuação média dos seus membros. Se duas nações empatarem na média, vence a que tiver a maior pontuação individual de um membro, e o prémio da nação vencedora é dividido igualmente por todos os seus membros.',
      },
    ],
  },

  timing: {
    eyebrow: 'datas & bloqueios',
    title: 'Quando as coisas acontecem',
    items: [
      { label: 'Grand Tournament', value: '11 Jun – 19 Jul 2026', detail: 'Cada jogo oficial mexe nas tabelas.' },
      { label: 'Encerramento do registo', value: '4 Jul 2026, 00:00 UTC', detail: 'Não há novas inscrições após este instante, e a tua equipa montada é definitiva — mas as trocas limitadas de reserva por titular continuam a funcionar nas suas janelas (vê Trocas de jogadores).' },
      {
        label: 'Bloqueio da equipa',
        value: 'Na submissão',
        detail: 'Bloqueias assim que todos os 15 jogadores estiverem montados; depois de a competição começar, a única alteração permitida é uma troca dentro de uma janela.',
      },
      {
        label: 'Sem pontos retroativos',
        value: 'Bloqueia antes do apito inicial',
        detail: 'Uma equipa só pontua a partir de jogos que começam depois de ter sido bloqueada.',
      },
    ],
  },

  coming: {
    eyebrow: 'bom saber',
    title: 'Resultados e pontos',
    note: 'Algumas coisas para definir expectativas, para que nada aqui te apanhe de surpresa.',
    items: [
      'Os resultados podem não aparecer no site no momento em que um jogo termina. As pontuações são atualizadas assim que cada jogo é processado, por isso dá algum tempo após os primeiros jogos antes de os teus pontos surgirem.',
      'Apenas as equipas bloqueadas são pontuadas. Uma equipa que não foi bloqueada não recebe pontos — os pontos vão apenas para as equipas bloqueadas.',
      'Não são atribuídos pontos retroativamente. Uma equipa só pontua em jogos que começam depois de ter sido bloqueada, por isso registar-te tarde nunca recupera pontos por jogos já disputados.',
    ],
  },
}

copyByLocale.ru = {
  eyebrow: 'как это работает',
  title: 'Правила события, полностью.',
  intro:
    'Один состав. Одна фиксация. Более сорока дней футбола Grand Tournament, меняющего ваш ранг. Всё, что описано на этой странице, уже работает в текущей сборке — правилами записаны только те механики, которые уже функционируют.',
  cta: 'Зарегистрируйте свой состав',

  squad: {
    eyebrow: 'регистрация и состав',
    title: 'Соберите один состав, затем зафиксируйте его',
    body:
      'Вы набираете единый состав из 15 игроков по схеме 4-3-3 с одним запасным на каждую позицию. Игроки берутся из официальных пулов команд Grand Tournament, перенесённых в Soccerverse. После фиксации ваш состав закреплён — никаких трансферов и новых игроков. Единственное изменение, разрешённое по ходу турнира, — это ограниченная замена запасного на игрока старта в рамках отведённых окон (см. Замены игроков ниже).',
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
      'В составе из 15 игроков можно взять не более 4 игроков из одной сборной — основные и запасные вместе. Учитывается сборная игрока на Grand Tournament; это не связано с двумя нациями, которые вы выбираете для Nation League.',
      'Перед входом в конструктор состава требуется подтверждённый адрес электронной почты.',
      'Ваш состав по умолчанию скрыт — раскрыть его можете только вы, хотя администратор может раскрыть все составы на старте. Ваше имя менеджера, счёт и место по-прежнему отображаются в публичных таблицах.',
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
      'К реальной игре каждого игрока на Grand Tournament применяется фиксированная система, матч за матчем. Ценность сухого матча зависит от позиции. Помимо этого, каждый игрок зарабатывает до 2 очков за игру, масштабируемых от его рейтинга за матч.',
    rubric: [
      { label: 'Гол', value: '+5', detail: 'за каждый забитый гол' },
      { label: 'Голевая передача', value: '+3', detail: 'за каждую голевую передачу' },
      { label: 'Появление', value: '+1', detail: 'за любое время на поле' },
      { label: '60+ минут', value: '+1', detail: 'дополнительно, за 60 и более сыгранных минут' },
      { label: 'Сухой матч', value: '+4 / +3 / +1* / 0', detail: 'GK +4, DEF +3, MID +1 только если у игрока есть DML/DMR/DMC/DM как альтернативная позиция в Soccerverse, FWD 0 — и только если игрок провёл 60+ минут, а его команда не пропустила' },
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
      { label: 'Сухой матч (MID с DM alt)', value: '+1' },
      { label: 'Игра (8.0)', value: '+1' },
    ],
    baseLabel: 'Базовые очки',
    baseValue: '12',
    boostLabel: 'С надбавкой за владение +5%',
    boostValue: '12.6',
    finalLabel: 'Под потолком 1,500,000 SVC (×1.5)',
    finalValue: '18.9',
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
      'Если в окне замен вы выводите запасного в стартовую одиннадцатку, он набирает полные очки в турах, где выходит в старте, — а игрок старта, которого вы отправляете на скамейку, опускается до 50%.',
    ],
  },

  swaps: {
    eyebrow: 'замены игроков',
    title: 'Ограниченные замены в рамках отведённых окон',
    body:
      'Ваш состав не полностью работает по принципу «настроил и забыл». В рамках нескольких отведённых окон вы можете заменить запасного на игрока старта — только в той же позиции и только среди тех 15 игроков, которых вы уже зафиксировали. Никаких новых игроков и никаких изменений вашего бюджета или зарплат; вы меняете только то, кто выходит в старте. Вне окон ваш состав заморожен.',
    windowsTitle: 'Окна замен',
    windows: [
      { label: 'Окно 1', value: '18 Jun', detail: '2 замены' },
      { label: 'Окно 2', value: '24 Jun', detail: '2 замены' },
      { label: 'Окно 3', value: '8–9 Jul', detail: '4 замены' },
    ],
    points: [
      'Замена меняет местами запасного и игрока старта в той же позиции (GK, DEF, MID или FWD).',
      'У каждого окна свой лимит замен; неиспользованные замены не переносятся, а отмена замены тратит ещё одну.',
      'Замена вступает в силу со следующего тура, который ещё не стартовал, — она никогда не меняет уже набранные очки.',
      'С тура, в котором она применяется, выводимый игрок набирает полные очки, а отправленный на скамейку — 50%, вплоть до вашей следующей замены.',
      'Окно 3 — последняя возможность сделать замену; после его закрытия ваш состав заблокирован до конца турнира.',
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
      'Отсчёт начинается с момента вашей регистрации — или, если вы привязываете аккаунт Soccerverse позже, с момента привязки. Влияние, которым вы владели до этого момента, не учитывается.',
      'Надбавка составляет +1% за каждые 10 чистых долей — ваши покупки минус ваши продажи по этому игроку — с потолком +10% на игрока.',
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
          'Каждый представляет обе выбранные им нации и отдаёт каждой свой полный счёт. Нации нужно минимум 2 участника, чтобы пройти квалификацию, и нации ранжируются по среднему счёту их участников. При равенстве по среднему побеждает нация с наивысшим индивидуальным счётом участника, а призовой фонд нации-победительницы делится поровну между всеми её участниками.',
      },
    ],
  },

  timing: {
    eyebrow: 'даты и фиксации',
    title: 'Когда что происходит',
    items: [
      { label: 'Grand Tournament', value: '11 Jun – 19 Jul 2026', detail: 'Каждый официальный матч двигает таблицы.' },
      { label: 'Регистрация закрывается', value: '4 Jul 2026, 00:00 UTC', detail: 'После этого момента никаких новых заявок, и ваш набранный состав окончателен — но ограниченные замены запасного на игрока старта по-прежнему работают в своих окнах (см. Замены игроков).' },
      {
        label: 'Фиксация состава',
        value: 'При отправке',
        detail: 'Вы фиксируете состав, как только набраны все 15 игроков; после начала соревнования единственное разрешённое изменение — это замена в рамках окна.',
      },
      {
        label: 'Никаких очков задним числом',
        value: 'Зафиксируйте до старта',
        detail: 'Состав набирает очки только в матчах, которые стартовали после его фиксации.',
      },
    ],
  },

  coming: {
    eyebrow: 'полезно знать',
    title: 'Результаты и очки',
    note: 'Несколько моментов, чтобы вы знали, чего ожидать, и ничто не застало вас врасплох.',
    items: [
      'Результаты могут появиться на сайте не сразу после окончания матча. Очки обновляются после обработки каждого матча, поэтому дайте немного времени после первых игр, прежде чем ваши очки отобразятся.',
      'Очки начисляются только зафиксированным составам. Состав, который не был зафиксирован, не получает очков — очки начисляются исключительно зафиксированным составам.',
      'Очки не начисляются задним числом. Состав получает очки только за матчи, которые начинаются после его фиксации, поэтому поздняя регистрация никогда не приносит очков за уже сыгранные матчи.',
    ],
  },
}

copyByLocale.zh = {
  eyebrow: '运作方式',
  title: '完整赛事规则。',
  intro:
    '一套阵容。一次锁定。四十多天的 Grand Tournament 足球赛事牵动你的排名。本页所述的一切都已在当前版本中上线——只有已经生效的机制才会写成规则。',
  cta: '注册你的阵容',

  squad: {
    eyebrow: '注册与阵容',
    title: '组建一套阵容，然后锁定它',
    body:
      '你以 4-3-3 阵型选出一套 15 名球员的阵容，每个位置配一名替补。球员来自映射进 Soccerverse 的官方 Grand Tournament 球队名单。一旦锁定，你的阵容即固定——不可转会，不可新增球员。赛事进行中唯一允许的变动，是在限定的时间窗口内进行有限的“替补换首发”调换（见下方的球员调换）。',
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
      '你的15名球员中，来自同一支国家队的最多只能选4名——首发和替补合计。这里统计的是球员的 Grand Tournament 国家队，与你为 Nation League 选择的两个国家无关。',
      '进入阵容构建器之前，必须先验证电子邮箱。',
      '你的阵容默认隐藏——只有你能将其公开，但管理员可在开赛时公开所有阵容。你的经理名称、得分和排名仍会显示在公开排行榜上。',
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
      '一套固定的细则会逐场比赛地应用于每名球员在 Grand Tournament 中的真实表现。零封价值取决于位置。在此之上，每名球员还能根据其比赛评分换算出最多 2 个表现分。',
    rubric: [
      { label: '进球', value: '+5', detail: '每打进一球' },
      { label: '助攻', value: '+3', detail: '每次助攻' },
      { label: '出场', value: '+1', detail: '只要踏上球场即可获得' },
      { label: '60 分钟以上', value: '+1', detail: '出场 60 分钟或以上额外获得' },
      { label: '零封', value: '+4 / +3 / +1* / 0', detail: 'GK +4，DEF +3，MID +1 仅当球员在 Soccerverse 中拥有 DML/DMR/DMC/DM 作为替代位置时，FWD 0——并且仅当该球员踢满 60 分钟以上且其球队未失球时' },
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
      { label: '零封（MID 含 DM alt）', value: '+1' },
      { label: '表现（8.0）', value: '+1' },
    ],
    baseLabel: '基础分',
    baseValue: '12',
    boostLabel: '加上 +5% 持股提升',
    boostValue: '12.6',
    finalLabel: '在 1,500,000 SVC 上限下（×1.5）',
    finalValue: '18.9',
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
      '如果你在调换窗口内把一名替补换入首发 XI，他在首发的那些轮次按全额分数计分——而你下放替补席的那名首发则降至 50%。',
    ],
  },

  swaps: {
    eyebrow: '球员调换',
    title: '在限定时间窗口内进行有限调换',
    body:
      '你的阵容并非完全设定后即可放手不管。在少数几个限定的时间窗口内，你可以用一名替补换一名首发——仅限同一位置，且只能在你已锁定的 15 名球员之间进行。不可新增球员，也不会改变你的预算或薪资；你只是改变谁首发。窗口之外，你的阵容处于冻结状态。',
    windowsTitle: '调换窗口',
    windows: [
      { label: '窗口 1', value: '18 Jun', detail: '2 次调换' },
      { label: '窗口 2', value: '24 Jun', detail: '2 次调换' },
      { label: '窗口 3', value: '8–9 Jul', detail: '4 次调换' },
    ],
    points: [
      '一次调换会用一名替补与同一位置的首发对调（GK、DEF、MID 或 FWD）。',
      '每个窗口有各自的调换次数额度；未使用的调换不会累计到下一窗口，撤销一次调换会再消耗一次。',
      '调换从下一个尚未开球的轮次起生效——绝不会改变已经获得的分数。',
      '从生效的那一轮起，你换入的球员按全额分数计分，被你下放替补席的球员按 50% 计分，直到你的下一次调换。',
      '窗口 3 是最后的调换机会；它关闭后，你的阵容在本届赛事余下时间内将被锁定。',
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
      '计入从你注册时开始——若你之后才关联 Soccerverse 账户，则从关联时开始。在此之前你已持有的影响力不计入。',
      '提升为每 10 股净持仓 +1%（即你对该球员的买入减去卖出），每名球员上限为 +10%。',
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
          '每个人都代表自己所选的两个国家，并将完整得分计入每个国家。一个国家需至少 2 名成员才有资格，国家按其成员的平均得分排名。若两个国家平均分相同，则由拥有最高个人成员得分的国家胜出，获胜国家的奖池在其所有成员之间平均分配。',
      },
    ],
  },

  timing: {
    eyebrow: '日期与锁定',
    title: '各项事件的时间',
    items: [
      { label: 'Grand Tournament', value: '11 Jun – 19 Jul 2026', detail: '每一场官方比赛都会牵动排行榜。' },
      { label: '注册截止', value: '4 Jul 2026, 00:00 UTC', detail: '此刻之后不再接受新参赛，你所选定的阵容也已定型——但有限的“替补换首发”调换仍会在各自的窗口内进行（见球员调换）。' },
      {
        label: '阵容锁定',
        value: '提交时',
        detail: '一旦 15 名球员全部选定，你便锁定；比赛开始后，唯一允许的变动是在窗口内进行的调换。',
      },
      {
        label: '不追溯计分',
        value: '开球前锁定',
        detail: '阵容只从其锁定之后开球的比赛中得分。',
      },
    ],
  },

  coming: {
    eyebrow: '须知',
    title: '结果与积分',
    note: '一些需要事先了解的事项，免得让你感到意外。',
    items: [
      '比赛结束后，结果可能不会立即显示在网站上。每场比赛的数据处理完成后积分才会更新，因此在最初的几场比赛后请稍等片刻，你的积分才会出现。',
      '只有已锁定的阵容才会计分。未锁定的阵容不会获得任何积分——积分只发放给已锁定的阵容。',
      '积分不会追溯发放。阵容只在锁定之后开赛的比赛中得分，因此过晚注册永远不会为已经进行过的比赛获得积分。',
    ],
  },
}

copyByLocale.ja = {
  eyebrow: '仕組み',
  title: 'イベントルール、すべて。',
  intro:
    '1つのスカッド。1度のロック。40日以上にわたる Grand Tournament のサッカーがあなたの順位を動かします。このページに記載されている内容はすべて現行ビルドで稼働中です——すでに機能しているメカニクスのみをルールとして記載しています。',
  cta: 'スカッドを登録する',

  squad: {
    eyebrow: '登録とスカッド',
    title: '1つのスカッドを組み、ロックする',
    body:
      '各ポジションに控えを1人ずつ置いた 4-3-3 で、15人の単一スカッドを編成します。選手は Soccerverse にマッピングされた公式 Grand Tournament チームプールから選びます。一度ロックすると、あなたのスカッドは固定されます——移籍も、新規選手の追加もありません。大会期間中に許される唯一の変更は、定められた時間枠内での控えと先発の限定的なスワップです（下記の「選手スワップ」を参照）。',
    formationTitle: 'スカッドの構成（15人）',
    starters: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '4' },
      { label: 'MID', value: '3' },
      { label: 'FWD', value: '3' },
    ],
    subsTitle: '控え（各ポジション1人）',
    subs: [
      { label: 'GK', value: '1' },
      { label: 'DEF', value: '1' },
      { label: 'MID', value: '1' },
      { label: 'FWD', value: '1' },
    ],
    points: [
      'Veteran（Soccerverse アカウントをお持ちの方）または Rookie（お持ちでない方）として登録します。',
      '2つの国を選びます——母国と、自由に選べる1つです。両者は異なる必要があり、これらが Nation League を決定します。',
      'すべての選手は誰でも選べます。独占はなく、2人のマネージャーがまったく同じスカッドになることもあり得ます。',
      'スカッド内で同じ選手を2回選ぶことはできません。',
      'スカッド15人のうち、同じ代表チームから選べるのは最大4人までです（先発と控えの合計）。これは選手の Grand Tournament 代表チームを数えるもので、Nation League 用に選ぶ2つの国とは無関係です。',
      'スカッドビルダーに入る前に、メールアドレスの確認が必要です。',
      'あなたのスカッドは既定で非公開です——公開できるのはあなただけですが、管理者がキックオフ時にすべてのスカッドを公開する場合があります。マネージャー名・スコア・順位は公開リーダーボードには引き続き表示されます。',
    ],
  },

  salary: {
    eyebrow: 'サラリーキャップと乗数',
    title: '少なく使い、多く稼ぐ',
    body:
      'すべての選手は、そのレーティングから算出される Soccerverse Coins（SVC）建ての給与を持ちます——レーティングが高いほど、給与は急に上がります。編成前に予算上限を選び、その上限はあなたのスカッドが獲得するすべてに適用されるスコア乗数を決めます。低い上限を選べば得点はブーストされ、高い上限の下でスーパースターを揃えれば得点は削られます。',
    scaleLow: '少なく使う · ブースト大',
    scaleMid: 'ニュートラル ×1.0',
    scaleHigh: '多く使う · ペナルティ大',
    tiersTitle: '予算上限とその乗数',
    boostLabel: 'ブースト',
    neutralLabel: 'ニュートラル',
    penaltyLabel: 'ペナルティ',
    capExamplesTitle: 'レーティング別の給与例',
    capExamplesNote: '給与はレーティングとともに急激に上がります——ひと握りのスーパースターで高い上限の大部分を飲み込んでしまうこともあります。',
    capExamples: [
      { rating: '70', cost: '9,288' },
      { rating: '80', cost: '57,506' },
      { rating: '90', cost: '356,064' },
      { rating: '97', cost: '1,275,843' },
    ],
    unit: 'SVC',
  },

  scoring: {
    eyebrow: '採点基準',
    title: '得点の稼ぎ方',
    body:
      '固定の採点基準が、各選手の実際の Grand Tournament でのパフォーマンスに、試合ごとに適用されます。クリーンシートの価値はポジションによって異なります。これに加えて、各選手は試合レーティングに応じて換算される最大2のパフォーマンスポイントを獲得します。',
    rubric: [
      { label: 'ゴール', value: '+5', detail: 'ゴール1点につき' },
      { label: 'アシスト', value: '+3', detail: 'アシスト1回につき' },
      { label: '出場', value: '+1', detail: 'ピッチに立った時間があれば' },
      { label: '60分以上', value: '+1', detail: '追加で、60分以上プレーした場合' },
      { label: 'クリーンシート', value: '+4 / +3 / +1* / 0', detail: 'GK +4、DEF +3、MID +1 は選手が Soccerverse のオルタネートポジションに DML/DMR/DMC/DM を持つ場合のみ、FWD 0——かつ選手が60分以上プレーし、チームが無失点だった場合のみ' },
      { label: 'パフォーマンス', value: 'up to +2', detail: '試合レーティングから換算（6.0→0.5, 8.0→1.0, 9.5→1.5, 10.0→2.0）' },
    ],
    calculatorIntro: '正確な計算を自分で試してみましょう——選手、上限、ブーストを調整してください：',
  },

  example: {
    eyebrow: '計算例',
    title: '1試合、1選手',
    intro:
      'あなたの先発XIのミッドフィルダーが78分プレーし、1ゴール1アシストを記録、クリーンシートを達成し、試合レーティング8.0を獲得します。',
    steps: [
      { label: 'ゴール', value: '+5' },
      { label: 'アシスト', value: '+3' },
      { label: '出場', value: '+1' },
      { label: '60分以上', value: '+1' },
      { label: 'クリーンシート（DM オルタを持つ MID）', value: '+1' },
      { label: 'パフォーマンス（8.0）', value: '+1' },
    ],
    baseLabel: '基礎ポイント',
    baseValue: '12',
    boostLabel: '+5% の保有ブースト込み',
    boostValue: '12.6',
    finalLabel: '1,500,000 SVC 上限の下で（×1.5）',
    finalValue: '18.9',
  },

  subs: {
    eyebrow: '控え',
    title: '控えは常に50%で貢献',
    body:
      'あなたのスカッドは自動で回ります——試合日に管理することは何もありません。各控えは毎試合、自身の実際のパフォーマンスから稼いだポイントの50%を常に積み立てます。先発は常に全ポイントで計算されます。',
    points: [
      '4人の控えはすべて毎試合得点します——アクティベーションは不要で、先発が出場したかどうかにも左右されません。',
      '控えは通常の基準で生み出すものの半分を稼ぎます：ゴール、アシスト、出場時間、クリーンシート、パフォーマンス。',
      'ある試合に出場しなかった控えは、その試合では単純に何も稼ぎません。',
      'スワップ枠で控えを先発XIに入れると、その控えは先発する各ラウンドで全ポイントを稼ぎ——ベンチに下げた先発は50%に下がります。',
    ],
  },

  swaps: {
    eyebrow: '選手スワップ',
    title: '定められた時間枠内での限定スワップ',
    body:
      'あなたのスカッドは完全に「設定したら放置」ではありません。いくつかの定められた時間枠の中で、控えを先発とスワップできます——同じポジションのみ、すでにロックした15人の中でのみです。新規選手はなく、予算や給与の変更もありません。変えられるのは誰が先発するかだけです。枠の外では、あなたのスカッドは凍結されます。',
    windowsTitle: 'スワップ枠',
    windows: [
      { label: '枠 1', value: '18 Jun', detail: '2スワップ' },
      { label: '枠 2', value: '24 Jun', detail: '2スワップ' },
      { label: '枠 3', value: '8–9 Jul', detail: '4スワップ' },
    ],
    points: [
      'スワップは控えと同じポジションの先発を入れ替えます（GK、DEF、MID または FWD）。',
      '各枠には独自のスワップ回数が割り当てられます。未使用のスワップは持ち越されず、スワップを取り消すとさらに1回消費します。',
      'スワップはまだキックオフしていない次のラウンドから有効になります——すでに獲得したポイントを変えることは決してありません。',
      '適用されるラウンドから、入れた選手は全ポイントで、ベンチに下げた選手は50%で得点します。これは次のスワップまで続きます。',
      '枠3はスワップの最後の機会です。それが閉じた後は、あなたのスカッドは大会の残り期間ロックされます。',
    ],
  },

  boost: {
    eyebrow: '保有ブースト',
    title: '自分の選手を支えることへの報酬',
    scaleZero: 'ブーストなし',
    scaleCaption: '正味10株ごとに +1%',
    scaleCap: '+10% 上限',
    body:
      'Soccerverse アカウントを連携すると、イベント中に自分のスカッドの選手で購入したインフルエンスが、それらの選手があなたのために稼ぐポイントに小さな乗数を加えます。大きな既存ポートフォリオが支配することを許さずに、確信を報います。',
    points: [
      '計上は登録した時点から始まります——後で Soccerverse アカウントを連携する場合は連携した時点からです。それより前から保有していたインフルエンスは計上されません。',
      'ブーストは正味10株ごとに +1%（その選手の購入から売却を差し引いた分）で、選手1人あたり +10% が上限です。',
      '選手ごと、試合ごとに計測され、あなたのスカッド乗数の前に適用されます。',
      '購入が、すでにキックオフした試合に遡って適用されることは決してありません。',
      'Soccerverse アカウントを連携したマネージャーなら誰でも利用できます——Veteran でも Rookie でも。',
    ],
  },

  leagues: {
    eyebrow: '3つのリーグ',
    title: 'あなたが競う場',
    items: [
      { name: 'Veteran League', body: 'Veteran 同士が個人として順位づけされます。' },
      { name: 'Rookie League', body: 'Rookie 同士が個人として順位づけされます。' },
      {
        name: 'Nation League',
        body:
          '全員が選んだ2つの国の両方を代表し、それぞれに自分の全スコアを計上します。国が資格を得るには最低2人のメンバーが必要で、国はメンバーの平均スコアで順位づけされます。平均が同点の場合は、メンバーの個人スコアが最も高い国が勝ち、優勝国の賞金プールはそのすべてのメンバーで均等に分けられます。',
      },
    ],
  },

  timing: {
    eyebrow: '日程とロック',
    title: '各イベントのタイミング',
    items: [
      { label: 'Grand Tournament', value: '11 Jun – 19 Jul 2026', detail: 'すべての公式戦が順位表を動かします。' },
      { label: '登録締切', value: '4 Jul 2026, 00:00 UTC', detail: 'この瞬間以降は新規エントリーはなく、編成したスカッドも確定です——ただし限定的な控えと先発のスワップは各枠内で引き続き行われます（「選手スワップ」を参照）。' },
      {
        label: 'スカッドロック',
        value: '提出時',
        detail: '15人全員を編成した時点でロックされます。大会開始後に許される唯一の変更は、枠内でのスワップです。',
      },
      {
        label: '遡及得点なし',
        value: 'キックオフ前にロック',
        detail: 'スカッドはロック後にキックオフした試合からのみ得点します。',
      },
    ],
  },

  coming: {
    eyebrow: '知っておきたいこと',
    title: '結果とポイント',
    note: '想定外のことがないよう、いくつか押さえておきたい点です。',
    items: [
      '試合終了直後には結果がサイトに表示されないことがあります。各試合のデータが処理されてからポイントが更新されるため、最初の数試合のあとはポイントが表示されるまで少し時間をおいてください。',
      'ロックされたスカッドのみが採点されます。ロックされていないスカッドはポイントを獲得できません——ポイントはロック済みのスカッドにのみ付与されます。',
      'ポイントが遡って付与されることはありません。スカッドはロック後にキックオフした試合でのみ得点するため、登録が遅れても、すでに行われた試合のポイントを獲得することはありません。',
    ],
  },
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

      {/* Player swaps */}
      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">{copy.swaps.eyebrow}</p>
        <h2 className="section-title mt-4 text-white">{copy.swaps.title}</h2>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.swaps.body}</p>

        <p className="mono mt-6 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.swaps.windowsTitle}</p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {copy.swaps.windows.map((window) => (
            <div key={window.label} className="surface-row rounded-[0.9rem] p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-white">{window.label}</span>
                <span className="mono text-sm text-[var(--color-accent)]">{window.value}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{window.detail}</p>
            </div>
          ))}
        </div>

        <ul className="mt-5 space-y-2.5">
          {copy.swaps.points.map((point, index) => (
            <li key={point} className="surface-row rounded-[0.9rem] p-3 text-sm leading-relaxed text-[var(--color-paper)]">
              <span className="mono mr-2 text-[var(--color-accent)]">{String(index + 1).padStart(2, '0')}</span>
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
