import { Link } from 'react-router-dom'
import type { LocaleCode } from '../lib/types'

interface HowToPlayPageProps {
  locale: LocaleCode
}

interface HowToStep {
  title: string
  body: string
  to?: string
  cta?: string
}

interface HowToCopy {
  eyebrow: string
  title: string
  intro: string
  freeNote: string
  stepsTitle: string
  steps: HowToStep[]
  learnTitle: string
  learnBody: string
  rulesCta: string
  helpCta: string
  registerCta: string
}

// First-timer onboarding. Deliberately the short version — the full scoring rules live on /rules and
// the FAQ on /help; this page links out to them rather than duplicating them (see
// architecture/SOP_system_overview.md "Beginner onboarding"). English-first; other locales fall back
// to English until translated.
const englishCopy: HowToCopy = {
  eyebrow: 'how to play',
  title: 'New here? The whole game in five steps.',
  intro:
    'The Grand Tournament is a free fantasy football game built around the 2026 tournament. You pick a squad of real tournament players, lock it in, and earn points from what those players actually do on the pitch. You do not need to know Soccerverse, and you do not need a Soccerverse account to take part.',
  freeNote: 'Free to enter · No entry fee · No Soccerverse account required',
  stepsTitle: 'Five steps to join',
  steps: [
    {
      title: 'Register — it is free',
      body: 'Sign up with your email. If you are new and have no Soccerverse account, choose the Rookie path — that is all you need to compete for prizes.',
      to: '/register',
      cta: 'Register',
    },
    {
      title: 'Confirm your email',
      body: 'Click the link in the confirmation email we send you. That verifies your entry and opens your squad builder.',
    },
    {
      title: 'Build your squad',
      body: 'Pick 15 players — a starting eleven in a 4-3-3 plus four substitutes — under your chosen budget. At most four players may come from the same national team, so you mix players from across the tournament.',
      to: '/builder',
      cta: 'Open the builder',
    },
    {
      title: 'Lock it before kickoff',
      body: 'Submit (lock) your squad before the first match. A locked squad starts scoring from the matches played after you lock it, so lock in early.',
    },
    {
      title: 'Climb the leaderboards',
      body: 'Every goal, assist, clean sheet and rating your players earn moves you up the Rookie, Veteran and Nation tables as the tournament plays out.',
      to: '/tables',
      cta: 'See the tables',
    },
  ],
  learnTitle: 'Want the detail?',
  learnBody:
    'This page is the quick version. The full scoring, budgets and swap windows are on the Rules page, and common questions are answered in Help.',
  rulesCta: 'Read the full rules',
  helpCta: 'Help & FAQ',
  registerCta: 'Register your squad',
}

const spanishCopy: HowToCopy = {
  eyebrow: 'cómo jugar',
  title: '¿Nuevo por aquí? Todo el juego en cinco pasos.',
  intro:
    'The Grand Tournament es un juego de fútbol fantasy gratuito para el torneo de 2026. Eliges una plantilla de jugadores reales del torneo, la bloqueas y ganas puntos por lo que esos jugadores hacen realmente en el campo. No necesitas conocer Soccerverse, y no necesitas una cuenta de Soccerverse para participar.',
  freeNote: 'Entrada gratuita · Sin cuota de inscripción · No se requiere cuenta de Soccerverse',
  stepsTitle: 'Cinco pasos para unirte',
  steps: [
    {
      title: 'Regístrate: es gratis',
      body: 'Apúntate con tu email. Si eres nuevo y no tienes cuenta de Soccerverse, elige la vía Rookie: es todo lo que necesitas para competir por premios.',
      to: '/register',
      cta: 'Registrarse',
    },
    {
      title: 'Confirma tu email',
      body: 'Haz clic en el enlace del email de confirmación que te enviamos. Eso verifica tu entrada y abre tu creador de plantilla.',
    },
    {
      title: 'Crea tu plantilla',
      body: 'Elige 15 jugadores —un once inicial en 4-3-3 más cuatro suplentes— dentro de tu presupuesto. Como máximo cuatro jugadores pueden ser del mismo equipo nacional, así que mezclas jugadores de todo el torneo.',
      to: '/builder',
      cta: 'Abrir el creador',
    },
    {
      title: 'Bloquéala antes del pitido inicial',
      body: 'Envía (bloquea) tu plantilla antes del primer partido. Una plantilla bloqueada empieza a puntuar desde los partidos jugados después de bloquearla, así que bloquéala pronto.',
    },
    {
      title: 'Escala las clasificaciones',
      body: 'Cada gol, asistencia, portería a cero y valoración que ganen tus jugadores te hace subir en las tablas Rookie, Veteran y de Nación a medida que avanza el torneo.',
      to: '/tables',
      cta: 'Ver las tablas',
    },
  ],
  learnTitle: '¿Quieres el detalle?',
  learnBody:
    'Esta página es la versión rápida. La puntuación completa, los presupuestos y las ventanas de cambio están en la página de Reglas, y las preguntas habituales se responden en Ayuda.',
  rulesCta: 'Leer las reglas completas',
  helpCta: 'Ayuda y FAQ',
  registerCta: 'Registra tu plantilla',
}

const italianCopy: HowToCopy = {
  eyebrow: 'come si gioca',
  title: 'Nuovo qui? Tutto il gioco in cinque passi.',
  intro:
    'The Grand Tournament è un gioco di fantacalcio gratuito per il torneo del 2026. Scegli una rosa di veri giocatori del torneo, la blocchi e guadagni punti da ciò che quei giocatori fanno davvero in campo. Non devi conoscere Soccerverse, e non ti serve un account Soccerverse per partecipare.',
  freeNote: 'Iscrizione gratuita · Nessuna quota d’ingresso · Nessun account Soccerverse richiesto',
  stepsTitle: 'Cinque passi per partecipare',
  steps: [
    {
      title: 'Registrati: è gratis',
      body: 'Iscriviti con la tua email. Se sei nuovo e non hai un account Soccerverse, scegli il percorso Rookie: è tutto ciò che ti serve per competere per i premi.',
      to: '/register',
      cta: 'Registrati',
    },
    {
      title: 'Conferma la tua email',
      body: 'Clicca sul link nell’email di conferma che ti inviamo. Verifica la tua iscrizione e apre il tuo costruttore di rosa.',
    },
    {
      title: 'Costruisci la tua rosa',
      body: 'Scegli 15 giocatori — un undici titolare in 4-3-3 più quattro riserve — entro il tuo budget. Al massimo quattro giocatori possono provenire dalla stessa nazionale, così mescoli giocatori di tutto il torneo.',
      to: '/builder',
      cta: 'Apri il costruttore',
    },
    {
      title: 'Bloccala prima del calcio d’inizio',
      body: 'Invia (blocca) la tua rosa prima della prima partita. Una rosa bloccata inizia a segnare dalle partite giocate dopo il blocco, quindi blocca presto.',
    },
    {
      title: 'Scala le classifiche',
      body: 'Ogni gol, assist, clean sheet e valutazione che i tuoi giocatori guadagnano ti fa salire nelle classifiche Rookie, Veteran e Nazione mentre il torneo prosegue.',
      to: '/tables',
      cta: 'Vedi le classifiche',
    },
  ],
  learnTitle: 'Vuoi i dettagli?',
  learnBody:
    'Questa pagina è la versione veloce. Il punteggio completo, i budget e le finestre di cambio sono nella pagina Regole, e le domande comuni trovano risposta in Aiuto.',
  rulesCta: 'Leggi le regole complete',
  helpCta: 'Aiuto e FAQ',
  registerCta: 'Registra la tua rosa',
}

const germanCopy: HowToCopy = {
  eyebrow: 'so wird gespielt',
  title: 'Neu hier? Das ganze Spiel in fünf Schritten.',
  intro:
    'The Grand Tournament ist ein kostenloses Fantasy-Football-Spiel zum Turnier 2026. Du stellst einen Kader aus echten Turnierspielern zusammen, fixierst ihn und sammelst Punkte für das, was diese Spieler tatsächlich auf dem Platz leisten. Du musst Soccerverse nicht kennen, und du brauchst kein Soccerverse-Konto, um teilzunehmen.',
  freeNote: 'Kostenlose Teilnahme · Keine Teilnahmegebühr · Kein Soccerverse-Konto erforderlich',
  stepsTitle: 'Fünf Schritte zum Mitmachen',
  steps: [
    {
      title: 'Registrieren – es ist kostenlos',
      body: 'Melde dich mit deiner E-Mail an. Wenn du neu bist und kein Soccerverse-Konto hast, wähle den Rookie-Weg – mehr brauchst du nicht, um um Preise mitzuspielen.',
      to: '/register',
      cta: 'Registrieren',
    },
    {
      title: 'Bestätige deine E-Mail',
      body: 'Klicke auf den Link in der Bestätigungs-E-Mail, die wir dir senden. Das verifiziert deine Teilnahme und öffnet deinen Kader-Builder.',
    },
    {
      title: 'Stelle deinen Kader zusammen',
      body: 'Wähle 15 Spieler – eine Startelf im 4-3-3 plus vier Ersatzspieler – innerhalb deines Budgets. Höchstens vier Spieler dürfen aus derselben Nationalmannschaft kommen, also mischst du Spieler aus dem ganzen Turnier.',
      to: '/builder',
      cta: 'Builder öffnen',
    },
    {
      title: 'Fixiere ihn vor dem Anpfiff',
      body: 'Reiche deinen Kader ein (fixiere ihn) vor dem ersten Spiel. Ein fixierter Kader sammelt Punkte ab den Spielen, die nach dem Fixieren stattfinden, also fixiere früh.',
    },
    {
      title: 'Klettere die Bestenlisten hinauf',
      body: 'Jedes Tor, jede Vorlage, jedes zu null und jede Bewertung, die deine Spieler erzielen, bringt dich in den Rookie-, Veteran- und Nation-Tabellen nach oben, während das Turnier läuft.',
      to: '/tables',
      cta: 'Tabellen ansehen',
    },
  ],
  learnTitle: 'Mehr Details gewünscht?',
  learnBody:
    'Diese Seite ist die Kurzfassung. Die vollständige Punktevergabe, die Budgets und die Wechselfenster stehen auf der Regeln-Seite, und häufige Fragen werden in der Hilfe beantwortet.',
  rulesCta: 'Die vollständigen Regeln lesen',
  helpCta: 'Hilfe & FAQ',
  registerCta: 'Registriere deinen Kader',
}

const frenchCopy: HowToCopy = {
  eyebrow: 'comment jouer',
  title: 'Nouveau ici ? Tout le jeu en cinq étapes.',
  intro:
    'The Grand Tournament est un jeu de football fantasy gratuit pour le tournoi 2026. Tu choisis un effectif de vrais joueurs du tournoi, tu le verrouilles et tu gagnes des points selon ce que ces joueurs font réellement sur le terrain. Tu n’as pas besoin de connaître Soccerverse, et tu n’as pas besoin d’un compte Soccerverse pour participer.',
  freeNote: 'Participation gratuite · Aucun frais d’inscription · Aucun compte Soccerverse requis',
  stepsTitle: 'Cinq étapes pour participer',
  steps: [
    {
      title: 'Inscris-toi : c’est gratuit',
      body: 'Inscris-toi avec ton email. Si tu es nouveau et n’as pas de compte Soccerverse, choisis la voie Rookie : c’est tout ce qu’il te faut pour concourir pour des prix.',
      to: '/register',
      cta: 'S’inscrire',
    },
    {
      title: 'Confirme ton email',
      body: 'Clique sur le lien dans l’email de confirmation que nous t’envoyons. Cela vérifie ton inscription et ouvre ton constructeur d’effectif.',
    },
    {
      title: 'Compose ton effectif',
      body: 'Choisis 15 joueurs — un onze de départ en 4-3-3 plus quatre remplaçants — dans la limite de ton budget. Au maximum quatre joueurs peuvent venir de la même équipe nationale, tu mélanges donc des joueurs de tout le tournoi.',
      to: '/builder',
      cta: 'Ouvrir le constructeur',
    },
    {
      title: 'Verrouille-le avant le coup d’envoi',
      body: 'Soumets (verrouille) ton effectif avant le premier match. Un effectif verrouillé commence à marquer à partir des matchs joués après le verrouillage, alors verrouille tôt.',
    },
    {
      title: 'Grimpe les classements',
      body: 'Chaque but, passe décisive, clean sheet et note que tes joueurs obtiennent te fait monter dans les tables Rookie, Veteran et Nation au fil du tournoi.',
      to: '/tables',
      cta: 'Voir les tables',
    },
  ],
  learnTitle: 'Tu veux le détail ?',
  learnBody:
    'Cette page est la version rapide. Le barème complet, les budgets et les fenêtres de swap sont sur la page Règles, et les questions fréquentes trouvent réponse dans l’Aide.',
  rulesCta: 'Lire les règles complètes',
  helpCta: 'Aide & FAQ',
  registerCta: 'Inscris ton effectif',
}

const portugueseCopy: HowToCopy = {
  eyebrow: 'como jogar',
  title: 'Novo por aqui? Todo o jogo em cinco passos.',
  intro:
    'The Grand Tournament é um jogo de fantasy football gratuito para o torneio de 2026. Escolhes um plantel de jogadores reais do torneio, bloqueia-lo e ganhas pontos pelo que esses jogadores fazem mesmo em campo. Não precisas de conhecer o Soccerverse, e não precisas de uma conta Soccerverse para participar.',
  freeNote: 'Entrada gratuita · Sem taxa de inscrição · Não é necessária conta Soccerverse',
  stepsTitle: 'Cinco passos para participar',
  steps: [
    {
      title: 'Regista-te: é grátis',
      body: 'Inscreve-te com o teu email. Se és novo e não tens conta Soccerverse, escolhe o caminho Rookie: é tudo o que precisas para competir por prémios.',
      to: '/register',
      cta: 'Registar',
    },
    {
      title: 'Confirma o teu email',
      body: 'Clica no link do email de confirmação que te enviamos. Isso verifica a tua entrada e abre o teu construtor de plantel.',
    },
    {
      title: 'Monta o teu plantel',
      body: 'Escolhe 15 jogadores — um onze inicial em 4-3-3 mais quatro suplentes — dentro do teu orçamento. No máximo quatro jogadores podem ser da mesma seleção, por isso misturas jogadores de todo o torneio.',
      to: '/builder',
      cta: 'Abrir o construtor',
    },
    {
      title: 'Bloqueia antes do apito inicial',
      body: 'Submete (bloqueia) o teu plantel antes do primeiro jogo. Um plantel bloqueado começa a pontuar a partir dos jogos disputados depois de o bloqueares, por isso bloqueia cedo.',
    },
    {
      title: 'Sobe nas classificações',
      body: 'Cada golo, assistência, baliza a zero e classificação que os teus jogadores ganham faz-te subir nas tabelas Rookie, Veteran e Nação à medida que o torneio decorre.',
      to: '/tables',
      cta: 'Ver as tabelas',
    },
  ],
  learnTitle: 'Queres o detalhe?',
  learnBody:
    'Esta página é a versão rápida. A pontuação completa, os orçamentos e as janelas de troca estão na página de Regras, e as perguntas comuns são respondidas na Ajuda.',
  rulesCta: 'Ler as regras completas',
  helpCta: 'Ajuda e FAQ',
  registerCta: 'Regista o teu plantel',
}

const russianCopy: HowToCopy = {
  eyebrow: 'как играть',
  title: 'Впервые здесь? Вся игра за пять шагов.',
  intro:
    'The Grand Tournament — это бесплатная фэнтези-футбольная игра к чемпионату мира 2026. Ты собираешь состав из реальных игроков турнира, фиксируешь его и зарабатываешь очки за то, что эти игроки реально делают на поле. Тебе не нужно знать Soccerverse, и для участия не нужен аккаунт Soccerverse.',
  freeNote: 'Бесплатное участие · Без вступительного взноса · Аккаунт Soccerverse не требуется',
  stepsTitle: 'Пять шагов, чтобы присоединиться',
  steps: [
    {
      title: 'Зарегистрируйся — это бесплатно',
      body: 'Зарегистрируйся по email. Если ты новичок и у тебя нет аккаунта Soccerverse, выбери путь Rookie — это всё, что нужно, чтобы бороться за призы.',
      to: '/register',
      cta: 'Регистрация',
    },
    {
      title: 'Подтверди свой email',
      body: 'Перейди по ссылке в письме-подтверждении, которое мы тебе отправим. Это подтверждает твою заявку и открывает конструктор состава.',
    },
    {
      title: 'Собери свой состав',
      body: 'Выбери 15 игроков — стартовую одиннадцатку по схеме 4-3-3 плюс четырёх запасных — в рамках своего бюджета. Не более четырёх игроков могут быть из одной сборной, так что ты смешиваешь игроков со всего турнира.',
      to: '/builder',
      cta: 'Открыть конструктор',
    },
    {
      title: 'Зафиксируй до стартового свистка',
      body: 'Отправь (зафиксируй) свой состав до первого матча. Зафиксированный состав начинает набирать очки с матчей, сыгранных после фиксации, поэтому фиксируй пораньше.',
    },
    {
      title: 'Поднимайся в таблицах',
      body: 'Каждый гол, передача, сухой матч и оценка, которые набирают твои игроки, поднимают тебя в таблицах Rookie, Veteran и Nation по мере хода турнира.',
      to: '/tables',
      cta: 'Смотреть таблицы',
    },
  ],
  learnTitle: 'Нужны подробности?',
  learnBody:
    'Эта страница — краткая версия. Полная система начисления очков, бюджеты и окна замен описаны на странице Правил, а частые вопросы разобраны в Помощи.',
  rulesCta: 'Читать полные правила',
  helpCta: 'Помощь и FAQ',
  registerCta: 'Зарегистрируй свой состав',
}

const chineseCopy: HowToCopy = {
  eyebrow: '玩法介绍',
  title: '初次来到？五步了解整个游戏。',
  intro:
    'The Grand Tournament 是一款面向 2026 年赛事的免费梦幻足球游戏。你挑选一支由真实参赛球员组成的阵容，将其锁定，并根据这些球员在场上的真实表现获得积分。你无需了解 Soccerverse，也无需 Soccerverse 账号即可参加。',
  freeNote: '免费参加 · 无报名费 · 无需 Soccerverse 账号',
  stepsTitle: '加入的五个步骤',
  steps: [
    {
      title: '注册——免费',
      body: '用你的邮箱注册。如果你是新手且没有 Soccerverse 账号，请选择 Rookie 路线——这就是你争夺奖品所需的全部。',
      to: '/register',
      cta: '注册',
    },
    {
      title: '确认你的邮箱',
      body: '点击我们发送的确认邮件中的链接。这会验证你的参赛资格并开启你的阵容构建器。',
    },
    {
      title: '组建你的阵容',
      body: '在你的预算内选择 15 名球员——4-3-3 的首发十一人加四名替补。同一支国家队最多只能有四名球员，因此你会混合来自整个赛事的球员。',
      to: '/builder',
      cta: '打开构建器',
    },
    {
      title: '在开球前锁定',
      body: '在首场比赛前提交（锁定）你的阵容。锁定后的阵容从锁定之后进行的比赛开始计分，所以请尽早锁定。',
    },
    {
      title: '在排行榜上攀升',
      body: '随着赛事进行，你球员获得的每个进球、助攻、零封和评分都会让你在 Rookie、Veteran 和国家榜上上升。',
      to: '/tables',
      cta: '查看榜单',
    },
  ],
  learnTitle: '想了解细节？',
  learnBody:
    '本页是快速版本。完整的计分、预算和替换窗口都在规则页面，常见问题在帮助中解答。',
  rulesCta: '阅读完整规则',
  helpCta: '帮助与 FAQ',
  registerCta: '注册你的阵容',
}

const japaneseCopy: HowToCopy = {
  eyebrow: '遊び方',
  title: 'はじめての方へ。ゲームのすべてを5ステップで。',
  intro:
    'The Grand Tournament は、2026年の大会向けの無料ファンタジーサッカーゲームです。実際の大会出場選手でスカッドを組み、それをロックして、その選手がピッチで実際に行ったことからポイントを獲得します。Soccerverse を知っている必要はなく、参加に Soccerverse アカウントも必要ありません。',
  freeNote: '参加無料 · 参加費なし · Soccerverse アカウント不要',
  stepsTitle: '参加までの5ステップ',
  steps: [
    {
      title: '登録——無料です',
      body: 'メールで登録します。はじめてで Soccerverse アカウントがない場合は、Rookie の道を選んでください。賞品を目指して競うのに必要なのはそれだけです。',
      to: '/register',
      cta: '登録',
    },
    {
      title: 'メールを確認',
      body: 'お送りする確認メール内のリンクをクリックします。これでエントリーが認証され、スカッドビルダーが開きます。',
    },
    {
      title: 'スカッドを組む',
      body: '予算内で15人の選手を選びます——4-3-3のスターティングイレブンと4人の控えです。同じ代表チームからは最大4人まで。大会全体から選手を組み合わせることになります。',
      to: '/builder',
      cta: 'ビルダーを開く',
    },
    {
      title: 'キックオフ前にロック',
      body: '最初の試合の前にスカッドを送信（ロック）します。ロックされたスカッドはロック後に行われた試合から得点を始めるので、早めにロックしましょう。',
    },
    {
      title: 'リーダーボードを駆け上がる',
      body: '大会が進むにつれて、選手が獲得したゴール、アシスト、クリーンシート、評価のすべてが、Rookie、Veteran、国別のテーブルであなたを押し上げます。',
      to: '/tables',
      cta: 'テーブルを見る',
    },
  ],
  learnTitle: '詳しく知りたいですか？',
  learnBody:
    'このページはクイック版です。完全なスコアリング、予算、入れ替えウィンドウはルールページに、よくある質問はヘルプにあります。',
  rulesCta: '完全なルールを読む',
  helpCta: 'ヘルプ＆FAQ',
  registerCta: 'スカッドを登録',
}

const copyByLocale: Partial<Record<LocaleCode, HowToCopy>> = {
  en: englishCopy,
  es: spanishCopy,
  it: italianCopy,
  de: germanCopy,
  fr: frenchCopy,
  pt: portugueseCopy,
  ru: russianCopy,
  zh: chineseCopy,
  ja: japaneseCopy,
}

export function HowToPlayPage({ locale }: HowToPlayPageProps) {
  const copy = copyByLocale[locale] ?? englishCopy

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-12">
      <section className="hero-card rounded-[1.25rem] px-5 py-7 sm:px-7">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="section-title mt-4 max-w-[20ch]">{copy.title}</h1>
        <p className="mt-5 max-w-[68ch] text-base leading-relaxed text-[var(--color-muted)]">{copy.intro}</p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-3.5 py-1.5 text-xs font-semibold text-[var(--color-accent)]">
          <span aria-hidden>✓</span>
          {copy.freeNote}
        </p>
      </section>

      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <h2 className="text-2xl font-semibold tracking-tight text-white">{copy.stepsTitle}</h2>
        <ol className="mt-5 space-y-3">
          {copy.steps.map((step, index) => (
            <li key={step.title} className="surface-row rounded-[0.95rem] p-4">
              <div className="flex items-start gap-4">
                <span className="mono mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-sm font-bold text-[var(--color-accent)]">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">{step.body}</p>
                  {step.to && step.cta ? (
                    <Link
                      to={step.to}
                      className="mt-3 inline-flex items-center rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-white hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
                    >
                      {step.cta} →
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <h2 className="text-2xl font-semibold tracking-tight text-white">{copy.learnTitle}</h2>
        <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.learnBody}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/register" className="premium-button px-6 py-3 text-sm font-semibold">
            {copy.registerCta}
          </Link>
          <Link
            to="/rules"
            className="inline-flex items-center rounded-full border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:-translate-y-[2px] hover:bg-white/7 active:scale-[0.98]"
          >
            {copy.rulesCta}
          </Link>
          <Link
            to="/help"
            className="inline-flex items-center rounded-full border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white hover:-translate-y-[2px] hover:bg-white/7 active:scale-[0.98]"
          >
            {copy.helpCta}
          </Link>
        </div>
      </section>
    </div>
  )
}
