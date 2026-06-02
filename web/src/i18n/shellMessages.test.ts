import { describe, expect, it } from 'vitest'
import { supportedLocales } from '../data/eventConfig'
import { getMessages } from './messages'
import { getShellMessages } from './shellMessages'

describe('shell messages', () => {
  it.each(supportedLocales)('keeps shell copy aligned for %s', (locale) => {
    const fullCopy = getMessages(locale)
    const shellCopy = getShellMessages(locale)

    expect(shellCopy.nav).toEqual(fullCopy.nav)
    expect(shellCopy.errorBoundary).toEqual(fullCopy.errorBoundary)
    expect(shellCopy.bootstrapError).toEqual(fullCopy.bootstrapError)
  })
})
