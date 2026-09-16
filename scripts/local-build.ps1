# Local Android build + install for sthlmevents (no EAS queue).
#
# Run from PowerShell on Windows, in the repo root (must be on the Windows
# filesystem, not \\wsl.localhost):
#
#   powershell -ExecutionPolicy Bypass -File scripts\local-build.ps1
#
# First run downloads Gradle + dependencies (~2-3 GB, one-time).
# Later runs take a few minutes: code change -> rerun this script.
#
# NOTE: the APK is signed with the local debug keystore, not the EAS one.
# If an EAS-built copy of the app is installed, uninstall it first
# (Android rejects signature-mismatch updates).

$ErrorActionPreference = "Stop"

# --- Sanity checks -----------------------------------------------------------

if ($PWD.Path -like "*\\wsl*`$*") {
  Write-Error "This repo is on the WSL filesystem (\\wsl.localhost). Clone it to a Windows path (e.g. C:\dev\sthlmevents) first - Gradle is unusably slow across the boundary."
}

$nodeVersion = (node -v) -replace 'v','' | ForEach-Object { [version]($_.Split('-')[0]) }
if ($nodeVersion -lt [version]"20.16") {
  Write-Error "Node $($nodeVersion) is too old for Expo SDK 57 (need >= 20.16). On Windows: nvm install 20.20.2; nvm use 20.20.2"
}
Write-Host "Node $($nodeVersion) OK" -ForegroundColor Green

# --- Toolchain paths (adjust here if your installs differ) --------------------

if (-not $env:JAVA_HOME -and (Test-Path "C:\Program Files\Java\jdk-21")) {
  $env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
  $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
}
if (-not $env:ANDROID_HOME) {
  $sdk = "$env:LOCALAPPDATA\Android\Sdk"
  if (Test-Path $sdk) { $env:ANDROID_HOME = $sdk }
}
if (-not $env:ANDROID_HOME) {
  Write-Error "ANDROID_HOME not set and no SDK found at $sdk. Install Android Studio or set ANDROID_HOME."
}
Write-Host "ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Gray
Write-Host "JAVA_HOME:    $env:JAVA_HOME" -ForegroundColor Gray

# --- Build-time env vars (baked into the JS bundle) ---------------------------

$env:EXPO_PUBLIC_SNAPSHOT_URL = "https://pub-bf9f22e6b04141a591ab56d75fc374e7.r2.dev/events.snapshot.json"

# --- Install JS deps ----------------------------------------------------------

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
  npm install
  if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed" }
}

# --- Generate native project --------------------------------------------------

if (-not (Test-Path "android")) {
  Write-Host "Generating native project (expo prebuild)..." -ForegroundColor Cyan
  npx expo prebuild --platform android
  if ($LASTEXITCODE -ne 0) { Write-Error "expo prebuild failed" }
}

# --- Build release APK --------------------------------------------------------

Write-Host "Building release APK (first run downloads Gradle, be patient)..." -ForegroundColor Cyan
& "$PWD\android\gradlew.bat" -p android assembleRelease --console=plain
if ($LASTEXITCODE -ne 0) { Write-Error "Gradle build failed" }

$apk = "$PWD\android\app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $apk)) { Write-Error "Expected APK not found at $apk" }
Write-Host "APK built: $apk ($([math]::Round((Get-Item $apk).Length / 1MB, 1)) MB)" -ForegroundColor Green

# --- Install via adb if a device is connected ---------------------------------

$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
$devices = (& $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\tdevice$" }).Count

if ($devices -gt 0) {
  Write-Host "Device connected - installing..." -ForegroundColor Cyan
  & $adb install -r $apk
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Installed on phone. Done!" -ForegroundColor Green
  } else {
    Write-Host "Install failed - if the error mentions signatures, uninstall the old app first (EAS and local builds use different keystores), then retry." -ForegroundColor Yellow
  }
} else {
  Write-Host "No phone connected via USB. Either:" -ForegroundColor Yellow
  Write-Host "  1. Enable USB debugging, plug in, rerun:  adb install -r `"$apk`""
  Write-Host "  2. Or copy the APK above to the phone and open it there."
}
