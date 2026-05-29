import { Link } from 'react-router-dom'
import type { LocaleCode } from '../lib/types'

interface TournamentClosedPageProps {
  locale: LocaleCode
}

// English is the source of truth. Locales fall back to englishCopy. Brand nouns (Veteran/Rookie
// league, Soccerverse) and route labels stay verbatim.
const englishCopy = {
  eyebrow: 'tournament status',
  title: 'Registration is closed.',
  body:
    'The Grand Tournament community event has locked. New entries and squad changes are no longer accepted because the Soccerverse season transition has rewritten player ratings, and the event must be scored against the wage table that was live when every locked squad was built.',
  whyTitle: 'Why now?',
  whyBody:
    'Registration closes at the Soccerverse season transition (2026-07-04, 00:00 UTC). After that instant, ratings — and therefore wages — change. A late entry would draft against a different wage table than everyone else, which would not be fair.',
  alreadyEnteredTitle: 'Already entered?',
  alreadyEnteredBody:
    'You can still sign in, check your locked squad, and follow your rank across the leagues. Scoring continues to update from every Grand Tournament match through 19 July 2026.',
  loginCta: 'Sign in to your entry',
  leaderboardsCta: 'View leaderboards',
  resultsCta: 'Match results',
}

type TournamentClosedCopy = typeof englishCopy

const copyByLocale: Partial<Record<LocaleCode, TournamentClosedCopy>> = {}

copyByLocale.en = englishCopy

copyByLocale.es = {
  eyebrow: 'estado del torneo',
  title: 'Las inscripciones están cerradas.',
  body:
    'El evento comunitario de The Grand Tournament está bloqueado. Ya no se aceptan nuevas inscripciones ni cambios de equipo porque la transición de temporada de Soccerverse ha reescrito las valoraciones de los jugadores, y el evento debe puntuarse contra la tabla de salarios que estaba activa cuando se bloqueó cada equipo.',
  whyTitle: '¿Por qué ahora?',
  whyBody:
    'Las inscripciones cierran en la transición de temporada de Soccerverse (4-7-2026, 00:00 UTC). Tras ese instante cambian las valoraciones — y por tanto los salarios. Una entrada tardía competiría contra una tabla de salarios distinta a la del resto, lo que no sería justo.',
  alreadyEnteredTitle: '¿Ya estás inscrito?',
  alreadyEnteredBody:
    'Todavía puedes iniciar sesión, revisar tu equipo bloqueado y seguir tu clasificación en las ligas. La puntuación sigue actualizándose con cada partido del Grand Tournament hasta el 19 de julio de 2026.',
  loginCta: 'Inicia sesión en tu entrada',
  leaderboardsCta: 'Ver clasificaciones',
  resultsCta: 'Resultados de partidos',
}

copyByLocale.it = {
  eyebrow: 'stato del torneo',
  title: 'Le iscrizioni sono chiuse.',
  body:
    'L’evento community di The Grand Tournament è stato bloccato. Non si accettano più nuove iscrizioni né modifiche alla rosa perché la transizione di stagione di Soccerverse ha riscritto le valutazioni dei giocatori, e l’evento deve essere calcolato sulla tabella ingaggi attiva quando ogni rosa è stata bloccata.',
  whyTitle: 'Perché ora?',
  whyBody:
    'Le iscrizioni chiudono alla transizione di stagione Soccerverse (04-07-2026, 00:00 UTC). Dopo quell’istante cambiano le valutazioni — e quindi gli ingaggi. Un’iscrizione tardiva competerebbe contro una tabella ingaggi diversa da quella di tutti gli altri, e non sarebbe corretto.',
  alreadyEnteredTitle: 'Già iscritto?',
  alreadyEnteredBody:
    'Puoi sempre accedere, controllare la tua rosa bloccata e seguire la tua posizione nelle classifiche. Il punteggio continua ad aggiornarsi a ogni partita del Grand Tournament fino al 19 luglio 2026.',
  loginCta: 'Accedi alla tua entry',
  leaderboardsCta: 'Vedi classifiche',
  resultsCta: 'Risultati partite',
}

copyByLocale.de = {
  eyebrow: 'turnierstatus',
  title: 'Registrierung ist geschlossen.',
  body:
    'Das The Grand Tournament-Community-Event ist festgelegt. Neue Einträge und Kaderänderungen werden nicht mehr angenommen, weil die Soccerverse-Saisontransition die Spielerratings neu geschrieben hat und das Event gegen die Gehaltstabelle gewertet werden muss, die beim Festlegen jedes Kaders aktiv war.',
  whyTitle: 'Warum jetzt?',
  whyBody:
    'Die Registrierung schließt zur Soccerverse-Saisontransition (04.07.2026, 00:00 UTC). Nach diesem Zeitpunkt ändern sich Ratings — und damit Gehälter. Ein später Einstieg würde gegen eine andere Gehaltstabelle drafteln als alle anderen, was nicht fair wäre.',
  alreadyEnteredTitle: 'Bereits eingetragen?',
  alreadyEnteredBody:
    'Du kannst dich weiterhin anmelden, deinen festgelegten Kader prüfen und deine Platzierung in den Ligen verfolgen. Die Wertung läuft mit jedem World-Cup-Spiel weiter bis zum 19. Juli 2026.',
  loginCta: 'Bei deinem Eintrag anmelden',
  leaderboardsCta: 'Tabellen ansehen',
  resultsCta: 'Spielergebnisse',
}

copyByLocale.fr = {
  eyebrow: 'statut du tournoi',
  title: 'Les inscriptions sont fermées.',
  body:
    'L’événement communautaire The Grand Tournament est verrouillé. Les nouvelles inscriptions et modifications d’effectif ne sont plus acceptées car la transition de saison Soccerverse a réécrit les notes des joueurs, et l’événement doit être noté sur la grille salariale en vigueur au moment où chaque effectif a été verrouillé.',
  whyTitle: 'Pourquoi maintenant ?',
  whyBody:
    'Les inscriptions ferment à la transition de saison Soccerverse (04-07-2026, 00:00 UTC). Après cet instant, les notes — et donc les salaires — changent. Une inscription tardive composerait face à une grille différente de tous les autres, ce qui ne serait pas équitable.',
  alreadyEnteredTitle: 'Déjà inscrit ?',
  alreadyEnteredBody:
    'Tu peux toujours te connecter, consulter ton effectif verrouillé et suivre ton classement dans les ligues. Le scoring continue à chaque match du Grand Tournament jusqu’au 19 juillet 2026.',
  loginCta: 'Se connecter à ton entrée',
  leaderboardsCta: 'Voir les classements',
  resultsCta: 'Résultats des matchs',
}

copyByLocale.pt = {
  eyebrow: 'estado do torneio',
  title: 'As inscrições estão fechadas.',
  body:
    'O evento comunitário de The Grand Tournament está bloqueado. Já não se aceitam novas inscrições nem alterações à equipa porque a transição de temporada do Soccerverse reescreveu as avaliações dos jogadores, e o evento tem de ser pontuado contra a tabela salarial em vigor quando cada equipa foi bloqueada.',
  whyTitle: 'Porquê agora?',
  whyBody:
    'As inscrições fecham na transição de temporada Soccerverse (04-07-2026, 00:00 UTC). A partir desse instante mudam as avaliações — e portanto os salários. Uma inscrição tardia jogaria contra uma tabela salarial diferente da dos restantes, o que não seria justo.',
  alreadyEnteredTitle: 'Já te inscreveste?',
  alreadyEnteredBody:
    'Ainda podes iniciar sessão, ver a tua equipa bloqueada e acompanhar a tua classificação nas ligas. A pontuação continua a atualizar-se em cada jogo do Grand Tournament até 19 de julho de 2026.',
  loginCta: 'Iniciar sessão na tua entrada',
  leaderboardsCta: 'Ver classificações',
  resultsCta: 'Resultados de jogos',
}

copyByLocale.ru = {
  eyebrow: 'статус турнира',
  title: 'Регистрация закрыта.',
  body:
    'Сообществое событие The Grand Tournament зафиксировано. Новые заявки и изменения составов больше не принимаются: переход сезона в Soccerverse переписал рейтинги игроков, а событие должно считаться по таблице зарплат, действовавшей в момент фиксации каждого состава.',
  whyTitle: 'Почему сейчас?',
  whyBody:
    'Регистрация закрывается при переходе сезона в Soccerverse (04-07-2026, 00:00 UTC). После этого момента рейтинги — а значит и зарплаты — меняются. Поздняя заявка собирала бы состав против другой таблицы зарплат, чем все остальные, что было бы нечестно.',
  alreadyEnteredTitle: 'Уже зарегистрированы?',
  alreadyEnteredBody:
    'Вы по-прежнему можете войти, посмотреть свой зафиксированный состав и следить за местом в лигах. Подсчёт продолжается по каждому матчу Grand Tournament до 19 июля 2026 года.',
  loginCta: 'Войти в свою заявку',
  leaderboardsCta: 'Открыть таблицы',
  resultsCta: 'Результаты матчей',
}

copyByLocale.zh = {
  eyebrow: '赛事状态',
  title: '注册已关闭。',
  body:
    'The Grand Tournament 社区赛事已锁定。不再接受新的参赛或阵容更改，因为 Soccerverse 赛季过渡已重写球员评分，而本赛事必须依据每位参赛者锁定阵容时所用的薪资表进行计分。',
  whyTitle: '为什么是现在？',
  whyBody:
    '注册在 Soccerverse 赛季过渡时关闭（2026-07-04 00:00 UTC）。该时刻之后，评分——以及薪资——会变化。迟到的参赛将以不同于其他人的薪资表来组建阵容，这并不公平。',
  alreadyEnteredTitle: '已经参赛？',
  alreadyEnteredBody:
    '你仍可登录，查看你已锁定的阵容，并跟踪自己在各联赛中的排名。计分将随着每场 Grand Tournament 比赛持续更新，直到 2026 年 7 月 19 日。',
  loginCta: '登录你的参赛',
  leaderboardsCta: '查看排行榜',
  resultsCta: '比赛结果',
}

copyByLocale.ja = {
  eyebrow: '大会ステータス',
  title: '登録は終了しました。',
  body:
    'The Grand Tournament コミュニティイベントはロックされました。Soccerverseのシーズン移行により選手のレーティングが書き換えられ、本イベントは各ロック時点の賃金表に基づいて採点されるため、新規参加とスカッド変更は受け付けられません。',
  whyTitle: 'なぜ今？',
  whyBody:
    '登録はSoccerverseのシーズン移行時（2026-07-04 00:00 UTC）に閉じます。その瞬間以降、レーティング——つまり賃金——が変わります。遅い参加は他の全員と異なる賃金表に対してドラフトすることになり、公平ではありません。',
  alreadyEnteredTitle: 'すでに参加していますか？',
  alreadyEnteredBody:
    'ログインしてロック済みのスカッドを確認し、リーグ内の順位を追うことができます。スコアリングはGrand Tournamentの各試合で2026年7月19日まで更新され続けます。',
  loginCta: 'エントリーにログイン',
  leaderboardsCta: '順位表を見る',
  resultsCta: '試合結果',
}

function resolveCopy(locale: LocaleCode): TournamentClosedCopy {
  return copyByLocale[locale] ?? englishCopy
}

export function TournamentClosedPage({ locale }: TournamentClosedPageProps) {
  const copy = resolveCopy(locale)

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-12">
      <section className="hero-card rounded-[1.6rem] px-6 py-8 sm:px-8 sm:py-10">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="section-title mt-4 max-w-[16ch] text-white">{copy.title}</h1>
        <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-[var(--color-muted)]">{copy.body}</p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
          >
            {copy.loginCta}
          </Link>
          <Link
            to="/tables"
            className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            {copy.leaderboardsCta}
          </Link>
          <Link
            to="/results"
            className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            {copy.resultsCta}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <p className="eyebrow">{copy.whyTitle}</p>
          <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.whyBody}</p>
        </article>
        <article className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
          <p className="eyebrow">{copy.alreadyEnteredTitle}</p>
          <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.alreadyEnteredBody}</p>
        </article>
      </section>
    </div>
  )
}
