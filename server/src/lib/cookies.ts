export interface CookieOptions {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
  maxAge?: number
  path?: string
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {}
  }

  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf('=')
        if (separatorIndex === -1) {
          return [part, '']
        }
        return [part.slice(0, separatorIndex), decodeURIComponent(part.slice(separatorIndex + 1))]
      }),
  )
}

export function createCookie(name: string, value: string, options: CookieOptions = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`]

  parts.push(`Path=${options.path ?? '/'}`)

  if (options.httpOnly ?? true) {
    parts.push('HttpOnly')
  }
  if (options.secure ?? false) {
    parts.push('Secure')
  }
  parts.push(`SameSite=${options.sameSite ?? 'Lax'}`)
  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`)
  }

  return parts.join('; ')
}

export function clearCookie(name: string, options: CookieOptions = {}) {
  return createCookie(name, '', {
    ...options,
    maxAge: 0,
  })
}
