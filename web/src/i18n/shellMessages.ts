import type { LocaleCode } from '../lib/types'

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}

const englishShellMessages = {
  nav: {
    primary: [
      { to: '/', label: 'Overview' },
      { to: '/builder', label: 'Builder' },
      { to: '/results', label: 'Results' },
      { to: '/tables', label: 'Tables' },
      { to: '/stats', label: 'Stats' },
    ],
    important: {
      label: 'Guide',
      items: [
        { to: '/how-to-play', label: 'How to play' },
        { to: '/rules', label: 'Rules' },
        { to: '/about', label: 'About' },
        { to: '/prizes', label: 'Prizes' },
        { to: '/help', label: 'Help' },
      ],
    },
    account: [
      { to: '/login', label: 'Login' },
      { to: '/admin', label: 'Admin' },
    ],
    register: 'Register',
    logoAlt: 'The Grand Tournament Community Event',
    toggle: 'Toggle navigation',
  },
  footer: {
    event: 'Event',
    mainProject: 'Main project',
    playSoccerverse: 'Play Soccerverse',
    help: 'Help',
    about: 'About',
    privacy: 'Privacy',
    admin: 'Admin',
    note: 'Fan-made community event. Not an official Soccerverse product.',
  },
  errorBoundary: {
    title: 'Something went wrong.',
    body: 'An unexpected error interrupted this page. You can try again.',
    retry: 'Try again',
  },
  bootstrapError: {
    message: 'Live tournament data could not be loaded — showing default information, so some details may be out of date.',
  },
}

type ShellMessages = typeof englishShellMessages

const shellMessages: Record<LocaleCode, DeepPartial<ShellMessages>> = {
  en: englishShellMessages,
  es: {
    nav: {
      primary: [
        { to: '/', label: 'Resumen' },
        { to: '/builder', label: 'Constructor' },
        { to: '/results', label: 'Resultados' },
        { to: '/tables', label: 'Tablas' },
        { to: '/stats', label: 'Estadísticas' },
      ],
      important: {
        label: 'Guía',
        items: [
          { to: '/how-to-play', label: 'Cómo jugar' },
          { to: '/rules', label: 'Reglas' },
          { to: '/about', label: 'Acerca de' },
          { to: '/prizes', label: 'Premios' },
          { to: '/help', label: 'Ayuda' },
        ],
      },
      account: [
        { to: '/login', label: 'Acceso' },
        { to: '/admin', label: 'Admin' },
      ],
      register: 'Registro',
      logoAlt: 'Evento comunitario The Grand Tournament',
      toggle: 'Abrir navegación',
    },
    footer: {
      event: 'Evento',
      mainProject: 'Proyecto principal',
      playSoccerverse: 'Jugar Soccerverse',
      help: 'Ayuda',
      about: 'Acerca de',
      privacy: 'Privacidad',
      admin: 'Admin',
      note: 'Evento comunitario hecho por fans. No es un producto oficial de Soccerverse.',
    },
    errorBoundary: {
      title: 'Algo salió mal.',
      body: 'Un error inesperado interrumpió esta página. Puedes intentarlo de nuevo.',
      retry: 'Intentar de nuevo',
    },
    bootstrapError: {
      message:
        'No se pudieron cargar los datos en vivo del evento; se muestra información predeterminada, así que algunos detalles pueden estar desactualizados.',
    },
  },
  it: {
    nav: {
      primary: [
        { to: '/', label: 'Panoramica' },
        { to: '/builder', label: 'Costruttore' },
        { to: '/results', label: 'Risultati' },
        { to: '/tables', label: 'Classifiche' },
        { to: '/stats', label: 'Statistiche' },
      ],
      important: {
        label: 'Guida',
        items: [
          { to: '/how-to-play', label: 'Come giocare' },
          { to: '/rules', label: 'Regole' },
          { to: '/about', label: 'Informazioni' },
          { to: '/prizes', label: 'Premi' },
          { to: '/help', label: 'Aiuto' },
        ],
      },
      account: [
        { to: '/login', label: 'Accedi' },
        { to: '/admin', label: 'Admin' },
      ],
      register: 'Registrati',
      logoAlt: 'Evento community The Grand Tournament',
      toggle: 'Apri navigazione',
    },
    footer: {
      event: 'Evento',
      mainProject: 'Progetto principale',
      playSoccerverse: 'Gioca a Soccerverse',
      help: 'Aiuto',
      about: 'Info',
      privacy: 'Privacy',
      admin: 'Admin',
      note: 'Evento della community fatto dai fan. Non è un prodotto ufficiale Soccerverse.',
    },
    errorBoundary: {
      title: 'Qualcosa è andato storto.',
      body: 'Un errore imprevisto ha interrotto questa pagina. Puoi riprovare.',
      retry: 'Riprova',
    },
    bootstrapError: {
      message:
        'Impossibile caricare i dati live dell’evento; vengono mostrate informazioni predefinite, quindi alcuni dettagli potrebbero non essere aggiornati.',
    },
  },
  de: {
    nav: {
      primary: [
        { to: '/', label: 'Übersicht' },
        { to: '/builder', label: 'Aufstellung' },
        { to: '/results', label: 'Ergebnisse' },
        { to: '/tables', label: 'Tabellen' },
        { to: '/stats', label: 'Statistiken' },
      ],
      important: {
        label: 'Infos',
        items: [
          { to: '/how-to-play', label: 'Anleitung' },
          { to: '/rules', label: 'Regeln' },
          { to: '/about', label: 'Über uns' },
          { to: '/prizes', label: 'Preise' },
          { to: '/help', label: 'Hilfe' },
        ],
      },
      account: [
        { to: '/login', label: 'Anmelden' },
        { to: '/admin', label: 'Admin' },
      ],
      register: 'Registrieren',
      logoAlt: 'The Grand Tournament Community-Event',
      toggle: 'Navigation öffnen',
    },
    footer: {
      event: 'Event',
      mainProject: 'Hauptprojekt',
      playSoccerverse: 'Soccerverse spielen',
      help: 'Hilfe',
      about: 'Über uns',
      privacy: 'Datenschutz',
      admin: 'Admin',
      note: 'Fan-gemachtes Community-Event. Kein offizielles Soccerverse-Produkt.',
    },
    errorBoundary: {
      title: 'Etwas ist schiefgelaufen.',
      body: 'Ein unerwarteter Fehler hat diese Seite unterbrochen. Du kannst es erneut versuchen.',
      retry: 'Erneut versuchen',
    },
    bootstrapError: {
      message:
        'Die Live-Daten des Events konnten nicht geladen werden – es werden Standardinformationen angezeigt, daher sind einige Details möglicherweise nicht aktuell.',
    },
  },
  fr: {
    nav: {
      primary: [
        { to: '/', label: 'Aperçu' },
        { to: '/builder', label: 'Composition' },
        { to: '/results', label: 'Résultats' },
        { to: '/tables', label: 'Classements' },
        { to: '/stats', label: 'Statistiques' },
      ],
      important: {
        label: 'Guide',
        items: [
          { to: '/how-to-play', label: 'Comment jouer' },
          { to: '/rules', label: 'Règles' },
          { to: '/about', label: 'À propos' },
          { to: '/prizes', label: 'Prix' },
          { to: '/help', label: 'Aide' },
        ],
      },
      account: [
        { to: '/login', label: 'Connexion' },
        { to: '/admin', label: 'Admin' },
      ],
      register: 'Inscription',
      logoAlt: 'Événement communautaire The Grand Tournament',
      toggle: 'Ouvrir la navigation',
    },
    footer: {
      event: 'Événement',
      mainProject: 'Projet principal',
      playSoccerverse: 'Jouer à Soccerverse',
      help: 'Aide',
      about: 'À propos',
      privacy: 'Confidentialité',
      admin: 'Admin',
      note: 'Événement communautaire fait par des fans. Ce n’est pas un produit officiel Soccerverse.',
    },
    errorBoundary: {
      title: 'Une erreur s’est produite.',
      body: 'Une erreur inattendue a interrompu cette page. Tu peux réessayer.',
      retry: 'Réessayer',
    },
    bootstrapError: {
      message:
        'Impossible de charger les données en direct de l’événement ; des informations par défaut sont affichées, donc certains détails peuvent être obsolètes.',
    },
  },
  pt: {
    nav: {
      primary: [
        { to: '/', label: 'Visão geral' },
        { to: '/builder', label: 'Construtor' },
        { to: '/results', label: 'Resultados' },
        { to: '/tables', label: 'Tabelas' },
        { to: '/stats', label: 'Estatísticas' },
      ],
      important: {
        label: 'Guia',
        items: [
          { to: '/how-to-play', label: 'Como jogar' },
          { to: '/rules', label: 'Regras' },
          { to: '/about', label: 'Sobre' },
          { to: '/prizes', label: 'Prémios' },
          { to: '/help', label: 'Ajuda' },
        ],
      },
      account: [
        { to: '/login', label: 'Entrar' },
        { to: '/admin', label: 'Admin' },
      ],
      register: 'Registar',
      logoAlt: 'Evento comunitário The Grand Tournament',
      toggle: 'Abrir navegação',
    },
    footer: {
      event: 'Evento',
      mainProject: 'Projeto principal',
      playSoccerverse: 'Jogar Soccerverse',
      help: 'Ajuda',
      about: 'Sobre',
      privacy: 'Privacidade',
      admin: 'Admin',
      note: 'Evento comunitário feito por fãs. Não é um produto oficial Soccerverse.',
    },
    errorBoundary: {
      title: 'Algo correu mal.',
      body: 'Um erro inesperado interrompeu esta página. Podes tentar de novo.',
      retry: 'Tentar de novo',
    },
    bootstrapError: {
      message:
        'Não foi possível carregar os dados ao vivo do evento; são mostradas informações predefinidas, por isso alguns detalhes podem estar desatualizados.',
    },
  },
  ru: {
    nav: {
      primary: [
        { to: '/', label: 'Обзор' },
        { to: '/builder', label: 'Конструктор' },
        { to: '/results', label: 'Результаты' },
        { to: '/tables', label: 'Таблицы' },
        { to: '/stats', label: 'Статистика' },
      ],
      important: {
        label: 'Гид',
        items: [
          { to: '/how-to-play', label: 'Как играть' },
          { to: '/rules', label: 'Правила' },
          { to: '/about', label: 'О проекте' },
          { to: '/prizes', label: 'Призы' },
          { to: '/help', label: 'Помощь' },
        ],
      },
      account: [
        { to: '/login', label: 'Вход' },
        { to: '/admin', label: 'Admin' },
      ],
      register: 'Регистрация',
      logoAlt: 'Комьюнити-событие The Grand Tournament',
      toggle: 'Открыть навигацию',
    },
    footer: {
      event: 'Событие',
      mainProject: 'Основной проект',
      playSoccerverse: 'Играть в Soccerverse',
      help: 'Помощь',
      about: 'О проекте',
      privacy: 'Конфиденциальность',
      admin: 'Admin',
      note: 'Фанатское событие сообщества. Это не официальный продукт Soccerverse.',
    },
    errorBoundary: {
      title: 'Что-то пошло не так.',
      body: 'Непредвиденная ошибка прервала эту страницу. Можно попробовать снова.',
      retry: 'Попробовать снова',
    },
    bootstrapError: {
      message:
        'Не удалось загрузить актуальные данные события — показана информация по умолчанию, поэтому некоторые детали могут быть устаревшими.',
    },
  },
  zh: {
    nav: {
      primary: [
        { to: '/', label: '概览' },
        { to: '/builder', label: '阵容' },
        { to: '/results', label: '赛果' },
        { to: '/tables', label: '榜单' },
        { to: '/stats', label: '数据' },
      ],
      important: {
        label: '指南',
        items: [
          { to: '/how-to-play', label: '玩法' },
          { to: '/rules', label: '规则' },
          { to: '/about', label: '关于' },
          { to: '/prizes', label: '奖品' },
          { to: '/help', label: '帮助' },
        ],
      },
      account: [
        { to: '/login', label: '登录' },
        { to: '/admin', label: 'Admin' },
      ],
      register: '注册',
      logoAlt: 'The Grand Tournament 社区活动',
      toggle: '打开导航',
    },
    footer: {
      event: '活动',
      mainProject: '主项目',
      playSoccerverse: '进入 Soccerverse',
      help: '帮助',
      about: '关于',
      privacy: '隐私',
      admin: 'Admin',
      note: '粉丝制作的社区活动。并非 Soccerverse 官方产品。',
    },
    errorBoundary: {
      title: '出了点问题。',
      body: '意外错误中断了此页面。你可以重试。',
      retry: '重试',
    },
    bootstrapError: {
      message: '无法加载赛事实时数据，现显示默认信息，因此部分细节可能已过时。',
    },
  },
  ja: {
    nav: {
      primary: [
        { to: '/', label: '概要' },
        { to: '/builder', label: 'ビルダー' },
        { to: '/results', label: '結果' },
        { to: '/tables', label: '順位表' },
        { to: '/stats', label: 'スタッツ' },
      ],
      important: {
        label: 'ガイド',
        items: [
          { to: '/how-to-play', label: '遊び方' },
          { to: '/rules', label: 'ルール' },
          { to: '/about', label: 'について' },
          { to: '/prizes', label: '賞品' },
          { to: '/help', label: 'ヘルプ' },
        ],
      },
      account: [
        { to: '/login', label: 'ログイン' },
        { to: '/admin', label: '管理' },
      ],
      register: '登録',
      logoAlt: 'The Grand Tournament コミュニティイベント',
      toggle: 'ナビゲーションを開く',
    },
    footer: {
      event: 'イベント',
      mainProject: 'メインプロジェクト',
      playSoccerverse: 'Soccerverse をプレイ',
      help: 'ヘルプ',
      about: 'について',
      privacy: 'プライバシー',
      admin: 'Admin',
      note: 'ファンによるコミュニティイベントです。Soccerverse 公式製品ではありません。',
    },
    errorBoundary: {
      title: '問題が発生しました。',
      body: '予期しないエラーでこのページが中断されました。もう一度お試しください。',
      retry: 'もう一度試す',
    },
    bootstrapError: {
      message:
        'イベントのライブデータを読み込めませんでした。デフォルト情報を表示しているため、一部の詳細は最新ではない可能性があります。',
    },
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function mergeMessages<T>(base: T, override: DeepPartial<T> | undefined): T {
  if (!override) {
    return base
  }

  if (Array.isArray(base)) {
    return (Array.isArray(override) && override.length ? override : base) as T
  }

  if (!isRecord(base) || !isRecord(override)) {
    return (override ?? base) as T
  }

  const result = { ...base } as Record<string, unknown>
  for (const key of Object.keys(override)) {
    result[key] = mergeMessages((base as Record<string, unknown>)[key], (override as Record<string, unknown>)[key] as never)
  }
  return result as T
}

export function getShellMessages(locale: LocaleCode): ShellMessages {
  return mergeMessages(englishShellMessages, shellMessages[locale])
}
