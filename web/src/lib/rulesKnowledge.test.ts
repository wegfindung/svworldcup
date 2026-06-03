import { describe, expect, it } from 'vitest'
import { groupRuleKnowledgeByCategory, ruleKnowledgeEntries, searchRuleKnowledge } from './rulesKnowledge'

describe('rules knowledge search', () => {
  it('answers nations leaderboard questions from the controlled knowledge base', () => {
    const results = searchRuleKnowledge('why is my nation not showing')

    expect(results[0]?.id).toBe('nations-qualification')
    expect(results[0]?.answer).toContain('at least 2 manager entries')
  })

  it('finds ownership boost answers by community wording', () => {
    const results = searchRuleKnowledge('soccerverse shares boost retroactive')

    expect(results[0]?.id).toBe('ownership-boost')
    expect(results[0]?.answer).toContain('never applies retroactively')
  })

  it('groups entries for the structured FAQ', () => {
    const groups = groupRuleKnowledgeByCategory()

    expect(groups.some((group) => group.category === 'Nations Leaderboard')).toBe(true)
    expect(groups.flatMap((group) => group.items)).toHaveLength(ruleKnowledgeEntries.length)
  })
})
