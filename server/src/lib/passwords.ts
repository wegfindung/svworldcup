import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const PASSWORD_KEY_LENGTH = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString('hex')
  return `scrypt:${salt}:${derivedKey}`
}

export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!storedHash) {
    return false
  }

  const [algorithm, salt, expectedHex] = storedHash.split(':')
  if (algorithm !== 'scrypt' || !salt || !expectedHex) {
    return false
  }

  const derivedKey = scryptSync(password, salt, PASSWORD_KEY_LENGTH)
  const expected = Buffer.from(expectedHex, 'hex')
  if (expected.length !== derivedKey.length) {
    return false
  }

  return timingSafeEqual(derivedKey, expected)
}
