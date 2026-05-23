import { Link } from 'react-router-dom'
import type { LocaleCode } from '../lib/types'

interface PrizesPageProps {
  locale: LocaleCode
}

const englishCopy = {
  eyebrow: 'prize dummy',
  title: 'Prize structure, pending final confirmation.',
  body:
    'This page mirrors the current infographic so the onboarding mail has a live prize link. Amounts, items, and payout logic are still provisional until the event team confirms them.',
  status: 'Not final confirmed',
  imageAlt: 'Draft infographic for the Soccerverse World Cup Event prize structure',
  individualTitle: 'Individual leagues',
  individualBody: 'Rookie and Veteran leagues currently use the same prize ladder.',
  individualItems: [
    { rank: '1st', prize: '200 SVV', extra: 'Exclusive Winner Shirt' },
    { rank: '2nd', prize: '100 SVV', extra: 'Exclusive Cap' },
    { rank: '3rd', prize: '75 SVV', extra: '' },
    { rank: '4th-10th', prize: '20 SVV each', extra: '' },
  ],
  nationalTitle: 'National league pool',
  nationalBody:
    'The community milestone pool grows with participants, capped at 500 SVV. The achieved milestone pool is distributed in full.',
  nationalItems: [
    '200 participants unlock 50 SVV.',
    '400 participants unlock 100 SVV.',
    '2000 participants unlock the 500 SVV cap.',
    'A winning nation with 11+ managers receives the full unlocked pool for its members.',
    'If an underdog nation with fewer than 11 managers wins, 20% goes there and the remaining pool is reallocated to the next eligible nation or nations.',
  ],
  cta: 'Register your squad',
}

const copyByLocale: Partial<Record<LocaleCode, typeof englishCopy>> = {}

copyByLocale.en = englishCopy
copyByLocale.de = {
  eyebrow: 'preis-dummy',
  title: 'Preisstruktur, noch nicht final bestätigt.',
  body:
    'Diese Seite spiegelt die aktuelle Infografik, damit die Onboarding-Mail bereits einen funktionierenden Preis-Link hat. Beträge, Items und Auszahlungslogik sind noch vorläufig, bis das Event-Team sie final bestätigt.',
  status: 'Noch nicht final bestätigt',
  imageAlt: 'Entwurf der Infografik zur Soccerverse World Cup Event Preisstruktur',
  individualTitle: 'Individual-Leagues',
  individualBody: 'Rookie und Veteran League nutzen aktuell dieselbe Preisstaffel.',
  individualItems: [
    { rank: '1.', prize: '200 SVV', extra: 'Exclusive Winner Shirt' },
    { rank: '2.', prize: '100 SVV', extra: 'Exclusive Cap' },
    { rank: '3.', prize: '75 SVV', extra: '' },
    { rank: '4.-10.', prize: '20 SVV jeweils', extra: '' },
  ],
  nationalTitle: 'National League Pool',
  nationalBody:
    'Der Community Milestone Pool wächst mit der Teilnehmerzahl und ist bei 500 SVV gedeckelt. Der erreichte Milestone Pool wird voll ausgespielt.',
  nationalItems: [
    '200 Teilnehmende schalten 50 SVV frei.',
    '400 Teilnehmende schalten 100 SVV frei.',
    '2000 Teilnehmende schalten den 500 SVV Cap frei.',
    'Eine Gewinner-Nation mit 11+ Managern erhält den vollen freigeschalteten Pool für ihre Mitglieder.',
    'Gewinnt eine Underdog-Nation mit weniger als 11 Managern, gehen 20% dorthin und der Rest wird an die nächste berechtigte Nation oder Nationen verteilt.',
  ],
  cta: 'Kader registrieren',
}

copyByLocale.es = {
  eyebrow: 'premios dummy',
  title: 'Estructura de premios pendiente de confirmación final.',
  body:
    'Esta página refleja la infografía actual para que el email de onboarding ya tenga un enlace de premios activo. Cantidades, artículos y lógica de pago siguen siendo provisionales hasta la confirmación final del equipo del evento.',
  status: 'Aún no confirmado',
  imageAlt: 'Infografía provisional de la estructura de premios del Soccerverse World Cup Event',
  individualTitle: 'Ligas individuales',
  individualBody: 'Las ligas Rookie y Veteran usan actualmente la misma escala de premios.',
  individualItems: [
    { rank: '1.º', prize: '200 SVV', extra: 'Exclusive Winner Shirt' },
    { rank: '2.º', prize: '100 SVV', extra: 'Exclusive Cap' },
    { rank: '3.º', prize: '75 SVV', extra: '' },
    { rank: '4.º-10.º', prize: '20 SVV cada uno', extra: '' },
  ],
  nationalTitle: 'Pool de liga nacional',
  nationalBody:
    'El pool comunitario por hitos crece con los participantes y tiene un tope de 500 SVV. El pool alcanzado se distribuye completo.',
  nationalItems: [
    '200 participantes desbloquean 50 SVV.',
    '400 participantes desbloquean 100 SVV.',
    '2000 participantes desbloquean el cap de 500 SVV.',
    'Una nación ganadora con 11+ managers recibe el pool desbloqueado completo para sus miembros.',
    'Si gana una nación underdog con menos de 11 managers, el 20% va allí y el resto se reasigna a la siguiente nación o naciones elegibles.',
  ],
  cta: 'Registrar plantilla',
}

copyByLocale.fr = {
  eyebrow: 'prix dummy',
  title: 'Structure des prix en attente de confirmation finale.',
  body:
    'Cette page reprend l’infographie actuelle afin que l’email d’onboarding dispose déjà d’un lien prix actif. Montants, objets et logique de distribution restent provisoires jusqu’à confirmation finale par l’équipe événement.',
  status: 'Pas encore confirmé',
  imageAlt: 'Infographie provisoire de la structure des prix du Soccerverse World Cup Event',
  individualTitle: 'Ligues individuelles',
  individualBody: 'Les ligues Rookie et Veteran utilisent actuellement la même grille de prix.',
  individualItems: [
    { rank: '1er', prize: '200 SVV', extra: 'Exclusive Winner Shirt' },
    { rank: '2e', prize: '100 SVV', extra: 'Exclusive Cap' },
    { rank: '3e', prize: '75 SVV', extra: '' },
    { rank: '4e-10e', prize: '20 SVV chacun', extra: '' },
  ],
  nationalTitle: 'Pool de ligue nationale',
  nationalBody:
    'Le pool communautaire par paliers augmente avec le nombre de participants et est plafonné à 500 SVV. Le pool atteint est distribué intégralement.',
  nationalItems: [
    '200 participants débloquent 50 SVV.',
    '400 participants débloquent 100 SVV.',
    '2000 participants débloquent le cap de 500 SVV.',
    'Une nation gagnante avec 11+ managers reçoit tout le pool débloqué pour ses membres.',
    'Si une nation outsider avec moins de 11 managers gagne, 20% y vont et le reste est réalloué à la ou aux prochaines nations éligibles.',
  ],
  cta: 'Inscrire ton effectif',
}

copyByLocale.pt = {
  eyebrow: 'prémios dummy',
  title: 'Estrutura de prémios ainda por confirmar.',
  body:
    'Esta página replica a infografia atual para que o email de onboarding já tenha um link de prémios ativo. Valores, itens e lógica de pagamento ainda são provisórios até confirmação final da equipa do evento.',
  status: 'Ainda não confirmado',
  imageAlt: 'Infografia provisória da estrutura de prémios do Soccerverse World Cup Event',
  individualTitle: 'Ligas individuais',
  individualBody: 'As ligas Rookie e Veteran usam atualmente a mesma escala de prémios.',
  individualItems: [
    { rank: '1.º', prize: '200 SVV', extra: 'Exclusive Winner Shirt' },
    { rank: '2.º', prize: '100 SVV', extra: 'Exclusive Cap' },
    { rank: '3.º', prize: '75 SVV', extra: '' },
    { rank: '4.º-10.º', prize: '20 SVV cada', extra: '' },
  ],
  nationalTitle: 'Pool da liga nacional',
  nationalBody:
    'O pool comunitário por milestones cresce com participantes e tem cap de 500 SVV. O pool atingido é distribuído na totalidade.',
  nationalItems: [
    '200 participantes desbloqueiam 50 SVV.',
    '400 participantes desbloqueiam 100 SVV.',
    '2000 participantes desbloqueiam o cap de 500 SVV.',
    'Uma nação vencedora com 11+ managers recebe o pool desbloqueado completo para os seus membros.',
    'Se uma nação underdog com menos de 11 managers vencer, 20% vai para ela e o restante é realocado para a próxima nação ou nações elegíveis.',
  ],
  cta: 'Registar plantel',
}

copyByLocale.ru = {
  eyebrow: 'призы dummy',
  title: 'Структура призов ожидает финального подтверждения.',
  body:
    'Эта страница повторяет текущую инфографику, чтобы onboarding email уже вел на рабочую страницу призов. Суммы, предметы и логика выплат остаются предварительными до финального подтверждения команды события.',
  status: 'Еще не подтверждено',
  imageAlt: 'Черновая инфографика структуры призов Soccerverse World Cup Event',
  individualTitle: 'Индивидуальные лиги',
  individualBody: 'Rookie и Veteran лиги сейчас используют одну и ту же призовую лестницу.',
  individualItems: [
    { rank: '1-е', prize: '200 SVV', extra: 'Exclusive Winner Shirt' },
    { rank: '2-е', prize: '100 SVV', extra: 'Exclusive Cap' },
    { rank: '3-е', prize: '75 SVV', extra: '' },
    { rank: '4-10-е', prize: '20 SVV каждому', extra: '' },
  ],
  nationalTitle: 'Национальный призовой pool',
  nationalBody:
    'Community milestone pool растет вместе с числом участников и ограничен 500 SVV. Достигнутый milestone pool распределяется полностью.',
  nationalItems: [
    '200 участников открывают 50 SVV.',
    '400 участников открывают 100 SVV.',
    '2000 участников открывают cap 500 SVV.',
    'Победившая нация с 11+ managers получает весь открытый pool для своих участников.',
    'Если underdog-нация с менее чем 11 managers выигрывает, 20% идет ей, а оставшийся pool перераспределяется следующей eligible нации или нациям.',
  ],
  cta: 'Зарегистрировать состав',
}

copyByLocale.zh = {
  eyebrow: '奖品 dummy',
  title: '奖品结构仍待最终确认。',
  body:
    '此页面根据当前信息图制作，方便 onboarding 邮件使用可访问的奖品链接。金额、物品和发放逻辑在活动团队最终确认前仍为临时版本。',
  status: '尚未最终确认',
  imageAlt: 'Soccerverse World Cup Event 奖品结构草案信息图',
  individualTitle: '个人联赛',
  individualBody: 'Rookie 和 Veteran 联赛目前使用相同奖品阶梯。',
  individualItems: [
    { rank: '第 1 名', prize: '200 SVV', extra: 'Exclusive Winner Shirt' },
    { rank: '第 2 名', prize: '100 SVV', extra: 'Exclusive Cap' },
    { rank: '第 3 名', prize: '75 SVV', extra: '' },
    { rank: '第 4-10 名', prize: '每人 20 SVV', extra: '' },
  ],
  nationalTitle: '国家联赛奖池',
  nationalBody:
    '社区里程碑奖池随参与人数增长，最高 500 SVV。达到的里程碑奖池会全额发放。',
  nationalItems: [
    '200 名参与者解锁 50 SVV。',
    '400 名参与者解锁 100 SVV。',
    '2000 名参与者解锁 500 SVV 上限。',
    '拥有 11+ managers 的获胜国家会为成员获得完整解锁奖池。',
    '如果少于 11 managers 的 underdog 国家获胜，20% 发放给该国家，剩余奖池重新分配给下一个符合条件的国家。',
  ],
  cta: '注册阵容',
}

function getPrizeCopy(locale: LocaleCode) {
  return copyByLocale[locale] ?? englishCopy
}

export function PrizesPage({ locale }: PrizesPageProps) {
  const copy = getPrizeCopy(locale)

  return (
    <div className="space-y-4 pb-10">
      <section className="hero-card rounded-[1.25rem] p-3 sm:p-4 lg:p-5">
        <img
          src="/prizes/prize-structure-dummy.svg"
          alt={copy.imageAlt}
          width={1600}
          height={900}
          className="block w-full rounded-[0.85rem] border border-white/10 bg-black/20"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">{copy.eyebrow}</p>
            <span className="mono rounded-full border border-[var(--color-sand)]/25 bg-[var(--color-sand)]/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-sand)]">
              {copy.status}
            </span>
          </div>
          <h1 className="section-title mt-5 max-w-[13ch] text-white">{copy.title}</h1>
          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-[var(--color-muted)]">{copy.body}</p>
          <Link to="/register" className="premium-button mt-6 px-6 py-3 text-sm font-semibold">
            {copy.cta}
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
          <article className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
            <p className="eyebrow">{copy.individualTitle}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{copy.individualBody}</p>
            <div className="mt-5 space-y-2.5">
              {copy.individualItems.map((item) => (
                <div key={item.rank} className="surface-row rounded-[0.9rem] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-accent)]">{item.rank}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{item.prize}</p>
                    </div>
                    {item.extra ? <p className="max-w-[12rem] text-right text-sm text-[var(--color-muted)]">{item.extra}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="glass-panel rounded-[1.15rem] p-4 sm:p-5">
            <p className="eyebrow">{copy.nationalTitle}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{copy.nationalBody}</p>
            <ul className="mt-5 space-y-2.5">
              {copy.nationalItems.map((item, index) => (
                <li key={item} className="surface-row rounded-[0.9rem] p-3 text-sm leading-relaxed text-[var(--color-paper)]">
                  <span className="mono mr-2 text-[var(--color-accent)]">{String(index + 1).padStart(2, '0')}</span>
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </div>
  )
}
