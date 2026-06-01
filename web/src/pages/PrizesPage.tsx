import { Link } from 'react-router-dom'
import type { LocaleCode } from '../lib/types'

interface PrizesPageProps {
  locale: LocaleCode
}

interface PrizeCopy {
  imageAlt: string
  cta: string
}

const englishCopy: PrizeCopy = {
  imageAlt: 'Final prize distribution graphic for The Grand Tournament Soccerverse Community Event',
  cta: 'Register your squad',
}

const copyByLocale: Partial<Record<LocaleCode, PrizeCopy>> = {
  en: englishCopy,
  es: {
    imageAlt: 'Grafica final de distribucion de premios de The Grand Tournament Soccerverse Community Event',
    cta: 'Registrar plantilla',
  },
  it: {
    imageAlt: 'Grafica finale della distribuzione premi di The Grand Tournament Soccerverse Community Event',
    cta: 'Registra la rosa',
  },
  de: {
    imageAlt: 'Finale Preisverteilungs-Grafik fuer The Grand Tournament Soccerverse Community Event',
    cta: 'Kader registrieren',
  },
  fr: {
    imageAlt: 'Graphique final de distribution des prix de The Grand Tournament Soccerverse Community Event',
    cta: 'Inscrire ton effectif',
  },
  pt: {
    imageAlt: 'Grafico final da distribuicao de premios do The Grand Tournament Soccerverse Community Event',
    cta: 'Registar equipa',
  },
  ru: {
    imageAlt: 'Финальная графика распределения призов The Grand Tournament Soccerverse Community Event',
    cta: 'Зарегистрировать состав',
  },
  zh: {
    imageAlt: 'The Grand Tournament Soccerverse Community Event 最终奖品分配图',
    cta: '注册阵容',
  },
  ja: {
    imageAlt: 'The Grand Tournament Soccerverse Community Event の最終賞品配分グラフィック',
    cta: 'スカッドを登録',
  },
}

function getPrizeCopy(locale: LocaleCode) {
  return copyByLocale[locale] ?? englishCopy
}

export function PrizesPage({ locale }: PrizesPageProps) {
  const copy = getPrizeCopy(locale)

  return (
    <div className="pb-10">
      <h1 className="sr-only">The Grand Tournament prize distribution</h1>

      <section className="mx-auto max-w-[72rem]">
        <div className="hero-card overflow-hidden rounded-[1.25rem] p-2 sm:p-3">
          <img
            src="/prizes/final_prize_distribution.png"
            alt={copy.imageAlt}
            width={1055}
            height={1491}
            className="block h-auto w-full rounded-[1rem]"
          />
        </div>

        <div className="mt-5 flex justify-center">
          <Link to="/register" className="premium-button px-6 py-3 text-sm font-semibold">
            {copy.cta}
          </Link>
        </div>
      </section>
    </div>
  )
}
