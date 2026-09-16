# Local Android builds (no EAS queue)

Build the preview APK on your Windows machine and install it over USB —
a few minutes once set up, instead of 30–120 min of EAS queue.

## One-time setup

1. **Clone the repo on the Windows filesystem** (not `\\wsl.localhost` —
   Gradle is unusably slow across the WSL boundary):

   ```powershell
   mkdir C:\dev -Force; cd C:\dev
   git clone https://github.com/rubensalasamner/sthlmevents.git
   cd sthlmevents
   ```

2. **Requirements** (already present on this machine):
   - Node >= 20.16 (`nvm install 20.20.2; nvm use 20.20.2`)
   - JDK 21 (`C:\Program Files\Java\jdk-21`)
   - Android SDK (`%LOCALAPPDATA%\Android\Sdk`) with NDK 26

## Build + install

In PowerShell, from the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\local-build.ps1
```

The script checks the toolchain, sets `EXPO_PUBLIC_SNAPSHOT_URL` (R2),
runs `expo prebuild` on first use, builds `assembleRelease` with Gradle,
and installs via adb when a phone is connected (USB debugging enabled).
Without a phone it prints the APK path to copy manually.

Subsequent builds after code changes: rerun the same script — a warm
build takes a few minutes.

## Gotchas

- **Signature mismatch**: local APKs are signed with the debug keystore;
  EAS uses its own. If an EAS-built app is installed, uninstall it first
  (one-time favourites reset — they persist again from this build on).
- **Native changes**: if `app.config.ts` plugins/permissions change, delete
  `android/` and let the script re-run `prebuild`.
- **Data vs code**: only code changes need rebuilds; event data refreshes
  daily from R2 with no rebuild.
