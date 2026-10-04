# Open the sthlmevents Expo development client over a Cloudflare tunnel URL
# (no USB required). Prerequisite: Metro running in WSL —
#   npm run start:wifi
# Copy the https://….trycloudflare.com URL from the Metro terminal, then:
#   .\scripts\wifi-open.ps1 -Url 'https://xxxx.trycloudflare.com'
#
# Without -Url, prints how to paste the URL in the development client.
# If adb sees a device (Wi‑Fi debugging or leftover USB), optionally deep-links.
#
# Dev client package is app.sthlmevents.dev.

param(
  [Parameter(Mandatory = $false)]
  [string]$Url
)

$ErrorActionPreference = 'Stop'

$DevPackage = 'app.sthlmevents.dev'

function Resolve-Adb {
  $cmd = Get-Command adb -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $sdkAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
  if (Test-Path $sdkAdb) { return $sdkAdb }
  return $null
}

if (-not $Url) {
  Write-Host @"
No -Url given. After ``npm run start:wifi`` in WSL:

  1. Copy the https://….trycloudflare.com URL from the Metro output
  2. Open the sthlmevents **development** app (app.sthlmevents.dev)
  3. Tap Enter URL / connect and paste that HTTPS URL

Or re-run with the URL to deep-link if adb can see the phone:
  .\scripts\wifi-open.ps1 -Url 'https://xxxx.trycloudflare.com'
"@
  exit 0
}

if ($Url -notmatch '^https?://') {
  Write-Error "Url must be http(s)://… (got: $Url)"
}

$encoded = [uri]::EscapeDataString($Url)
$deepLink = "exp+sthlmevents://expo-development-client/?url=$encoded"

Write-Host "Deep link: $deepLink"
Write-Host ''
Write-Host 'Manual (no adb): open app.sthlmevents.dev → Enter URL → paste:'
Write-Host "  $Url"
Write-Host ''

$adb = Resolve-Adb
if (-not $adb) {
  Write-Host 'adb not found — use the manual steps above.'
  exit 0
}

$devices = & $adb devices 2>$null | Select-Object -Skip 1 | Where-Object { $_ -match '\tdevice$' }
if (-not $devices) {
  Write-Host 'No adb device — use the manual steps above (USB not required).'
  exit 0
}

$installed = & $adb shell pm path $DevPackage 2>$null
if (-not $installed) {
  Write-Error "Dev client $DevPackage is not installed. Build once: eas build -p android --profile development"
}

Write-Host "Starting $DevPackage via adb (optional helper)"
& $adb shell am start -a android.intent.action.VIEW -d $deepLink -p $DevPackage | Out-Null
Write-Host 'Done. Watch WSL Metro for "Android Bundled…".'
