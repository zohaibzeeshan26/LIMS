$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $PSScriptRoot) { $PSScriptRoot = Get-Location }

$env:PATH = "E:\nodejs;C:\Program Files\nodejs;" + $env:PATH

Write-Host "Stopping any existing node processes on port 3000 and 5000..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "Starting Backend API on port 5000..."
$bRes = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$PSScriptRoot\backend`" && set PATH=E:\nodejs;C:\Program Files\nodejs;%PATH% && run.bat" -WindowStyle Minimized -PassThru

Write-Host "Starting Frontend Next.js on port 3000..."
$fRes = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$PSScriptRoot\frontend`" && set PATH=E:\nodejs;C:\Program Files\nodejs;%PATH% && run.bat" -WindowStyle Minimized -PassThru

Write-Host "Both servers started. Backend PID: $($bRes.Id), Frontend PID: $($fRes.Id)"

for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  $bOk = $false
  $fOk = $false
  try {
    $b = Invoke-RestMethod -Uri "http://localhost:5000/" -Method Get -TimeoutSec 2
    if ($b.status -eq "online") { $bOk = $true }
  } catch {}
  try {
    $f = (Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2).StatusCode
    if ($f -eq 200) { $fOk = $true }
  } catch {}
  if ($bOk -and $fOk) {
    Write-Host ">>> ALL SYSTEMS OPERATIONAL: Backend (http://localhost:5000) & Frontend (http://localhost:3000) are READY! <<<"
    break
  }
}
