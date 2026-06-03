import { describe, expect, it } from 'vitest'
import { isEmailLikeUsername } from './soccerverseUsername.js'

describe('isEmailLikeUsername', () => {
  it('flags any value containing @ (the email-pasted-by-mistake case)', () => {
    expect(isEmailLikeUsername('user@example.com')).toBe(true)
    expect(isEmailLikeUsername('@handle')).toBe(true)
  })

  it('accepts a plain Soccerverse username and preserves case (no canonicalization here)', () => {
    expect(isEmailLikeUsername('MyManager')).toBe(false)
    expect(isEmailLikeUsername('manager_99')).toBe(false)
  })
})
