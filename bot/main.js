/* ============================================================
   main.js — Facebook Messenger AI Bot Entry Point
   Library: stfca (Unofficial Facebook Chat API)
   Owner: MANUELSON YASIS
   ============================================================ */

const fs = require("fs");
const path = require("path");
const login = require("stfca");
const Data = require("./Data");

const APPSTATE_PATH = path.join(__dirname, "appstate.json");
const START_TIME = Date.now();

/* ─── Banner ─────────────────────────────────────────────── */
function banner() {
  console.log("\n" + "═".repeat(60));
  console.log(`   🤖  ${Data.botName}  v${Data.version}`);
  console.log(`   👤  Owner: ${Data.ownerName}`);
  console.log(`   🔧  Prefix: ${Data.prefix}`);
  console.log("═".repeat(60) + "\n");
}

/* ─── Load appstate ──────────────────────────────────────── */
function loadAppState() {
  if (!fs.existsSync(APPSTATE_PATH)) {
    console.error("❌ appstate.json not found at:", APPSTATE_PATH);
    console.error("ℹ️  Please export your Facebook cookies into appstate.json");
    process.exit(1);
  }
  try {
    const raw = fs.readFileSync(APPSTATE_PATH, "utf8").trim();
    if (!raw || raw === "[]") {
      console.error("⚠️  appstate.json is EMPTY.");
      console.error("ℹ️  Paste your Facebook session cookies (array format) into appstate.json");
      console.error("ℹ️  You can use a browser extension like 'C3C FBState' to export them.");
      process.exit(1);
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error("❌ Failed to parse appstate.json:", e.message);
    process.exit(1);
  }
}

/* ─── Format uptime ──────────────────────────────────────── */
function uptimeText() {
  const ms = Date.now() - START_TIME;
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  return `${h}h ${m}m ${s}s`;
}

/* ─── Random helper ──────────────────────────────────────── */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
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
        `🤖 Bot: ${Data.botName}\n` +
        `📦 Version: ${Data.version}\n` +
        `👤 Owner: ${Data.ownerName}\n` +
        `🔧 Prefix: ${Data.prefix}\n` +
        `📚 Library: stfca (Unofficial Facebook Chat API)`
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
      return send(
        `👑 Bot Owner\n${"─".repeat(20)}\n` +
        `Name: ${Data.ownerName}\n` +
        `Bot: ${Data.botName} v${Data.version}`
      );

    default:
      return send(`❓ Unknown command: "${cmd}"\nType ${Data.prefix}help to see all commands.`);
  }
}

/* ─── Auto-reply matcher ─────────────────────────────────── */
function matchAutoReply(text) {
  const lower = text.toLowerCase().trim();
  for (const [keyword, reply] of Object.entries(Data.autoReplies)) {
    if (lower === keyword || lower.includes(keyword)) {
      return reply;
    }
  }
  return null;
}

/* ─── Main listener ──────────────────────────────────────── */
function startBot() {
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

    console.log("✅ Logged in successfully!");
    console.log(`👂 Listening for messages... (prefix: ${Data.prefix})\n`);

    api.listenMqtt(async (err, event) => {
      if (err) {
        console.error("⚠️  Listen error:", err);
        return;
      }

      // Only handle text messages
      if (event.type !== "message" || !event.body) return;

      const body = event.body.trim();
      if (Data.settings.logMessages) {
        console.log(`📩 [${event.threadID}] ${event.senderID}: ${body}`);
      }

      // Command handling
      if (body.startsWith(Data.prefix)) {
        const parts = body.slice(Data.prefix.length).trim().split(/\s+/);
        const cmd = (parts.shift() || "").toLowerCase();
        try {
          await handleCommand(api, event, cmd, parts);
        } catch (e) {
          console.error("Command error:", e);
          api.sendMessage("⚠️ An error occurred running that command.", event.threadID);
        }
        return;
      }

      // Auto-reply
      if (Data.settings.autoReply) {
        const reply = matchAutoReply(body);
        if (reply) {
          api.sendMessage(reply, event.threadID);
        }
      }
    });

    // Save updated appstate every 5 minutes
    setInterval(() => {
      try {
        fs.writeFileSync(APPSTATE_PATH, JSON.stringify(api.getAppState(), null, 2));
        console.log("💾 appstate.json updated");
      } catch (e) {
        console.error("Failed to save appstate:", e.message);
      }
    }, 5 * 60 * 1000);
  });
}

/* ─── Crash protection ───────────────────────────────────── */
process.on("uncaughtException", (e) => console.error("UncaughtException:", e));
process.on("unhandledRejection", (e) => console.error("UnhandledRejection:", e));

startBot();
