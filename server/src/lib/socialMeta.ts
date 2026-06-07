import { defaultLocale, supportedLocales } from '../data/worldCupSeed.js'
import type { SupportedLocale } from '../domain/types.js'

export const noIndexRobotsValue = 'noindex, nofollow, noarchive, nosnippet'

interface HomeSocialCopy {
  htmlLang: string
  ogLocale: string
  title: string
  description: string
  imageAlt: string
}

const homeSocialCopyByLocale: Record<SupportedLocale, HomeSocialCopy> = {
  en: {
    htmlLang: 'en',
    ogLocale: 'en_US',
    title: 'The Grand Tournament',
    description:
      'Build a hidden Soccerverse squad, lock it for the tournament, and compete across Rookie, Veteran, and Nations tables. Unlock $5,000 SVV with the community.',
    imageAlt: 'The Grand Tournament social preview image',
  },
  es: {
    htmlLang: 'es',
    ogLocale: 'es_ES',
    title: 'The Grand Tournament',
    description:
      'Crea una plantilla oculta de Soccerverse, bloquéala para el torneo y compite en las tablas Rookie, Veteran y Nations. Desbloquea $5,000 SVV con la comunidad.',
    imageAlt: 'Imagen de vista previa social de The Grand Tournament',
  },
  it: {
    htmlLang: 'it',
    ogLocale: 'it_IT',
    title: 'The Grand Tournament',
    description:
      'Crea una rosa nascosta di Soccerverse, bloccala per il torneo e competi nelle classifiche Rookie, Veteran e Nations. Sblocca $5,000 SVV con la community.',
    imageAlt: 'Immagine di anteprima social di The Grand Tournament',
  },
  de: {
    htmlLang: 'de',
    ogLocale: 'de_DE',
    title: 'The Grand Tournament',
    description:
      'Baue einen versteckten Soccerverse-Kader, locke ihn fuer das Turnier und tritt in Rookie-, Veteran- und Nations-Tabellen an. Schalte mit der Community $5,000 SVV frei.',
    imageAlt: 'Social-Preview-Bild von The Grand Tournament',
  },
  fr: {
    htmlLang: 'fr',
    ogLocale: 'fr_FR',
    title: 'The Grand Tournament',
    description:
      'Construis un effectif Soccerverse cache, verrouille-le pour le tournoi et joue les classements Rookie, Veteran et Nations. Debloque $5,000 SVV avec la communaute.',
    imageAlt: 'Image de partage social de The Grand Tournament',
  },
  pt: {
    htmlLang: 'pt',
    ogLocale: 'pt_PT',
    title: 'The Grand Tournament',
    description:
      'Cria uma equipa Soccerverse oculta, bloqueia-a para o torneio e compete nas tabelas Rookie, Veteran e Nations. Desbloqueia $5,000 SVV com a comunidade.',
    imageAlt: 'Imagem de pre-visualizacao social de The Grand Tournament',
  },
  ru: {
    htmlLang: 'ru',
    ogLocale: 'ru_RU',
    title: 'The Grand Tournament',
    description:
      'Собери скрытый состав Soccerverse, зафиксируй его на турнир и соревнуйся в таблицах Rookie, Veteran и Nations. Разблокируйте $5,000 SVV вместе с сообществом.',
    imageAlt: 'Социальное изображение предпросмотра The Grand Tournament',
  },
  zh: {
    htmlLang: 'zh',
    ogLocale: 'zh_CN',
    title: 'The Grand Tournament',
    description:
      '组建隐藏的 Soccerverse 阵容，锁定参赛，并在 Rookie、Veteran 和 Nations 排行榜竞争。与社区一起解锁 $5,000 SVV。',
    imageAlt: 'The Grand Tournament 社交分享预览图',
  },
  ja: {
    htmlLang: 'ja',
    ogLocale: 'ja_JP',
    title: 'The Grand Tournament',
    description:
      '非公開の Soccerverse スカッドを作成し、トーナメント用にロックして、Rookie、Veteran、Nations のランキングで競いましょう。コミュニティで $5,000 SVV をアンロック。',
    imageAlt: 'The Grand Tournament のソーシャル共有プレビュー画像',
  },
}

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function resolveSocialLocale(input: unknown): SupportedLocale {
  const candidate = Array.isArray(input) ? input[0] : input
  const value = String(candidate ?? '').trim().toLowerCase().split(/[-_]/, 1)[0]
  return supportedLocales.includes(value as SupportedLocale) ? (value as SupportedLocale) : defaultLocale
}

export function resolveSocialLocaleFromQuery(query: Record<string, unknown>) {
  return resolveSocialLocale(query.share_locale ?? query.lang ?? query.locale)
}

function replaceMetaContent(html: string, attribute: string, content: string) {
  const escapedContent = escapeHtmlAttribute(content)
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(<meta\\s+${escapedAttribute}\\s+content=")[^"]*("\\s*/?>)`, 'i')
  return html.replace(pattern, `$1${escapedContent}$2`)
}

function buildAbsoluteUrl(pathname: string, baseUrl: string) {
  return new URL(pathname, baseUrl).toString()
}

export const indexRobotsValue = 'index, follow'

const siteName = 'The Grand Tournament'

interface RouteMeta {
  title: string
  description: string
}

// Per-route SEO metadata for the indexable public pages other than home (home uses the localized
// social copy above). English-only — locale variants are covered by hreflang alternates and the
// localized page body. See SOP_system_overview.md "SEO & Discoverability".
const routeMetaByPath: Record<string, RouteMeta> = {
  '/prizes': {
    title: `Prizes — ${siteName}`,
    description:
      'A $5,000 SVV prize pool, free to enter. Veteran 50%, Nations 30%, Rookie 20% — the full breakdown of how the prizes are shared.',
  },
  '/rules': {
    title: `Rules — ${siteName}`,
    description:
      'How The Grand Tournament works: squad building, the salary-budget multiplier, scoring, swap windows, and league rules.',
  },
  '/help': {
    title: `Help & FAQ — ${siteName}`,
    description:
      'Answers for registration, account access, squad changes, scoring, and the Soccerverse game behind the event.',
  },
  '/about': {
    title: `About — ${siteName}`,
    description:
      'A free, fan-made fantasy game for the 2026 tournament, built by the Soccerverse community. Not an official Soccerverse product.',
  },
  '/privacy': {
    title: `Privacy — ${siteName}`,
    description: 'How The Grand Tournament Community Event handles your data.',
  },
  '/how-to-play': {
    title: `How to play — ${siteName}`,
    description:
      'New here? The whole game in five steps. Free to enter, no Soccerverse account needed — pick a squad, lock it, and climb the leaderboards.',
  },
  '/tables': {
    title: `Leaderboards — ${siteName}`,
    description: 'Live Rookie, Veteran, and Nation standings for The Grand Tournament.',
  },
  '/results': {
    title: `Results — ${siteName}`,
    description: 'Match results and fixtures for the 2026 Grand Tournament.',
  },
}

// Prerendered marketing pages (body baked at build) — a strict subset of the indexable set.
export const prerenderedPaths: string[] = ['/', '/prizes', '/rules', '/help', '/about', '/privacy', '/how-to-play']

const indexablePaths = new Set<string>(['/', ...Object.keys(routeMetaByPath)])

function normalizePath(pathname: string): string {
  if (!pathname) {
    return '/'
  }
  const trimmed = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  return trimmed || '/'
}

export function isIndexablePath(pathname: string): boolean {
  return indexablePaths.has(normalizePath(pathname))
}

function replaceCanonical(html: string, url: string): string {
  const tag = `<link rel="canonical" href="${escapeHtmlAttribute(url)}" />`
  if (/<link\s+rel="canonical"[^>]*>/i.test(html)) {
    return html.replace(/<link\s+rel="canonical"[^>]*>/i, tag)
  }
  return injectIntoHead(html, tag)
}

function injectIntoHead(html: string, block: string): string {
  if (!block) {
    return html
  }
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${block}</head>`)
  }
  return html
}

function buildHreflangLinks(indexable: boolean, path: string, origin: string): string {
  if (!indexable) {
    return ''
  }
  const cleanUrl = buildAbsoluteUrl(path, origin)
  const links = supportedLocales.map((loc) => {
    const href = loc === defaultLocale ? cleanUrl : `${cleanUrl}?lang=${loc}`
    return `<link rel="alternate" hreflang="${loc}" href="${escapeHtmlAttribute(href)}" />`
  })
  links.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtmlAttribute(cleanUrl)}" />`)
  return links.join('')
}

function buildJsonLd(path: string, title: string, description: string, url: string, imageUrl: string, origin: string): string {
  const graph: Record<string, unknown>[] = [
    { '@type': 'Organization', '@id': `${origin}/#org`, name: siteName, url: origin, logo: imageUrl },
    { '@type': 'WebSite', '@id': `${origin}/#website`, name: siteName, url: origin, publisher: { '@id': `${origin}/#org` } },
    { '@type': 'WebPage', url, name: title, description, isPartOf: { '@id': `${origin}/#website` } },
  ]
  if (path === '/') {
    graph.push({
      '@type': 'SportsEvent',
      name: 'The Grand Tournament Community Event',
      description,
      sport: 'Soccer',
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      startDate: '2026-06-11T19:00:00Z',
      url: origin,
      image: imageUrl,
      organizer: { '@id': `${origin}/#org` },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${origin}/register`,
      },
    })
  }
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
  return `<script type="application/ld+json">${json}</script>`
}

export function renderIndexSocialMeta(
  html: string,
  locale: SupportedLocale,
  pageUrl: string,
  pathname = '/',
  baseUrl?: string,
) {
  const path = normalizePath(pathname)
  const home = homeSocialCopyByLocale[locale] ?? homeSocialCopyByLocale[defaultLocale]
  const route = routeMetaByPath[path]
  const indexable = indexablePaths.has(path)
  const origin = (baseUrl ?? new URL(pageUrl).origin).replace(/\/+$/, '')
  const canonicalUrl = buildAbsoluteUrl(path, origin)
  const imageUrl = buildAbsoluteUrl('/brand/og-image.jpg', origin)
  const title = path === '/' ? home.title : (route?.title ?? home.title)
  const description = route?.description ?? home.description
  const robots = indexable ? indexRobotsValue : noIndexRobotsValue

  const transforms: ((value: string) => string)[] = [
    (value) => value.replace(/<html lang="[^"]*">/i, `<html lang="${escapeHtmlAttribute(home.htmlLang)}">`),
    (value) => value.replace(/<title>.*?<\/title>/i, `<title>${escapeHtmlAttribute(title)}</title>`),
    (value) => replaceMetaContent(value, 'name="description"', description),
    (value) => replaceMetaContent(value, 'name="robots"', robots),
    (value) => replaceMetaContent(value, 'property="og:locale"', home.ogLocale),
    (value) => replaceMetaContent(value, 'property="og:url"', pageUrl),
    (value) => replaceMetaContent(value, 'property="og:title"', title),
    (value) => replaceMetaContent(value, 'property="og:description"', description),
    (value) => replaceMetaContent(value, 'property="og:image"', imageUrl),
    (value) => replaceMetaContent(value, 'property="og:image:alt"', home.imageAlt),
    (value) => replaceMetaContent(value, 'name="twitter:title"', title),
    (value) => replaceMetaContent(value, 'name="twitter:description"', description),
    (value) => replaceMetaContent(value, 'name="twitter:image"', imageUrl),
    (value) => replaceMetaContent(value, 'name="twitter:image:alt"', home.imageAlt),
    (value) => replaceCanonical(value, canonicalUrl),
    (value) => injectIntoHead(value, buildHreflangLinks(indexable, path, origin)),
    (value) => injectIntoHead(value, buildJsonLd(path, title, description, canonicalUrl, imageUrl, origin)),
  ]

  return transforms.reduce((currentHtml, transform) => transform(currentHtml), html)
}

export function buildRobotsTxt(baseUrl: string): string {
  const origin = baseUrl.replace(/\/+$/, '')
  return [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /builder',
    'Disallow: /register',
    'Disallow: /verify',
    'Disallow: /login',
    'Disallow: /reset-password',
    'Disallow: /profiles',
    'Allow: /',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n')
}

export function buildSitemapXml(baseUrl: string): string {
  const origin = baseUrl.replace(/\/+$/, '')
  const urls = [...indexablePaths]
    .sort()
    .map((path) => `  <url><loc>${escapeHtmlAttribute(buildAbsoluteUrl(path, origin))}</loc></url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

export function getOgLocale(locale: SupportedLocale) {
  return (homeSocialCopyByLocale[locale] ?? homeSocialCopyByLocale[defaultLocale]).ogLocale
}
