# Open the sthlmevents Expo development client over USB (WSL Metro on :8081).
# Prerequisite: Metro running in WSL —
#   npx expo start --port 8081 --dev-client --localhost
#
# Usage (Windows PowerShell):
#   .\scripts\usb-dev.ps1
# Or after installing the profile alias below:  sthlmdev

$ErrorActionPreference = 'Stop'

Write-Host 'Checking adb devices...'
$devices = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match '\tdevice$' }
if (-not $devices) {
  Write-Error 'No device in "device" state. Plug in USB, enable USB debugging, accept the prompt.'
}

Write-Host 'adb reverse tcp:8081 -> phone'
adb reverse tcp:8081 tcp:8081 | Out-Null

$url = 'exp+sthlmevents://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081'
Write-Host "Starting app: $url"
adb shell am start -a android.intent.action.VIEW -d $url | Out-Null
Write-Host 'Done. Watch WSL Metro for "Android Bundled…".'
