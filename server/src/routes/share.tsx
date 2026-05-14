import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Request, Response } from 'express'
import { Resvg, type ResvgRenderOptions } from '@resvg/resvg-js'
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

type ShareRenderCopy = ReturnType<typeof getShareCopy>
type ResvgOptionsWithFontBuffers = ResvgRenderOptions & {
  font?: NonNullable<ResvgRenderOptions['font']> & {
    fontBuffers?: Uint8Array[]
  }
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

function renderCenteredMultilineText(
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  fontSize: number,
  weight: 500 | 700,
  fill: string,
) {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" text-anchor="middle" fill="${fill}" font-family="Outfit" font-size="${fontSize}" font-weight="${weight}">${escapeXml(
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

function createShareRenderer(svg: string, fonts: LoadedFont[]) {
  const options: ResvgOptionsWithFontBuffers = {
    font: {
      fontBuffers: fonts.map((font) => new Uint8Array(font.data)),
      loadSystemFonts: false,
      defaultFontFamily: 'Outfit',
      sansSerifFamily: 'Outfit',
    },
    fitTo: {
      mode: 'width',
      value: shareCardWidth,
    },
  }

  return new Resvg(svg, options)
}

function buildShareCardSvg(
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
  const cardWidth = players.length === 2 ? 330 : 280
  const cardHeight = 260
  const cardGap = players.length === 2 ? 34 : 30
  const totalCardsWidth = players.length * cardWidth + (players.length - 1) * cardGap
  const cardsStartX = Math.round((shareCardWidth - totalCardsWidth) / 2)
  const panelX = 58
  const panelY = 210
  const panelWidth = 1084
  const panelHeight = 318
  const cardsTopY = 244
  const ctaY = 548
  const ctaText = truncateText(copy.cta, 76)

  const playerCardsSvg = players
    .map((player, index) => {
      const x = cardsStartX + index * (cardWidth + cardGap)
      const y = cardsTopY
      const playerClipId = `player-clip-${player.playerId}-${index}`
      const flagClipId = `flag-clip-${player.playerId}-${index}`
      const playerNameLines = wrapText(truncateText(player.renderLabel, 30), players.length === 2 ? 18 : 15, 2)
      const playerNameY = playerNameLines.length === 1 ? cardHeight - 34 : cardHeight - 47
      const flagX = cardWidth - 68

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
          <rect x="0" y="${cardHeight - 132}" width="${cardWidth}" height="132" fill="url(#card-bottom-shade)" clip-path="url(#${playerClipId})" />
          <g transform="translate(${flagX}, 18)">
            <circle cx="22" cy="22" r="24" fill="#f4f0e8" fill-opacity="0.96" />
            <image href="${player.flagDataUrl}" x="0" y="0" width="44" height="44" clip-path="url(#${flagClipId})" preserveAspectRatio="xMidYMid slice" />
          </g>
          <rect x="18" y="${cardHeight - 82}" width="${cardWidth - 36}" height="64" rx="20" ry="20" fill="rgba(4,10,8,0.86)" stroke="rgba(255,255,255,0.12)" stroke-width="1.2" />
          ${renderCenteredMultilineText(playerNameLines, Math.round(cardWidth / 2), playerNameY, 22, players.length === 2 ? 24 : 22, 700, '#f4f0e8')}
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

  <rect x="72" y="48" width="286" height="40" rx="20" ry="20" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.14)" stroke-width="1.5" />
  <text x="92" y="73" fill="#f4f0e8" font-size="18" font-weight="700" letter-spacing="2">${escapeXml(copy.bodyBadge.toUpperCase())}</text>
  <text x="1128" y="74" text-anchor="end" fill="rgba(255,255,255,0.74)" font-size="18" font-weight="500">${escapeXml(
    `${copy.bodyBylinePrefix} ${payload.managerName}`,
  )}</text>
  ${renderMultilineText(statementLines, 72, 138, 48, 46, 700, '#f4f0e8')}

  ${playerCardsSvg}

  <g transform="translate(72, ${ctaY})">
    <rect x="0" y="0" width="1056" height="58" rx="29" ry="29" fill="url(#cta-fill)" />
    <text x="528" y="37" text-anchor="middle" fill="#07120f" font-size="27" font-weight="700">${escapeXml(ctaText)}</text>
  </g>
</svg>`
}

async function renderShareCardPng(payload: ShareSnapshotPayload) {
  const [fonts, renderData] = await Promise.all([loadShareFonts(), buildShareRenderData(payload)])
  const { players, copy } = renderData
  const svg = buildShareCardSvg(payload, players, copy, fonts)
  const resvg = createShareRenderer(svg, fonts)

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
      text { font-family: 'Outfit', sans-serif; }
    </style>
    <linearGradient id="fallback-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#07120f" />
      <stop offset="100%" stop-color="#123227" />
    </linearGradient>
  </defs>
  <rect width="${shareCardWidth}" height="${shareCardHeight}" fill="url(#fallback-bg)" />
  <text x="600" y="262" text-anchor="middle" fill="#f4f0e8" font-size="58" font-weight="700">Soccerverse World Cup</text>
  <text x="600" y="330" text-anchor="middle" fill="#f4f0e8" font-size="28" font-weight="500">${escapeXml(copy.cta)}</text>
</svg>`
  const resvg = createShareRenderer(svg, fonts)
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

      @media (max-width: 768px) {
        main { width: min(1180px, calc(100% - 20px)); padding-top: 18px; }
        .hero { padding: 20px 20px 6px; }
        .image-wrap { padding: 12px; }
        .subnote { padding: 0 20px 20px; }
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
    const pageUrl = `${origin}/share/snapshot?data=${encodeURIComponent(rawPayload)}`
    const imageUrl = `${origin}/api/public/share-card.png?data=${encodeURIComponent(rawPayload)}`

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
