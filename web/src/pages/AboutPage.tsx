import { Link } from 'react-router-dom'
import type { LocaleCode } from '../lib/types'

interface AboutPageProps {
  locale: LocaleCode
}

interface LinkItem {
  id: string
  label: string
  href: string
  by?: string
  // Optional hover-revealed background. Drop the file in web/public/link-previews/ and point `src` at it
  // (e.g. '/link-previews/svbase.jpg'). fit: 'cover' for screenshots, 'contain' for logos. Omit = no preview.
  preview?: { src: string; fit: 'cover' | 'contain' }
}

interface AboutCopy {
  eyebrow: string
  title: string
  intro: string
  ctaRegister: string
  ctaRules: string
  svEyebrow: string
  svTitle: string
  svBody: string
  officialEyebrow: string
  officialTitle: string
  communityEyebrow: string
  communityTitle: string
  communityBody: string
  creatorsEyebrow: string
  creatorsTitle: string
  creatorsBody: string
  by: string
  blurbs: Record<string, string>
}

// Link identity (label, href, credit) is locale-independent; only the descriptive copy translates.
const officialLinks: LinkItem[] = [
  { id: 'play', label: 'Play Soccerverse', href: 'https://play.soccerverse.com/' },
  { id: 'site', label: 'Soccerverse', href: 'https://soccerverse.com/' },
  { id: 'guide', label: 'Guide', href: 'https://guide.soccerverse.com/' },
  { id: 'hub', label: 'Hub', href: 'https://hub.soccerverse.com/' },
  { id: 'data', label: 'Datacenter', href: 'https://data.soccerverse.com/' },
  { id: 'ratings', label: 'Player ratings', href: 'https://soccerratings.org/' },
  { id: 'wiki', label: 'Wiki', href: 'https://wiki.soccerverse.com/index.php/Main_Page' },
  { id: 'discord', label: 'Discord', href: 'https://discord.com/invite/ze5xJgg7AM' },
]

const communityLinks: LinkItem[] = [
  { id: 'svbase', label: 'SVBase', href: 'https://svbase.eu/', by: 'Klo', preview: { src: '/svbase.png', fit: 'cover' } },
  { id: 'elrincon', label: 'El Rincón del DT', href: 'https://elrincondeldt.com/que-es-soccerverse.html', by: 'cipone', preview: { src: '/elrincon.png', fit: 'cover' } },
  { id: 'svworld', label: 'SV World Club', href: 'https://svworld.club/', by: 'Blvck', preview: { src: '/svworld.jpg', fit: 'cover' } },
  { id: 'svfootball', label: 'SV Football', href: 'https://svfootball.com/', by: 'jackxxx', preview: { src: '/svfootball.png', fit: 'cover' } },
  { id: 'office', label: 'Soccerverse Office', href: 'https://soccerversetool.vercel.app/', by: 'acky', preview: { src: '/office.png', fit: 'cover' } },
  { id: 'nickx', label: 'Nickx on Twitch', href: 'https://www.twitch.tv/nickxcrypto', by: 'Nickx', preview: { src: '/nickx.png', fit: 'cover' } },
]

const englishCopy: AboutCopy = {
  eyebrow: 'about & links',
  title: 'A community event, built on Soccerverse.',
  intro:
    'The Grand Tournament Community Event is a free, fan-made fantasy game for the 2026 tournament, built by members of the Soccerverse community and powered by Soccerverse player data. It is not an official Soccerverse product — it is made by players, for players, to bring the community together around the tournament.',
  ctaRegister: 'Register your squad',
  ctaRules: 'Read the rules',
  svEyebrow: 'what is soccerverse',
  svTitle: 'The football world this event runs on',
  svBody:
    'Soccerverse is an online football management game where you run real clubs, build squads, and can hold influence in players and clubs across a living football economy. This event maps real Grand Tournament performances onto Soccerverse players, so the same names you follow in the game move the leaderboards here. If you are new, the links below are the best places to start; if you already play, they are your shortcuts back into the game and the wider community.',
  officialEyebrow: 'official soccerverse',
  officialTitle: 'Official sites & channels',
  communityEyebrow: 'community projects',
  communityTitle: 'Made by the community',
  communityBody:
    'Independent sites, tools and creators from the Soccerverse community. They are not affiliated with this event — we link them because they are genuinely useful.',
  creatorsEyebrow: 'the creators',
  creatorsTitle: 'Who built this',
  creatorsBody:
    'This event and this page are a collaboration between Libertaer, Klo, Acky and Blvck, built within the Soccerverse community in their own time. Come say hello on the Soccerverse Discord — that is the best place to reach the people behind the event, share feedback, or help out.',
  by: 'by',
  blurbs: {
    play: 'Open the game and manage your own club.',
    site: 'The official site — what Soccerverse is and how to start.',
    guide: 'The official onboarding guide and how-tos.',
    hub: 'The Soccerverse hub for players and clubs.',
    data: 'Live data on players, clubs and the economy.',
    ratings: 'Browse and compare Soccerverse player ratings.',
    wiki: 'The community knowledge base and game mechanics.',
    discord: 'Join the community chat — the fastest way into the event.',
    svbase: 'Community tools and stats for Soccerverse.',
    elrincon: 'Community guide and resources (Spanish).',
    svworld: 'Community site for Soccerverse managers.',
    svfootball: 'Community-built Soccerverse companion site.',
    office: 'Community-built Soccerverse tool.',
    nickx: 'Soccerverse streams and content on Twitch.',
  },
}

const spanishCopy: AboutCopy = {
  eyebrow: 'acerca de y enlaces',
  title: 'Un evento comunitario, construido sobre Soccerverse.',
  intro:
    'El Grand Tournament Community Event es un juego de fantasy gratuito y hecho por aficionados para el torneo de 2026, creado por miembros de la comunidad de Soccerverse y con datos de jugadores de Soccerverse. No es un producto oficial de Soccerverse: está hecho por jugadores, para jugadores, para unir a la comunidad en torno al torneo.',
  ctaRegister: 'Registra tu equipo',
  ctaRules: 'Lee las reglas',
  svEyebrow: 'qué es soccerverse',
  svTitle: 'El mundo del fútbol sobre el que funciona este evento',
  svBody:
    'Soccerverse es un juego online de gestión futbolística donde diriges clubes reales, formas plantillas y puedes tener influencia en jugadores y clubes dentro de una economía futbolística viva. Este evento traslada las actuaciones reales del Grand Tournament a los jugadores de Soccerverse, así que los mismos nombres que sigues en el juego mueven las clasificaciones aquí. Si eres nuevo, los enlaces de abajo son el mejor punto de partida; si ya juegas, son tus atajos de vuelta al juego y a la comunidad.',
  officialEyebrow: 'soccerverse oficial',
  officialTitle: 'Sitios y canales oficiales',
  communityEyebrow: 'proyectos de la comunidad',
  communityTitle: 'Hecho por la comunidad',
  communityBody:
    'Sitios, herramientas y creadores independientes de la comunidad de Soccerverse. No están afiliados a este evento: los enlazamos porque son realmente útiles.',
  creatorsEyebrow: 'los creadores',
  creatorsTitle: 'Quién lo creó',
  creatorsBody:
    'Este evento y esta página son una colaboración entre Libertaer, Klo, Acky y Blvck, creada dentro de la comunidad de Soccerverse en su tiempo libre. Pásate a saludar por el Discord de Soccerverse: es el mejor sitio para contactar con las personas detrás del evento, compartir comentarios o echar una mano.',
  by: 'por',
  blurbs: {
    play: 'Abre el juego y gestiona tu propio club.',
    site: 'El sitio oficial: qué es Soccerverse y cómo empezar.',
    guide: 'La guía oficial de iniciación y tutoriales.',
    hub: 'El hub de Soccerverse para jugadores y clubes.',
    data: 'Datos en vivo de jugadores, clubes y la economía.',
    ratings: 'Consulta y compara las valoraciones de jugadores de Soccerverse.',
    wiki: 'La base de conocimiento de la comunidad y las mecánicas del juego.',
    discord: 'Únete al chat de la comunidad: la vía más rápida al evento.',
    svbase: 'Herramientas y estadísticas comunitarias para Soccerverse.',
    elrincon: 'Guía y recursos de la comunidad (en español).',
    svworld: 'Sitio comunitario para managers de Soccerverse.',
    svfootball: 'Sitio complementario de Soccerverse hecho por la comunidad.',
    office: 'Herramienta de Soccerverse hecha por la comunidad.',
    nickx: 'Streams y contenido de Soccerverse en Twitch.',
  },
}

const italianCopy: AboutCopy = {
  eyebrow: 'informazioni e link',
  title: 'Un evento della community, costruito su Soccerverse.',
  intro:
    'Il Grand Tournament Community Event è un gioco fantasy gratuito e amatoriale per il torneo 2026, creato da membri della community di Soccerverse e basato sui dati dei giocatori di Soccerverse. Non è un prodotto ufficiale di Soccerverse: è fatto dai giocatori, per i giocatori, per unire la community attorno al torneo.',
  ctaRegister: 'Registra la tua rosa',
  ctaRules: 'Leggi le regole',
  svEyebrow: 'cos’è soccerverse',
  svTitle: 'Il mondo del calcio su cui gira questo evento',
  svBody:
    'Soccerverse è un gioco manageriale di calcio online in cui gestisci club reali, costruisci rose e puoi detenere influenza su giocatori e club in un’economia calcistica viva. Questo evento riporta le prestazioni reali del Grand Tournament sui giocatori di Soccerverse, così gli stessi nomi che segui nel gioco muovono le classifiche qui. Se sei nuovo, i link qui sotto sono il punto di partenza migliore; se già giochi, sono le tue scorciatoie verso il gioco e la community.',
  officialEyebrow: 'soccerverse ufficiale',
  officialTitle: 'Siti e canali ufficiali',
  communityEyebrow: 'progetti della community',
  communityTitle: 'Fatto dalla community',
  communityBody:
    'Siti, strumenti e creator indipendenti della community di Soccerverse. Non sono affiliati a questo evento: li segnaliamo perché sono davvero utili.',
  creatorsEyebrow: 'i creatori',
  creatorsTitle: 'Chi l’ha creato',
  creatorsBody:
    'Questo evento e questa pagina sono una collaborazione tra Libertaer, Klo, Acky e Blvck, realizzata all’interno della community di Soccerverse nel loro tempo libero. Vieni a salutare sul Discord di Soccerverse: è il posto migliore per raggiungere chi c’è dietro l’evento, dare feedback o dare una mano.',
  by: 'di',
  blurbs: {
    play: 'Apri il gioco e gestisci il tuo club.',
    site: 'Il sito ufficiale: cos’è Soccerverse e come iniziare.',
    guide: 'La guida ufficiale di avvio e i tutorial.',
    hub: 'L’hub di Soccerverse per giocatori e club.',
    data: 'Dati in tempo reale su giocatori, club ed economia.',
    ratings: 'Sfoglia e confronta le valutazioni dei giocatori di Soccerverse.',
    wiki: 'La knowledge base della community e le meccaniche di gioco.',
    discord: 'Entra nella chat della community: la via più rapida all’evento.',
    svbase: 'Strumenti e statistiche della community per Soccerverse.',
    elrincon: 'Guida e risorse della community (in spagnolo).',
    svworld: 'Sito della community per i manager di Soccerverse.',
    svfootball: 'Sito companion di Soccerverse fatto dalla community.',
    office: 'Strumento di Soccerverse fatto dalla community.',
    nickx: 'Stream e contenuti su Soccerverse su Twitch.',
  },
}

const germanCopy: AboutCopy = {
  eyebrow: 'über uns & links',
  title: 'Ein Community-Event, gebaut auf Soccerverse.',
  intro:
    'Das Grand Tournament Community Event ist ein kostenloses, von Fans gemachtes Fantasy-Spiel zum Turnier 2026, erstellt von Mitgliedern der Soccerverse-Community und basierend auf Soccerverse-Spielerdaten. Es ist kein offizielles Soccerverse-Produkt – es ist von Spielern für Spieler gemacht, um die Community rund um das Turnier zusammenzubringen.',
  ctaRegister: 'Kader registrieren',
  ctaRules: 'Regeln lesen',
  svEyebrow: 'was ist soccerverse',
  svTitle: 'Die Fußballwelt, auf der dieses Event läuft',
  svBody:
    'Soccerverse ist ein Online-Fußballmanager, in dem du echte Vereine führst, Kader zusammenstellst und Einfluss an Spielern und Vereinen in einer lebendigen Fußballwirtschaft halten kannst. Dieses Event überträgt echte Grand-Tournament-Leistungen auf Soccerverse-Spieler, sodass dieselben Namen, denen du im Spiel folgst, hier die Ranglisten bewegen. Wenn du neu bist, sind die Links unten der beste Einstieg; wenn du schon spielst, sind sie deine Abkürzungen zurück ins Spiel und in die Community.',
  officialEyebrow: 'offizielles soccerverse',
  officialTitle: 'Offizielle Seiten & Kanäle',
  communityEyebrow: 'community-projekte',
  communityTitle: 'Von der Community gemacht',
  communityBody:
    'Unabhängige Seiten, Tools und Creator aus der Soccerverse-Community. Sie sind nicht mit diesem Event verbunden – wir verlinken sie, weil sie wirklich nützlich sind.',
  creatorsEyebrow: 'die macher',
  creatorsTitle: 'Wer das gebaut hat',
  creatorsBody:
    'Dieses Event und diese Seite sind eine Zusammenarbeit von Libertaer, Klo, Acky und Blvck, entstanden in der Soccerverse-Community in ihrer Freizeit. Sag gerne im Soccerverse-Discord Hallo – dort erreichst du die Leute hinter dem Event am besten, gibst Feedback oder hilfst mit.',
  by: 'von',
  blurbs: {
    play: 'Öffne das Spiel und manage deinen eigenen Verein.',
    site: 'Die offizielle Seite – was Soccerverse ist und wie man startet.',
    guide: 'Der offizielle Einstiegsguide und How-tos.',
    hub: 'Der Soccerverse-Hub für Spieler und Vereine.',
    data: 'Live-Daten zu Spielern, Vereinen und der Wirtschaft.',
    ratings: 'Soccerverse-Spielerbewertungen durchsuchen und vergleichen.',
    wiki: 'Die Wissensdatenbank der Community und die Spielmechaniken.',
    discord: 'Tritt dem Community-Chat bei – der schnellste Weg ins Event.',
    svbase: 'Community-Tools und -Statistiken für Soccerverse.',
    elrincon: 'Community-Guide und -Ressourcen (auf Spanisch).',
    svworld: 'Community-Seite für Soccerverse-Manager.',
    svfootball: 'Von der Community gebaute Soccerverse-Begleitseite.',
    office: 'Von der Community gebautes Soccerverse-Tool.',
    nickx: 'Soccerverse-Streams und -Content auf Twitch.',
  },
}

const frenchCopy: AboutCopy = {
  eyebrow: 'à propos & liens',
  title: 'Un événement communautaire, bâti sur Soccerverse.',
  intro:
    'Le Grand Tournament Community Event est un jeu de fantasy gratuit et amateur pour le tournoi 2026, créé par des membres de la communauté Soccerverse et propulsé par les données de joueurs Soccerverse. Ce n’est pas un produit officiel Soccerverse : il est fait par des joueurs, pour des joueurs, afin de rassembler la communauté autour du tournoi.',
  ctaRegister: 'Inscrivez votre effectif',
  ctaRules: 'Lire les règles',
  svEyebrow: 'qu’est-ce que soccerverse',
  svTitle: 'Le monde du football sur lequel repose cet événement',
  svBody:
    'Soccerverse est un jeu de gestion de football en ligne où vous dirigez de vrais clubs, composez des effectifs et pouvez détenir de l’influence sur des joueurs et des clubs dans une économie footballistique vivante. Cet événement reporte les performances réelles du Grand Tournament sur les joueurs Soccerverse : les mêmes noms que vous suivez dans le jeu font bouger les classements ici. Si vous débutez, les liens ci-dessous sont le meilleur point de départ ; si vous jouez déjà, ce sont vos raccourcis vers le jeu et la communauté.',
  officialEyebrow: 'soccerverse officiel',
  officialTitle: 'Sites et canaux officiels',
  communityEyebrow: 'projets de la communauté',
  communityTitle: 'Fait par la communauté',
  communityBody:
    'Sites, outils et créateurs indépendants de la communauté Soccerverse. Ils ne sont pas affiliés à cet événement : nous les relayons parce qu’ils sont vraiment utiles.',
  creatorsEyebrow: 'les créateurs',
  creatorsTitle: 'Qui a créé ceci',
  creatorsBody:
    'Cet événement et cette page sont une collaboration entre Libertaer, Klo, Acky et Blvck, réalisée au sein de la communauté Soccerverse sur leur temps libre. Venez dire bonjour sur le Discord Soccerverse : c’est le meilleur endroit pour joindre les personnes derrière l’événement, donner votre avis ou aider.',
  by: 'par',
  blurbs: {
    play: 'Ouvrez le jeu et gérez votre propre club.',
    site: 'Le site officiel : ce qu’est Soccerverse et comment commencer.',
    guide: 'Le guide officiel de prise en main et les tutoriels.',
    hub: 'Le hub Soccerverse pour les joueurs et les clubs.',
    data: 'Données en direct sur les joueurs, les clubs et l’économie.',
    ratings: 'Parcourez et comparez les notes des joueurs Soccerverse.',
    wiki: 'La base de connaissances de la communauté et les mécaniques de jeu.',
    discord: 'Rejoignez le chat de la communauté : la voie la plus rapide vers l’événement.',
    svbase: 'Outils et statistiques communautaires pour Soccerverse.',
    elrincon: 'Guide et ressources de la communauté (en espagnol).',
    svworld: 'Site communautaire pour les managers Soccerverse.',
    svfootball: 'Site compagnon Soccerverse créé par la communauté.',
    office: 'Outil Soccerverse créé par la communauté.',
    nickx: 'Streams et contenu Soccerverse sur Twitch.',
  },
}

const portugueseCopy: AboutCopy = {
  eyebrow: 'sobre e links',
  title: 'Um evento da comunidade, construído sobre o Soccerverse.',
  intro:
    'O Grand Tournament Community Event é um jogo de fantasy gratuito e feito por fãs para o torneio de 2026, criado por membros da comunidade do Soccerverse e alimentado por dados de jogadores do Soccerverse. Não é um produto oficial do Soccerverse: é feito por jogadores, para jogadores, para unir a comunidade em torno do torneio.',
  ctaRegister: 'Regista a tua equipa',
  ctaRules: 'Lê as regras',
  svEyebrow: 'o que é o soccerverse',
  svTitle: 'O mundo do futebol em que este evento assenta',
  svBody:
    'O Soccerverse é um jogo de gestão de futebol online onde geres clubes reais, montas plantéis e podes ter influência em jogadores e clubes numa economia de futebol viva. Este evento transpõe os desempenhos reais do Grand Tournament para os jogadores do Soccerverse, por isso os mesmos nomes que segues no jogo movem as classificações aqui. Se és novo, os links abaixo são o melhor ponto de partida; se já jogas, são os teus atalhos de volta ao jogo e à comunidade.',
  officialEyebrow: 'soccerverse oficial',
  officialTitle: 'Sites e canais oficiais',
  communityEyebrow: 'projetos da comunidade',
  communityTitle: 'Feito pela comunidade',
  communityBody:
    'Sites, ferramentas e criadores independentes da comunidade do Soccerverse. Não são afiliados a este evento: ligamo-los porque são genuinamente úteis.',
  creatorsEyebrow: 'os criadores',
  creatorsTitle: 'Quem criou isto',
  creatorsBody:
    'Este evento e esta página são uma colaboração entre Libertaer, Klo, Acky e Blvck, criada dentro da comunidade do Soccerverse no seu tempo livre. Passa para dizer olá no Discord do Soccerverse: é o melhor sítio para contactar as pessoas por detrás do evento, dar feedback ou ajudar.',
  by: 'por',
  blurbs: {
    play: 'Abre o jogo e gere o teu próprio clube.',
    site: 'O site oficial: o que é o Soccerverse e como começar.',
    guide: 'O guia oficial de iniciação e tutoriais.',
    hub: 'O hub do Soccerverse para jogadores e clubes.',
    data: 'Dados em direto sobre jogadores, clubes e a economia.',
    ratings: 'Explora e compara as avaliações de jogadores do Soccerverse.',
    wiki: 'A base de conhecimento da comunidade e as mecânicas do jogo.',
    discord: 'Junta-te ao chat da comunidade: a via mais rápida para o evento.',
    svbase: 'Ferramentas e estatísticas da comunidade para o Soccerverse.',
    elrincon: 'Guia e recursos da comunidade (em espanhol).',
    svworld: 'Site da comunidade para managers do Soccerverse.',
    svfootball: 'Site complementar do Soccerverse feito pela comunidade.',
    office: 'Ferramenta do Soccerverse feita pela comunidade.',
    nickx: 'Streams e conteúdo de Soccerverse no Twitch.',
  },
}

// Russian / Chinese / Japanese below are machine translations — review by a native speaker advised.
const russianCopy: AboutCopy = {
  eyebrow: 'о проекте и ссылки',
  title: 'Событие сообщества на базе Soccerverse.',
  intro:
    'Grand Tournament Community Event — это бесплатная фанатская фэнтези-игра к турниру 2026 года, созданная участниками сообщества Soccerverse и работающая на данных игроков Soccerverse. Это не официальный продукт Soccerverse — он сделан игроками для игроков, чтобы объединить сообщество вокруг турнира.',
  ctaRegister: 'Зарегистрируйте состав',
  ctaRules: 'Читать правила',
  svEyebrow: 'что такое soccerverse',
  svTitle: 'Футбольный мир, на котором работает это событие',
  svBody:
    'Soccerverse — это онлайн-игра по футбольному менеджменту, где вы управляете реальными клубами, собираете составы и можете владеть влиянием в игроках и клубах в живой футбольной экономике. Это событие переносит реальные выступления в Grand Tournament на игроков Soccerverse, поэтому те же имена, за которыми вы следите в игре, двигают таблицы здесь. Если вы новичок, ссылки ниже — лучшее начало; если вы уже играете, это ваши короткие пути обратно в игру и сообщество.',
  officialEyebrow: 'официальный soccerverse',
  officialTitle: 'Официальные сайты и каналы',
  communityEyebrow: 'проекты сообщества',
  communityTitle: 'Сделано сообществом',
  communityBody:
    'Независимые сайты, инструменты и авторы из сообщества Soccerverse. Они не связаны с этим событием — мы даём на них ссылки, потому что они действительно полезны.',
  creatorsEyebrow: 'создатели',
  creatorsTitle: 'Кто это создал',
  creatorsBody:
    'Это событие и эта страница — совместная работа Libertaer, Klo, Acky и Blvck, созданная внутри сообщества Soccerverse в свободное время. Загляните поздороваться в Discord Soccerverse — это лучшее место, чтобы связаться с теми, кто стоит за событием, поделиться отзывом или помочь.',
  by: 'от',
  blurbs: {
    play: 'Откройте игру и управляйте своим клубом.',
    site: 'Официальный сайт — что такое Soccerverse и как начать.',
    guide: 'Официальное руководство для начала и инструкции.',
    hub: 'Хаб Soccerverse для игроков и клубов.',
    data: 'Живые данные об игроках, клубах и экономике.',
    ratings: 'Просматривайте и сравнивайте рейтинги игроков Soccerverse.',
    wiki: 'База знаний сообщества и игровые механики.',
    discord: 'Присоединяйтесь к чату сообщества — самый быстрый путь в событие.',
    svbase: 'Инструменты и статистика сообщества для Soccerverse.',
    elrincon: 'Руководство и ресурсы сообщества (на испанском).',
    svworld: 'Сайт сообщества для менеджеров Soccerverse.',
    svfootball: 'Сопутствующий сайт Soccerverse, созданный сообществом.',
    office: 'Инструмент Soccerverse, созданный сообществом.',
    nickx: 'Стримы и контент по Soccerverse на Twitch.',
  },
}

const chineseCopy: AboutCopy = {
  eyebrow: '关于与链接',
  title: '一个建立在 Soccerverse 上的社区活动。',
  intro:
    'Grand Tournament Community Event 是一个面向 2026 年赛事的免费、粉丝制作的梦幻游戏，由 Soccerverse 社区成员打造，并使用 Soccerverse 球员数据。它不是 Soccerverse 的官方产品——它由玩家为玩家而制作，让社区围绕这届赛事聚在一起。',
  ctaRegister: '注册你的阵容',
  ctaRules: '阅读规则',
  svEyebrow: '什么是 soccerverse',
  svTitle: '本活动运行所依托的足球世界',
  svBody:
    'Soccerverse 是一款在线足球经理游戏，你可以经营真实球队、组建阵容，并在一个活跃的足球经济中持有球员和俱乐部的影响力。本活动将 Grand Tournament 的真实表现映射到 Soccerverse 球员上，因此你在游戏中关注的那些名字也会在这里牵动榜单。如果你是新手，下面的链接是最好的起点；如果你已经在玩，它们是你回到游戏和更广泛社区的快捷方式。',
  officialEyebrow: '官方 soccerverse',
  officialTitle: '官方网站与频道',
  communityEyebrow: '社区项目',
  communityTitle: '由社区打造',
  communityBody:
    '来自 Soccerverse 社区的独立网站、工具和创作者。它们与本活动无关——我们链接它们是因为它们确实有用。',
  creatorsEyebrow: '创作者',
  creatorsTitle: '由谁打造',
  creatorsBody:
    '本活动与本页面由 Libertaer、Klo、Acky 和 Blvck 共同打造，是 Soccerverse 社区成员利用业余时间完成的。欢迎到 Soccerverse Discord 打个招呼——那里是联系活动幕后人员、提供反馈或参与帮忙的最佳去处。',
  by: '作者',
  blurbs: {
    play: '打开游戏，管理你自己的球队。',
    site: '官方网站——了解 Soccerverse 是什么以及如何开始。',
    guide: '官方入门指南与教程。',
    hub: '面向玩家和球队的 Soccerverse 中心。',
    data: '关于球员、球队和经济的实时数据。',
    ratings: '浏览并比较 Soccerverse 球员评分。',
    wiki: '社区知识库与游戏机制。',
    discord: '加入社区聊天——进入活动的最快方式。',
    svbase: '面向 Soccerverse 的社区工具与数据。',
    elrincon: '社区指南与资源（西班牙语）。',
    svworld: '面向 Soccerverse 经理的社区网站。',
    svfootball: '由社区打造的 Soccerverse 配套网站。',
    office: '由社区打造的 Soccerverse 工具。',
    nickx: 'Twitch 上的 Soccerverse 直播与内容。',
  },
}

const japaneseCopy: AboutCopy = {
  eyebrow: 'について & リンク',
  title: 'Soccerverse の上に作られたコミュニティイベント。',
  intro:
    'Grand Tournament Community Event は、2026 年大会向けの無料・ファンメイドのファンタジーゲームで、Soccerverse コミュニティのメンバーによって作られ、Soccerverse の選手データで動いています。Soccerverse の公式製品ではありません——プレイヤーによる、プレイヤーのためのもので、大会を中心にコミュニティをつなぐために作られました。',
  ctaRegister: 'スカッドを登録する',
  ctaRules: 'ルールを読む',
  svEyebrow: 'soccerverse とは',
  svTitle: 'このイベントが動く土台となるサッカーの世界',
  svBody:
    'Soccerverse はオンラインのサッカーマネジメントゲームで、実在のクラブを運営し、スカッドを組み、生きたサッカー経済の中で選手やクラブへの影響力を保有できます。このイベントは Grand Tournament の実際の成績を Soccerverse の選手にマッピングするため、ゲームで追っている名前がそのままここのランキングを動かします。初めての方は下のリンクが最良の出発点です。すでにプレイしている方には、ゲームや広いコミュニティへの近道です。',
  officialEyebrow: '公式 soccerverse',
  officialTitle: '公式サイトとチャンネル',
  communityEyebrow: 'コミュニティプロジェクト',
  communityTitle: 'コミュニティ制作',
  communityBody:
    'Soccerverse コミュニティによる独立したサイト・ツール・クリエイター。本イベントとは提携していません——本当に役立つのでリンクしています。',
  creatorsEyebrow: '制作者',
  creatorsTitle: '誰が作ったか',
  creatorsBody:
    'このイベントとこのページは、Libertaer、Klo、Acky、Blvck による共同制作で、Soccerverse コミュニティの中で各自の時間を使って作られました。Soccerverse の Discord で気軽に声をかけてください——イベントの中の人に連絡したり、フィードバックを送ったり、手伝ったりするのに最適な場所です。',
  by: '制作',
  blurbs: {
    play: 'ゲームを開いて自分のクラブを運営しよう。',
    site: '公式サイト——Soccerverse とは何か、始め方。',
    guide: '公式の入門ガイドとハウツー。',
    hub: 'プレイヤーとクラブのための Soccerverse ハブ。',
    data: '選手・クラブ・経済のライブデータ。',
    ratings: 'Soccerverse の選手レーティングを閲覧・比較。',
    wiki: 'コミュニティのナレッジベースとゲームの仕組み。',
    discord: 'コミュニティチャットに参加——イベントへの最速ルート。',
    svbase: 'Soccerverse 向けのコミュニティツールと統計。',
    elrincon: 'コミュニティのガイドとリソース（スペイン語）。',
    svworld: 'Soccerverse マネージャー向けのコミュニティサイト。',
    svfootball: 'コミュニティ制作の Soccerverse 関連サイト。',
    office: 'コミュニティ制作の Soccerverse ツール。',
    nickx: 'Twitch での Soccerverse 配信とコンテンツ。',
  },
}

const copyByLocale: Record<LocaleCode, AboutCopy> = {
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

// The official Soccerverse mark, rendered behind official link cards as a hover watermark.
// Uses currentColor so the tint/dimness is controlled by the wrapping element's text color + opacity.
function SoccerverseMark({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 698.12 826.77" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M144.86,486.75l196.93,196.88c4.69,4.69,12.29,4.69,16.98,0l29.24-29.21c4.69-4.69,4.7-12.3,0-16.99l-238.16-238.16c-3.77-3.77-10.23-1.1-10.23,4.24v70.58c0,4.75,1.89,9.3,5.24,12.65Z"
      />
      <path
        fill="currentColor"
        d="M486.43,349.28h-163.99c-26.66,0-41.91-4.31-41.91-27.14v-26.27c.91-21,15.95-25.05,41.78-25.05h123.69c27.05-.17,39.77,4.88,41.73,23.51.64,6.07,5.75,10.69,11.85,10.69h41.78c6.55,0,11.88-5.3,11.94-11.86.22-25.85-1.16-42.9-27.27-71.93,0,0,0-.04-.04-.04-.52-1.54-57.8-58.44-75.73-76.35-3.35-3.35-7.88-5.21-12.62-5.21h-70.51c-5.34,0-8.01,6.45-4.24,10.23l55.61,55.61h-92.58l-60.59-60.59c-3.36-3.36-7.91-5.24-12.65-5.24h-70.58c-5.34,0-8.01,6.45-4.24,10.23l68.41,68.42c-19.38,13.35-31.83,36.3-31.11,61.43l-65.32-65.29c-3.77-3.77-10.23-1.1-10.23,4.24v70.55c0,4.74,1.88,9.29,5.24,12.65l66.7,66.74c19.08,18.67,40.88,37.69,66.36,42.83,10.86,2.54,27.32,3.15,37.21,3.22,0,0,136.2,0,136.2,0,25.36,0,40.34,3.92,41.74,23.96.11,12.09,1.64,16.79-10.24,28.49l-35.86,35.98c-2.33,2.34-6.12,2.34-8.46,0l-17.85-17.85c-3.35-3.35-7.9-5.24-12.65-5.24h-70.56c-5.33,0-8,6.44-4.23,10.21l101.06,101.06c4.67,4.67,12.25,4.67,16.92,0l84.38-84.42c14.81-14.81,22.92-34.46,22.92-55.38v-30.11c0-39.8-32.26-72.06-72.06-72.06Z"
      />
    </svg>
  )
}

function LinkCard({ item, copy, showMark = false }: { item: LinkItem; copy: AboutCopy; showMark?: boolean }) {
  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col overflow-hidden rounded-[1.1rem] border border-white/8 bg-black/15 p-4 transition duration-300 ease-out hover:border-white/18 hover:bg-white/6 active:scale-[0.99]"
    >
      {showMark && !item.preview ? (
        <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <SoccerverseMark className="h-28 w-28 scale-90 text-[#e8f1f9] opacity-0 blur-[2px] transition-all duration-[2000ms] ease-out group-hover:scale-100 group-hover:opacity-[0.16] group-hover:blur-0" />
        </span>
      ) : null}

      {item.preview ? (
        <span aria-hidden className="pointer-events-none absolute inset-0">
          <img
            src={item.preview.src}
            alt=""
            loading="lazy"
            className={[
              'absolute inset-0 h-full w-full scale-110 opacity-0 grayscale-[0.25] saturate-[1.05] transition duration-500 ease-out group-hover:scale-100 group-hover:opacity-100',
              item.preview.fit === 'contain' ? 'object-contain p-6' : 'object-cover',
            ].join(' ')}
          />
          <span className="absolute inset-0 bg-[var(--color-ink)]/80 transition duration-500 group-hover:bg-[var(--color-ink)]/45" />
        </span>
      ) : null}

      <span className="relative z-[1] flex flex-col">
        <span className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-white">{item.label}</span>
          <span className="mono text-[var(--color-accent)] transition group-hover:translate-x-0.5">↗</span>
        </span>
        {item.by ? (
          <span className="mono mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-sand)]">
            {copy.by} {item.by}
          </span>
        ) : null}
        <span className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">{copy.blurbs[item.id]}</span>
        <span className="mono mt-3 truncate text-[10px] text-[var(--color-muted)]/70">{item.href.replace(/^https?:\/\//, '')}</span>
      </span>
    </a>
  )
}

export function AboutPage({ locale }: AboutPageProps) {
  const copy = copyByLocale[locale] ?? englishCopy

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-12">
      <section className="hero-card rounded-[1.25rem] px-5 py-7 sm:px-7">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="section-title mt-4 max-w-[16ch]">{copy.title}</h1>
        <p className="mt-5 max-w-[68ch] text-base leading-relaxed text-[var(--color-muted)]">{copy.intro}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/register"
            className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-[1px] active:scale-[0.98]"
          >
            {copy.ctaRegister}
          </Link>
          <Link
            to="/rules"
            className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/6 active:scale-[0.98]"
          >
            {copy.ctaRules}
          </Link>
        </div>
      </section>

      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">{copy.svEyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{copy.svTitle}</h2>
        <p className="mt-4 max-w-[72ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.svBody}</p>
      </section>

      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">{copy.officialEyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{copy.officialTitle}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {officialLinks.map((item) => (
            <LinkCard key={item.href} item={item} copy={copy} showMark />
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">{copy.communityEyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{copy.communityTitle}</h2>
        <p className="mt-3 max-w-[72ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.communityBody}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {communityLinks.map((item) => (
            <LinkCard key={item.href} item={item} copy={copy} />
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-[1.25rem] p-5 sm:p-6">
        <p className="eyebrow">{copy.creatorsEyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{copy.creatorsTitle}</h2>
        <p className="mt-4 max-w-[72ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.creatorsBody}</p>
      </section>
    </div>
  )
}
