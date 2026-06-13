// Near-optimal squad builder shared by both Best XI sub-tabs. One generic solver maximises Σ(value × slot
// weight) over a legal squad (fixed formation, budget cap, max-4-per-nation), parameterised by what "value"
// means: realised base points for the Best squad, or total picks for the People's XI. Pure + client-side —
// both inputs are already-served public payloads, so there is no server endpoint or DB read. See
// SOP_scoring_and_leagues "Stats — Best XI".
import {
  MAX_PLAYERS_PER_NATION,
  SUBSTITUTE_POINT_WEIGHT,
  budgetOptions,
  formationLayout,
} from './squadFormation'
import type { PlayerPointsPlayer, PublicSquadUsagePlayer, SlotClass, SlotGroup } from './types'

const POSITION_ORDER: SlotClass[] = ['GK', 'DEF', 'MID', 'FWD']

export interface SquadSlotPlayer {
  playerId: number
  displayName: string
  teamCode: string
  nationalityCode: string
  imageUrl?: string
  rating: number
  capCost: number
  positionMain?: string
  positions: string[]
  positionClasses: SlotClass[]
  // Best-squad metric fields.
  basePoints?: number
  slotPoints?: number
  effectivePoints?: number
  appearances?: number
  goals?: number
  assists?: number
  // People's XI metric fields.
  usageCount?: number
  presenceRate?: number
  starterCount?: number
  subCount?: number
}

export interface SquadSlot {
  slotClass: SlotClass
  slotGroup: SlotGroup
  player: SquadSlotPlayer | null
}

export interface SquadTier {
  budgetLimit: number
  scoreMultiplier: number
  filledSlots: number
  complete: boolean
  budgetUsed: number
  // Σ of the board's metric across filled slots: effective points (Best) or total picks (People's).
  total: number
  // Best squad only: total × the tier multiplier.
  finalScore?: number
  slots: SquadSlot[]
}

export type SquadBoard = SquadTier[]

// ----- solver internals -------------------------------------------------------------------------------

interface SlotSpec {
  index: number
  slotClass: SlotClass
  slotGroup: SlotGroup
  weight: number
}

interface Candidate<T> {
  id: number
  teamCode: string
  cost: number
  valueByClass: Map<SlotClass, number>
  data: T
}

type Assignment<T> = Array<Candidate<T> | null>

function buildSlots(subWeight: number): SlotSpec[] {
  return formationLayout.map((slot, index) => ({
    index,
    slotClass: slot.slotClass,
    slotGroup: slot.slotGroup,
    weight: slot.slotGroup === 'sub' ? subWeight : 1,
  }))
}

function slotValue<T>(candidate: Candidate<T>, slot: SlotSpec): number {
  return (candidate.valueByClass.get(slot.slotClass) ?? 0) * slot.weight
}

function isEligible<T>(candidate: Candidate<T>, slot: SlotSpec): boolean {
  return candidate.valueByClass.has(slot.slotClass)
}

function assignmentCost<T>(assignment: Assignment<T>): number {
  let total = 0
  for (const candidate of assignment) {
    if (candidate) total += candidate.cost
  }
  return total
}

function nationCounts<T>(assignment: Assignment<T>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const candidate of assignment) {
    if (candidate?.teamCode) counts.set(candidate.teamCode, (counts.get(candidate.teamCode) ?? 0) + 1)
  }
  return counts
}

function nationCapOk<T>(counts: Map<string, number>, outgoing: Candidate<T> | null, incoming: Candidate<T>, enforce: boolean): boolean {
  if (!enforce || !incoming.teamCode) return true
  if (outgoing && outgoing.teamCode === incoming.teamCode) return true
  return (counts.get(incoming.teamCode) ?? 0) < MAX_PLAYERS_PER_NATION
}

// Greedy construction ignoring budget: assign the highest-value (candidate, slot) pairs first, respecting
// distinct players and the nation cap. Repair then trims it to fit the budget.
function constructByValue<T>(candidates: Candidate<T>[], slots: SlotSpec[], enforce: boolean): Assignment<T> {
  const pairs: Array<{ candidate: Candidate<T>; slotIndex: number; value: number }> = []
  for (const candidate of candidates) {
    for (const slot of slots) {
      if (isEligible(candidate, slot)) {
        pairs.push({ candidate, slotIndex: slot.index, value: slotValue(candidate, slot) })
      }
    }
  }
  pairs.sort((a, b) => b.value - a.value || a.candidate.cost - b.candidate.cost)

  const assignment: Assignment<T> = slots.map(() => null)
  const usedPlayers = new Set<number>()
  const counts = new Map<string, number>()
  for (const pair of pairs) {
    if (assignment[pair.slotIndex]) continue
    if (usedPlayers.has(pair.candidate.id)) continue
    if (!nationCapOk(counts, null, pair.candidate, enforce)) continue
    assignment[pair.slotIndex] = pair.candidate
    usedPlayers.add(pair.candidate.id)
    if (pair.candidate.teamCode) counts.set(pair.candidate.teamCode, (counts.get(pair.candidate.teamCode) ?? 0) + 1)
  }
  return assignment
}

function repairToBudget<T>(assignment: Assignment<T>, candidates: Candidate<T>[], slots: SlotSpec[], budget: number, enforce: boolean): void {
  while (assignmentCost(assignment) > budget) {
    const used = new Set<number>()
    for (const candidate of assignment) {
      if (candidate) used.add(candidate.id)
    }
    const counts = nationCounts(assignment)

    let best: { slotIndex: number; replacement: Candidate<T> | null; ratio: number } | null = null
    const consider = (slotIndex: number, replacement: Candidate<T> | null, curVal: number, costSaved: number) => {
      if (costSaved <= 0) return
      const newValue = replacement ? slotValue(replacement, slots[slotIndex]) : 0
      const ratio = (curVal - newValue) / costSaved
      if (!best || ratio < best.ratio) best = { slotIndex, replacement, ratio }
    }

    for (let i = 0; i < slots.length; i += 1) {
      const current = assignment[i]
      if (!current) continue
      const slot = slots[i]
      const currentValue = slotValue(current, slot)
      consider(i, null, currentValue, current.cost) // empty the slot (always available)
      for (const candidate of candidates) {
        if (candidate.cost >= current.cost) continue
        if (used.has(candidate.id)) continue
        if (!isEligible(candidate, slot)) continue
        if (!nationCapOk(counts, current, candidate, enforce)) continue
        consider(i, candidate, currentValue, current.cost - candidate.cost)
      }
    }

    if (!best) break
    const move = best as { slotIndex: number; replacement: Candidate<T> | null; ratio: number }
    assignment[move.slotIndex] = move.replacement
  }
}

function improveByLocalSearch<T>(assignment: Assignment<T>, candidates: Candidate<T>[], slots: SlotSpec[], budget: number, enforce: boolean): void {
  const ITERATION_CAP = 1000
  for (let iteration = 0; iteration < ITERATION_CAP; iteration += 1) {
    const baseCost = assignmentCost(assignment)
    const used = new Set<number>()
    for (const candidate of assignment) {
      if (candidate) used.add(candidate.id)
    }
    const counts = nationCounts(assignment)

    let best: { apply: () => void; gain: number } | null = null
    const offer = (gain: number, apply: () => void) => {
      if (gain > 1e-9 && (!best || gain > best.gain)) best = { gain, apply }
    }

    // Bring an unused candidate into a slot (filling an empty one or replacing its holder).
    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i]
      const current = assignment[i]
      const currentValue = current ? slotValue(current, slot) : 0
      const currentCost = current ? current.cost : 0
      for (const candidate of candidates) {
        if (used.has(candidate.id)) continue
        if (!isEligible(candidate, slot)) continue
        if (baseCost - currentCost + candidate.cost > budget) continue
        if (!nationCapOk(counts, current, candidate, enforce)) continue
        offer(slotValue(candidate, slot) - currentValue, () => {
          assignment[i] = candidate
        })
      }
    }

    // Swap the players of two filled slots (cost and nations unchanged).
    for (let i = 0; i < slots.length; i += 1) {
      const a = assignment[i]
      if (!a) continue
      for (let j = i + 1; j < slots.length; j += 1) {
        const b = assignment[j]
        if (!b) continue
        if (!isEligible(a, slots[j]) || !isEligible(b, slots[i])) continue
        const before = slotValue(a, slots[i]) + slotValue(b, slots[j])
        const after = slotValue(b, slots[i]) + slotValue(a, slots[j])
        offer(after - before, () => {
          assignment[i] = b
          assignment[j] = a
        })
      }
    }

    if (!best) break
    ;(best as { apply: () => void }).apply()
  }
}

// Within each class put the highest-value chosen player in the starter slots and the weakest in the reserve
// slot — deterministic display, and for the People's XI it realises "least picked of each position on the
// bench". Formation lists starters before the sub, so filling class slots in order does this.
function normalizeBench<T>(assignment: Assignment<T>, slots: SlotSpec[]): void {
  for (const slotClass of POSITION_ORDER) {
    const indices = slots.filter((slot) => slot.slotClass === slotClass).map((slot) => slot.index)
    const chosen = indices.map((index) => assignment[index]).filter((candidate): candidate is Candidate<T> => Boolean(candidate))
    chosen.sort((left, right) => (right.valueByClass.get(slotClass) ?? 0) - (left.valueByClass.get(slotClass) ?? 0))
    indices.forEach((slotIndex, rank) => {
      assignment[slotIndex] = chosen[rank] ?? null
    })
  }
}

function solveTier<T>(candidates: Candidate<T>[], slots: SlotSpec[], budget: number, enforce: boolean): Assignment<T> {
  const assignment = constructByValue(candidates, slots, enforce)
  repairToBudget(assignment, candidates, slots, budget, enforce)
  improveByLocalSearch(assignment, candidates, slots, budget, enforce)
  normalizeBench(assignment, slots)
  return assignment
}

// Run the solver across every budget tier and shape the result. `toPlayer` maps a chosen candidate + its slot
// to the display payload; `withMultiplier` adds finalScore (Best squad only).
function buildBoard<T>(
  candidates: Candidate<T>[],
  subWeight: number,
  toPlayer: (candidate: Candidate<T>, slot: SlotSpec) => SquadSlotPlayer,
  withMultiplier: boolean,
): SquadBoard {
  const slots = buildSlots(subWeight)
  return budgetOptions.map((option) => {
    const assignment = solveTier(candidates, slots, option.budgetLimit, true)
    const slotPayloads: SquadSlot[] = slots.map((slot, index) => {
      const candidate = assignment[index]
      return {
        slotClass: slot.slotClass,
        slotGroup: slot.slotGroup,
        player: candidate ? toPlayer(candidate, slot) : null,
      }
    })
    const filledSlots = slotPayloads.filter((slot) => slot.player).length
    const budgetUsed = slotPayloads.reduce((sum, slot) => sum + (slot.player?.capCost ?? 0), 0)
    const total = slotPayloads.reduce((sum, slot) => sum + (slot.player?.effectivePoints ?? slot.player?.usageCount ?? 0), 0)
    return {
      budgetLimit: option.budgetLimit,
      scoreMultiplier: option.scoreMultiplier,
      filledSlots,
      complete: filledSlots === slots.length,
      budgetUsed,
      total,
      finalScore: withMultiplier ? total * option.scoreMultiplier : undefined,
      slots: slotPayloads,
    }
  })
}

function cleanSheetForClass(player: PlayerPointsPlayer, slotClass: SlotClass): number {
  return player.cleanSheetByPosition.find((entry) => entry.slotClass === slotClass)?.points ?? 0
}

// Best squad — value is the realised points the player earns in a class (base + that class's clean sheet);
// reserves bank half (SUBSTITUTE_POINT_WEIGHT).
export function buildBestSquads(items: PlayerPointsPlayer[]): SquadBoard {
  const candidates: Candidate<PlayerPointsPlayer>[] = items.map((player) => {
    const valueByClass = new Map<SlotClass, number>()
    for (const slotClass of player.positionClasses) {
      valueByClass.set(slotClass, player.basePoints + cleanSheetForClass(player, slotClass))
    }
    return { id: player.playerId, teamCode: player.teamCode, cost: player.capCost, valueByClass, data: player }
  })
  return buildBoard(
    candidates,
    SUBSTITUTE_POINT_WEIGHT,
    (candidate, slot) => {
      const slotPoints = candidate.valueByClass.get(slot.slotClass) ?? 0
      const player = candidate.data
      return {
        playerId: player.playerId,
        displayName: player.displayName,
        teamCode: player.teamCode,
        nationalityCode: player.nationalityCode,
        imageUrl: player.imageUrl,
        rating: player.rating,
        capCost: player.capCost,
        positionMain: player.positionMain,
        positions: player.positions,
        positionClasses: player.positionClasses,
        basePoints: player.basePoints,
        slotPoints,
        effectivePoints: slotPoints * slot.weight,
        appearances: player.appearances,
        goals: player.goals,
        assists: player.assists,
      }
    },
    true,
  )
}

// People's XI — value is total picks (usageCount); every slot weighs the same, so the solver chooses the most-
// picked legal squad that fits the budget and the bench normalisation puts the least-picked of each class on
// the reserve slot.
export function buildPeoplesSquads(items: PublicSquadUsagePlayer[]): SquadBoard {
  const candidates: Candidate<PublicSquadUsagePlayer>[] = items.map((player) => {
    const valueByClass = new Map<SlotClass, number>()
    for (const slotClass of player.positionClasses) {
      valueByClass.set(slotClass, player.usageCount)
    }
    return { id: player.playerId, teamCode: player.teamCode, cost: player.capCost, valueByClass, data: player }
  })
  return buildBoard(
    candidates,
    1,
    (candidate) => {
      const player = candidate.data
      return {
        playerId: player.playerId,
        displayName: player.displayName,
        teamCode: player.teamCode,
        nationalityCode: player.nationalityCode,
        imageUrl: player.imageUrl,
        rating: player.rating,
        capCost: player.capCost,
        positionMain: player.positionMain,
        positions: player.positions,
        positionClasses: player.positionClasses,
        usageCount: player.usageCount,
        presenceRate: player.presenceRate,
        starterCount: player.starterCount,
        subCount: player.subCount,
      }
    },
    false,
  )
}
