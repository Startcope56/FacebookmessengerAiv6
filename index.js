/* ============================================================
   index.js — Root entry for deployment
   Loads the Facebook Messenger AI Bot from ./bot/main.js
   Owner: MANUELSON YASIS
   ============================================================ */
process.chdir(__dirname + "/bot");
require("./bot/main.js");
