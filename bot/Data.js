/* ============================================================
   Data.js — Bot Configuration & Data
   Facebook Messenger AI Bot
   Owner: MANUELSON YASIS
   ============================================================ */

module.exports = {
  // ─── Bot Identity ─────────────────────────────────────────
  botName: "MANUELSON AI BOT",
  ownerName: "MANUELSON YASIS",
  version: "1.0.0",
  prefix: "/",

  // ─── Owner / Admin UIDs (Facebook user IDs) ───────────────
  adminUIDs: [
    "61588479630286",
  ],

  // ─── Auto-greeting messages ───────────────────────────────
  greetings: [
    "Kumusta! Ako si MANUELSON AI BOT 🤖",
    "Hello! How can I help you today?",
    "Hi friend! Type /help to see what I can do.",
    "Magandang araw! Ano maitutulong ko sa'yo?",
  ],

  // ─── Auto-reply triggers (keyword → reply) ────────────────
  autoReplies: {
    "hi": "Hello! 👋 Type /help to see commands.",
    "hello": "Hi there! 😊",
    "kumusta": "Mabuti naman! Ikaw kumusta? 🌸",
    "thanks": "You're welcome! 💙",
    "salamat": "Walang anuman! 🙏",
    "good morning": "Good morning! Have a great day ☀️",
    "good night": "Good night! Sweet dreams 🌙",
  },

  // ─── Available bot commands ───────────────────────────────
  commands: {
    help: { description: "Show all available commands", usage: "/help" },
    info: { description: "Show bot info", usage: "/info" },
    protect: { description: "Toggle chat protection (admins only)", usage: "/protect on | off | status" },
    ping: { description: "Check if the bot is alive", usage: "/ping" },
    uptime: { description: "Show how long the bot has been running", usage: "/uptime" },
    say: { description: "Bot will repeat what you say", usage: "/say <message>" },
    quote: { description: "Get a random motivational quote", usage: "/quote" },
    joke: { description: "Get a random joke", usage: "/joke" },
    owner: { description: "Show bot owner info", usage: "/owner" },
    post: { description: "Create a Facebook post", usage: "/post <message>" },
    autopost: { description: "Toggle 24/7 auto-news posting (admins)", usage: "/autopost on | off | status | now" },
    stream: { description: "MOR online streaming stations + live listeners", usage: "/stream" },
    settings: { description: "Toggle AI features on/off (admins)", usage: "/settings [feature] [on|off]" },
    install: { description: "Install custom command from code (admins)", usage: "/install <name.js>\\n<code>" },
    uninstall: { description: "Remove an installed command (admins)", usage: "/uninstall <name>" },
    commands: { description: "List all installed custom commands", usage: "/commands" },
  },

  // ─── Auto-post news settings ──────────────────────────────
  autoPost: {
    enabled: true,                   // 24/7, never turns off
    intervalMinutes: 3,              // post every ~3 minutes
    jitterSeconds: 45,               // ±45s random variance to look human
    skipChance: 0.10,                // 10% chance to skip a cycle (natural pause)
    typingDelayMs: [3000, 9000],     // simulated "typing" pause range
    maxPostsPerHour: 0,              // 0 = unlimited (use bot judgment / CPU only)
    apiUrl: "https://newsdata.io/api/1/latest?apikey=pub_4b1ec47b99fd4f8a9be3475f69e0f979&q=Philippines%20",
    stateFile: "autopost_state.json",
    historyFile: "posted_news.json",
    maxHistory: 200,
    brand: {
      name: "MOR 101.9 NAGA NEWS",
      tagline: "Para sa Naga, Para sa Pilipinas",
      footerLine: "📻 MOR 101.9 NAGA · Tune in for more updates",
    },
  },

  // ─── Bot protection (admin-only chat lock) ────────────────
  protection: {
    defaultProtected: false,         // /protect off by default
    protectMessage: "🔐 THIS AI IS PROTECTED BY THE ADMIN\n\nTo all users: please do NOT chat.\nOnly news posts are active right now.\n\n— Admin",
  },

  // ─── Human-like reaction variations (anti-detect) ─────────
  postIntros: [
    "Latest update 📰",
    "News alert!",
    "Just in:",
    "Heads up:",
    "Worth a read 👇",
    "Kakaalam ko lang:",
    "Bagong balita:",
    "Sharing this:",
    "Interesting one:",
    "ICYMI:",
    "Saw this earlier —",
    "Para sa mga interesado:",
    "Update ngayon:",
    "Ito ang trending:",
    "Real talk:",
  ],
  postOutros: [
    "What do you think? 🤔",
    "Thoughts?",
    "Anong masasabi nyo?",
    "Stay informed everyone 🙏",
    "Share lang for awareness.",
    "Ingat tayo lahat 🇵🇭",
    "Para sa kaalaman natin.",
    "Let's talk about this.",
    "",  // sometimes no outro
    "",
    "",
  ],
  postEmojis: ["📰","🇵🇭","💭","✨","🙏","📢","🌏","💡","🔔","👀"],

  // ─── Random quotes ────────────────────────────────────────
  quotes: [
    "Believe you can and you're halfway there. — Theodore Roosevelt",
    "Ang tagumpay ay hindi nakukuha sa swerte, kundi sa pagsisikap.",
    "The only way to do great work is to love what you do. — Steve Jobs",
    "Hindi mahalaga kung gaano ka kabagal magpatuloy, basta't hindi ka tumitigil.",
    "Dream big and dare to fail. — Norman Vaughan",
    "Ang taong masipag, hindi nagugutom.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill",
  ],

  // ─── Random jokes (Tagalog + English) ─────────────────────
  jokes: [
    "Bakit hindi pwede maging doctor ang multo? Kasi wala silang patient! 😂",
    "Why don't scientists trust atoms? Because they make up everything! 🤣",
    "Anong tawag sa isdang tinapakan? ISDApak! 🐟",
    "I told my wife she was drawing her eyebrows too high. She looked surprised. 😆",
    "Bakit malungkot ang refrigerator? Kasi lagi siyang naiiwan sa bahay. ❄️",
  ],

  // ─── Bot behavior settings (toggleable via /settings) ────
  settings: {
    autoReply: true,         // respond to keyword auto-replies
    autoGreet: true,         // send greeting on common hellos
    logMessages: true,       // log incoming messages to console
    typingIndicator: true,   // show typing... before replies
    reactToCommands: true,   // react with emoji to commands
    autoPost: true,          // mirror of autoPost.enabled
    protect: false,          // mirror of protectMode
    customCommands: true,    // allow installed custom commands to run
    antiDetect: true,        // anti-detect mutations on autopost
    sessionKeepAlive: true,  // appstate auto-save + ping
    dedupeMessages: true,    // ignore duplicate messageIDs (anti double-chat)
  },

  // ─── MOR Online Streaming Stations ────────────────────────
  stations: [
    {
      name: "MOR ENTERTAINMENT METRO MANILA",
      slug: "mor-entertainment",
      stationUrl: "https://zeno.fm/radio/mor-entertainment/",
      streamUrl: "https://stream.zeno.fm/0r0xa792kwzuv",
      provider: "zeno",
      tagline: "🎙️ Metro Manila's #1 Entertainment Hub",
    },
    {
      name: "MOR 97.1 CEBU",
      slug: "mor-971-cebu",
      stationUrl: "https://mor971lupigsila.blogspot.rs/",
      streamUrl: null,
      provider: "blogspot",
      tagline: "🎙️ Lupig Sila — Cebu's hottest hits",
    },
  ],
};
