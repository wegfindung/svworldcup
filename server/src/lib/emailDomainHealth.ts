import { promises as dns } from 'node:dns'

export type EmailMxStatus = 'valid' | 'missing' | 'timeout' | 'error'

export interface EmailDomainHealth {
  mxStatus: EmailMxStatus
  mxHostCount: number
}

export async function checkEmailDomainHealth(domain: string, timeoutMs = 1500): Promise<EmailDomainHealth> {
  const normalizedDomain = domain.trim().toLowerCase()
  if (!normalizedDomain) {
    return { mxStatus: 'missing', mxHostCount: 0 }
  }

  let timeout: NodeJS.Timeout | undefined
  try {
    const result = await Promise.race([
      dns.resolveMx(normalizedDomain),
      new Promise<'timeout'>((resolve) => {
        timeout = setTimeout(() => resolve('timeout'), timeoutMs)
      }),
    ])

    if (result === 'timeout') {
      return { mxStatus: 'timeout', mxHostCount: 0 }
    }

    return {
      mxStatus: result.length > 0 ? 'valid' : 'missing',
      mxHostCount: result.length,
    }
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code === 'ENODATA' || code === 'ENOTFOUND' || code === 'ENODOMAIN') {
      return { mxStatus: 'missing', mxHostCount: 0 }
    }
    return { mxStatus: 'error', mxHostCount: 0 }
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}
