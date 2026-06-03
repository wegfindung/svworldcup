import { fetchPlayerShareTrades, type ShareTradeEvent } from './soccerverse.js'
import { bonusPercentFromNet } from './participantInfluenceSnapshot.js'
import type { ParticipantBoostPlayer } from '../domain/types.js'

// Live ownership-boost standing for the logged-in participant. Reuses the same primitives the per-fixture
// snapshot uses (fetchPlayerShareTrades + bonusPercentFromNet); the only difference is the bound: this
// counts trades from the event-link cutoff up to *now* (no kickoff bound), so it is a current-standing
// indicator, not the frozen per-fixture value. See SOP_scoring_and_leagues.md "Participant boost view".

export interface BoostDraftedPlayer {
  playerId: number
  displayName: string
  teamCode: string
  imageUrl?: string
}

// bought/sold are reported separately (the participant wants to see both); net is what drives the boost.
// computeNetInfluence returns only the net, so this summarizer splits the two sides.
export function summarizeShareTrades(trades: ShareTradeEvent[], name: string): { bought: number; sold: number; net: number } {
  let bought = 0
  let sold = 0
  for (const trade of trades) {
    if (trade.buyer === name) bought += trade.num
    if (trade.seller === name) sold += trade.num
  }
  return { bought, sold, net: Math.max(0, bought - sold) }
}

export interface BoostComputeDeps {
  fetchTrades?: typeof fetchPlayerShareTrades
}

export async function computeParticipantBoostRows(
  soccerverseUsername: string,
  cutoffUnix: number,
  players: BoostDraftedPlayer[],
  deps: BoostComputeDeps = {},
): Promise<ParticipantBoostPlayer[]> {
  const fetchTrades = deps.fetchTrades ?? fetchPlayerShareTrades
  const rows: ParticipantBoostPlayer[] = []
  // Serial on purpose: every fetch shares the global ~2.5 req/s Soccerverse gate anyway, so firing them
  // in parallel buys nothing and only widens the burst against that gate.
  for (const player of players) {
    const trades = await fetchTrades(soccerverseUsername, player.playerId, cutoffUnix)
    const { bought, sold, net } = summarizeShareTrades(trades, soccerverseUsername)
    rows.push({
      playerId: player.playerId,
      displayName: player.displayName,
      teamCode: player.teamCode,
      imageUrl: player.imageUrl,
      bought,
      sold,
      net,
      bonusPercent: bonusPercentFromNet(net),
    })
  }
  return rows
}

// Per-participant in-process cache. A cold read fans out one Soccerverse call per drafted player, so the
// view must never recompute on every load. Correctness is bounded by the short TTL + a drafted-set check
// (a squad change forces a recompute) + an explicit refresh; single-flight collapses concurrent reads for
// one participant onto a single compute.
const BOOST_CACHE_TTL_MS = 10 * 60 * 1000

interface BoostCacheEntry {
  computedAt: number
  draftedKey: string
  rows: ParticipantBoostPlayer[]
}

const cache = new Map<string, BoostCacheEntry>()
const inFlight = new Map<string, Promise<BoostCacheEntry>>()

export function draftedKeyOf(players: BoostDraftedPlayer[]): string {
  return players
    .map((player) => player.playerId)
    .sort((left, right) => left - right)
    .join(',')
}

export interface CachedBoostResult {
  computedAt: string
  players: ParticipantBoostPlayer[]
}

export async function getParticipantBoost(
  participantId: string,
  soccerverseUsername: string,
  cutoffUnix: number,
  players: BoostDraftedPlayer[],
  options: { refresh?: boolean; deps?: BoostComputeDeps } = {},
): Promise<CachedBoostResult> {
  const draftedKey = draftedKeyOf(players)
  const cached = cache.get(participantId)
  if (!options.refresh && cached && cached.draftedKey === draftedKey && Date.now() - cached.computedAt < BOOST_CACHE_TTL_MS) {
    return toResult(cached)
  }

  let pending = options.refresh ? undefined : inFlight.get(participantId)
  if (!pending) {
    pending = loadFresh(participantId, soccerverseUsername, cutoffUnix, players, draftedKey, options.deps)
    inFlight.set(participantId, pending)
    pending.finally(() => {
      if (inFlight.get(participantId) === pending) {
        inFlight.delete(participantId)
      }
    })
  }
  return toResult(await pending)
}

async function loadFresh(
  participantId: string,
  soccerverseUsername: string,
  cutoffUnix: number,
  players: BoostDraftedPlayer[],
  draftedKey: string,
  deps?: BoostComputeDeps,
): Promise<BoostCacheEntry> {
  const rows = await computeParticipantBoostRows(soccerverseUsername, cutoffUnix, players, deps ?? {})
  const entry: BoostCacheEntry = { computedAt: Date.now(), draftedKey, rows }
  cache.set(participantId, entry)
  return entry
}

function toResult(entry: BoostCacheEntry): CachedBoostResult {
  return { computedAt: new Date(entry.computedAt).toISOString(), players: entry.rows }
}

export function _resetParticipantBoostCacheForTests() {
  cache.clear()
  inFlight.clear()
}
