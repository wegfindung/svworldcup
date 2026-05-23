import { describe, expect, it } from 'vitest'
import { canonicalizeEmail } from './emailCanonicalization.js'

describe('canonicalizeEmail', () => {
  it('normalizes Gmail dots, plus tags, and googlemail domain aliases', () => {
    expect(canonicalizeEmail(' j.OhN.sMiTh+WM2026@googlemail.com ').canonicalEmail).toBe('johnsmith@gmail.com')
  })

  it('strips Microsoft plus tags without removing dots', () => {
    expect(canonicalizeEmail('first.last+worldcup@outlook.com').canonicalEmail).toBe('first.last@outlook.com')
  })

  it('keeps generic provider local parts after lowercasing', () => {
    expect(canonicalizeEmail('Manager+Cup@example.com').canonicalEmail).toBe('manager+cup@example.com')
  })
})
