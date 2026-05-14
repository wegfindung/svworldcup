import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Request, Response } from 'express'
import { Resvg } from '@resvg/resvg-js'
import React from 'react'
import satori from 'satori'
import { decodeShareSnapshotPayload, type ShareSnapshotPayload } from '../lib/sharePayload.js'
import { getShareCopy } from '../lib/shareCopy.js'

const shareCardWidth = 1200
const shareCardHeight = 630
const shareRenderVersion = '7'
const immutableCacheControl = 'public, immutable, no-transform, max-age=31536000'
const requestTimeoutMs = 4_000

interface LoadedFont {
  name: string
  format: 'woff'
  data: ArrayBuffer
  weight: 500 | 700
  style: 'normal'
}

type ShareRenderCopy = ReturnType<typeof getShareCopy>

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeXml(value: string) {
  return escapeHtml(value)
}

function buildOrigin(req: Request) {
  return `${req.protocol}://${req.get('host') ?? 'localhost'}`
}

function sanitizeReferrerUsername(value?: string) {
  const trimmed = value?.trim().replace(/^@+/, '') ?? ''
  if (!trimmed) {
    return ''
  }

  return trimmed.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 60)
}

function buildLandingReferralUrl(origin: string, referrerUsername: string) {
  const normalizedOrigin = origin.replace(/\/+$/, '')
  const sanitizedReferrer = sanitizeReferrerUsername(referrerUsername)
  if (sanitizedReferrer) {
    return `${normalizedOrigin}?ref=${encodeURIComponent(sanitizedReferrer)}`
  }

  return normalizedOrigin
}

function buildReferralInvitationText(referralUrl: string) {
  return `Show that you have the best soccer knowledge and join the competition ${referralUrl}`
}

function getRawSharePayload(req: Request) {
  return String(req.query.data ?? '').trim()
}

function getSharePlayerLabel(player: ShareSnapshotPayload['featuredPlayers'][number]) {
  return player.shareLabel?.trim() || player.displayName
}

async function fetchArrayBuffer(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(requestTimeoutMs),
  })

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url} with ${response.status}`)
  }

  return await response.arrayBuffer()
}

async function fetchImageDataUrl(url: string, fallbackDataUrl: string) {
  try {
    const arrayBuffer = await fetchArrayBuffer(url)
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    return `data:image/png;base64,${base64}`
  } catch {
    return fallbackDataUrl
  }
}

async function readFileAsDataUrl(absolutePath: string, mimeType: string) {
  const fileBuffer = await readFile(absolutePath)
  return `data:${mimeType};base64,${fileBuffer.toString('base64')}`
}

async function findFirstFile(directory: string, matcher: (name: string) => boolean) {
  if (!existsSync(directory)) {
    return null
  }

  const entries = await readdir(directory)
  const match = entries.find(matcher)
  return match ? resolve(directory, match) : null
}

async function findFontPath(prefix: string) {
  const runtimeAssetsDir = resolve(process.cwd(), 'public', 'assets')
  const devAssetsDir = resolve(process.cwd(), 'web', 'dist', 'assets')
  const sourceFontDir = resolve(process.cwd(), 'web', 'node_modules', '@fontsource', 'outfit', 'files')
  const runtimeMatch = await findFirstFile(runtimeAssetsDir, (name) => name.startsWith(prefix) && name.endsWith('.woff'))
  if (runtimeMatch) {
    return runtimeMatch
  }

  const devMatch = await findFirstFile(devAssetsDir, (name) => name.startsWith(prefix) && name.endsWith('.woff'))
  if (devMatch) {
    return devMatch
  }

  const sourceMatch = await findFirstFile(sourceFontDir, (name) => name.startsWith(prefix.replace(/-$/, '')) && name.endsWith('.woff'))
  if (sourceMatch) {
    return sourceMatch
  }

  return null
}

let loadedFontsPromise: Promise<LoadedFont[]> | null = null

async function loadShareFonts() {
  loadedFontsPromise ??= (async () => {
    const regularPath = await findFontPath('outfit-latin-500-normal-')
    const boldPath = await findFontPath('outfit-latin-700-normal-')
    const fallbackRegularPath = regularPath ?? (await findFontPath('outfit-latin-400-normal-'))
    const fallbackBoldPath = boldPath ?? fallbackRegularPath

    if (!fallbackRegularPath || !fallbackBoldPath) {
      throw new Error('Share fonts could not be found.')
    }

    const [regularData, boldData] = await Promise.all([readFile(fallbackRegularPath), readFile(fallbackBoldPath)])

    return [
      {
        name: 'Outfit',
        format: 'woff',
        data: regularData.buffer.slice(regularData.byteOffset, regularData.byteOffset + regularData.byteLength),
        weight: 500,
        style: 'normal',
      },
      {
        name: 'Outfit',
        format: 'woff',
        data: boldData.buffer.slice(boldData.byteOffset, boldData.byteOffset + boldData.byteLength),
        weight: 700,
        style: 'normal',
      },
    ]
  })()

  return loadedFontsPromise
}

async function resolvePublicAssetPath(relativePath: string) {
  const candidates = [
    resolve(process.cwd(), 'public', relativePath),
    resolve(process.cwd(), 'web', 'public', relativePath),
    resolve(process.cwd(), 'web', 'dist', relativePath),
  ]

  const match = candidates.find((candidate) => existsSync(candidate))
  if (!match) {
    throw new Error(`Missing public asset: ${relativePath}`)
  }

  return match
}

function buildPlayerProxyUrl(originalUrl: string) {
  return `https://wsrv.nl/?url=${encodeURIComponent(originalUrl)}&w=420&h=480&fit=cover&output=png`
}

async function buildShareRenderData(payload: ShareSnapshotPayload) {
  const playerPlaceholderPath = await resolvePublicAssetPath('placeholders/player.svg')
  const placeholderDataUrl = await readFileAsDataUrl(playerPlaceholderPath, 'image/svg+xml')
  const copy = getShareCopy(payload.locale)

  const players = await Promise.all(
    payload.featuredPlayers.map(async (player) => {
      const flagPath = await resolvePublicAssetPath(`team-flags/${player.teamCode}.svg`)
      const [portraitDataUrl, flagDataUrl] = await Promise.all([
        fetchImageDataUrl(buildPlayerProxyUrl(player.imageUrl), placeholderDataUrl),
        readFileAsDataUrl(flagPath, 'image/svg+xml'),
      ])

      return {
        ...player,
        renderLabel: getSharePlayerLabel(player),
        portraitDataUrl,
        flagDataUrl,
      }
    }),
  )

  return {
    payload,
    players,
    copy,
  }
}

function wrapText(value: string, maxLineLength: number, maxLines: number) {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (!words.length) {
    return ['']
  }

  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word
    if (nextLine.length <= maxLineLength || !currentLine) {
      currentLine = nextLine
      continue
    }

    lines.push(currentLine)
    currentLine = word

    if (lines.length === maxLines - 1) {
      break
    }
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine)
  }

  const consumedWords = lines.join(' ').split(/\s+/).filter(Boolean).length
  if (consumedWords < words.length) {
    const lastLine = lines[Math.max(0, lines.length - 1)] ?? ''
    lines[Math.max(0, lines.length - 1)] = `${lastLine.replace(/[.…]+$/g, '')}…`
  }

  return lines.slice(0, maxLines)
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…` : value
}

function buildEmbeddedFontCss(fonts: LoadedFont[]) {
  return fonts
    .map(
      (font) =>
        `@font-face{font-family:'${font.name}';src:url(data:font/${font.format};base64,${Buffer.from(font.data).toString('base64')}) format('${font.format}');font-weight:${font.weight};font-style:${font.style};}`,
    )
    .join('')
}

function createShareRenderer(svg: string) {
  return new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: shareCardWidth,
    },
  })
}

function encodeSvgDataUrl(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

async function renderTextDataUrl(
  fonts: LoadedFont[],
  options: {
    lines: string[]
    width: number
    height: number
    fontSize: number
    lineHeight: number
    weight: 500 | 700
    fill: string
    textAlign?: 'left' | 'center' | 'right'
    justifyContent?: 'flex-start' | 'center'
    letterSpacing?: number
  },
) {
  const svg = await satori(
    React.createElement(
      'div',
      {
        style: {
          color: options.fill,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Outfit',
          fontSize: `${options.fontSize}px`,
          fontWeight: options.weight,
          height: `${options.height}px`,
          justifyContent: options.justifyContent ?? 'flex-start',
          lineHeight: `${options.lineHeight}px`,
          width: `${options.width}px`,
        },
      },
      options.lines.map((line, index) =>
        React.createElement(
          'div',
          {
            key: `${line}-${index}`,
            style: {
              display: 'flex',
              justifyContent:
                options.textAlign === 'center' ? 'center' : options.textAlign === 'right' ? 'flex-end' : 'flex-start',
              letterSpacing: options.letterSpacing ? `${options.letterSpacing}px` : '0px',
              lineHeight: `${options.lineHeight}px`,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              width: '100%',
            },
          },
          line,
        ),
      ),
    ),
    {
      width: options.width,
      height: options.height,
      fonts: fonts.map((font) => ({
        name: font.name,
        data: Buffer.from(font.data),
        weight: font.weight,
        style: font.style,
      })),
    },
  )

  return encodeSvgDataUrl(svg)
}

async function buildShareCardSvg(
  payload: ShareSnapshotPayload,
  players: Array<
    ShareSnapshotPayload['featuredPlayers'][number] & {
      renderLabel: string
      portraitDataUrl: string
      flagDataUrl: string
    }
  >,
  copy: ShareRenderCopy,
  fonts: LoadedFont[],
) {
  const statementLines = wrapText(payload.statement, players.length === 2 ? 38 : 34, 2)
  const cardWidth = players.length === 2 ? 270 : 270
  const cardHeight = 316
  const namePlateHeight = 48
  const namePlateY = cardHeight - 54
  const cardGap = players.length === 2 ? 52 : 28
  const totalCardsWidth = players.length * cardWidth + (players.length - 1) * cardGap
  const cardsStartX = Math.round((shareCardWidth - totalCardsWidth) / 2)
  const panelX = 58
  const panelY = 194
  const panelWidth = 1084
  const panelHeight = 334
  const cardsTopY = 210
  const ctaY = 548
  const ctaText = truncateText(copy.cta, 76)
  const attributionText = 'Soccerverse.com - images: Official partnership with FIFPro'
  const [badgeTextUrl, bylineTextUrl, attributionTextUrl, statementTextUrl, ctaTextUrl] = await Promise.all([
    renderTextDataUrl(fonts, {
      lines: [copy.bodyBadge.toUpperCase()],
      width: 390,
      height: 40,
      fontSize: 18,
      lineHeight: 22,
      weight: 700,
      fill: '#f4f0e8',
      justifyContent: 'center',
      letterSpacing: 2,
    }),
    renderTextDataUrl(fonts, {
      lines: [`${copy.bodyBylinePrefix} ${payload.managerName}`],
      width: 420,
      height: 40,
      fontSize: 18,
      lineHeight: 22,
      weight: 500,
      fill: 'rgba(255,255,255,0.74)',
      textAlign: 'right',
      justifyContent: 'center',
    }),
    renderTextDataUrl(fonts, {
      lines: [attributionText],
      width: 520,
      height: 24,
      fontSize: 13,
      lineHeight: 16,
      weight: 500,
      fill: 'rgba(255,255,255,0.58)',
      textAlign: 'right',
      justifyContent: 'center',
    }),
    renderTextDataUrl(fonts, {
      lines: statementLines,
      width: 820,
      height: 108,
      fontSize: 46,
      lineHeight: 48,
      weight: 700,
      fill: '#f4f0e8',
    }),
    renderTextDataUrl(fonts, {
      lines: [ctaText],
      width: 1056,
      height: 58,
      fontSize: 27,
      lineHeight: 31,
      weight: 700,
      fill: '#07120f',
      textAlign: 'center',
      justifyContent: 'center',
    }),
  ])

  const playerCardsSvg = (
    await Promise.all(
      players.map(async (player, index) => {
      const x = cardsStartX + index * (cardWidth + cardGap)
      const y = cardsTopY
      const playerClipId = `player-clip-${player.playerId}-${index}`
      const flagClipId = `flag-clip-${player.playerId}-${index}`
      const playerNameLines = wrapText(truncateText(player.renderLabel, 30), players.length === 2 ? 18 : 15, 2)
      const flagX = cardWidth - 68
      const playerNameUrl = await renderTextDataUrl(fonts, {
        lines: playerNameLines,
        width: cardWidth - 36,
        height: namePlateHeight,
        fontSize: 20,
        lineHeight: 20,
        weight: 700,
        fill: '#f4f0e8',
        textAlign: 'center',
        justifyContent: 'center',
      })

      return `
        <g transform="translate(${x}, ${y})">
          <defs>
            <clipPath id="${playerClipId}">
              <rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" rx="32" ry="32" />
            </clipPath>
            <clipPath id="${flagClipId}">
              <circle cx="22" cy="22" r="22" />
            </clipPath>
          </defs>
          <rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" rx="32" ry="32" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.22)" stroke-width="2" />
          <image href="${player.portraitDataUrl}" x="0" y="0" width="${cardWidth}" height="${cardHeight}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${playerClipId})" />
          <rect x="0" y="${cardHeight - 126}" width="${cardWidth}" height="126" fill="url(#card-bottom-shade)" clip-path="url(#${playerClipId})" />
          <g transform="translate(${flagX}, 18)">
            <circle cx="22" cy="22" r="24" fill="#f4f0e8" fill-opacity="0.96" />
            <image href="${player.flagDataUrl}" x="0" y="0" width="44" height="44" clip-path="url(#${flagClipId})" preserveAspectRatio="xMidYMid slice" />
          </g>
          <rect x="18" y="${namePlateY}" width="${cardWidth - 36}" height="${namePlateHeight}" rx="18" ry="18" fill="rgba(4,10,8,0.86)" stroke="rgba(255,255,255,0.12)" stroke-width="1.2" />
          <image href="${playerNameUrl}" x="18" y="${namePlateY}" width="${cardWidth - 36}" height="${namePlateHeight}" />
        </g>
      `
      }),
    )
  ).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${shareCardWidth}" height="${shareCardHeight}" viewBox="0 0 ${shareCardWidth} ${shareCardHeight}" role="img" aria-label="${escapeXml(
    payload.statement,
  )}">
  <defs>
    <style>
      ${buildEmbeddedFontCss(fonts)}
      text { font-family: 'Outfit', sans-serif; }
    </style>
    <linearGradient id="share-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#071410" />
      <stop offset="50%" stop-color="#0a2e21" />
      <stop offset="100%" stop-color="#07120f" />
    </linearGradient>
    <radialGradient id="floodlight-left" cx="0.16" cy="0.04" r="0.55">
      <stop offset="0%" stop-color="rgba(255,255,255,0.22)" />
      <stop offset="58%" stop-color="rgba(255,255,255,0.03)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0)" />
    </radialGradient>
    <radialGradient id="floodlight-right" cx="0.84" cy="0.04" r="0.55">
      <stop offset="0%" stop-color="rgba(214,255,131,0.18)" />
      <stop offset="58%" stop-color="rgba(214,255,131,0.03)" />
      <stop offset="100%" stop-color="rgba(214,255,131,0)" />
    </radialGradient>
    <linearGradient id="card-bottom-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.54)" />
    </linearGradient>
    <linearGradient id="cta-fill" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#d6ff72" />
      <stop offset="100%" stop-color="#c6ff61" />
    </linearGradient>
  </defs>

  <rect width="${shareCardWidth}" height="${shareCardHeight}" fill="url(#share-bg)" />
  <rect width="${shareCardWidth}" height="${shareCardHeight}" fill="url(#floodlight-left)" />
  <rect width="${shareCardWidth}" height="${shareCardHeight}" fill="url(#floodlight-right)" />

  <rect x="${panelX}" y="${panelY}" width="${panelWidth}" height="${panelHeight}" rx="38" ry="38" fill="rgba(1,14,10,0.48)" stroke="rgba(150,255,205,0.14)" stroke-width="2" />
  <rect x="${panelX + 22}" y="${panelY + 24}" width="${panelWidth - 44}" height="2" rx="1" ry="1" fill="rgba(202,255,225,0.12)" />
  <rect x="${panelX + 22}" y="${panelY + panelHeight - 26}" width="${panelWidth - 44}" height="2" rx="1" ry="1" fill="rgba(202,255,225,0.1)" />

  <rect x="72" y="48" width="430" height="40" rx="20" ry="20" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.14)" stroke-width="1.5" />
  <image href="${badgeTextUrl}" x="92" y="48" width="390" height="40" />
  <image href="${bylineTextUrl}" x="708" y="48" width="420" height="40" />
  <image href="${attributionTextUrl}" x="608" y="84" width="520" height="24" />
  <image href="${statementTextUrl}" x="72" y="102" width="820" height="108" />

  ${playerCardsSvg}

  <g transform="translate(72, ${ctaY})">
    <rect x="0" y="0" width="1056" height="58" rx="29" ry="29" fill="url(#cta-fill)" />
    <image href="${ctaTextUrl}" x="0" y="0" width="1056" height="58" />
  </g>
</svg>`
}

async function renderShareCardPng(payload: ShareSnapshotPayload) {
  const [fonts, renderData] = await Promise.all([loadShareFonts(), buildShareRenderData(payload)])
  const { players, copy } = renderData
  const svg = await buildShareCardSvg(payload, players, copy, fonts)
  const resvg = createShareRenderer(svg)

  return resvg.render().asPng()
}

async function renderFallbackShareCardPng() {
  const fonts = await loadShareFonts()
  const copy = getShareCopy('en')
  const [titleTextUrl, ctaTextUrl] = await Promise.all([
    renderTextDataUrl(fonts, {
      lines: ['Soccerverse World Cup'],
      width: 980,
      height: 76,
      fontSize: 58,
      lineHeight: 64,
      weight: 700,
      fill: '#f4f0e8',
      textAlign: 'center',
      justifyContent: 'center',
    }),
    renderTextDataUrl(fonts, {
      lines: [copy.cta],
      width: 980,
      height: 44,
      fontSize: 28,
      lineHeight: 32,
      weight: 500,
      fill: '#f4f0e8',
      textAlign: 'center',
      justifyContent: 'center',
    }),
  ])
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${shareCardWidth}" height="${shareCardHeight}" viewBox="0 0 ${shareCardWidth} ${shareCardHeight}">
  <defs>
    <style>
      ${buildEmbeddedFontCss(fonts)}
      text { font-family: 'Outfit', sans-serif; }
    </style>
    <linearGradient id="fallback-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#07120f" />
      <stop offset="100%" stop-color="#123227" />
    </linearGradient>
  </defs>
  <rect width="${shareCardWidth}" height="${shareCardHeight}" fill="url(#fallback-bg)" />
  <image href="${titleTextUrl}" x="110" y="214" width="980" height="76" />
  <image href="${ctaTextUrl}" x="110" y="304" width="980" height="44" />
</svg>`
  const resvg = createShareRenderer(svg)
  return resvg.render().asPng()
}

function buildShareSnapshotHtml(
  payload: ShareSnapshotPayload,
  copy: ShareRenderCopy,
  origin: string,
  pageUrl: string,
  imageUrl: string,
) {
  const playerNames = payload.featuredPlayers.map((player) => getSharePlayerLabel(player))
  const description = `${payload.statement} ${copy.pageDescriptionPrefix}: ${playerNames.join(', ')}. ${copy.cta}`
  const referralUsername = sanitizeReferrerUsername(payload.referrerUsername || payload.managerName)
  const referralUrl = buildLandingReferralUrl(origin, referralUsername)
  const referralInvitationText = buildReferralInvitationText(referralUrl)

  return `<!doctype html>
<html lang="${escapeHtml(payload.locale)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(`${payload.managerName} · ${copy.pageTitleSuffix}`)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(`${payload.managerName} · ${copy.pageTitleSuffix}`)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:width" content="${shareCardWidth}" />
    <meta property="og:image:height" content="${shareCardHeight}" />
    <meta property="og:image:alt" content="${escapeHtml(description)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(`${payload.managerName} · ${copy.pageTitleSuffix}`)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <meta name="theme-color" content="#081611" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #06110d;
        --panel: rgba(10, 20, 17, 0.82);
        --panel-border: rgba(255, 255, 255, 0.12);
        --text: #f3efe7;
        --muted: rgba(243, 239, 231, 0.7);
        --accent: #d6ff72;
        --accent-ink: #07120f;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: Outfit, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(214, 255, 114, 0.08), transparent 28rem),
          radial-gradient(circle at top right, rgba(255, 255, 255, 0.06), transparent 24rem),
          linear-gradient(180deg, #071410 0%, #07120f 100%);
        color: var(--text);
      }

      main {
        width: min(1180px, calc(100% - 32px));
        margin: 0 auto;
        padding: 28px 0 56px;
      }

      .frame {
        border: 1px solid var(--panel-border);
        border-radius: 30px;
        background: var(--panel);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.08),
          0 40px 90px -56px rgba(0,0,0,0.95);
        overflow: hidden;
      }

      .hero {
        padding: 24px 24px 8px;
        background:
          radial-gradient(circle at top left, rgba(214, 255, 114, 0.12), transparent 18rem),
          linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0));
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        padding: 10px 16px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.24em;
        text-transform: uppercase;
      }

      .builder-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: var(--accent);
        color: var(--accent-ink);
        padding: 14px 22px;
        font-size: 15px;
        font-weight: 700;
        text-decoration: none;
      }

      .image-wrap {
        padding: 12px 18px 18px;
      }

      .image-frame {
        border-radius: 28px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(4,10,8,0.94);
      }

      img {
        display: block;
        width: 100%;
        height: auto;
      }

      .subnote {
        padding: 0 24px 24px;
        font-size: 0.95rem;
        color: var(--muted);
      }

      .invite-card {
        margin: 0 24px 24px;
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 20px;
        background: rgba(0,0,0,0.2);
        padding: 16px;
      }

      .invite-label {
        margin: 0 0 8px;
        color: var(--accent);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }

      .invite-text {
        margin: 0;
        color: var(--text);
        font-size: 1rem;
        line-height: 1.55;
      }

      .invite-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
      }

      .invite-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 999px;
        background: rgba(255,255,255,0.05);
        color: var(--text);
        cursor: pointer;
        font: inherit;
        font-size: 0.9rem;
        font-weight: 700;
        padding: 10px 14px;
        text-decoration: none;
      }

      @media (max-width: 768px) {
        main { width: min(1180px, calc(100% - 20px)); padding-top: 18px; }
        .hero { padding: 20px 20px 6px; }
        .image-wrap { padding: 12px; }
        .subnote { padding: 0 20px 20px; }
        .invite-card { margin: 0 20px 20px; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="frame">
        <div class="hero">
          <div class="topbar">
            <span class="badge">${escapeHtml(copy.bodyBadge)}</span>
            <a class="builder-link" href="${escapeHtml(origin)}/builder">${escapeHtml(copy.bodyButton)}</a>
          </div>
        </div>

        <div class="image-wrap">
          <div class="image-frame">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(description)}" width="${shareCardWidth}" height="${shareCardHeight}" />
          </div>
        </div>

        <p class="subnote">${escapeHtml(copy.bodyIntro)} ${escapeHtml(`${copy.bodyBylinePrefix} ${payload.managerName}`)}</p>
        <div class="invite-card">
          <p class="invite-label">${escapeHtml(copy.inviteLabel)}</p>
          <p class="invite-text">${escapeHtml(referralInvitationText)}</p>
          <div class="invite-actions">
            <a class="invite-action" href="${escapeHtml(referralUrl)}">${escapeHtml(copy.inviteButton)}</a>
            <button class="invite-action" type="button" data-share-text="${escapeHtml(referralInvitationText)}" onclick="navigator.clipboard && navigator.clipboard.writeText(this.dataset.shareText || '')">${escapeHtml(copy.inviteCopyButton)}</button>
          </div>
        </div>
      </section>
    </main>
  </body>
</html>`
}

export async function handleShareSnapshotPage(req: Request, res: Response) {
  const rawPayload = getRawSharePayload(req)
  if (!rawPayload) {
    return res.status(400).send('Missing share payload.')
  }

  try {
    const payload = decodeShareSnapshotPayload(rawPayload)
    const copy = getShareCopy(payload.locale)
    const origin = buildOrigin(req)
    const pageUrl = `${origin}/share/snapshot?data=${encodeURIComponent(rawPayload)}&v=${shareRenderVersion}`
    const imageUrl = `${origin}/api/public/share-card.png?data=${encodeURIComponent(rawPayload)}&v=${shareRenderVersion}`

    res.setHeader('Cache-Control', immutableCacheControl)
    res.type('html').send(buildShareSnapshotHtml(payload, copy, origin, pageUrl, imageUrl))
  } catch {
    res.status(400).send('Invalid share payload.')
  }
}

export async function handleShareCardImage(req: Request, res: Response) {
  const rawPayload = getRawSharePayload(req)

  try {
    const pngBuffer = rawPayload ? await renderShareCardPng(decodeShareSnapshotPayload(rawPayload)) : await renderFallbackShareCardPng()
    res.setHeader('Cache-Control', immutableCacheControl)
    res.type('png').send(Buffer.from(pngBuffer))
  } catch (error) {
    console.error('Share card rendering failed', error)
    const fallbackBuffer = await renderFallbackShareCardPng()
    res.setHeader('Cache-Control', immutableCacheControl)
    res.type('png').send(Buffer.from(fallbackBuffer))
  }
}
