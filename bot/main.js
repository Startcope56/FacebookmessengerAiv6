/* ============================================================
   main.js — Facebook Messenger AI Bot
   Library: stfca · Owner: MANUELSON YASIS
   Features: Commands · Auto-reply · 24/7 News Auto-Post (3 min)
             · Chat Protection · Anti-Detect · Session Keep-Alive
   ============================================================ */

const fs = require("fs");
const http = require("http");
const path = require("path");
const axios = require("axios");
const login = require("stfca");
const Data = require("./Data");

/* ─── Tiny health-check HTTP server (deployment) ─────────── */
const PORT = parseInt(process.env.PORT || "3000", 10);
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "ok",
    bot: Data.botName,
    owner: Data.ownerName,
    version: Data.version,
    uptimeSec: Math.floor(process.uptime()),
    autoPost: autoPostEnabled,
    protect: protectMode,
    posts: autoPostCount,
  }));
}).listen(PORT, "0.0.0.0", () => console.log(`🌐 Health server on :${PORT}`));

/* ─── Paths & state ──────────────────────────────────────── */
const APPSTATE_PATH = path.join(__dirname, "appstate.json");
const STATE_PATH = path.join(__dirname, Data.autoPost.stateFile);
const HISTORY_PATH = path.join(__dirname, Data.autoPost.historyFile);
const ACTIVATED_PATH = path.join(__dirname, "activated.json");
const START_TIME = Date.now();

let autoPostEnabled = Data.autoPost.enabled;
let protectMode = Data.protection.defaultProtected;
let autoPostTimer = null;
let lastAutoPostAt = null;
let autoPostCount = 0;
let postTimestamps = []; // for hourly cap (if enabled)
let activatedAt = null;

// Anti double-chat: dedupe seen messageIDs (TTL ~2min)
const seenMessages = new Map();
function alreadySeen(mid) {
  if (!mid) return false;
  const now = Date.now();
  for (const [k, t] of seenMessages) if (now - t > 120_000) seenMessages.delete(k);
  if (seenMessages.has(mid)) return true;
  seenMessages.set(mid, now);
  return false;
}

// Runtime feature toggles (clone from Data so we can mutate)
const featureFlags = { ...Data.settings };

// Custom command registry (loaded from bot/commands/*.js)
const customCommands = new Map();
const COMMANDS_DIR = path.join(__dirname, "commands");

/* ─── Sans-Serif Bold Unicode converter (anti-detect bonus + style) ─── */
const BOLD_MAP = {
  A:"𝗔",B:"𝗕",C:"𝗖",D:"𝗗",E:"𝗘",F:"𝗙",G:"𝗚",H:"𝗛",I:"𝗜",J:"𝗝",K:"𝗞",L:"𝗟",M:"𝗠",
  N:"𝗡",O:"𝗢",P:"𝗣",Q:"𝗤",R:"𝗥",S:"𝗦",T:"𝗧",U:"𝗨",V:"𝗩",W:"𝗪",X:"𝗫",Y:"𝗬",Z:"𝗭",
  a:"𝗮",b:"𝗯",c:"𝗰",d:"𝗱",e:"𝗲",f:"𝗳",g:"𝗴",h:"𝗵",i:"𝗶",j:"𝗷",k:"𝗸",l:"𝗹",m:"𝗺",
  n:"𝗻",o:"𝗼",p:"𝗽",q:"𝗾",r:"𝗿",s:"𝘀",t:"𝘁",u:"𝘂",v:"𝘃",w:"𝘄",x:"𝘅",y:"𝘆",z:"𝘇",
  "0":"𝟬","1":"𝟭","2":"𝟮","3":"𝟯","4":"𝟰","5":"𝟱","6":"𝟲","7":"𝟳","8":"𝟴","9":"𝟵",
};
const toBold = (s) => String(s).split("").map(c => BOLD_MAP[c] || c).join("");

/* ─── Helpers ────────────────────────────────────────────── */
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function uptimeMs() { return Date.now() - START_TIME; }
function uptimeText() {
  const ms = uptimeMs();
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000) % 24;
  const d = Math.floor(ms / 86400000);
  return `${d}d ${h}h ${m}m ${s}s`;
}
function activeDays() {
  if (!activatedAt) return 0;
  return Math.max(1, Math.floor((Date.now() - activatedAt) / 86400000));
}

/* ─── State persistence ──────────────────────────────────── */
function loadState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      const s = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
      if (typeof s.autoPostEnabled === "boolean") autoPostEnabled = s.autoPostEnabled;
      if (typeof s.protectMode === "boolean") protectMode = s.protectMode;
      if (typeof s.autoPostCount === "number") autoPostCount = s.autoPostCount;
      lastAutoPostAt = s.lastAutoPostAt || null;
    }
    if (fs.existsSync(ACTIVATED_PATH)) {
      activatedAt = JSON.parse(fs.readFileSync(ACTIVATED_PATH, "utf8")).activatedAt;
    } else {
      activatedAt = Date.now();
      fs.writeFileSync(ACTIVATED_PATH, JSON.stringify({ activatedAt }));
    }
  } catch (e) { console.warn("loadState:", e.message); }
}
function saveState() {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify({
      autoPostEnabled, protectMode, autoPostCount, lastAutoPostAt,
    }, null, 2));
  } catch (e) { console.warn("saveState:", e.message); }
}
function loadHistory() {
  try { if (fs.existsSync(HISTORY_PATH)) return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8")); }
  catch {} return [];
}
function saveHistory(arr) {
  try { fs.writeFileSync(HISTORY_PATH, JSON.stringify(arr.slice(-Data.autoPost.maxHistory), null, 2)); }
  catch (e) { console.warn("saveHistory:", e.message); }
}

/* ─── Banner ─────────────────────────────────────────────── */
function banner() {
  console.log("\n" + "═".repeat(60));
  console.log(`   🤖  ${Data.botName}  v${Data.version}`);
  console.log(`   👤  Owner: ${Data.ownerName}`);
  console.log(`   📰  Auto-Post: ${autoPostEnabled ? "ON (24/7, ~3 min)" : "OFF"}`);
  console.log(`   🔐  Protect Mode: ${protectMode ? "ON" : "OFF"}`);
  console.log(`   📡  Brand: ${Data.autoPost.brand.name}`);
  console.log("═".repeat(60) + "\n");
}

/* ─── AppState protection ────────────────────────────────── */
function loadAppState() {
  if (!fs.existsSync(APPSTATE_PATH)) {
    console.error("❌ appstate.json not found."); process.exit(1);
  }
  try {
    const raw = fs.readFileSync(APPSTATE_PATH, "utf8").trim();
    if (!raw || raw === "[]") {
      console.error("⚠️  appstate.json is EMPTY."); process.exit(1);
    }
    return JSON.parse(raw);
  } catch (e) { console.error("❌ Bad appstate.json:", e.message); process.exit(1); }
}
function backupAppState() {
  try {
    const dir = path.join(__dirname, "appstate_backups");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    if (fs.existsSync(APPSTATE_PATH)) {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      fs.copyFileSync(APPSTATE_PATH, path.join(dir, `appstate-${ts}.json`));
      const files = fs.readdirSync(dir).sort();
      while (files.length > 10) fs.unlinkSync(path.join(dir, files.shift()));
    }
  } catch (e) { console.warn("backupAppState:", e.message); }
}

function isAdmin(uid) {
  return Data.adminUIDs.length === 0 || Data.adminUIDs.includes(String(uid));
}

/* ─── Streaming station live status ──────────────────────── */
async function checkStationLive(station) {
  try {
    if (station.provider === "zeno" && station.streamUrl) {
      // Best-effort listener fetch from public Zeno page
      try {
        const res = await axios.get(station.stationUrl, { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" } });
        const m = String(res.data).match(/listeners?["':\s]+([\d,]+)/i);
        if (m) {
          const n = parseInt(m[1].replace(/,/g, ""), 10);
          if (!isNaN(n)) return { online: true, totalListeners: n };
        }
      } catch {}
      // Verify stream alive via HEAD
      try {
        const h = await axios.head(station.streamUrl, { timeout: 5000, validateStatus: () => true });
        return { online: h.status >= 200 && h.status < 400, totalListeners: 0 };
      } catch { return { online: false, totalListeners: 0 }; }
    }
    if (station.provider === "blogspot") {
      const r = await axios.get(station.stationUrl, { timeout: 6000, validateStatus: () => true });
      return { online: r.status >= 200 && r.status < 400, totalListeners: 0 };
    }
  } catch {}
  return { online: false, totalListeners: 0 };
}

let _liveCache = null;
async function gatherAllLive() {
  const out = [];
  for (const st of Data.stations) {
    const live = await checkStationLive(st);
    out.push({ ...st, ...live });
  }
  const total = out.reduce((s, x) => s + (x.totalListeners || 0), 0);
  for (const o of out) {
    o.percentage = total > 0 ? ((o.totalListeners / total) * 100).toFixed(1) : null;
  }
  _liveCache = out;
  return out;
}
// override checkStationLive to add percentage from cached aggregate
const _originalCheck = checkStationLive;
async function checkStationLiveWithPct(station) {
  if (!_liveCache || !_liveCache.find(x => x.slug === station.slug)) await gatherAllLive();
  const found = _liveCache.find(x => x.slug === station.slug);
  return found || { online: false, totalListeners: 0, percentage: null };
}
// Replace by reassignment
checkStationLive = checkStationLiveWithPct;
async function sumListeners() {
  const arr = _liveCache || await gatherAllLive();
  const t = arr.reduce((s, x) => s + (x.totalListeners || 0), 0);
  return t > 0 ? t.toLocaleString() : "—";
}

/* ─── Custom command loader (Mirai/GoatBot/Botpack compat) ─ */
function loadCustomCommand(filePath) {
  try {
    delete require.cache[require.resolve(filePath)];
    const mod = require(filePath);
    let name, description, runner, format = "generic";

    // GoatBot V2 / Mirai style: { config: {name, description}, onStart/onChat }
    if (mod.config && (mod.onStart || mod.onChat || mod.run || mod.execute)) {
      name = (mod.config.name || path.basename(filePath, ".js")).toLowerCase();
      description = mod.config.description || mod.config.shortDescription?.en || "";
      runner = mod.onStart || mod.onChat || mod.run || mod.execute;
      format = mod.onStart ? "GoatBotV2" : (mod.onChat ? "Mirai" : "Legacy");
    }
    // Legacy module.exports.run + module.exports.config
    else if (typeof mod.run === "function") {
      name = (mod.config?.name || path.basename(filePath, ".js")).toLowerCase();
      description = mod.config?.description || "";
      runner = mod.run; format = "Botpack";
    }
    // Plain function export
    else if (typeof mod === "function") {
      name = path.basename(filePath, ".js").toLowerCase();
      runner = mod; format = "Function";
    } else { return null; }

    customCommands.set(name, { name, description, runner, format, file: filePath });
    return { name, description, format };
  } catch (e) {
    console.error(`❌ loadCustomCommand(${filePath}):`, e.message);
    return null;
  }
}

function loadAllCustomCommands() {
  if (!fs.existsSync(COMMANDS_DIR)) { fs.mkdirSync(COMMANDS_DIR); return; }
  const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith(".js"));
  for (const f of files) loadCustomCommand(path.join(COMMANDS_DIR, f));
  if (files.length) console.log(`📦 Loaded ${customCommands.size} custom command(s)`);
}

async function runCustomCommand(name, api, event, args) {
  const c = customCommands.get(name);
  if (!c) return false;
  try {
    const ctx = {
      api, event, args, message: { reply: (m) => api.sendMessage(m, event.threadID, event.messageID) },
      threadID: event.threadID, senderID: event.senderID, body: event.body,
      Data, Users: {}, Threads: {}, getLang: (k) => k,
    };
    // Try multiple call signatures for compatibility
    try { await c.runner(ctx); }
    catch { await c.runner(api, event, args); }
  } catch (e) {
    console.error(`Custom cmd "${name}" error:`, e);
    api.sendMessage(`⚠️ Error in custom command "${name}": ${e.message}`, event.threadID);
  }
  return true;
}

/* ─── News fetching & freshness ──────────────────────────── */
async function fetchNews() {
  const res = await axios.get(Data.autoPost.apiUrl, {
    timeout: 15000,
    headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36" },
  });
  const r = res.data?.results;
  if (!Array.isArray(r) || r.length === 0) throw new Error("No news returned");
  return r;
}
function pickFreshNews(results, history) {
  const seen = new Set(history.map(h => h.id));
  const fresh = results.filter(r => !seen.has(r.article_id || r.link || r.title));
  return fresh.length > 0 ? pick(fresh) : null;
}

/* ─── MOR 101.9 NAGA NEWS post composer ─────────────────── */
function composePost(article) {
  const brand = Data.autoPost.brand;
  const intro = pick(Data.postIntros);
  const outro = pick(Data.postOutros);
  const emoji = pick(Data.postEmojis);

  const title = (article.title || "").trim();
  const desc = (article.description || "").trim();
  const link = article.link || "";
  const source = article.source_id || article.source_name || "";

  const boldTitle = toBold(title);
  const boldBrand = toBold(brand.name);

  // Decorative dividers (rotate to vary look)
  const dividers = [
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    "═══════════════════════",
    "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬",
    "•───────────────────•",
    "◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆",
  ];
  const div = pick(dividers);

  const layouts = [
    () =>
      `📻 ${boldBrand} 📻\n${div}\n\n${emoji} ${boldTitle}\n\n${desc}\n\n` +
      `${source ? `📌 𝗦𝗼𝘂𝗿𝗰𝗲: ${source}\n` : ""}` +
      `${link ? `🔗 ${link}\n` : ""}\n${div}\n${brand.footerLine}\n${outro}`.trim(),

    () =>
      `╔═══ 📡 ${boldBrand} ═══╗\n\n` +
      `${intro}\n\n${boldTitle}\n\n${desc}\n\n` +
      `${link ? `▸ ${link}\n` : ""}` +
      `${source ? `▸ via ${source}\n` : ""}` +
      `\n╚═════════════════════════╝\n` +
      `🇵🇭 ${toBold(brand.tagline)}\n${outro}`.trim(),

    () =>
      `${emoji} ${boldBrand} ${emoji}\n${div}\n` +
      `${boldTitle}\n\n${desc}${link ? `\n\n👉 ${link}` : ""}\n\n` +
      `${div}\n📻 𝗧𝘂𝗻𝗲 𝗶𝗻 𝘁𝗼 𝟭𝟬𝟭.𝟵 𝗙𝗠 𝗡𝗮𝗴𝗮 ${source ? `· ${source}` : ""}\n${outro}`.trim(),

    () =>
      `🔴 𝗟𝗜𝗩𝗘 𝗡𝗘𝗪𝗦 — ${boldBrand}\n${div}\n\n` +
      `${boldTitle}\n\n${desc}\n\n` +
      `${source ? `📰 ${source}\n` : ""}${link ? `🌐 ${link}\n` : ""}\n` +
      `${div}\n${brand.footerLine}\n${outro}`.trim(),
  ];

  let text = pick(layouts)();

  // Subtle anti-detect mutations
  if (Math.random() < 0.18) text += "\n\n#MOR1019Naga #PhilippinesNews";
  if (Math.random() < 0.12) text += " 🇵🇭";

  return text.trim().slice(0, 1900);
}

/* ─── Auto-post executor (with protection layers) ────────── */
let apiRef = null;

function withinHourlyCap() {
  const cap = Data.autoPost.maxPostsPerHour;
  if (!cap || cap <= 0) return true; // unlimited
  const cutoff = Date.now() - 3600_000;
  postTimestamps = postTimestamps.filter(t => t > cutoff);
  return postTimestamps.length < cap;
}

async function runAutoPostCycle() {
  if (!autoPostEnabled || !apiRef) return;

  // Anti-detect: random skip
  if (Math.random() < Data.autoPost.skipChance) {
    console.log("📰 [autopost] natural pause — skipping cycle");
    return;
  }

  // Account-protection: hourly cap
  if (!withinHourlyCap()) {
    console.log(`📰 [autopost] hourly cap reached (${Data.autoPost.maxPostsPerHour}/hr) — skipping`);
    return;
  }

  try {
    const results = await fetchNews();
    const history = loadHistory();
    const article = pickFreshNews(results, history);
    if (!article) { console.log("📰 [autopost] no fresh article"); return; }

    const text = composePost(article);

    // Anti-detect typing delay
    const delay = rand(Data.autoPost.typingDelayMs[0], Data.autoPost.typingDelayMs[1]);
    console.log(`📰 [autopost] composing (typing ${delay}ms)...`);
    await sleep(delay);

    const post = await apiRef.createPost(text);
    autoPostCount++;
    lastAutoPostAt = new Date().toISOString();
    postTimestamps.push(Date.now());

    history.push({
      id: article.article_id || article.link || article.title,
      title: article.title, postedAt: lastAutoPostAt,
      postId: post?.legacy_story_hideable_id || null,
    });
    saveHistory(history);
    saveState();

    console.log(`✅ [autopost #${autoPostCount}] "${(article.title || "").slice(0, 60)}..."`);
  } catch (e) {
    console.error("❌ [autopost] error:", e?.error || e?.message || e);
  }
}

function scheduleNextAutoPost() {
  if (autoPostTimer) { clearTimeout(autoPostTimer); autoPostTimer = null; }
  if (!autoPostEnabled) return;
  const baseMs = Data.autoPost.intervalMinutes * 60 * 1000;
  const jitterMs = rand(-Data.autoPost.jitterSeconds, Data.autoPost.jitterSeconds) * 1000;
  const wait = Math.max(60_000, baseMs + jitterMs);
  console.log(`⏱️  [autopost] next in ${Math.round(wait / 1000)}s`);
  autoPostTimer = setTimeout(async () => {
    await runAutoPostCycle();
    scheduleNextAutoPost();
  }, wait);
}
function startAutoPost() {
  if (!autoPostEnabled) return;
  console.log("📰 [autopost] starting 24/7 cycle (3 min)...");
  setTimeout(async () => { await runAutoPostCycle(); scheduleNextAutoPost(); }, rand(8_000, 25_000));
}
function stopAutoPost() {
  if (autoPostTimer) { clearTimeout(autoPostTimer); autoPostTimer = null; }
  console.log("📰 [autopost] stopped.");
}

/* ─── Account-protection: session keep-alive ─────────────── */
function startSessionKeepAlive() {
  // Frequent appstate save (every 60s) + backup every hour
  setInterval(() => {
    if (!apiRef) return;
    try {
      fs.writeFileSync(APPSTATE_PATH, JSON.stringify(apiRef.getAppState(), null, 2));
    } catch (e) { console.warn("appstate save:", e.message); }
  }, 60_000);
  setInterval(backupAppState, 3600_000);

  // Lightweight session ping (calls a harmless API to keep cookies fresh)
  setInterval(async () => {
    if (!apiRef) return;
    try {
      if (typeof apiRef.getCurrentUserID === "function") apiRef.getCurrentUserID();
      if (typeof apiRef.getFriendsList === "function") {
        await new Promise(res => apiRef.getFriendsList(() => res()));
      }
    } catch {}
  }, 15 * 60_000);
}

/* ─── Command handler ────────────────────────────────────── */
async function handleCommand(api, event, cmd, args) {
  const send = (msg) => api.sendMessage(msg, event.threadID, event.messageID);

  switch (cmd) {
    case "help": {
      let txt = `🤖 ${Data.botName} — Commands\n${"─".repeat(30)}\n`;
      for (const [n, i] of Object.entries(Data.commands))
        txt += `\n${Data.prefix}${n}\n  ${i.description}\n  Usage: ${i.usage}\n`;
      txt += `\n${"─".repeat(30)}\n👤 Owner: ${Data.ownerName}`;
      return send(txt);
    }

    case "info": {
      const status = protectMode ? "🔴 PROTECTED" : "🟢 ACTIVE";
      return send(
        `🤖 ${toBold(Data.botName)}\n` +
        `${"━".repeat(28)}\n` +
        `📦 Version: ${Data.version}\n` +
        `👤 Owner: ${Data.ownerName}\n` +
        `🔧 Prefix: ${Data.prefix}\n` +
        `📚 Library: stfca\n\n` +
        `📊 ${toBold("STATUS")}\n` +
        `${"─".repeat(20)}\n` +
        `${status}\n` +
        `🟢 Active AI Days: ${activeDays()} day${activeDays() !== 1 ? "s" : ""}\n` +
        `⏱️  Uptime: ${uptimeText()}\n` +
        `📰 Posts made: ${autoPostCount}\n` +
        `📡 Brand: ${Data.autoPost.brand.name}\n\n` +
        `📢 ${toBold("AUTO-POST NOTICE")}\n` +
        `${"─".repeat(20)}\n` +
        `THIS AI IS AUTOMATICALLY POST NEWS\n` +
        `EVERY 3 MINUTES — 24/7 NO OFF\n\n` +
        `🛡️ Anti-detect: ENABLED\n` +
        `🔐 Account protection: ACTIVE`
      );
    }

    case "ping": return send("🏓 Pong! Bot is online.");
    case "uptime": return send(`⏱️  Uptime: ${uptimeText()}\n📅 Active for ${activeDays()} day(s)`);
    case "say":
      if (!args.length) return send("Usage: /say <message>");
      return send(args.join(" "));
    case "quote": return send(`💭 ${pick(Data.quotes)}`);
    case "joke": return send(`😂 ${pick(Data.jokes)}`);
    case "owner":
      return send(`👑 ${toBold("Owner")}\n${"─".repeat(20)}\nName: ${Data.ownerName}\nBot: ${Data.botName} v${Data.version}`);

    /* ─── /post <message> ─── */
    case "post": {
      const msg = args.join(" ");
      if (!msg) return send("⚠️ Enter message to post.");
      try {
        const post = await api.createPost(msg);
        return send(`✅️ Posted successfully.\nPostID: ${post?.legacy_story_hideable_id || "N/A"}`);
      } catch (err) {
        const e = err?.error || err?.message || err?.err || JSON.stringify(err);
        return send(`❌ Failed to post: ${e}`);
      }
    }

    /* ─── /autopost on|off|status|now ─── */
    case "autopost": {
      if (!isAdmin(event.senderID)) return send("🚫 Admins only.");
      const sub = (args[0] || "status").toLowerCase();
      if (sub === "on") {
        if (autoPostEnabled) return send("📰 Auto-post is already ON.");
        autoPostEnabled = true; saveState(); startAutoPost();
        return send(`✅ Auto-post ON\n• Every ~${Data.autoPost.intervalMinutes} min (±${Data.autoPost.jitterSeconds}s)\n• Brand: ${Data.autoPost.brand.name}\n• Anti-detect: 🛡️`);
      }
      if (sub === "off") {
        if (!autoPostEnabled) return send("📰 Auto-post is already OFF.");
        autoPostEnabled = false; saveState(); stopAutoPost();
        return send("🛑 Auto-post OFF.");
      }
      if (sub === "now") { send("📰 Posting now..."); await runAutoPostCycle(); return; }
      const capStr = (!Data.autoPost.maxPostsPerHour || Data.autoPost.maxPostsPerHour <= 0)
        ? "♾️ UNLIMITED (CPU-bound)" : `${Data.autoPost.maxPostsPerHour}/hr`;
      return send(
        `📰 ${toBold("Auto-Post Status")}\n${"─".repeat(22)}\n` +
        `State: ${autoPostEnabled ? "✅ ON (24/7)" : "🛑 OFF"}\n` +
        `Interval: ${Data.autoPost.intervalMinutes} min (±${Data.autoPost.jitterSeconds}s)\n` +
        `Brand: ${Data.autoPost.brand.name}\n` +
        `Posts: ${autoPostCount}\n` +
        `Last: ${lastAutoPostAt || "never"}\n` +
        `Cap: ${capStr}\n` +
        `Storage: ♾️ unlimited\n` +
        `Anti-detect: 🛡️ ENABLED`
      );
    }

    /* ─── /stream — MOR online streaming stations ─── */
    case "stream": {
      send("📻 Fetching live status of MOR stations...");
      const lines = [`📻 ${toBold("DO YOU WANT ONLINE STREAMING MOR HERE?")}`, "━".repeat(30)];
      for (const st of Data.stations) {
        const live = await checkStationLive(st);
        const total = live.totalListeners || 0;
        const pct = live.percentage != null ? `${live.percentage}%` : "—";
        lines.push("");
        lines.push(`${live.online ? "🔴 LIVE" : "⚫ OFFLINE"} · ${toBold(st.name)}`);
        lines.push(st.tagline);
        lines.push(`👥 Listeners: ${total > 0 ? total.toLocaleString() : "—"}  (~${pct})`);
        lines.push(`🔗 ${st.stationUrl}`);
      }
      lines.push("");
      lines.push("━".repeat(30));
      lines.push(`📊 Total network listeners: ${(await sumListeners())}`);
      lines.push(`📡 ${Data.autoPost.brand.name} · ${Data.ownerName}`);
      return send(lines.join("\n"));
    }

    /* ─── /settings [feature] [on|off] ─── */
    case "settings": {
      if (args.length === 0) {
        const lines = [`⚙️ ${toBold("AI Settings")}`, "━".repeat(28)];
        for (const [k, v] of Object.entries(featureFlags)) {
          lines.push(`${v ? "🟢" : "🔴"} ${k.padEnd(20)} ${v ? "ON" : "OFF"}`);
        }
        lines.push("━".repeat(28));
        lines.push(`Usage: ${Data.prefix}settings <feature> on|off`);
        return send(lines.join("\n"));
      }
      if (!isAdmin(event.senderID)) return send("🚫 Admins only.");
      const key = args[0];
      const val = (args[1] || "").toLowerCase();
      if (!(key in featureFlags)) return send(`❓ Unknown feature: ${key}`);
      if (val !== "on" && val !== "off") return send(`Usage: ${Data.prefix}settings ${key} on|off`);
      featureFlags[key] = val === "on";
      // Mirror critical flags
      if (key === "autoPost") {
        autoPostEnabled = featureFlags[key];
        if (autoPostEnabled) startAutoPost(); else stopAutoPost();
      }
      if (key === "protect") protectMode = featureFlags[key];
      saveState();
      return send(`✅ Setting "${key}" set to ${val.toUpperCase()}`);
    }

    /* ─── /install <name>\n<code> ─── */
    case "install": {
      if (!isAdmin(event.senderID)) return send("🚫 Admins only.");
      // Parse: /install name.js\n<code...>
      const raw = event.body.slice(Data.prefix.length + cmd.length).trim();
      const nl = raw.indexOf("\n");
      if (nl < 0) return send(`Usage:\n${Data.prefix}install <name.js>\n<code...>`);
      let name = raw.slice(0, nl).trim();
      const code = raw.slice(nl + 1).trim();
      if (!name) return send("⚠️ Please provide a command name.");
      if (!code) return send("⚠️ Please provide command code after the filename.");
      if (!name.endsWith(".js")) name += ".js";
      const safe = name.replace(/[^a-z0-9._-]/gi, "");
      const fp = path.join(COMMANDS_DIR, safe);
      try {
        if (!fs.existsSync(COMMANDS_DIR)) fs.mkdirSync(COMMANDS_DIR);
        fs.writeFileSync(fp, code, "utf8");
        const mod = loadCustomCommand(fp);
        if (!mod) { fs.unlinkSync(fp); return send("❌ Command code is invalid (no exports detected)."); }
        return send(
          `✅ Installed: ${toBold(mod.name)}\n` +
          `📁 File: commands/${safe}\n` +
          `📝 Description: ${mod.description || "(none)"}\n` +
          `▶ Usage: ${Data.prefix}${mod.name}\n` +
          `🔧 Format: ${mod.format}`
        );
      } catch (e) {
        return send(`❌ Install failed: ${e.message}`);
      }
    }

    /* ─── /uninstall <name> ─── */
    case "uninstall": {
      if (!isAdmin(event.senderID)) return send("🚫 Admins only.");
      const target = (args[0] || "").toLowerCase().replace(/\.js$/, "");
      if (!target) return send(`Usage: ${Data.prefix}uninstall <name>`);
      let removed = false;
      for (const [n, info] of customCommands) {
        if (n === target) {
          try { fs.unlinkSync(info.file); } catch {}
          customCommands.delete(n);
          removed = true; break;
        }
      }
      return send(removed ? `🗑️ Uninstalled: ${target}` : `❓ Not found: ${target}`);
    }

    /* ─── /commands — list installed custom commands ─── */
    case "commands": {
      if (customCommands.size === 0)
        return send(`📦 No custom commands installed.\nUse ${Data.prefix}install <name.js> + code to add one.`);
      const lines = [`📦 ${toBold("Installed Custom Commands")}`, "━".repeat(28)];
      for (const [n, info] of customCommands) {
        lines.push(`• ${Data.prefix}${n}  [${info.format}]`);
        if (info.description) lines.push(`    ${info.description}`);
      }
      return send(lines.join("\n"));
    }

    /* ─── /protect on|off|status ─── */
    case "protect": {
      if (!isAdmin(event.senderID)) return send("🚫 Admins only.");
      const sub = (args[0] || "status").toLowerCase();
      if (sub === "on") {
        protectMode = true; saveState();
        return send(`🔐 Protection ON\nUsers can no longer chat with the bot.\nThey will receive the protect message.`);
      }
      if (sub === "off") {
        protectMode = false; saveState();
        return send(`🔓 Protection OFF\nAll users can chat with the bot again.`);
      }
      return send(
        `🔐 ${toBold("Protection Status")}\n${"─".repeat(22)}\n` +
        `State: ${protectMode ? "🔴 ON (locked)" : "🟢 OFF (open)"}\n` +
        `Admins: ${Data.adminUIDs.length || "(any user — none configured)"}`
      );
    }

    default:
      return send(`❓ Unknown command: "${cmd}"\nType ${Data.prefix}help to see all commands.`);
  }
}

function matchAutoReply(text) {
  const lower = text.toLowerCase().trim();
  for (const [k, v] of Object.entries(Data.autoReplies)) {
    if (lower === k || lower.includes(k)) return v;
  }
  return null;
}

/* ─── Listener ───────────────────────────────────────────── */
function startBot() {
  loadState();
  banner();
  const appState = loadAppState();
  console.log("🔐 Logging in to Facebook...");

  login({ appState }, (err, api) => {
    if (err) { console.error("❌ Login failed:", err.error || err); process.exit(1); }

    api.setOptions({
      listenEvents: true, selfListen: false,
      autoMarkRead: true, autoMarkDelivery: true,
      forceLogin: true, online: true,
      updatePresence: false,
    });

    apiRef = api;
    console.log(`✅ Logged in! Listening... (prefix: ${Data.prefix})\n`);

    api.listenMqtt(async (err, event) => {
      if (err) { console.error("⚠️  Listen error:", err); return; }
      if (event.type !== "message" || !event.body) return;

      // Anti double-chat: dedupe by messageID
      if (featureFlags.dedupeMessages && alreadySeen(event.messageID)) return;

      const body = event.body.trim();
      if (featureFlags.logMessages)
        console.log(`📩 [${event.threadID}] ${event.senderID}: ${body}`);

      const senderIsAdmin = isAdmin(event.senderID);

      // PROTECT MODE: block non-admins from interacting
      if (protectMode && !senderIsAdmin) {
        try { await api.sendMessage(Data.protection.protectMessage, event.threadID, event.messageID); }
        catch {}
        return;
      }

      // Commands (built-in OR installed custom)
      if (body.startsWith(Data.prefix)) {
        const parts = body.slice(Data.prefix.length).trim().split(/\s+/);
        const cmd = (parts.shift() || "").toLowerCase();
        try {
          if (Data.commands[cmd] || ["autopost","protect","stream","settings","install","uninstall","commands"].includes(cmd)) {
            await handleCommand(api, event, cmd, parts);
          } else if (featureFlags.customCommands && customCommands.has(cmd)) {
            await runCustomCommand(cmd, api, event, parts);
          } else {
            await handleCommand(api, event, cmd, parts);
          }
        } catch (e) {
          console.error("Command error:", e);
          try { api.sendMessage("⚠️ An error occurred running that command.", event.threadID); } catch {}
        }
        return;
      }

      // Auto-reply
      if (featureFlags.autoReply) {
        const reply = matchAutoReply(body);
        if (reply) { try { api.sendMessage(reply, event.threadID); } catch {} }
      }
    });

    loadAllCustomCommands();
    if (featureFlags.sessionKeepAlive) startSessionKeepAlive();
    if (autoPostEnabled) startAutoPost();
  });
}

/* ─── Crash protection — keep 24/7 alive ─────────────────── */
process.on("uncaughtException", (e) => console.error("UncaughtException:", e));
process.on("unhandledRejection", (e) => console.error("UnhandledRejection:", e));

startBot();
