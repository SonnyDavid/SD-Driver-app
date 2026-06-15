# Start Expo with a working tunnel on Windows.
# Uses Expo's WebSocket tunnel (boltexpo.dev) instead of the shared ngrok token,
# which can hit ERR_NGROK_108 (5000 simultaneous agent sessions).
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ExpoArgs
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$ngrokBin = Join-Path $projectRoot "node_modules\@expo\ngrok-bin-win32-x64\ngrok.exe"
$clearCache = $ExpoArgs -contains "--clear"

Write-Host "[tunnel] Stopping stale ngrok agents..."
Get-Process -Name ngrok -ErrorAction SilentlyContinue | ForEach-Object {
  if (-not $ngrokBin -or $_.Path -eq $ngrokBin -or -not $_.Path) {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  }
}

Write-Host "[tunnel] Stopping stale Expo / Metro node processes..."
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object {
    $_.CommandLine -match 'expo|metro|ngrok|@expo/cli|SD-Driver-app|react-native'
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Start-Sleep -Milliseconds 500

if ($clearCache -and (Test-Path (Join-Path $projectRoot ".expo"))) {
  Write-Host "[tunnel] Clearing project .expo cache..."
  Remove-Item (Join-Path $projectRoot ".expo") -Recurse -Force -ErrorAction SilentlyContinue
}

# Trust Windows system CAs (Node 22+). Do not use EXPO_OFFLINE — it disables tunnel setup.
$env:NODE_USE_SYSTEM_CA = "1"
Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue
Remove-Item Env:EXPO_OFFLINE -ErrorAction SilentlyContinue
Remove-Item Env:CI -ErrorAction SilentlyContinue

# Bypass shared ngrok authtoken (ERR_NGROK_108). Expo CLI uses @expo/ws-tunnel instead.
$env:EXPO_FORCE_WEBCONTAINER_ENV = "1"

Set-Location $projectRoot

Write-Host "[tunnel] Verifying Expo login..."
$whoami = npx expo whoami 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Error "Expo is not logged in. Run: npx expo login"
  exit 1
}
Write-Host "[tunnel] Expo account: $whoami"

Write-Host "[tunnel] Applying @expo/ngrok client patch..."
node (Join-Path $PSScriptRoot "patch-expo-ngrok.js")
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

if ($env:NGROK_AUTHTOKEN) {
  Write-Host "[tunnel] NGROK_AUTHTOKEN is set (personal ngrok account available)."
} else {
  Write-Host "[tunnel] Using Expo WebSocket tunnel (no personal ngrok token required)."
}

Write-Host "[tunnel] Starting Expo with tunnel..."
if ($ExpoArgs.Count -gt 0) {
  npx expo start --tunnel @ExpoArgs
} else {
  npx expo start --tunnel
}
