import { Link } from 'react-router-dom'
import type { LocaleCode } from '../lib/types'

interface PrizesPageProps {
  locale: LocaleCode
}

interface PrizeMetric {
  label: string
  value: string
  body: string
}

interface PrizeRow {
  rank: string
  prize: string
  extra?: string
}

interface LeaguePrize {
  eyebrow: string
  title: string
  share: string
  total: string
  body: string
  rows: PrizeRow[]
}

interface NationsRule {
  title: string
  body: string
}

interface PrizeCopy {
  eyebrow: string
  title: string
  body: string
  imageAlt: string
  unlockBadge: string
  metrics: PrizeMetric[]
  communityTitle: string
  communityBody: string
  leaguesEyebrow: string
  leaguesTitle: string
  leaguesBody: string
  payoutBasis: string
  leagues: LeaguePrize[]
  nationsRulesEyebrow: string
  nationsRulesTitle: string
  nationsRulesBody: string
  nationsRules: NationsRule[]
  finalNote: string
  cta: string
}

const englishCopy: PrizeCopy = {
  eyebrow: 'prizes & community unlock',
  title: '$5,000 SVV is on the line.',
  body:
    'The Grant Tournament starts with a guaranteed $2,500 prize pool paid in SVV Vouchers. If the community reaches 1,000 total participants, that pool doubles to a massive $5,000 SVV.',
  imageAlt: 'The Grant Tournament $5,000 community unlock prize pool visual',
  unlockBadge: 'Community Unlock at 1,000 participants',
  metrics: [
    {
      label: 'Guaranteed base pool',
      value: '$2,500',
      body: 'Locked from the start and paid in SVV Vouchers.',
    },
    {
      label: 'Community milestone',
      value: '1,000',
      body: 'Total participants needed to trigger the full unlock.',
    },
    {
      label: 'Unlocked prize pool',
      value: '$5,000',
      body: 'The full payout table below is based on this doubled pool.',
    },
  ],
  communityTitle: 'Share it. Recruit managers. Unlock the bigger prize pool.',
  communityBody:
    'Every new participant helps the whole event. When the community grows to 1,000 players, everyone is competing for the $5,000 SVV unlocked pool.',
  leaguesEyebrow: 'final payout map',
  leaguesTitle: 'Three races, one unlocked $5,000 pool.',
  leaguesBody:
    'The league tables below show the final distribution once the Community Unlock is reached. All amounts are paid as SVV Vouchers.',
  payoutBasis: 'Based on the $5,000 unlocked pool',
  leagues: [
    {
      eyebrow: '50% of pool',
      title: 'Veteran League',
      share: '50%',
      total: '$2,500 total',
      body: 'Established Soccerverse managers fight for the biggest individual bracket.',
      rows: [
        { rank: '1st Place', prize: '$1,000', extra: 'Shirt' },
        { rank: '2nd Place', prize: '$500', extra: 'Lanyard' },
        { rank: '3rd Place', prize: '$300', extra: 'Lanyard' },
        { rank: '4th to 10th Place', prize: '$100 each' },
      ],
    },
    {
      eyebrow: '20% of pool',
      title: 'Rookie League',
      share: '20%',
      total: '$1,000 total',
      body: 'New managers get their own prize lane and a real shot at the podium.',
      rows: [
        { rank: '1st Place', prize: '$350', extra: 'Shirt' },
        { rank: '2nd Place', prize: '$200', extra: 'Lanyard' },
        { rank: '3rd Place', prize: '$100', extra: 'Lanyard' },
        { rank: '4th to 10th Place', prize: '$50 each' },
      ],
    },
    {
      eyebrow: '30% of pool',
      title: 'Nations League',
      share: '30%',
      total: '$1,500 total',
      body: 'Represent your country. Your national leaderboard can unlock extra SVV for its best managers.',
      rows: [
        { rank: '1st Place Nation', prize: '$750' },
        { rank: '2nd Place Nation', prize: '$450' },
        { rank: '3rd Place Nation', prize: '$300' },
      ],
    },
  ],
  nationsRulesEyebrow: 'nations league rules',
  nationsRulesTitle: 'How Nations League payouts work.',
  nationsRulesBody:
    'The Nations League is built to reward strong countries without wasting prize budget when a smaller nation makes a surprise run.',
  nationsRules: [
    {
      title: 'Top 10 rule',
      body:
        'Prize money allocated to a winning nation is divided equally only among that nation’s Top 10 highest-scoring managers.',
    },
    {
      title: 'Spillover guarantee',
      body:
        'If a winning nation has fewer than 10 participating managers, the undistributed funds spill over to the next highest-ranking nation on the leaderboard, then 4th place, 5th place, and onward until the funds are fully distributed.',
    },
    {
      title: 'Minimum prize condition',
      body:
        'During spillover distribution, each individual manager payout must be at least 10 SVV. This keeps every paid share meaningful.',
    },
  ],
  finalNote:
    'The guaranteed pool is $2,500. The tables above show the full $5,000 version unlocked at 1,000 total participants.',
  cta: 'Register your squad',
}

const germanCopy: PrizeCopy = {
  ...englishCopy,
  eyebrow: 'preise & community unlock',
  title: '$5,000 SVV stehen auf dem Spiel.',
  body:
    'The Grant Tournament startet mit einem garantierten Preispool von $2,500, ausgezahlt in SVV Vouchers. Wenn die Community 1,000 Teilnehmer erreicht, verdoppelt sich der Pool auf massive $5,000 SVV.',
  unlockBadge: 'Community Unlock bei 1,000 Teilnehmern',
  metrics: [
    {
      label: 'Garantierter Basis-Pool',
      value: '$2,500',
      body: 'Von Beginn an garantiert und in SVV Vouchers ausgezahlt.',
    },
    {
      label: 'Community-Milestone',
      value: '1,000',
      body: 'So viele Teilnehmer braucht es für den vollen Unlock.',
    },
    {
      label: 'Freigeschalteter Preispool',
      value: '$5,000',
      body: 'Die Auszahlungstabellen unten basieren auf diesem verdoppelten Pool.',
    },
  ],
  communityTitle: 'Teilen. Manager rekrutieren. Den größeren Preispool freischalten.',
  communityBody:
    'Jeder neue Teilnehmer hilft dem ganzen Event. Wenn die Community auf 1,000 Spieler wächst, kämpfen alle um den freigeschalteten $5,000 SVV Pool.',
  leaguesEyebrow: 'finale auszahlung',
  leaguesTitle: 'Drei Wettbewerbe, ein freigeschalteter $5,000 Pool.',
  leaguesBody:
    'Die Tabellen unten zeigen die finale Verteilung, sobald der Community Unlock erreicht ist. Alle Beträge werden als SVV Vouchers ausgezahlt.',
  payoutBasis: 'Basierend auf dem freigeschalteten $5,000 Pool',
  leagues: [
    {
      eyebrow: '50% des Pools',
      title: 'Veteran League',
      share: '50%',
      total: '$2,500 gesamt',
      body: 'Erfahrene Soccerverse-Manager spielen im größten Individual-Bracket.',
      rows: [
        { rank: '1. Platz', prize: '$1,000', extra: 'Shirt' },
        { rank: '2. Platz', prize: '$500', extra: 'Lanyard' },
        { rank: '3. Platz', prize: '$300', extra: 'Lanyard' },
        { rank: '4. bis 10. Platz', prize: '$100 jeweils' },
      ],
    },
    {
      eyebrow: '20% des Pools',
      title: 'Rookie League',
      share: '20%',
      total: '$1,000 gesamt',
      body: 'Neue Manager bekommen ihre eigene Prize Lane und eine echte Chance aufs Podium.',
      rows: [
        { rank: '1. Platz', prize: '$350', extra: 'Shirt' },
        { rank: '2. Platz', prize: '$200', extra: 'Lanyard' },
        { rank: '3. Platz', prize: '$100', extra: 'Lanyard' },
        { rank: '4. bis 10. Platz', prize: '$50 jeweils' },
      ],
    },
    {
      eyebrow: '30% des Pools',
      title: 'Nations League',
      share: '30%',
      total: '$1,500 gesamt',
      body: 'Repräsentiere dein Land. Dein National-Leaderboard kann extra SVV für seine besten Manager freischalten.',
      rows: [
        { rank: 'Nation auf Platz 1', prize: '$750' },
        { rank: 'Nation auf Platz 2', prize: '$450' },
        { rank: 'Nation auf Platz 3', prize: '$300' },
      ],
    },
  ],
  nationsRulesEyebrow: 'nations league regeln',
  nationsRulesTitle: 'So funktionieren Nations-League-Auszahlungen.',
  nationsRulesBody:
    'Die Nations League belohnt starke Länder, ohne Preisbudget zu verlieren, wenn eine kleinere Nation überraschend weit oben landet.',
  nationsRules: [
    {
      title: 'Top-10-Regel',
      body:
        'Das Preisgeld einer Gewinner-Nation wird ausschließlich gleichmäßig unter den Top 10 bestplatzierten Managern dieser Nation verteilt.',
    },
    {
      title: 'Spillover-Garantie',
      body:
        'Hat eine Gewinner-Nation weniger als 10 teilnehmende Manager, wandert das nicht verteilte Budget zur nächsthöher platzierten Nation auf dem Leaderboard, danach zu Platz 4, Platz 5 und weiter, bis die Mittel vollständig verteilt sind.',
    },
    {
      title: 'Mindestpreis-Bedingung',
      body:
        'Bei der Spillover-Verteilung muss jede individuelle Auszahlung mindestens 10 SVV betragen. So bleibt jeder ausgezahlte Anteil relevant.',
    },
  ],
  finalNote:
    'Der garantierte Pool beträgt $2,500. Die Tabellen oben zeigen die volle $5,000-Version, die bei 1,000 Gesamtteilnehmern freigeschaltet wird.',
  cta: 'Kader registrieren',
}

const spanishCopy: PrizeCopy = {
  ...englishCopy,
  eyebrow: 'premios & community unlock',
  title: '$5,000 SVV en juego.',
  body:
    'The Grant Tournament empieza con un prize pool garantizado de $2,500, pagado en SVV Vouchers. Si la comunidad llega a 1,000 participantes totales, ese pool se duplica hasta unos enormes $5,000 SVV.',
  unlockBadge: 'Community Unlock con 1,000 participantes',
  metrics: [
    {
      label: 'Pool base garantizado',
      value: '$2,500',
      body: 'Bloqueado desde el inicio y pagado en SVV Vouchers.',
    },
    {
      label: 'Milestone comunitario',
      value: '1,000',
      body: 'Participantes totales necesarios para activar el unlock completo.',
    },
    {
      label: 'Prize pool desbloqueado',
      value: '$5,000',
      body: 'La tabla de pagos completa de abajo se basa en este pool duplicado.',
    },
  ],
  communityTitle: 'Comparte. Recluta managers. Desbloquea el prize pool grande.',
  communityBody:
    'Cada nuevo participante ayuda a todo el evento. Cuando la comunidad llegue a 1,000 jugadores, todos competirán por el pool desbloqueado de $5,000 SVV.',
  leaguesEyebrow: 'mapa final de pagos',
  leaguesTitle: 'Tres carreras, un pool desbloqueado de $5,000.',
  leaguesBody:
    'Las tablas de ligas muestran la distribución final cuando se alcance el Community Unlock. Todos los importes se pagan como SVV Vouchers.',
  payoutBasis: 'Basado en el pool desbloqueado de $5,000',
  leagues: [
    {
      eyebrow: '50% del pool',
      title: 'Veteran League',
      share: '50%',
      total: '$2,500 total',
      body: 'Managers experimentados de Soccerverse compiten en el bracket individual más grande.',
      rows: [
        { rank: '1.er puesto', prize: '$1,000', extra: 'Shirt' },
        { rank: '2.º puesto', prize: '$500', extra: 'Lanyard' },
        { rank: '3.er puesto', prize: '$300', extra: 'Lanyard' },
        { rank: '4.º a 10.º puesto', prize: '$100 cada uno' },
      ],
    },
    {
      eyebrow: '20% del pool',
      title: 'Rookie League',
      share: '20%',
      total: '$1,000 total',
      body: 'Los nuevos managers tienen su propia vía de premios y una oportunidad real de podio.',
      rows: [
        { rank: '1.er puesto', prize: '$350', extra: 'Shirt' },
        { rank: '2.º puesto', prize: '$200', extra: 'Lanyard' },
        { rank: '3.er puesto', prize: '$100', extra: 'Lanyard' },
        { rank: '4.º a 10.º puesto', prize: '$50 cada uno' },
      ],
    },
    {
      eyebrow: '30% del pool',
      title: 'Nations League',
      share: '30%',
      total: '$1,500 total',
      body: 'Representa a tu país. Tu ranking nacional puede desbloquear SVV extra para sus mejores managers.',
      rows: [
        { rank: 'Nación en 1.er puesto', prize: '$750' },
        { rank: 'Nación en 2.º puesto', prize: '$450' },
        { rank: 'Nación en 3.er puesto', prize: '$300' },
      ],
    },
  ],
  nationsRulesEyebrow: 'reglas nations league',
  nationsRulesTitle: 'Cómo funcionan los pagos de Nations League.',
  nationsRulesBody:
    'La Nations League premia a los países fuertes sin desperdiciar presupuesto cuando una nación más pequeña sorprende en la clasificación.',
  nationsRules: [
    {
      title: 'Regla Top 10',
      body:
        'El premio asignado a una nación ganadora se divide por igual solo entre los Top 10 managers con más puntos de esa nación.',
    },
    {
      title: 'Garantía spillover',
      body:
        'Si una nación ganadora tiene menos de 10 managers participantes, los fondos no distribuidos pasan a la siguiente nación mejor clasificada, luego al 4.º puesto, 5.º puesto y así sucesivamente hasta distribuirlo todo.',
    },
    {
      title: 'Condición de premio mínimo',
      body:
        'Durante el spillover, cada pago individual debe ser de al menos 10 SVV. Así cada parte pagada sigue siendo significativa.',
    },
  ],
  finalNote:
    'El pool garantizado es de $2,500. Las tablas muestran la versión completa de $5,000 desbloqueada al llegar a 1,000 participantes totales.',
  cta: 'Registrar plantilla',
}

const italianCopy: PrizeCopy = {
  ...englishCopy,
  eyebrow: 'premi & community unlock',
  title: '$5,000 SVV in palio.',
  body:
    'The Grant Tournament parte con un prize pool garantito di $2,500, pagato in SVV Vouchers. Se la community raggiunge 1,000 partecipanti totali, il pool raddoppia fino a un enorme $5,000 SVV.',
  unlockBadge: 'Community Unlock a 1,000 partecipanti',
  metrics: [
    {
      label: 'Pool base garantito',
      value: '$2,500',
      body: 'Garantito fin dall’inizio e pagato in SVV Vouchers.',
    },
    {
      label: 'Milestone community',
      value: '1,000',
      body: 'Partecipanti totali necessari per attivare l’unlock completo.',
    },
    {
      label: 'Prize pool sbloccato',
      value: '$5,000',
      body: 'La tabella completa dei payout qui sotto si basa su questo pool raddoppiato.',
    },
  ],
  communityTitle: 'Condividi. Porta nuovi manager. Sblocca il prize pool più grande.',
  communityBody:
    'Ogni nuovo partecipante aiuta tutto l’evento. Quando la community arriva a 1,000 giocatori, tutti competono per il pool sbloccato da $5,000 SVV.',
  leaguesEyebrow: 'mappa payout finale',
  leaguesTitle: 'Tre classifiche, un pool sbloccato da $5,000.',
  leaguesBody:
    'Le tabelle qui sotto mostrano la distribuzione finale quando viene raggiunto il Community Unlock. Tutti gli importi sono pagati come SVV Vouchers.',
  payoutBasis: 'Basato sul pool sbloccato da $5,000',
  leagues: [
    {
      eyebrow: '50% del pool',
      title: 'Veteran League',
      share: '50%',
      total: '$2,500 totali',
      body: 'I manager Soccerverse più esperti competono nel bracket individuale più grande.',
      rows: [
        { rank: '1° posto', prize: '$1,000', extra: 'Shirt' },
        { rank: '2° posto', prize: '$500', extra: 'Lanyard' },
        { rank: '3° posto', prize: '$300', extra: 'Lanyard' },
        { rank: '4°-10° posto', prize: '$100 ciascuno' },
      ],
    },
    {
      eyebrow: '20% del pool',
      title: 'Rookie League',
      share: '20%',
      total: '$1,000 totali',
      body: 'I nuovi manager hanno una corsia premi dedicata e una vera possibilità di podio.',
      rows: [
        { rank: '1° posto', prize: '$350', extra: 'Shirt' },
        { rank: '2° posto', prize: '$200', extra: 'Lanyard' },
        { rank: '3° posto', prize: '$100', extra: 'Lanyard' },
        { rank: '4°-10° posto', prize: '$50 ciascuno' },
      ],
    },
    {
      eyebrow: '30% del pool',
      title: 'Nations League',
      share: '30%',
      total: '$1,500 totali',
      body: 'Rappresenta il tuo paese. La classifica nazionale può sbloccare SVV extra per i suoi migliori manager.',
      rows: [
        { rank: 'Nazione 1ª classificata', prize: '$750' },
        { rank: 'Nazione 2ª classificata', prize: '$450' },
        { rank: 'Nazione 3ª classificata', prize: '$300' },
      ],
    },
  ],
  nationsRulesEyebrow: 'regole nations league',
  nationsRulesTitle: 'Come funzionano i payout della Nations League.',
  nationsRulesBody:
    'La Nations League premia i paesi forti senza sprecare budget quando una nazione più piccola sorprende in classifica.',
  nationsRules: [
    {
      title: 'Regola Top 10',
      body:
        'Il premio assegnato a una nazione vincente viene diviso in parti uguali solo tra i Top 10 manager con più punti di quella nazione.',
    },
    {
      title: 'Garanzia spillover',
      body:
        'Se una nazione vincente ha meno di 10 manager partecipanti, i fondi non distribuiti passano alla nazione successiva in classifica, poi al 4° posto, 5° posto e così via finché il budget è distribuito.',
    },
    {
      title: 'Condizione premio minimo',
      body:
        'Durante lo spillover, ogni payout individuale deve essere almeno 10 SVV. Così ogni quota pagata resta significativa.',
    },
  ],
  finalNote:
    'Il pool garantito è di $2,500. Le tabelle mostrano la versione completa da $5,000 sbloccata a 1,000 partecipanti totali.',
  cta: 'Registra la rosa',
}

const frenchCopy: PrizeCopy = {
  ...englishCopy,
  eyebrow: 'prix & community unlock',
  title: '$5,000 SVV en jeu.',
  body:
    'The Grant Tournament démarre avec un prize pool garanti de $2,500, payé en SVV Vouchers. Si la communauté atteint 1,000 participants au total, ce pool double pour atteindre un énorme $5,000 SVV.',
  unlockBadge: 'Community Unlock à 1,000 participants',
  metrics: [
    {
      label: 'Pool de base garanti',
      value: '$2,500',
      body: 'Garanti dès le départ et payé en SVV Vouchers.',
    },
    {
      label: 'Palier communautaire',
      value: '1,000',
      body: 'Participants totaux nécessaires pour déclencher l’unlock complet.',
    },
    {
      label: 'Prize pool débloqué',
      value: '$5,000',
      body: 'La table complète des paiements ci-dessous est basée sur ce pool doublé.',
    },
  ],
  communityTitle: 'Partage. Recrute des managers. Débloque le plus gros prize pool.',
  communityBody:
    'Chaque nouveau participant aide tout l’événement. Quand la communauté atteint 1,000 joueurs, tout le monde joue pour le pool débloqué de $5,000 SVV.',
  leaguesEyebrow: 'carte finale des paiements',
  leaguesTitle: 'Trois courses, un pool débloqué de $5,000.',
  leaguesBody:
    'Les tableaux ci-dessous montrent la distribution finale une fois le Community Unlock atteint. Tous les montants sont payés en SVV Vouchers.',
  payoutBasis: 'Basé sur le pool débloqué de $5,000',
  leagues: [
    {
      eyebrow: '50% du pool',
      title: 'Veteran League',
      share: '50%',
      total: '$2,500 au total',
      body: 'Les managers Soccerverse établis se battent dans le plus grand bracket individuel.',
      rows: [
        { rank: '1re place', prize: '$1,000', extra: 'Shirt' },
        { rank: '2e place', prize: '$500', extra: 'Lanyard' },
        { rank: '3e place', prize: '$300', extra: 'Lanyard' },
        { rank: '4e à 10e place', prize: '$100 chacun' },
      ],
    },
    {
      eyebrow: '20% du pool',
      title: 'Rookie League',
      share: '20%',
      total: '$1,000 au total',
      body: 'Les nouveaux managers ont leur propre voie de prix et une vraie chance de podium.',
      rows: [
        { rank: '1re place', prize: '$350', extra: 'Shirt' },
        { rank: '2e place', prize: '$200', extra: 'Lanyard' },
        { rank: '3e place', prize: '$100', extra: 'Lanyard' },
        { rank: '4e à 10e place', prize: '$50 chacun' },
      ],
    },
    {
      eyebrow: '30% du pool',
      title: 'Nations League',
      share: '30%',
      total: '$1,500 au total',
      body: 'Représente ton pays. Ton classement national peut débloquer des SVV supplémentaires pour ses meilleurs managers.',
      rows: [
        { rank: 'Nation 1re place', prize: '$750' },
        { rank: 'Nation 2e place', prize: '$450' },
        { rank: 'Nation 3e place', prize: '$300' },
      ],
    },
  ],
  nationsRulesEyebrow: 'règles nations league',
  nationsRulesTitle: 'Comment fonctionnent les paiements Nations League.',
  nationsRulesBody:
    'La Nations League récompense les pays forts sans perdre de budget quand une petite nation crée la surprise.',
  nationsRules: [
    {
      title: 'Règle du Top 10',
      body:
        'Le prix attribué à une nation gagnante est partagé équitablement uniquement entre les Top 10 managers les mieux classés de cette nation.',
    },
    {
      title: 'Garantie spillover',
      body:
        'Si une nation gagnante compte moins de 10 managers participants, les fonds non distribués passent à la nation suivante au classement, puis à la 4e, 5e, et ainsi de suite jusqu’à distribution complète.',
    },
    {
      title: 'Prix minimum',
      body:
        'Pendant le spillover, chaque paiement individuel doit être d’au moins 10 SVV. Cela garde chaque part payée significative.',
    },
  ],
  finalNote:
    'Le pool garanti est de $2,500. Les tableaux ci-dessus montrent la version complète de $5,000 débloquée à 1,000 participants au total.',
  cta: 'Inscrire ton effectif',
}

const portugueseCopy: PrizeCopy = {
  ...englishCopy,
  eyebrow: 'prémios & community unlock',
  title: '$5,000 SVV em jogo.',
  body:
    'The Grant Tournament começa com um prize pool garantido de $2,500, pago em SVV Vouchers. Se a comunidade chegar a 1,000 participantes no total, esse pool duplica para enormes $5,000 SVV.',
  unlockBadge: 'Community Unlock aos 1,000 participantes',
  metrics: [
    {
      label: 'Pool base garantido',
      value: '$2,500',
      body: 'Garantido desde o início e pago em SVV Vouchers.',
    },
    {
      label: 'Marco comunitário',
      value: '1,000',
      body: 'Total de participantes necessário para ativar o unlock completo.',
    },
    {
      label: 'Prize pool desbloqueado',
      value: '$5,000',
      body: 'A tabela completa de pagamentos abaixo baseia-se neste pool duplicado.',
    },
  ],
  communityTitle: 'Partilha. Recruta managers. Desbloqueia o prize pool maior.',
  communityBody:
    'Cada novo participante ajuda todo o evento. Quando a comunidade chegar a 1,000 jogadores, todos competem pelo pool desbloqueado de $5,000 SVV.',
  leaguesEyebrow: 'mapa final de pagamentos',
  leaguesTitle: 'Três corridas, um pool desbloqueado de $5,000.',
  leaguesBody:
    'As tabelas abaixo mostram a distribuição final quando o Community Unlock for atingido. Todos os valores são pagos em SVV Vouchers.',
  payoutBasis: 'Baseado no pool desbloqueado de $5,000',
  leagues: [
    {
      eyebrow: '50% do pool',
      title: 'Veteran League',
      share: '50%',
      total: '$2,500 total',
      body: 'Managers experientes de Soccerverse competem no maior bracket individual.',
      rows: [
        { rank: '1.º lugar', prize: '$1,000', extra: 'Shirt' },
        { rank: '2.º lugar', prize: '$500', extra: 'Lanyard' },
        { rank: '3.º lugar', prize: '$300', extra: 'Lanyard' },
        { rank: '4.º a 10.º lugar', prize: '$100 cada' },
      ],
    },
    {
      eyebrow: '20% do pool',
      title: 'Rookie League',
      share: '20%',
      total: '$1,000 total',
      body: 'Novos managers têm a sua própria faixa de prémios e uma verdadeira hipótese de pódio.',
      rows: [
        { rank: '1.º lugar', prize: '$350', extra: 'Shirt' },
        { rank: '2.º lugar', prize: '$200', extra: 'Lanyard' },
        { rank: '3.º lugar', prize: '$100', extra: 'Lanyard' },
        { rank: '4.º a 10.º lugar', prize: '$50 cada' },
      ],
    },
    {
      eyebrow: '30% do pool',
      title: 'Nations League',
      share: '30%',
      total: '$1,500 total',
      body: 'Representa o teu país. A tua classificação nacional pode desbloquear SVV extra para os melhores managers.',
      rows: [
        { rank: 'Nação em 1.º lugar', prize: '$750' },
        { rank: 'Nação em 2.º lugar', prize: '$450' },
        { rank: 'Nação em 3.º lugar', prize: '$300' },
      ],
    },
  ],
  nationsRulesEyebrow: 'regras nations league',
  nationsRulesTitle: 'Como funcionam os pagamentos da Nations League.',
  nationsRulesBody:
    'A Nations League recompensa países fortes sem desperdiçar orçamento quando uma nação mais pequena surpreende na classificação.',
  nationsRules: [
    {
      title: 'Regra Top 10',
      body:
        'O prémio atribuído a uma nação vencedora é dividido igualmente apenas pelos Top 10 managers com maior pontuação dessa nação.',
    },
    {
      title: 'Garantia spillover',
      body:
        'Se uma nação vencedora tiver menos de 10 managers participantes, os fundos não distribuídos passam para a próxima nação mais bem classificada, depois para o 4.º lugar, 5.º lugar e assim sucessivamente até tudo ser distribuído.',
    },
    {
      title: 'Condição de prémio mínimo',
      body:
        'Durante o spillover, cada pagamento individual deve ser de pelo menos 10 SVV. Assim cada quota paga continua relevante.',
    },
  ],
  finalNote:
    'O pool garantido é de $2,500. As tabelas acima mostram a versão completa de $5,000 desbloqueada aos 1,000 participantes totais.',
  cta: 'Registar plantel',
}

const russianCopy: PrizeCopy = {
  ...englishCopy,
  eyebrow: 'призы & community unlock',
  title: '$5,000 SVV на кону.',
  body:
    'The Grant Tournament стартует с гарантированным призовым фондом $2,500, выплачиваемым в SVV Vouchers. Если сообщество достигнет 1,000 участников, фонд удвоится до крупных $5,000 SVV.',
  unlockBadge: 'Community Unlock при 1,000 участниках',
  metrics: [
    {
      label: 'Гарантированный базовый фонд',
      value: '$2,500',
      body: 'Зафиксирован с самого начала и выплачивается в SVV Vouchers.',
    },
    {
      label: 'Цель сообщества',
      value: '1,000',
      body: 'Общее число участников, нужное для полного unlock.',
    },
    {
      label: 'Разблокированный призовой фонд',
      value: '$5,000',
      body: 'Полная таблица выплат ниже основана на этом удвоенном фонде.',
    },
  ],
  communityTitle: 'Делись. Приглашай менеджеров. Открой больший призовой фонд.',
  communityBody:
    'Каждый новый участник помогает всему событию. Когда сообщество вырастет до 1,000 игроков, все будут бороться за разблокированный фонд $5,000 SVV.',
  leaguesEyebrow: 'финальная карта выплат',
  leaguesTitle: 'Три гонки, один разблокированный фонд $5,000.',
  leaguesBody:
    'Таблицы ниже показывают финальное распределение после достижения Community Unlock. Все суммы выплачиваются как SVV Vouchers.',
  payoutBasis: 'На основе разблокированного фонда $5,000',
  leagues: [
    {
      eyebrow: '50% фонда',
      title: 'Veteran League',
      share: '50%',
      total: '$2,500 всего',
      body: 'Опытные менеджеры Soccerverse борются в крупнейшем индивидуальном зачете.',
      rows: [
        { rank: '1-е место', prize: '$1,000', extra: 'Shirt' },
        { rank: '2-е место', prize: '$500', extra: 'Lanyard' },
        { rank: '3-е место', prize: '$300', extra: 'Lanyard' },
        { rank: '4-10-е место', prize: '$100 каждому' },
      ],
    },
    {
      eyebrow: '20% фонда',
      title: 'Rookie League',
      share: '20%',
      total: '$1,000 всего',
      body: 'Новые менеджеры получают отдельную призовую гонку и реальный шанс на подиум.',
      rows: [
        { rank: '1-е место', prize: '$350', extra: 'Shirt' },
        { rank: '2-е место', prize: '$200', extra: 'Lanyard' },
        { rank: '3-е место', prize: '$100', extra: 'Lanyard' },
        { rank: '4-10-е место', prize: '$50 каждому' },
      ],
    },
    {
      eyebrow: '30% фонда',
      title: 'Nations League',
      share: '30%',
      total: '$1,500 всего',
      body: 'Представляй свою страну. Национальный рейтинг может открыть дополнительные SVV для лучших менеджеров.',
      rows: [
        { rank: 'Нация на 1-м месте', prize: '$750' },
        { rank: 'Нация на 2-м месте', prize: '$450' },
        { rank: 'Нация на 3-м месте', prize: '$300' },
      ],
    },
  ],
  nationsRulesEyebrow: 'правила nations league',
  nationsRulesTitle: 'Как работают выплаты Nations League.',
  nationsRulesBody:
    'Nations League награждает сильные страны и не теряет бюджет, если небольшая нация неожиданно поднимается высоко.',
  nationsRules: [
    {
      title: 'Правило Top 10',
      body:
        'Призовые, выделенные победившей нации, делятся поровну только между Top 10 менеджерами этой нации по очкам.',
    },
    {
      title: 'Гарантия spillover',
      body:
        'Если у победившей нации меньше 10 участвующих менеджеров, нераспределенные средства переходят следующей нации в рейтинге, затем 4-му месту, 5-му месту и далее, пока фонд не будет полностью распределен.',
    },
    {
      title: 'Минимальная выплата',
      body:
        'При spillover каждая индивидуальная выплата должна быть минимум 10 SVV. Так каждая выплаченная доля остается значимой.',
    },
  ],
  finalNote:
    'Гарантированный фонд составляет $2,500. Таблицы выше показывают полную версию $5,000, разблокируемую при 1,000 участниках.',
  cta: 'Зарегистрировать состав',
}

const chineseCopy: PrizeCopy = {
  ...englishCopy,
  eyebrow: '奖品 & community unlock',
  title: '$5,000 SVV 等你来争。',
  body:
    'The Grant Tournament 初始保证 prize pool 为 $2,500，并以 SVV Vouchers 支付。如果社区总参与人数达到 1,000，奖池将翻倍至巨大的 $5,000 SVV。',
  unlockBadge: '1,000 名参与者触发 Community Unlock',
  metrics: [
    {
      label: '保证基础奖池',
      value: '$2,500',
      body: '从一开始就锁定，并以 SVV Vouchers 支付。',
    },
    {
      label: '社区里程碑',
      value: '1,000',
      body: '触发完整 unlock 所需的总参与人数。',
    },
    {
      label: '解锁后奖池',
      value: '$5,000',
      body: '下方完整 payout 表基于这个翻倍后的奖池。',
    },
  ],
  communityTitle: '分享活动。邀请经理。解锁更大的 prize pool。',
  communityBody:
    '每一位新参与者都会帮助整个活动。当社区达到 1,000 名玩家时，所有人都将争夺 $5,000 SVV 的解锁奖池。',
  leaguesEyebrow: '最终 payout 地图',
  leaguesTitle: '三条赛道，一个解锁的 $5,000 奖池。',
  leaguesBody:
    '下方联赛表展示 Community Unlock 达成后的最终分配。所有金额均以 SVV Vouchers 支付。',
  payoutBasis: '基于解锁后的 $5,000 奖池',
  leagues: [
    {
      eyebrow: '奖池 50%',
      title: 'Veteran League',
      share: '50%',
      total: '总计 $2,500',
      body: '成熟的 Soccerverse managers 将争夺最大的个人组别。',
      rows: [
        { rank: '第 1 名', prize: '$1,000', extra: 'Shirt' },
        { rank: '第 2 名', prize: '$500', extra: 'Lanyard' },
        { rank: '第 3 名', prize: '$300', extra: 'Lanyard' },
        { rank: '第 4 至第 10 名', prize: '每人 $100' },
      ],
    },
    {
      eyebrow: '奖池 20%',
      title: 'Rookie League',
      share: '20%',
      total: '总计 $1,000',
      body: '新 managers 拥有自己的奖品赛道，也有真正登上领奖台的机会。',
      rows: [
        { rank: '第 1 名', prize: '$350', extra: 'Shirt' },
        { rank: '第 2 名', prize: '$200', extra: 'Lanyard' },
        { rank: '第 3 名', prize: '$100', extra: 'Lanyard' },
        { rank: '第 4 至第 10 名', prize: '每人 $50' },
      ],
    },
    {
      eyebrow: '奖池 30%',
      title: 'Nations League',
      share: '30%',
      total: '总计 $1,500',
      body: '代表你的国家。你的国家排行榜可以为最佳 managers 解锁额外 SVV。',
      rows: [
        { rank: '第 1 名国家', prize: '$750' },
        { rank: '第 2 名国家', prize: '$450' },
        { rank: '第 3 名国家', prize: '$300' },
      ],
    },
  ],
  nationsRulesEyebrow: 'nations league 规则',
  nationsRulesTitle: 'Nations League payout 如何运作。',
  nationsRulesBody:
    'Nations League 既奖励强国，也确保小国家爆冷时奖池预算不会浪费。',
  nationsRules: [
    {
      title: 'Top 10 规则',
      body:
        '分配给获胜国家的奖金只会平均分给该国家积分最高的 Top 10 managers。',
    },
    {
      title: 'Spillover 保证',
      body:
        '如果获胜国家少于 10 名参赛 managers，未分配资金会流向排行榜上的下一个最高国家，然后是第 4、第 5，依次继续，直到全部资金分配完毕。',
    },
    {
      title: '最低奖金条件',
      body:
        '在 spillover 分配中，每位 manager 的个人 payout 必须至少为 10 SVV，确保每一份奖金都有实际意义。',
    },
  ],
  finalNote:
    '保证奖池为 $2,500。上方表格展示总参与人数达到 1,000 后解锁的完整 $5,000 版本。',
  cta: '注册阵容',
}

const japaneseCopy: PrizeCopy = {
  ...englishCopy,
  eyebrow: 'prizes & community unlock',
  title: '$5,000 SVV が懸かっています。',
  body:
    'The Grant Tournament は、SVV Vouchers で支払われる保証 prize pool $2,500 から始まります。コミュニティ全体で 1,000 参加者に到達すると、その pool は巨大な $5,000 SVV へ倍増します。',
  unlockBadge: '1,000 参加者で Community Unlock',
  metrics: [
    {
      label: '保証ベース pool',
      value: '$2,500',
      body: '開始時点から確定し、SVV Vouchers で支払われます。',
    },
    {
      label: 'コミュニティ milestone',
      value: '1,000',
      body: 'フル unlock を発動するために必要な総参加者数です。',
    },
    {
      label: 'Unlock 後 prize pool',
      value: '$5,000',
      body: '下の payout 表は、この倍増した pool を基準にしています。',
    },
  ],
  communityTitle: 'シェアしよう。Manager を呼ぼう。大きな prize pool を解放しよう。',
  communityBody:
    '新しい参加者が増えるほど、イベント全体が強くなります。コミュニティが 1,000 プレイヤーに到達すると、全員が $5,000 SVV の unlock pool を争います。',
  leaguesEyebrow: 'final payout map',
  leaguesTitle: '3つのレース、1つの unlock 済み $5,000 pool。',
  leaguesBody:
    '下の league tables は Community Unlock 到達後の最終配分です。すべての金額は SVV Vouchers で支払われます。',
  payoutBasis: '$5,000 unlock pool ベース',
  leagues: [
    {
      eyebrow: 'pool の 50%',
      title: 'Veteran League',
      share: '50%',
      total: '$2,500 合計',
      body: '経験ある Soccerverse managers が最大の個人 bracket で戦います。',
      rows: [
        { rank: '1位', prize: '$1,000', extra: 'Shirt' },
        { rank: '2位', prize: '$500', extra: 'Lanyard' },
        { rank: '3位', prize: '$300', extra: 'Lanyard' },
        { rank: '4位から10位', prize: '各 $100' },
      ],
    },
    {
      eyebrow: 'pool の 20%',
      title: 'Rookie League',
      share: '20%',
      total: '$1,000 合計',
      body: '新しい managers には専用の prize lane と、表彰台を狙える本物のチャンスがあります。',
      rows: [
        { rank: '1位', prize: '$350', extra: 'Shirt' },
        { rank: '2位', prize: '$200', extra: 'Lanyard' },
        { rank: '3位', prize: '$100', extra: 'Lanyard' },
        { rank: '4位から10位', prize: '各 $50' },
      ],
    },
    {
      eyebrow: 'pool の 30%',
      title: 'Nations League',
      share: '30%',
      total: '$1,500 合計',
      body: '自分の国を代表しましょう。国別 leaderboard は、上位 managers に追加 SVV を unlock できます。',
      rows: [
        { rank: '1位の Nation', prize: '$750' },
        { rank: '2位の Nation', prize: '$450' },
        { rank: '3位の Nation', prize: '$300' },
      ],
    },
  ],
  nationsRulesEyebrow: 'nations league rules',
  nationsRulesTitle: 'Nations League payout の仕組み。',
  nationsRulesBody:
    'Nations League は強い国を報酬で評価しつつ、小さな国がサプライズを起こしても prize budget が無駄にならない設計です。',
  nationsRules: [
    {
      title: 'Top 10 ルール',
      body:
        '勝利した nation に割り当てられた prize money は、その nation の最高得点 Top 10 managers のみに均等配分されます。',
    },
    {
      title: 'Spillover 保証',
      body:
        '勝利した nation の参加 managers が 10 人未満の場合、未配分の資金は leaderboard 上の次の上位 nation、その後 4位、5位へと流れ、資金がすべて配分されるまで続きます。',
    },
    {
      title: '最低 prize 条件',
      body:
        'Spillover 配分では、個々の manager payout は最低 10 SVV でなければなりません。これにより、すべての支払いが意味のある額になります。',
    },
  ],
  finalNote:
    '保証 pool は $2,500 です。上の表は、総参加者 1,000 到達時に unlock されるフル $5,000 版を示しています。',
  cta: 'スカッドを登録',
}

const copyByLocale: Partial<Record<LocaleCode, PrizeCopy>> = {
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

function getPrizeCopy(locale: LocaleCode) {
  return copyByLocale[locale] ?? englishCopy
}

export function PrizesPage({ locale }: PrizesPageProps) {
  const copy = getPrizeCopy(locale)

  return (
    <div className="space-y-4 pb-10">
      <section className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="hero-card overflow-hidden rounded-[1.25rem] p-3 sm:p-4">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[0.95rem] border border-white/10 bg-black/24">
            <img
              src="/prizes/prizes_pool.webp"
              alt={copy.imageAlt}
              width={593}
              height={850}
              className="h-full w-full object-cover object-top"
            />
            <div className="absolute left-[27%] right-[19%] top-[46%] grid min-h-7 place-items-center rounded-full border border-[var(--color-accent)]/25 bg-[rgba(7,16,14,0.9)] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm">
              <p className="mono text-center text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-paper)] sm:text-[10px]">
                The Grant Tournament
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-[0.9rem] border border-[var(--color-accent)]/25 bg-[rgba(7,16,14,0.86)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-accent)]">{copy.unlockBadge}</p>
          </div>
        </div>

        <article className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="section-title mt-5 max-w-[12ch] text-white">{copy.title}</h1>
          <p className="mt-5 max-w-[64ch] text-base leading-relaxed text-[var(--color-muted)]">{copy.body}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {copy.metrics.map((metric) => (
              <div key={metric.label} className="surface-row rounded-[0.95rem] p-4">
                <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{metric.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-white">{metric.value}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{metric.body}</p>
              </div>
            ))}
          </div>
          <Link to="/register" className="premium-button mt-6 px-6 py-3 text-sm font-semibold">
            {copy.cta}
          </Link>
        </article>
      </section>

      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div>
            <p className="eyebrow">community unlock</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{copy.communityTitle}</h2>
          </div>
          <p className="text-base leading-relaxed text-[var(--color-muted)]">{copy.communityBody}</p>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full border border-white/10 bg-black/24">
          <div className="h-full w-full rounded-full bg-[linear-gradient(90deg,var(--color-accent),var(--color-sand))]" />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
          <span>$2,500</span>
          <span className="text-[var(--color-accent)]">1,000</span>
          <span>$5,000</span>
        </div>
      </section>

      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{copy.leaguesEyebrow}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{copy.leaguesTitle}</h2>
            <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.leaguesBody}</p>
          </div>
          <span className="mono rounded-full border border-[var(--color-sand)]/25 bg-[var(--color-sand)]/10 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[var(--color-sand)]">
            {copy.payoutBasis}
          </span>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {copy.leagues.map((league) => (
            <article key={league.title} className="rounded-[1.05rem] border border-white/10 bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{league.eyebrow}</p>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">{league.title}</h3>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-[var(--color-accent)]">{league.share}</p>
                  <p className="mono mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{league.total}</p>
                </div>
              </div>
              <p className="mt-4 min-h-[3.8rem] text-sm leading-relaxed text-[var(--color-muted)]">{league.body}</p>
              <div className="mt-5 space-y-2.5">
                {league.rows.map((row) => (
                  <div key={row.rank} className="surface-row rounded-[0.85rem] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{row.rank}</p>
                        {row.extra ? <p className="mt-1 text-xs font-semibold text-[var(--color-sand)]">{row.extra}</p> : null}
                      </div>
                      <p className="text-right text-lg font-bold text-white">{row.prize}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="hero-card rounded-[1.25rem] p-5 sm:p-6">
          <p className="eyebrow">{copy.nationsRulesEyebrow}</p>
          <h2 className="section-title mt-4 max-w-[12ch] text-white">{copy.nationsRulesTitle}</h2>
          <p className="mt-5 text-base leading-relaxed text-[var(--color-muted)]">{copy.nationsRulesBody}</p>
        </article>

        <div className="grid gap-3">
          {copy.nationsRules.map((rule, index) => (
            <article key={rule.title} className="surface-row rounded-[1rem] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="mono mt-1 text-[var(--color-accent)]">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-white">{rule.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{rule.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <p className="mx-auto max-w-3xl text-center text-sm leading-relaxed text-[var(--color-muted)]">{copy.finalNote}</p>
    </div>
  )
}
