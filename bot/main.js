/* ============================================================
   main.js — Facebook Messenger AI Bot Entry Point
   Library: stfca (Unofficial Facebook Chat API)
   Owner: MANUELSON YASIS
   Features: Commands · Auto-reply · 24/7 Auto-news Posting
   ============================================================ */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const login = require("stfca");
const Data = require("./Data");

const APPSTATE_PATH = path.join(__dirname, "appstate.json");
const STATE_PATH = path.join(__dirname, Data.autoPost.stateFile);
const HISTORY_PATH = path.join(__dirname, Data.autoPost.historyFile);
const START_TIME = Date.now();

let autoPostEnabled = Data.autoPost.enabled;
let autoPostTimer = null;
let lastAutoPostAt = null;
let autoPostCount = 0;

/* ─── Banner ─────────────────────────────────────────────── */
function banner() {
  console.log("\n" + "═".repeat(60));
  console.log(`   🤖  ${Data.botName}  v${Data.version}`);
  console.log(`   👤  Owner: ${Data.ownerName}`);
  console.log(`   🔧  Prefix: ${Data.prefix}`);
  console.log(`   📰  Auto-Post News: ${autoPostEnabled ? "ON (24/7)" : "OFF"}`);
  console.log("═".repeat(60) + "\n");
}

/* ─── State persistence ──────────────────────────────────── */
function loadState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      const s = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
      if (typeof s.autoPostEnabled === "boolean") autoPostEnabled = s.autoPostEnabled;
    }
  } catch (e) { console.warn("loadState:", e.message); }
}
function saveState() {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify({ autoPostEnabled, lastAutoPostAt, autoPostCount }, null, 2));
  } catch (e) { console.warn("saveState:", e.message); }
}
function loadHistory() {
  try { if (fs.existsSync(HISTORY_PATH)) return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8")); }
  catch {}
  return [];
}
function saveHistory(arr) {
  try { fs.writeFileSync(HISTORY_PATH, JSON.stringify(arr.slice(-Data.autoPost.maxHistory), null, 2)); }
  catch (e) { console.warn("saveHistory:", e.message); }
}

/* ─── Helpers ────────────────────────────────────────────── */
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function uptimeText() {
  const ms = Date.now() - START_TIME;
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  return `${h}h ${m}m ${s}s`;
}

function loadAppState() {
  if (!fs.existsSync(APPSTATE_PATH)) {
    console.error("❌ appstate.json not found.");
    process.exit(1);
  }
  try {
    const raw = fs.readFileSync(APPSTATE_PATH, "utf8").trim();
    if (!raw || raw === "[]") {
      console.error("⚠️  appstate.json is EMPTY. Paste your FB cookies array.");
      process.exit(1);
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error("❌ Failed to parse appstate.json:", e.message);
    process.exit(1);
  }
}

function isAdmin(uid) {
  return Data.adminUIDs.length === 0 || Data.adminUIDs.includes(String(uid));
}

/* ─── News fetching ──────────────────────────────────────── */
async function fetchNews() {
  const res = await axios.get(Data.autoPost.apiUrl, { timeout: 15000 });
  const results = res.data?.results;
  if (!Array.isArray(results) || results.length === 0) throw new Error("No news returned");
  return results;
}

function pickFreshNews(results, history) {
  const seen = new Set(history.map(h => h.id));
  const fresh = results.filter(r => !seen.has(r.article_id || r.link || r.title));
  return fresh.length > 0 ? pick(fresh) : null;
}

/* ─── Anti-detect post composer ──────────────────────────── */
function composePost(article) {
  const intro = pick(Data.postIntros);
  const outro = pick(Data.postOutros);
  const emoji = Math.random() < 0.7 ? pick(Data.postEmojis) + " " : "";
  const title = (article.title || "").trim();
  const desc = (article.description || "").trim();
  const link = article.link || "";
  const source = article.source_id || article.source_name || "";

  // Vary structure each time so output never looks templated
  const layouts = [
    () => `${emoji}${intro}\n\n${title}${desc ? "\n\n" + desc : ""}${source ? `\n\nSource: ${source}` : ""}${link ? "\n" + link : ""}${outro ? "\n\n" + outro : ""}`,
    () => `${title}\n\n${desc}${link ? "\n\nRead more: " + link : ""}\n\n— ${source || "via news feed"}${outro ? "\n" + outro : ""}`,
    () => `${intro} ${emoji}\n\n${title}${link ? "\n\n🔗 " + link : ""}${outro ? "\n\n" + outro : ""}`,
    () => `${title}\n${"─".repeat(rand(8, 22))}\n${desc || "No description available."}${source ? `\n\n📌 ${source}` : ""}${link ? "\n" + link : ""}${outro ? "\n\n" + outro : ""}`,
  ];
  let text = pick(layouts)();

  // Light, natural mutations
  if (Math.random() < 0.25) text = text.replace(/\.$/g, "");          // sometimes drop trailing period
  if (Math.random() < 0.15) text = text.toLowerCase();                 // occasional all-lowercase
  if (Math.random() < 0.20) text += "\n\n#Philippines #News";          // occasional hashtags
  if (Math.random() < 0.10) text += " 🇵🇭";

  return text.trim().slice(0, 1900); // safe length
}

/* ─── Auto-post executor ─────────────────────────────────── */
let apiRef = null;

async function runAutoPostCycle() {
  if (!autoPostEnabled || !apiRef) return;

  // Anti-detect: random skip
  if (Math.random() < Data.autoPost.skipChance) {
    console.log("📰 [autopost] skipping this cycle (anti-detect natural pause)");
    return;
  }

  try {
    const results = await fetchNews();
    const history = loadHistory();
    const article = pickFreshNews(results, history);
    if (!article) {
      console.log("📰 [autopost] no new fresh article — skipping");
      return;
    }

    const text = composePost(article);

    // Anti-detect: simulate "typing" delay before posting
    const typingDelay = rand(Data.autoPost.typingDelayMs[0], Data.autoPost.typingDelayMs[1]);
    console.log(`📰 [autopost] composing post (typing delay ${typingDelay}ms)...`);
    await sleep(typingDelay);

    // Post
    const post = await apiRef.createPost(text);
    autoPostCount++;
    lastAutoPostAt = new Date().toISOString();

    history.push({
      id: article.article_id || article.link || article.title,
      title: article.title,
      postedAt: lastAutoPostAt,
      postId: post?.legacy_story_hideable_id || null,
    });
    saveHistory(history);
    saveState();

    console.log(`✅ [autopost #${autoPostCount}] posted: "${(article.title || "").slice(0, 60)}..."`);
  } catch (e) {
    console.error("❌ [autopost] error:", e?.error || e?.message || e);
  }
}

function scheduleNextAutoPost() {
  if (autoPostTimer) { clearTimeout(autoPostTimer); autoPostTimer = null; }
  if (!autoPostEnabled) return;

  // Anti-detect: jitter the interval ±jitterSeconds
  const baseMs = Data.autoPost.intervalMinutes * 60 * 1000;
  const jitterMs = rand(-Data.autoPost.jitterSeconds, Data.autoPost.jitterSeconds) * 1000;
  const wait = Math.max(60_000, baseMs + jitterMs);

  console.log(`⏱️  [autopost] next post in ${Math.round(wait / 1000)}s`);

  autoPostTimer = setTimeout(async () => {
    await runAutoPostCycle();
    scheduleNextAutoPost(); // chain forever — never stops
  }, wait);
}

function startAutoPost() {
  if (!autoPostEnabled) return;
  console.log("📰 [autopost] starting 24/7 cycle...");
  // First run after a short randomized delay (10–40s)
  setTimeout(async () => {
    await runAutoPostCycle();
    scheduleNextAutoPost();
  }, rand(10_000, 40_000));
}

function stopAutoPost() {
  if (autoPostTimer) { clearTimeout(autoPostTimer); autoPostTimer = null; }
  console.log("📰 [autopost] stopped.");
}

/* ─── Command handler ────────────────────────────────────── */
async function handleCommand(api, event, cmd, args) {
  const send = (msg) => api.sendMessage(msg, event.threadID, event.messageID);

  switch (cmd) {
    case "help": {
      let txt = `🤖 ${Data.botName} — Commands\n${"─".repeat(30)}\n`;
      for (const [name, info] of Object.entries(Data.commands)) {
        txt += `\n${Data.prefix}${name}\n  ${info.description}\n  Usage: ${info.usage}\n`;
      }
      txt += `\n${"─".repeat(30)}\n👤 Owner: ${Data.ownerName}`;
      return send(txt);
    }

    case "info":
      return send(
        `🤖 Bot: ${Data.botName}\n📦 Version: ${Data.version}\n👤 Owner: ${Data.ownerName}\n🔧 Prefix: ${Data.prefix}\n📚 Library: stfca\n📰 Auto-post: ${autoPostEnabled ? "ON" : "OFF"}`
      );

    case "ping":
      return send("🏓 Pong! Bot is online and responsive.");

    case "uptime":
      return send(`⏱️  Uptime: ${uptimeText()}`);

    case "say":
      if (!args.length) return send("Usage: /say <message>");
      return send(args.join(" "));

    case "quote":
      return send(`💭 ${pick(Data.quotes)}`);

    case "joke":
      return send(`😂 ${pick(Data.jokes)}`);

    case "owner":
      return send(`👑 Owner\n${"─".repeat(20)}\nName: ${Data.ownerName}\nBot: ${Data.botName} v${Data.version}`);

    /* ─── /post <message> — manual create FB post ─── */
    case "post": {
      const msg = args.join(" ");
      if (!msg) return send("⚠️ Enter message to post.");
      try {
        const post = await api.createPost(msg);
        return send(`✅️ Posted successfully.\nPostID: ${post?.legacy_story_hideable_id || "N/A"}`);
      } catch (err) {
        console.error("createPost error:", err);
        const e = err?.error || err?.message || err?.err || JSON.stringify(err);
        return send(`❌ Failed to post: ${e}`);
      }
    }

    /* ─── /autopost on|off|status ─── */
    case "autopost": {
      if (!isAdmin(event.senderID)) return send("🚫 Admins only.");
      const sub = (args[0] || "status").toLowerCase();
      if (sub === "on") {
        if (autoPostEnabled) return send("📰 Auto-post is already ON.");
        autoPostEnabled = true; saveState(); startAutoPost();
        return send(`✅ Auto-post turned ON.\n• Every ~${Data.autoPost.intervalMinutes} min (±${Data.autoPost.jitterSeconds}s)\n• Source: newsdata.io (Philippines)\n• Anti-detect: ENABLED 🛡️`);
      }
      if (sub === "off") {
        if (!autoPostEnabled) return send("📰 Auto-post is already OFF.");
        autoPostEnabled = false; saveState(); stopAutoPost();
        return send("🛑 Auto-post turned OFF.");
      }
      if (sub === "now") {
        send("📰 Posting now...");
        await runAutoPostCycle();
        return;
      }
      // status
      return send(
        `📰 Auto-Post Status\n${"─".repeat(22)}\n` +
        `State: ${autoPostEnabled ? "✅ ON (24/7)" : "🛑 OFF"}\n` +
        `Interval: every ${Data.autoPost.intervalMinutes} min (±${Data.autoPost.jitterSeconds}s)\n` +
        `Posts made: ${autoPostCount}\n` +
        `Last post: ${lastAutoPostAt || "never"}\n` +
        `Anti-detect: 🛡️ ENABLED\n\n` +
        `Subcommands:\n  /autopost on\n  /autopost off\n  /autopost now\n  /autopost status`
      );
    }

    default:
      return send(`❓ Unknown command: "${cmd}"\nType ${Data.prefix}help to see all commands.`);
  }
}

/* ─── Auto-reply matcher ─────────────────────────────────── */
function matchAutoReply(text) {
  const lower = text.toLowerCase().trim();
  for (const [keyword, reply] of Object.entries(Data.autoReplies)) {
    if (lower === keyword || lower.includes(keyword)) return reply;
  }
  return null;
}

/* ─── Main listener ──────────────────────────────────────── */
function startBot() {
  loadState();
  banner();
  const appState = loadAppState();

  console.log("🔐 Logging in to Facebook...");
  login({ appState }, (err, api) => {
    if (err) {
      console.error("❌ Login failed:", err.error || err);
      process.exit(1);
    }

    api.setOptions({
      listenEvents: true,
      selfListen: false,
      autoMarkRead: true,
      autoMarkDelivery: true,
      forceLogin: true,
    });

    apiRef = api;
    console.log(`✅ Logged in successfully! Listening... (prefix: ${Data.prefix})\n`);

    api.listenMqtt(async (err, event) => {
      if (err) { console.error("⚠️  Listen error:", err); return; }
      if (event.type !== "message" || !event.body) return;

      const body = event.body.trim();
      if (Data.settings.logMessages) console.log(`📩 [${event.threadID}] ${event.senderID}: ${body}`);

      if (body.startsWith(Data.prefix)) {
        const parts = body.slice(Data.prefix.length).trim().split(/\s+/);
        const cmd = (parts.shift() || "").toLowerCase();
        try { await handleCommand(api, event, cmd, parts); }
        catch (e) {
          console.error("Command error:", e);
          api.sendMessage("⚠️ An error occurred running that command.", event.threadID);
        }
        return;
      }

      if (Data.settings.autoReply) {
        const reply = matchAutoReply(body);
        if (reply) api.sendMessage(reply, event.threadID);
      }
    });

    // Save updated appstate every 5 minutes
    setInterval(() => {
      try {
        fs.writeFileSync(APPSTATE_PATH, JSON.stringify(api.getAppState(), null, 2));
        console.log("💾 appstate.json updated");
      } catch (e) { console.error("Failed to save appstate:", e.message); }
    }, 5 * 60 * 1000);

    // Kick off auto-post 24/7 loop
    startAutoPost();
  });
}

/* ─── Crash protection — keep 24/7 alive ─────────────────── */
process.on("uncaughtException", (e) => console.error("UncaughtException:", e));
process.on("unhandledRejection", (e) => console.error("UnhandledRejection:", e));

startBot();
