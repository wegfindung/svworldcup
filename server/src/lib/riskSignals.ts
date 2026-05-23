import { createHmac } from 'node:crypto'
import net from 'node:net'
import type { Request } from 'express'
import { env } from '../config/env.js'

export type RiskEventType = 'registration' | 'login' | 'verify' | 'squad_lock' | 'lineup_lock'

export interface BasicClientFingerprint {
  [key: string]: unknown
  timeZone?: string
  languages?: string[]
  platform?: string
  userAgentDataPlatform?: string
  userAgentDataMobile?: boolean
  webdriver?: boolean
  hardwareConcurrency?: number
  maxTouchPoints?: number
  deviceMemory?: number
  cookieEnabled?: boolean
  screen?: {
    width?: number
    height?: number
    colorDepth?: number
    pixelRatio?: number
  }
}

export interface RequestRiskSignal {
  ipHash?: string
  ipv4Cidr24Hash?: string
  ipv4Cidr26Hash?: string
  ipv6Cidr64Hash?: string
  userAgentHash?: string
  acceptLanguageHash?: string
  acceptLanguage?: string
  clientFingerprintHash?: string
  clientFingerprint?: BasicClientFingerprint
}

function riskSecret() {
  return env.RISK_SIGNAL_SECRET ?? env.SESSION_SECRET ?? env.CSRF_TOKEN_SECRET ?? env.SHARE_SNAPSHOT_SECRET ?? 'dev-risk-signal-secret'
}

export function hashRiskValue(value?: string | null) {
  const normalized = value?.trim()
  if (!normalized) {
    return undefined
  }

  return createHmac('sha256', riskSecret()).update(normalized).digest('hex')
}

function normalizeIp(ip?: string) {
  if (!ip) {
    return undefined
  }

  const trimmed = ip.trim().replace(/^::ffff:/, '')
  const zoneIndex = trimmed.indexOf('%')
  return zoneIndex >= 0 ? trimmed.slice(0, zoneIndex) : trimmed
}

function ipv4Cidr(ip: string, prefix: 24 | 26) {
  const parts = ip.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return undefined
  }

  if (prefix === 24) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
  }

  const lastOctet = Math.floor(parts[3] / 64) * 64
  return `${parts[0]}.${parts[1]}.${parts[2]}.${lastOctet}/26`
}

function expandIpv6(ip: string) {
  const normalized = ip.toLowerCase()
  if (!normalized.includes(':')) {
    return undefined
  }

  const [leftRaw, rightRaw] = normalized.split('::')
  const left = leftRaw ? leftRaw.split(':').filter(Boolean) : []
  const right = rightRaw ? rightRaw.split(':').filter(Boolean) : []
  if (normalized.includes('::')) {
    const missing = Math.max(0, 8 - left.length - right.length)
    return [...left, ...Array.from({ length: missing }, () => '0'), ...right].map((part) => part.padStart(4, '0'))
  }
  const parts = normalized.split(':')
  return parts.length === 8 ? parts.map((part) => part.padStart(4, '0')) : undefined
}

function ipv6Cidr64(ip: string) {
  const parts = expandIpv6(ip)
  if (!parts || parts.length !== 8) {
    return undefined
  }
  return `${parts.slice(0, 4).join(':')}:0000:0000:0000:0000/64`
}

function sanitizeString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : undefined
}

function sanitizeNumber(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : undefined
}

function sanitizeBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

export function sanitizeClientFingerprint(value: unknown): BasicClientFingerprint | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const source = value as Record<string, unknown>
  const screenSource = source.screen && typeof source.screen === 'object' ? (source.screen as Record<string, unknown>) : undefined
  const fingerprint: BasicClientFingerprint = {
    timeZone: sanitizeString(source.timeZone, 80),
    languages: Array.isArray(source.languages)
      ? source.languages.map((item) => sanitizeString(item, 40)).filter((item): item is string => Boolean(item)).slice(0, 8)
      : undefined,
    platform: sanitizeString(source.platform, 80),
    userAgentDataPlatform: sanitizeString(source.userAgentDataPlatform, 80),
    userAgentDataMobile: sanitizeBoolean(source.userAgentDataMobile),
    webdriver: sanitizeBoolean(source.webdriver),
    hardwareConcurrency: sanitizeNumber(source.hardwareConcurrency, 0, 256),
    maxTouchPoints: sanitizeNumber(source.maxTouchPoints, 0, 32),
    deviceMemory: sanitizeNumber(source.deviceMemory, 0, 256),
    cookieEnabled: sanitizeBoolean(source.cookieEnabled),
    screen: screenSource
      ? {
          width: sanitizeNumber(screenSource.width, 0, 100_000),
          height: sanitizeNumber(screenSource.height, 0, 100_000),
          colorDepth: sanitizeNumber(screenSource.colorDepth, 0, 128),
          pixelRatio: sanitizeNumber(screenSource.pixelRatio, 0, 16),
        }
      : undefined,
  }

  const compact = Object.fromEntries(Object.entries(fingerprint).filter(([, entry]) => entry !== undefined))
  return Object.keys(compact).length ? (compact as BasicClientFingerprint) : undefined
}

function parseClientFingerprintHeader(req: Request) {
  const raw = req.header('x-client-fingerprint')
  if (!raw || raw.length > 8000) {
    return undefined
  }

  try {
    return sanitizeClientFingerprint(JSON.parse(decodeURIComponent(raw)))
  } catch {
    return undefined
  }
}

export function buildRequestRiskSignal(req: Request): RequestRiskSignal {
  const ip = normalizeIp(req.ips[0] ?? req.ip)
  const ipVersion = ip ? net.isIP(ip) : 0
  const userAgent = req.header('user-agent')?.slice(0, 500)
  const acceptLanguage = req.header('accept-language')?.slice(0, 300)
  const clientFingerprint = parseClientFingerprintHeader(req)
  const fingerprintJson = clientFingerprint ? JSON.stringify(clientFingerprint) : undefined

  return {
    ipHash: hashRiskValue(ip),
    ipv4Cidr24Hash: ip && ipVersion === 4 ? hashRiskValue(ipv4Cidr(ip, 24)) : undefined,
    ipv4Cidr26Hash: ip && ipVersion === 4 ? hashRiskValue(ipv4Cidr(ip, 26)) : undefined,
    ipv6Cidr64Hash: ip && ipVersion === 6 ? hashRiskValue(ipv6Cidr64(ip)) : undefined,
    userAgentHash: hashRiskValue(userAgent),
    acceptLanguageHash: hashRiskValue(acceptLanguage),
    acceptLanguage,
    clientFingerprintHash: hashRiskValue(fingerprintJson),
    clientFingerprint,
  }
}
