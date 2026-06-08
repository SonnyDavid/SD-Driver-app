# Start Expo with ngrok tunnel.
# Fixes common Windows failures: stale ngrok agents, port conflicts, TLS to api.expo.dev.
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ExpoArgs
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$ngrokBin = Join-Path $projectRoot "node_modules\@expo\ngrok-bin-win32-x64\ngrok.exe"

# Stale ngrok.exe processes from aborted tunnel starts cause "session closed" errors.
Get-Process -Name ngrok -ErrorAction SilentlyContinue | ForEach-Object {
  if (-not $ngrokBin -or $_.Path -eq $ngrokBin) {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  }
}
Start-Sleep -Milliseconds 400

# Trust Windows system CAs (Node 22+). Do not use EXPO_OFFLINE — it disables tunnel setup.
$env:NODE_USE_SYSTEM_CA = "1"
Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue
Remove-Item Env:EXPO_OFFLINE -ErrorAction SilentlyContinue
Remove-Item Env:CI -ErrorAction SilentlyContinue

Set-Location $projectRoot
if ($ExpoArgs.Count -gt 0) {
  npx expo start --tunnel @ExpoArgs
} else {
  npx expo start --tunnel
}
