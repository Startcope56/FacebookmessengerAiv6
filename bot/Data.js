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
  // Add your Facebook user ID here so the bot recognizes you as admin
  adminUIDs: [
    // "100012345678901"
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
    help: {
      description: "Show all available commands",
      usage: "/help",
    },
    info: {
      description: "Show bot info",
      usage: "/info",
    },
    ping: {
      description: "Check if the bot is alive",
      usage: "/ping",
    },
    uptime: {
      description: "Show how long the bot has been running",
      usage: "/uptime",
    },
    say: {
      description: "Bot will repeat what you say",
      usage: "/say <message>",
    },
    quote: {
      description: "Get a random motivational quote",
      usage: "/quote",
    },
    joke: {
      description: "Get a random joke",
      usage: "/joke",
    },
    owner: {
      description: "Show bot owner info",
      usage: "/owner",
    },
  },

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

  // ─── Bot behavior settings ────────────────────────────────
  settings: {
    autoReply: true,
    autoGreet: true,
    logMessages: true,
    typingIndicator: true,
    reactToCommands: true,
  },
};
