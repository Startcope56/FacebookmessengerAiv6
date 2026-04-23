# Facebook Messenger AI Bot

**Owner:** MANUELSON YASIS
**Library:** `stfca` (Unofficial Facebook Chat API)

## Files

- `main.js` — bot entry point (login + message listener + commands)
- `Data.js` — bot config, commands list, auto-replies, quotes, jokes
- `appstate.json` — your Facebook session cookies (you must add yours)
- `package.json` — npm config and dependencies

## Setup

1. **Install dependencies**
   ```bash
   cd bot
   npm install
   ```

2. **Add your Facebook session cookies to `appstate.json`**
   - Use a browser extension like **C3C FBState** or **FB-State** to export your cookies.
   - Replace the `[]` in `appstate.json` with your exported cookie array.

3. **(Optional) Add your Facebook UID as admin** — edit `Data.js` → `adminUIDs`.

4. **Run the bot**
   ```bash
   npm start
   ```

## Commands

| Command | Description |
|---|---|
| `/help` | Show all commands |
| `/info` | Bot info |
| `/ping` | Ping check |
| `/uptime` | Bot uptime |
| `/say <msg>` | Repeat your message |
| `/quote` | Random motivational quote |
| `/joke` | Random joke |
| `/owner` | Show bot owner |

## Auto-replies

The bot will auto-reply to common greetings like `hi`, `hello`, `kumusta`, `salamat`, etc. (configurable in `Data.js`).
