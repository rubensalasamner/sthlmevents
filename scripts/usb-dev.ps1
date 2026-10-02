# Open the sthlmevents Expo development client over USB (WSL Metro on :8081).
# Prerequisite: Metro running in WSL —
#   npm run start:usb
#
# Dev client package is app.sthlmevents.dev (side-by-side with Play
# Internal Testing's app.sthlmevents).
#
# Usage (Windows PowerShell, from the project root):
#   .\scripts\usb-dev.ps1

$ErrorActionPreference = 'Stop'

$DevPackage = 'app.sthlmevents.dev'
$url = 'exp+sthlmevents://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081'

Write-Host 'Checking adb devices...'
$devices = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match '\tdevice$' }
if (-not $devices) {
  Write-Error 'No device in "device" state. Plug in USB, enable USB debugging, accept the prompt. If empty under WSL, use Windows adb (kill WSL adb first).'
}

Write-Host "adb reverse tcp:8081 -> phone"
adb reverse tcp:8081 tcp:8081 | Out-Null

$installed = adb shell pm path $DevPackage 2>$null
if (-not $installed) {
  Write-Error "Dev client $DevPackage is not installed. Build once: eas build -p android --profile development"
}

Write-Host "Starting $DevPackage with Metro URL"
adb shell am start -a android.intent.action.VIEW -d $url -p $DevPackage | Out-Null
Write-Host 'Done. Watch WSL Metro for "Android Bundled…". Play Internal Testing app is untouched.'
