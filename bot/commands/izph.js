/* ============================================================
   izph.js — IZPH VPN PRO clone command
   Owner: MANUELSON YASIS · Loaded by MANUELSON AI BOT
   Format: GoatBot V2 compatible
   ============================================================ */

const fs = require("fs");
const path = require("path");
const axios = require("axios");

/* ─── Sans-serif bold Unicode ────────────────────────────── */
const BOLD = {
  A:"𝗔",B:"𝗕",C:"𝗖",D:"𝗗",E:"𝗘",F:"𝗙",G:"𝗚",H:"𝗛",I:"𝗜",J:"𝗝",K:"𝗞",L:"𝗟",M:"𝗠",
  N:"𝗡",O:"𝗢",P:"𝗣",Q:"𝗤",R:"𝗥",S:"𝗦",T:"𝗧",U:"𝗨",V:"𝗩",W:"𝗪",X:"𝗫",Y:"𝗬",Z:"𝗭",
  a:"𝗮",b:"𝗯",c:"𝗰",d:"𝗱",e:"𝗲",f:"𝗳",g:"𝗴",h:"𝗵",i:"𝗶",j:"𝗷",k:"𝗸",l:"𝗹",m:"𝗺",
  n:"𝗻",o:"𝗼",p:"𝗽",q:"𝗾",r:"𝗿",s:"𝘀",t:"𝘁",u:"𝘂",v:"𝘃",w:"𝘄",x:"𝘅",y:"𝘆",z:"𝘇",
  "0":"𝟬","1":"𝟭","2":"𝟮","3":"𝟯","4":"𝟰","5":"𝟱","6":"𝟲","7":"𝟳","8":"𝟴","9":"𝟵",
};
const B = (s) => String(s).split("").map(c => BOLD[c] || c).join("");

/* ─── Free database (JSON file) ──────────────────────────── */
const DB_PATH = path.join(__dirname, "..", "data", "izph_db.json");
function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) return { users: {}, posts: [], nextId: 1 };
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch { return { users: {}, posts: [], nextId: 1 }; }
}
function saveDB(db) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) { console.error("izph saveDB:", e.message); }
}

/* ─── Telco network status (real HTTP pings) ─────────────── */
const NETWORKS = [
  { code: "TNT",   name: "TNT",   url: "https://tntph.com",        emoji: "📱", color: "🟡" },
  { code: "SMART", name: "Smart", url: "https://smart.com.ph",     emoji: "📲", color: "🟢" },
  { code: "SUN",   name: "Sun",   url: "https://www.suncellular.com.ph", emoji: "☀️", color: "🟠" },
  { code: "GTM",   name: "GoMo",  url: "https://www.gomo.ph",      emoji: "🔷", color: "🔵" },
  { code: "GLOBE", name: "Globe", url: "https://www.globe.com.ph", emoji: "🌐", color: "🔵" },
];

const STATUS_CACHE = { at: 0, data: null };
async function getNetworkStatus() {
  if (STATUS_CACHE.data && Date.now() - STATUS_CACHE.at < 60_000) return STATUS_CACHE.data;
  const results = await Promise.all(NETWORKS.map(async (n) => {
    const t0 = Date.now();
    try {
      const r = await axios.get(n.url, { timeout: 7000, validateStatus: () => true,
        headers: { "User-Agent": "Mozilla/5.0" } });
      const ms = Date.now() - t0;
      const up = r.status >= 200 && r.status < 500;
      // Status %: HTTP up + response speed factor
      let pct = 0;
      if (up) {
        if (ms < 500) pct = 100;
        else if (ms < 1000) pct = 95;
        else if (ms < 2000) pct = 90;
        else if (ms < 4000) pct = 80;
        else pct = 70;
      }
      return { ...n, up, ms, pct };
    } catch {
      return { ...n, up: false, ms: 0, pct: 0 };
    }
  }));
  STATUS_CACHE.at = Date.now();
  STATUS_CACHE.data = results;
  return results;
}

/* ─── VIP servers (gaya ng IZPH VPN PRO Playstore app) ──── */
const VIP_SERVERS = [
  { id: 1, name: "VIP SERVER 1", country: "Philippines",  flag: "🇵🇭", ping: "12ms" },
  { id: 2, name: "VIP SERVER 2", country: "Singapore",    flag: "🇸🇬", ping: "28ms" },
  { id: 3, name: "VIP SERVER 3", country: "Japan",        flag: "🇯🇵", ping: "45ms" },
  { id: 4, name: "VIP SERVER 4", country: "United States",flag: "🇺🇸", ping: "180ms" },
  { id: 5, name: "VIP SERVER 5", country: "Germany",      flag: "🇩🇪", ping: "220ms" },
  { id: 6, name: "VIP SERVER 6", country: "United Kingdom",flag:"🇬🇧", ping: "210ms" },
  { id: 7, name: "VIP SERVER 7", country: "Canada",       flag: "🇨🇦", ping: "190ms" },
  { id: 8, name: "VIP SERVER 8", country: "Australia",    flag: "🇦🇺", ping: "150ms" },
  { id: 9, name: "VIP SERVER 9", country: "South Korea",  flag: "🇰🇷", ping: "55ms" },
  { id:10, name: "VIP SERVER 10",country: "Hong Kong",    flag: "🇭🇰", ping: "35ms" },
];

/* ─── Plans per telco ────────────────────────────────────── */
const PLANS = {
  TNT:   ["🎮 UNLI GAMING", "💬 UNLI SOCIAL", "📡 PISO WIFI NO HULOG"],
  SMART: ["🎮 UNLI GAMING", "💬 UNLI SOCIAL", "📡 PISO WIFI NO HULOG"],
  SUN:   ["🎮 UNLI GAMING", "💬 UNLI SOCIAL", "📡 PISO WIFI NO HULOG"],
  GTM:   ["🎮 UNLI GAMING", "💬 UNLI SOCIAL", "📡 PISO WIFI NO HULOG"],
  GLOBE: ["🎮 UNLI GAMING", "💬 UNLI SOCIAL", "📡 PISO WIFI NO HULOG"],
};

/* ─── Helpers ────────────────────────────────────────────── */
function isAdminUID(uid) {
  try {
    const Data = require("../Data");
    return Data.adminUIDs.includes(String(uid));
  } catch { return false; }
}
function getDisplayName(db, senderID) {
  return db.users[senderID]?.name || null;
}
function divider() { return "━".repeat(30); }

/* ─── Sub-screens ────────────────────────────────────────── */
function mainMenu(name) {
  return [
    `🛡️ ${B("IZPH VPN PRO")} 🛡️`,
    `${B("FREE UNLIMITED INTERNET")}`,
    divider(),
    `👤 User: ${name ? B(name) : "❌ Not registered"}`,
    "",
    `📋 ${B("MENU")}`,
    `▸ /izph register <name>  📝 Register your name`,
    `▸ /izph status            📊 TNT/Smart/Sun/Globe %`,
    `▸ /izph servers           🌐 VIP servers list`,
    `▸ /izph plans             📦 UNLI plans per network`,
    `▸ /izph post <issue>      📮 Post your issue to admin`,
    `▸ /izph dashboard         📊 See all user posts`,
    `▸ /izph delete <num>      🗑️ Admin only`,
    `▸ /izph help              ℹ️ This menu`,
    divider(),
    `👑 Owner: MANUELSON YASIS`,
    `💎 ${B("VIP SERVER 1 — Philippines")} 🇵🇭`,
  ].join("\n");
}

async function statusScreen() {
  const stats = await getNetworkStatus();
  const lines = [
    `📊 ${B("IZPH NETWORK STATUS")}`,
    `${B("LIVE TELCO MONITORING")}`,
    divider(),
  ];
  for (const s of stats) {
    const bar = "█".repeat(Math.round(s.pct / 10)) + "░".repeat(10 - Math.round(s.pct / 10));
    const dot = s.pct >= 90 ? "🟢" : s.pct >= 70 ? "🟡" : s.pct > 0 ? "🟠" : "🔴";
    lines.push(`${s.emoji} ${B(s.name.toUpperCase())}  ${dot}`);
    lines.push(`   [${bar}] ${B(String(s.pct))}%`);
    lines.push(`   ${s.up ? "✅ ONLINE" : "❌ OFFLINE"} · ${s.ms}ms`);
    lines.push("");
  }
  lines.push(divider());
  lines.push(`🛡️ ${B("IZPH VPN PRO")} · MANUELSON YASIS`);
  return lines.join("\n");
}

function serversScreen() {
  const lines = [
    `🌐 ${B("IZPH VIP SERVERS")}`,
    `${B("FREE UNLIMITED INTERNET")}`,
    divider(),
  ];
  for (const s of VIP_SERVERS) {
    lines.push(`${s.flag} ${B(s.name)}`);
    lines.push(`   🌎 ${s.country}  ·  📶 ${s.ping}  ·  💎 VIP`);
    lines.push("");
  }
  lines.push(divider());
  lines.push(`🛡️ All servers FREE · Tap /izph status for live %`);
  return lines.join("\n");
}

function plansScreen() {
  const lines = [
    `📦 ${B("IZPH UNLI PLANS")}`,
    divider(),
  ];
  for (const [net, plans] of Object.entries(PLANS)) {
    lines.push(`${B(net)}`);
    plans.forEach(p => lines.push(`   ${p}`));
    lines.push("");
  }
  lines.push(divider());
  lines.push(`💎 ${B("VIP SERVER 1 — Philippines 🇵🇭")}`);
  lines.push(`🛡️ FREE FOREVER · No limit · No load`);
  return lines.join("\n");
}

function dashboardScreen(db) {
  if (db.posts.length === 0) {
    return `📊 ${B("IZPH DASHBOARD")}\n${divider()}\n\n📭 Walang post pa.\nMauna ka mag /izph post <issue>`;
  }
  const lines = [
    `📊 ${B("IZPH DASHBOARD")}`,
    `${B("ALL USER POSTS")} · Total: ${db.posts.length}`,
    divider(),
  ];
  // Show newest first, max 30
  const recent = db.posts.slice(-30).reverse();
  for (const p of recent) {
    const when = new Date(p.postedAt).toLocaleString("en-PH", { hour12: true });
    lines.push(`#${B(String(p.id))} · 👤 ${B(p.name)}`);
    lines.push(`📮 ${p.issue}`);
    lines.push(`🕒 ${when}`);
    lines.push("");
  }
  lines.push(divider());
  lines.push(`💡 Admin can /izph delete <num>`);
  return lines.join("\n");
}

/* ─── Main handler ───────────────────────────────────────── */
async function run({ api, event, args }) {
  const reply = (m) => api.sendMessage(m, event.threadID, event.messageID);
  const sub = (args[0] || "").toLowerCase();
  const db = loadDB();
  const myName = getDisplayName(db, event.senderID);

  // Routing
  if (!sub || sub === "help" || sub === "menu") return reply(mainMenu(myName));

  if (sub === "register") {
    const name = args.slice(1).join(" ").trim();
    if (!name) return reply(`📝 Usage: /izph register <your name>\n\n⚠️ ${B("REGISTER YOUR NAME BAGO GAMITIN ANG IZPH")}`);
    if (name.length > 40) return reply("⚠️ Name too long (max 40 chars).");
    db.users[event.senderID] = { name, registeredAt: new Date().toISOString() };
    saveDB(db);
    return reply(
      `✅ ${B("REGISTERED!")}\n${divider()}\n` +
      `👤 Name: ${B(name)}\n` +
      `🆔 UID: ${event.senderID}\n` +
      `📅 ${new Date().toLocaleString("en-PH")}\n${divider()}\n` +
      `🛡️ Welcome to ${B("IZPH VPN PRO")}!\n` +
      `Type /izph to see the menu.`
    );
  }

  // All other subcommands require registration
  if (!myName) {
    return reply(
      `🚫 ${B("NOT REGISTERED")}\n${divider()}\n` +
      `⚠️ ${B("REGISTER YOUR NAME BAGO GAMITIN ANG IZPH")}\n\n` +
      `📝 Type: /izph register <your name>\n\n` +
      `Example:\n/izph register Juan Dela Cruz`
    );
  }

  if (sub === "status")    return reply(await statusScreen());
  if (sub === "servers")   return reply(serversScreen());
  if (sub === "plans")     return reply(plansScreen());
  if (sub === "dashboard") return reply(dashboardScreen(db));

  if (sub === "post") {
    const issue = args.slice(1).join(" ").trim();
    if (!issue) return reply(`📮 Usage: /izph post <your issue here>`);
    if (issue.length > 500) return reply("⚠️ Issue too long (max 500 chars).");
    const id = db.nextId++;
    db.posts.push({
      id, userID: event.senderID, name: myName, issue,
      postedAt: new Date().toISOString(),
    });
    saveDB(db);
    return reply(
      `✅ ${B("ISSUE POSTED!")}\n${divider()}\n` +
      `#${B(String(id))} by ${B(myName)}\n` +
      `📮 ${issue}\n${divider()}\n` +
      `👁️ Admin will see this on the dashboard.\n` +
      `Type /izph dashboard to view all posts.`
    );
  }

  if (sub === "delete") {
    if (!isAdminUID(event.senderID)) return reply("🚫 Admin only.");
    const num = parseInt(args[1], 10);
    if (!num) return reply(`Usage: /izph delete <post#>\nExample: /izph delete 3`);
    const idx = db.posts.findIndex(p => p.id === num);
    if (idx < 0) return reply(`❓ Post #${num} not found.`);
    const removed = db.posts.splice(idx, 1)[0];
    saveDB(db);
    return reply(`🗑️ Deleted post #${num} by ${removed.name}\n📮 "${removed.issue}"`);
  }

  return reply(`❓ Unknown subcommand: ${sub}\nType /izph for the menu.`);
}

module.exports = {
  config: {
    name: "izph",
    description: "IZPH VPN PRO — FREE UNLIMITED INTERNET (status, servers, plans, issue dashboard)",
    version: "1.0.0",
    author: "MANUELSON YASIS",
  },
  onStart: run,
  run,
};
