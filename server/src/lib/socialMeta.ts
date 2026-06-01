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

export function renderIndexSocialMeta(html: string, locale: SupportedLocale, pageUrl: string) {
  const copy = homeSocialCopyByLocale[locale] ?? homeSocialCopyByLocale[defaultLocale]
  const escapedTitle = escapeHtmlAttribute(copy.title)

  return [
    (value: string) => value.replace(/<html lang="[^"]*">/i, `<html lang="${escapeHtmlAttribute(copy.htmlLang)}">`),
    (value: string) => value.replace(/<title>.*?<\/title>/i, `<title>${escapedTitle}</title>`),
    (value: string) => replaceMetaContent(value, 'name="description"', copy.description),
    (value: string) => replaceMetaContent(value, 'property="og:locale"', copy.ogLocale),
    (value: string) => replaceMetaContent(value, 'property="og:url"', pageUrl),
    (value: string) => replaceMetaContent(value, 'property="og:title"', copy.title),
    (value: string) => replaceMetaContent(value, 'property="og:description"', copy.description),
    (value: string) => replaceMetaContent(value, 'property="og:image:alt"', copy.imageAlt),
    (value: string) => replaceMetaContent(value, 'name="twitter:title"', copy.title),
    (value: string) => replaceMetaContent(value, 'name="twitter:description"', copy.description),
    (value: string) => replaceMetaContent(value, 'name="twitter:image:alt"', copy.imageAlt),
  ].reduce((currentHtml, transform) => transform(currentHtml), html)
}

export function getOgLocale(locale: SupportedLocale) {
  return (homeSocialCopyByLocale[locale] ?? homeSocialCopyByLocale[defaultLocale]).ogLocale
}
