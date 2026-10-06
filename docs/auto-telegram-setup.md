# nitech/auto + Telegram — setup (Windows)

Replicate remote Cursor control (prompt + **Approve/Run from Android**) on another
laptop. Stack: [nitech/auto](https://github.com/nitech/auto) (MIT), not
`udah1/cursor-chat-bridge` (that one cannot forward IDE approval buttons).

Official tutorial (more detail): `auto/docs/install.md` after clone.

## What you get

| Path | Role |
|------|------|
| Telegram bot / group | Prompt + approval buttons on phone |
| `http://127.0.0.1:4331/` | Web UI on the PC |
| Tailscale `http://100.x.y.z:4331/` | Optional phone web UI (no public port-forward) |

**Telegram alone is enough** for mobile. Tailscale is only needed for the phone
browser/PWA. Do **not** expose port 4331 to the internet / Tailscale Funnel.

## Travels with git vs local-only

| In this repo (after pull) | Local on each laptop (never commit) |
|---------------------------|-------------------------------------|
| This doc + `PROJECT_LOG.md` pointer | `TELEGRAM_BOT_TOKEN` |
| Steps / commands below | `TELEGRAM_CHAT_ID` |
| | Auto clone + `node_modules` + `auto\.env` |
| | Portable Node install + user PATH |
| | Cursor agent CLI + `agent login` session |
| | Cursor started with `--remote-debugging-port=9222` |
| | Running `npm run supervise` (or autostart task) |
| | Optional Tailscale + `AUTO_WEB_URL` |

**Bot rule:** only **one** PC may poll the same bot token at a time. Stop Auto on
laptop A before starting it on laptop B.

### Local secrets — where they live on the first machine

Copy these onto the new laptop (password manager / USB / secure note). Do **not**
put them in git.

| Secret / setting | Where we keep it here | What to set on the new laptop |
|------------------|----------------------|-------------------------------|
| Bot token | Desktop `telegrambottoken.txt` **or** `auto\.env` → `TELEGRAM_BOT_TOKEN` | Same BotFather token (reuse `@sthlmeventsbot`) |
| Chat id | `auto\.env` → `TELEGRAM_CHAT_ID` (supergroup was `-100…`) | Same group/DM id, or re-fetch via `getUpdates` after messaging the bot |
| Policy | `auto\.env` → `AUTO_POLICY=ask-on-write` | Same unless you want stricter/looser |
| Web URL | optional `AUTO_WEB_URL` | Only if using Tailscale on that PC |

If you only have the token file: paste token into `.env`, message the bot once,
then set chat id from `getUpdates` (see §3).

### Ordered setup on a new laptop (summary)

1. Install portable Node → new PowerShell → `node -v`  
2. Clone `nitech/auto` → `npm install`  
3. Create `auto\.env` from `.env.example` with token, chat id, `ask-on-write`  
4. `agent login` (browser “All set”)  
5. Start Cursor with CDP (`restart-cursor-cdp.ps1` or shortcut flag)  
6. `npm run supervise` in a normal PowerShell  
7. Smoke-test: Telegram “are we live?” + tap Allow on a permission card  

Details for each step follow.

## Prerequisites

- Windows PC with Cursor installed
- Telegram bot (BotFather) — can reuse an existing bot token (only **one** Auto
  host may poll a given token at a time)
- Node on Windows PATH (portable zip is fine; no admin MSI required)

## 1. Portable Node (no admin)

If `node -v` already works in PowerShell, skip this.

```powershell
# Example: Node 22 LTS zip (not the .msi)
# Download: https://nodejs.org/dist/v22.20.0/node-v22.20.0-win-x64.zip
# Unzip so node.exe is at e.g.:
#   %LOCALAPPDATA%\nodejs\node-v22.20.0-win-x64\node.exe

$dir = "$env:LOCALAPPDATA\nodejs\node-v22.20.0-win-x64"
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath -notlike "*$dir*") {
  [Environment]::SetEnvironmentVariable('Path', "$userPath;$dir", 'User')
}
# Open a NEW PowerShell, then:
node -v
npm -v
```

## 2. Clone and install Auto

```powershell
mkdir -Force "$env:USERPROFILE\programming\personal" | Out-Null
cd "$env:USERPROFILE\programming\personal"
git clone https://github.com/nitech/auto.git
cd auto
npm install
```

## 3. Configure `.env`

```powershell
cd "$env:USERPROFILE\programming\personal\auto"
copy .env.example .env   # if .env does not exist yet
notepad .env
```

Set at least:

```env
AUTO_POLICY=ask-on-write
TELEGRAM_BOT_TOKEN=<from BotFather>
TELEGRAM_CHAT_ID=<numeric chat id>
```

Optional:

```env
AUTO_WEB_URL=http://100.x.y.z:4331
```

### Chat id

1. Send any message to the bot (or in the target group).
2. Open in a browser (keep token private):

   `https://api.telegram.org/bot<TOKEN>/getUpdates`

3. Read `"chat":{"id": ...}` — DMs are positive; groups/supergroups are often
   negative (`-100…`).

## 4. Cursor agent CLI

```powershell
irm 'https://cursor.com/install?win32=true' | iex
agent login
agent status
# expect: Logged in as …
```

Complete the browser “All set! Feel free to return to the CLI.” page.

## 5. Start Cursor with CDP

Auto must attach to Cursor’s debug port. If Cursor is already open **without**
`--remote-debugging-port=9222`, fully quit it first (unsaved work will be lost
if you force-kill).

One-shot helper (save as e.g. `programming\personal\restart-cursor-cdp.ps1`):

```powershell
$ErrorActionPreference = 'Stop'
$cursor = Join-Path $env:LOCALAPPDATA 'Programs\cursor\Cursor.exe'
Get-Process Cursor -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Start-Process -FilePath $cursor -ArgumentList '--remote-debugging-port=9222'
Start-Sleep -Seconds 3
Invoke-WebRequest -Uri 'http://127.0.0.1:9222/json/version' -UseBasicParsing -TimeoutSec 5
```

Or permanently append `--remote-debugging-port=9222` to the Cursor shortcut
Target field.

Check: `http://127.0.0.1:9222/json` returns JSON.

## 6. Run Auto

Use a **normal PowerShell window**, not a Cursor agent terminal (those die with
the agent and take Auto down).

```powershell
cd "$env:USERPROFILE\programming\personal\auto"
npm run supervise
```

Expect: `Auto is up`, `[telegram] polling as chat …`, local URL
`http://127.0.0.1:4331/`.

Optional stay-up across reboot:

```powershell
npm run autostart:install
Start-ScheduledTask -TaskName AutoSupervise
```

## 7. Optional Tailscale (phone web UI)

1. Install Tailscale on PC + Android (same account).
2. `tailscale ip -4` → set `AUTO_WEB_URL=http://<that-ip>:4331` in `.env`.
3. Restart supervise; open that URL on the phone; add to home screen (PWA).

## Checklist on a new laptop

- [ ] Portable Node on user PATH  
- [ ] `git clone` + `npm install` Auto  
- [ ] `.env`: `AUTO_POLICY=ask-on-write`, bot token, chat id  
- [ ] `agent login` OK  
- [ ] Cursor started with `--remote-debugging-port=9222`  
- [ ] `npm run supervise` running  
- [ ] Telegram message reaches a Cursor/Auto session  
- [ ] Approval prompt appears on Telegram when agent needs write/shell  

## Remove old chat-bridge (if present)

```powershell
npx --yes cursor-telegram-chat@latest uninstall --purge
```

Then reload Cursor. Do not run chat-bridge and Auto on the **same** bot token.

## Approvals

| `AUTO_POLICY` | Behavior |
|---------------|----------|
| `ask-on-write` | Ask before writes/commands (recommended) — answer from Telegram/web |
| `ask` | Ask every time |
| `auto` | Approve everything (yolo) |

Per-session override: Telegram `/policy` or web header.

## This machine’s paths (reference)

| Item | Path |
|------|------|
| Auto clone | `C:\Users\rus\programming\personal\auto` |
| Setup helper | `C:\Users\rus\programming\personal\setup-auto.ps1` |
| CDP restart | `C:\Users\rus\programming\personal\restart-cursor-cdp.ps1` |
| Portable Node | `%LOCALAPPDATA%\nodejs\node-v22.20.0-win-x64` |
| Bot token file (local only) | Desktop `telegrambottoken.txt` — do not commit |

Token and chat id live only in `auto\.env` (gitignored). Never commit them.
