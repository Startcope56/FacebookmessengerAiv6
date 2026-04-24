/* ============================================================
   userBots.js — Multi-tenant AI bot manager
   Lets ANY Messenger user spawn their own AI clone connected
   to the same command files. Each user supplies their own
   appstate + admin UID via /create.
   Owner: MANUELSON YASIS
   ============================================================ */

const fs = require("fs");
const path = require("path");
const { login } = require("ws3-fca");

const USER_BOTS_DIR = path.join(__dirname, "data", "user_bots");
if (!fs.existsSync(USER_BOTS_DIR)) fs.mkdirSync(USER_BOTS_DIR, { recursive: true });

// ownerUID (the FB user who ran /create) -> bot record
const bots = new Map();

let ctx = null; // { handleCommand, matchAutoReply, customCommands, featureFlags, Data, alreadySeen }

function init(context) { ctx = context; }

function userDir(ownerUID) {
  const d = path.join(USER_BOTS_DIR, String(ownerUID));
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

function metaPath(ownerUID)     { return path.join(userDir(ownerUID), "meta.json"); }
function appstatePath(ownerUID) { return path.join(userDir(ownerUID), "appstate.json"); }

function saveMeta(rec) {
  const m = {
    ownerUID:  rec.ownerUID,
    adminUID:  rec.adminUID,
    createdAt: rec.createdAt,
    threadID:  rec.threadID,
    status:    rec.status,
    lastError: rec.lastError || null,
    botUserID: rec.botUserID || null,
  };
  try { fs.writeFileSync(metaPath(rec.ownerUID), JSON.stringify(m, null, 2)); } catch {}
}

function listUserBots() {
  return Array.from(bots.values()).map(b => ({
    ownerUID: b.ownerUID,
    adminUID: b.adminUID,
    status:   b.status,
    botUserID:b.botUserID,
    createdAt:b.createdAt,
    lastError:b.lastError || null,
  }));
}

function getUserBot(ownerUID) { return bots.get(String(ownerUID)) || null; }

function stopUserBot(ownerUID) {
  const rec = bots.get(String(ownerUID));
  if (!rec) return false;
  try { rec.api?.stopListening?.(); } catch {}
  rec.status = "stopped";
  rec.api = null;
  saveMeta(rec);
  return true;
}

function deleteUserBot(ownerUID) {
  stopUserBot(ownerUID);
  bots.delete(String(ownerUID));
  try {
    fs.rmSync(userDir(ownerUID), { recursive: true, force: true });
  } catch {}
  return true;
}

/* ─── Spawn a child bot ──────────────────────────────────── */
async function startUserBot(ownerUID, adminUID, threadID = null) {
  if (!ctx) throw new Error("userBots not initialized");
  const id = String(ownerUID);

  // Already running?
  const existing = bots.get(id);
  if (existing && existing.status === "online") return existing;

  const ap = appstatePath(ownerUID);
  if (!fs.existsSync(ap)) throw new Error("appstate.json missing for this user");
  let appState;
  try { appState = JSON.parse(fs.readFileSync(ap, "utf8")); }
  catch (e) { throw new Error("invalid appstate JSON: " + e.message); }

  const rec = existing || {
    ownerUID:  id,
    adminUID:  String(adminUID),
    createdAt: new Date().toISOString(),
    threadID,
    status:    "starting",
    api:       null,
    botUserID: null,
    lastError: null,
  };
  rec.status = "starting";
  rec.lastError = null;
  bots.set(id, rec);
  saveMeta(rec);

  return new Promise((resolve, reject) => {
    login({ appState }, (err, api) => {
      if (err) {
        rec.status = "error";
        rec.lastError = (err.error || err.message || JSON.stringify(err)).toString().slice(0, 300);
        saveMeta(rec);
        return reject(new Error(rec.lastError));
      }

      try {
        api.setOptions({
          listenEvents: true,
          selfListen:   false,
          autoMarkRead: false,
          autoMarkDelivery: false,
          forceLogin:   false,
          updatePresence: false,
          online: false,
          userAgent: "Mozilla/5.0 (Linux; Android 11; FB Lite) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/96.0.4664.45 Mobile Safari/537.36",
        });
      } catch {}

      try { rec.botUserID = api.getCurrentUserID?.() || null; } catch {}
      rec.api = api;
      rec.status = "online";
      saveMeta(rec);

      // Save fresh appstate immediately
      try { fs.writeFileSync(ap, JSON.stringify(api.getAppState(), null, 2)); } catch {}

      attachListener(rec);
      resolve(rec);
    });
  });
}

function attachListener(rec) {
  const { handleCommand, matchAutoReply, customCommands, featureFlags, Data, alreadySeen, runCustomCommand, isAdminUID, toBold } = ctx;

  const adminSet = new Set([String(rec.adminUID), String(rec.ownerUID)]);
  // Main system admins also retain control over child bots
  if (Array.isArray(Data.adminUIDs)) Data.adminUIDs.forEach(u => adminSet.add(String(u)));

  rec.api.listenMqtt(async (err, event) => {
    if (err) {
      console.error(`⚠️ [userbot ${rec.ownerUID}] listen error:`, err.error || err.message || err);
      const errStr = (err.error || err.message || "").toString().toLowerCase();
      if (errStr.includes("logout") || errStr.includes("not logged") || errStr.includes("cookiestate")) {
        rec.status = "logged_out";
        rec.lastError = "logged_out";
        saveMeta(rec);
        try { rec.api?.stopListening?.(); } catch {}
      }
      return;
    }
    if (event.type !== "message" || !event.body) return;

    // Dedupe (per child bot)
    if (featureFlags.dedupeMessages && alreadySeen(`u:${rec.ownerUID}:${event.messageID}`)) return;

    const body = event.body.trim();
    const senderIsAdmin = adminSet.has(String(event.senderID));

    // Save appstate periodically (every 60s lazy save)
    const now = Date.now();
    if (!rec._lastSave || now - rec._lastSave > 60_000) {
      rec._lastSave = now;
      try { fs.writeFileSync(appstatePath(rec.ownerUID), JSON.stringify(rec.api.getAppState(), null, 2)); } catch {}
    }

    const safeSend = async (text, mid) => {
      try { await rec.api.sendMessage(text, event.threadID, mid); }
      catch { try { await rec.api.sendMessage(text, event.threadID); } catch {} }
    };

    // Wrap event with isAdmin override so handleCommand sees correct admin set
    const wrappedEvent = Object.assign({}, event, { _userBotAdminSet: adminSet });

    if (body.startsWith(Data.prefix)) {
      const parts = body.slice(Data.prefix.length).trim().split(/\s+/);
      const cmd = (parts.shift() || "").toLowerCase();

      // Block /create from being run via a child bot to avoid recursion
      if (cmd === "create") {
        await safeSend("ℹ️ /create can only be run on the main bot, not on a cloned AI.", event.messageID);
        return;
      }

      try {
        if (Data.commands[cmd] || ["autopost","protect","stream","settings","install","uninstall","commands","fca","mybot","userbots"].includes(cmd)) {
          await handleCommand(rec.api, wrappedEvent, cmd, parts);
        } else if (featureFlags.customCommands && customCommands.has(cmd)) {
          await runCustomCommand(cmd, rec.api, wrappedEvent, parts);
        } else {
          await safeSend(`❓ Unknown command: /${cmd}\nType /help to see all commands.`, event.messageID);
        }
      } catch (e) {
        await safeSend(`⚠️ Error sa /${cmd}: ${(e?.message||e).toString().slice(0,200)}`, event.messageID);
      }
      return;
    }

    // Auto-reply with question fallback (same behavior as main bot)
    try {
      const reply = featureFlags.autoReply ? matchAutoReply(body) : null;
      if (reply) {
        await safeSend(reply, event.messageID);
      } else {
        const isQuestion = /\?\s*$/.test(body) ||
          /^(ano|anu|paano|pano|sino|kailan|bakit|saan|nasaan|pwede|puede|tulong|help|what|how|who|when|why|where|can|could|please)\b/i.test(body);
        if (isQuestion) {
          await safeSend(
            `🤖 ${toBold ? toBold(Data.botName) : Data.botName} (clone)\n` +
            `Hi! Hindi pa ako handa sumagot dyan. Subukan: /help, /info, /stream`,
            event.messageID
          );
        }
      }
    } catch {}
  });

  console.log(`✅ [userbot] online — owner=${rec.ownerUID} admin=${rec.adminUID} botUID=${rec.botUserID || "?"}`);
}

/* ─── Create from /create command ────────────────────────── */
async function createFromCommand(creatorUID, adminUID, appstateRaw, threadID) {
  const id = String(creatorUID);

  // Validate appstate JSON
  let parsed;
  try { parsed = JSON.parse(appstateRaw); }
  catch (e) { throw new Error("Invalid appstate JSON: " + e.message); }
  if (!Array.isArray(parsed)) throw new Error("Appstate must be an array of cookie objects.");
  if (parsed.length < 3) throw new Error("Appstate seems empty/invalid (too few cookies).");
  if (!parsed.some(c => c.key === "c_user" || c.name === "c_user"))
    throw new Error("Appstate missing c_user cookie — invalid.");

  // Save appstate
  fs.writeFileSync(appstatePath(creatorUID), JSON.stringify(parsed, null, 2));

  // Stop any existing instance
  if (bots.has(id)) stopUserBot(creatorUID);

  // Start it
  return startUserBot(creatorUID, adminUID, threadID);
}

/* ─── Restore all saved user bots on startup ─────────────── */
async function restoreAll() {
  if (!fs.existsSync(USER_BOTS_DIR)) return;
  const dirs = fs.readdirSync(USER_BOTS_DIR).filter(d => {
    try { return fs.statSync(path.join(USER_BOTS_DIR, d)).isDirectory(); } catch { return false; }
  });
  for (const ownerUID of dirs) {
    try {
      const m = JSON.parse(fs.readFileSync(metaPath(ownerUID), "utf8"));
      if (!fs.existsSync(appstatePath(ownerUID))) continue;
      console.log(`🔄 [userbot] restoring owner=${ownerUID}...`);
      await startUserBot(m.ownerUID, m.adminUID, m.threadID).catch(e =>
        console.warn(`⚠️ restore failed for ${ownerUID}:`, e.message));
    } catch (e) {
      console.warn(`⚠️ restoreAll skip ${ownerUID}:`, e.message);
    }
  }
}

module.exports = {
  init,
  createFromCommand,
  startUserBot,
  stopUserBot,
  deleteUserBot,
  listUserBots,
  getUserBot,
  restoreAll,
};
