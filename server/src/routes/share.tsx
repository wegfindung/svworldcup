import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Request, Response } from 'express'
import { Resvg } from '@resvg/resvg-js'
import { env } from '../config/env.js'
import { decodeShareSnapshotPayload, type ShareSnapshotPayload } from '../lib/sharePayload.js'
import { getShareCopy } from '../lib/shareCopy.js'

const shareCardWidth = 1200
const shareCardHeight = 630
const immutableCacheControl = 'public, immutable, no-transform, max-age=31536000'
const requestTimeoutMs = 4_000

interface LoadedFont {
  name: string
  format: 'woff'
  data: ArrayBuffer
  weight: 500 | 700
  style: 'normal'
}

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

function getRawSharePayload(req: Request) {
  return String(req.query.data ?? '').trim()
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
  return `https://wsrv.nl/?url=${encodeURIComponent(originalUrl)}&w=320&h=380&fit=cover&output=png`
}

async function buildShareRenderData(payload: ShareSnapshotPayload) {
  const playerPlaceholderPath = await resolvePublicAssetPath('placeholders/player.svg')
  const placeholderDataUrl = await readFileAsDataUrl(playerPlaceholderPath, 'image/svg+xml')

  const players = await Promise.all(
    payload.featuredPlayers.map(async (player) => {
      const flagPath = await resolvePublicAssetPath(`team-flags/${player.teamCode}.svg`)
      const [portraitDataUrl, flagDataUrl] = await Promise.all([
        fetchImageDataUrl(buildPlayerProxyUrl(player.imageUrl), placeholderDataUrl),
        readFileAsDataUrl(flagPath, 'image/svg+xml'),
      ])

      return {
        ...player,
        portraitDataUrl,
        flagDataUrl,
      }
    }),
  )

  return {
    payload,
    players,
    cta: getShareCopy(payload.locale).cta,
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

function renderMultilineText(lines: string[], x: number, y: number, lineHeight: number, fontSize: number, weight: 500 | 700, fill: string) {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" fill="${fill}" font-family="Outfit" font-size="${fontSize}" font-weight="${weight}">${escapeXml(
          line,
        )}</text>`,
    )
    .join('')
}

function buildEmbeddedFontCss(fonts: LoadedFont[]) {
  return fonts
    .map(
      (font) =>
        `@font-face{font-family:'${font.name}';src:url(data:font/${font.format};base64,${Buffer.from(font.data).toString('base64')}) format('${font.format}');font-weight:${font.weight};font-style:${font.style};}`,
    )
    .join('')
}

function buildShareCardSvg(
  payload: ShareSnapshotPayload,
  players: Array<
    ShareSnapshotPayload['featuredPlayers'][number] & {
      portraitDataUrl: string
      flagDataUrl: string
    }
  >,
  cta: string,
  fonts: LoadedFont[],
) {
  const statementLines = wrapText(payload.statement, 32, 3)
  const playerNameLineHeight = 28
  const cardWidth = players.length === 2 ? 320 : 250
  const cardGap = 24
  const totalCardsWidth = players.length * cardWidth + (players.length - 1) * cardGap
  const cardsStartX = Math.round((shareCardWidth - totalCardsWidth) / 2)
  const cardsTopY = 206
  const cardImageHeight = 290
  const cardHeight = 402
  const ctaLines = wrapText(cta, 28, 2)

  const playerCardsSvg = players
    .map((player, index) => {
      const x = cardsStartX + index * (cardWidth + cardGap)
      const y = cardsTopY
      const playerClipId = `player-clip-${player.playerId}-${index}`
      const flagClipId = `flag-clip-${player.playerId}-${index}`
      const playerNameLines = wrapText(truncateText(player.displayName, 28), players.length === 2 ? 17 : 16, 2)

      return `
        <g transform="translate(${x}, ${y})">
          <defs>
            <clipPath id="${playerClipId}">
              <rect x="0" y="0" width="${cardWidth}" height="${cardImageHeight}" rx="30" ry="30" />
            </clipPath>
            <clipPath id="${flagClipId}">
              <circle cx="26" cy="26" r="26" />
            </clipPath>
          </defs>
          <rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" rx="30" ry="30" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.24)" stroke-width="2" />
          <image href="${player.portraitDataUrl}" x="0" y="0" width="${cardWidth}" height="${cardImageHeight}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${playerClipId})" />
          <rect x="0" y="${cardImageHeight - 62}" width="${cardWidth}" height="62" fill="rgba(0,0,0,0.18)" clip-path="url(#${playerClipId})" />
          <g transform="translate(18, 18)">
            <circle cx="26" cy="26" r="28" fill="#ffffff" fill-opacity="0.94" />
            <image href="${player.flagDataUrl}" x="0" y="0" width="52" height="52" clip-path="url(#${flagClipId})" preserveAspectRatio="xMidYMid slice" />
          </g>
          <rect x="${cardWidth - 86}" y="18" width="68" height="40" rx="20" ry="20" fill="rgba(7,18,15,0.88)" />
          <text x="${cardWidth - 52}" y="45" text-anchor="middle" fill="#d4ff83" font-family="Outfit" font-size="20" font-weight="700">${player.rating}</text>
          <text x="20" y="${cardImageHeight + 34}" fill="#d4ff83" font-family="Outfit" font-size="14" font-weight="700" letter-spacing="2">${escapeXml(
            player.slotClass,
          )}</text>
          ${renderMultilineText(playerNameLines, 20, cardImageHeight + 72, playerNameLineHeight, players.length === 2 ? 30 : 26, 700, '#f4f0e8')}
        </g>
      `
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${shareCardWidth}" height="${shareCardHeight}" viewBox="0 0 ${shareCardWidth} ${shareCardHeight}" role="img" aria-label="${escapeXml(
    payload.statement,
  )}">
  <defs>
    <style>
      ${buildEmbeddedFontCss(fonts)}
      text { font-family: 'Outfit'; }
    </style>
    <linearGradient id="share-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#06140f" />
      <stop offset="48%" stop-color="#0b2f22" />
      <stop offset="100%" stop-color="#081a14" />
    </linearGradient>
    <linearGradient id="statement-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.48)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.3)" />
    </linearGradient>
  </defs>

  <rect width="${shareCardWidth}" height="${shareCardHeight}" fill="url(#share-bg)" />
  <rect x="0" y="248" width="${shareCardWidth}" height="134" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2" />
  <line x1="${shareCardWidth / 2}" y1="248" x2="${shareCardWidth / 2}" y2="382" stroke="rgba(255,255,255,0.18)" stroke-width="2" />
  <circle cx="${shareCardWidth / 2}" cy="315" r="68" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="2" />

  <rect x="44" y="42" width="270" height="42" rx="21" ry="21" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)" stroke-width="1.5" />
  <text x="64" y="69" fill="#f4f0e8" font-size="18" font-weight="700" letter-spacing="2">SOCCERVERSE WORLD CUP</text>

  <rect x="44" y="100" width="1112" height="${statementLines.length * 52 + 30}" rx="28" ry="28" fill="rgba(0,0,0,0.34)" stroke="rgba(255,255,255,0.14)" stroke-width="1.5" />
  ${renderMultilineText(statementLines, 68, 148, 52, 48, 700, '#f4f0e8')}

  ${playerCardsSvg}

  <text x="44" y="588" fill="rgba(255,255,255,0.82)" font-size="26" font-weight="500">${escapeXml(payload.managerName)}</text>

  <g transform="translate(770, 532)">
    <rect x="0" y="0" width="386" height="64" rx="32" ry="32" fill="#d4ff83" />
    ${renderMultilineText(ctaLines, 26, ctaLines.length === 1 ? 41 : 30, 22, 20, 700, '#0a1c15')}
  </g>
</svg>`
}

async function renderShareCardPng(payload: ShareSnapshotPayload) {
  const [fonts, renderData] = await Promise.all([loadShareFonts(), buildShareRenderData(payload)])
  const { players, cta } = renderData
  const svg = buildShareCardSvg(payload, players, cta, fonts)

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: shareCardWidth,
    },
  })

  return resvg.render().asPng()
}

async function renderFallbackShareCardPng() {
  const fonts = await loadShareFonts()
  const copy = getShareCopy('en')
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${shareCardWidth}" height="${shareCardHeight}" viewBox="0 0 ${shareCardWidth} ${shareCardHeight}">
  <defs>
    <style>
      ${buildEmbeddedFontCss(fonts)}
      text { font-family: 'Outfit'; }
    </style>
    <linearGradient id="fallback-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#07120f" />
      <stop offset="100%" stop-color="#123227" />
    </linearGradient>
  </defs>
  <rect width="${shareCardWidth}" height="${shareCardHeight}" fill="url(#fallback-bg)" />
  <text x="600" y="270" text-anchor="middle" fill="#f4f0e8" font-size="58" font-weight="700">Soccerverse World Cup</text>
  <text x="600" y="332" text-anchor="middle" fill="#f4f0e8" font-size="30" font-weight="500">${escapeXml(copy.cta)}</text>
</svg>`
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: shareCardWidth,
    },
  })
  return resvg.render().asPng()
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
    const pageUrl = `${origin}/share/snapshot?data=${encodeURIComponent(rawPayload)}`
    const imageUrl = `${origin}/api/public/share-card.png?data=${encodeURIComponent(rawPayload)}`
    const playerNames = payload.featuredPlayers.map((player) => player.displayName).join(', ')
    const title = `${payload.managerName} · ${copy.pageTitleSuffix}`
    const description = `${payload.statement} ${copy.pageDescriptionPrefix}: ${playerNames}. ${copy.cta}`

    res.setHeader('Cache-Control', immutableCacheControl)
    res.type('html').send(`<!doctype html>
<html lang="${escapeHtml(payload.locale)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:width" content="${shareCardWidth}" />
    <meta property="og:image:height" content="${shareCardHeight}" />
    <meta property="og:image:alt" content="${escapeHtml(description)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  </head>
  <body>
    <main>
      <h1>${escapeHtml(copy.bodyHeading)}</h1>
      <p>${escapeHtml(payload.statement)}</p>
      <p>${escapeHtml(copy.bodyIntro)}</p>
      <p>${escapeHtml(copy.cta)}</p>
      <p>${escapeHtml(playerNames)}</p>
      <p><a href="${escapeHtml(origin)}/builder">${escapeHtml(copy.bodyButton)}</a></p>
      <p><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(description)}" width="${shareCardWidth}" height="${shareCardHeight}" /></p>
    </main>
  </body>
</html>`)
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
