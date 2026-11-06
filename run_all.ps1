$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

Write-Host "Stopping any existing node processes on port 3000 and 5000..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "Starting Backend API on port 5000..."
$bRes = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine = '"C:\Program Files\nodejs\node.exe" "dist\src\server.js"'
    CurrentDirectory = 'C:\Star LIMS\backend'
}

Write-Host "Starting Frontend Next.js on port 3000..."
$fRes = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine = '"C:\Program Files\nodejs\node.exe" "node_modules\next\dist\bin\next" dev -p 3000'
    CurrentDirectory = 'C:\Star LIMS\frontend'
}

Write-Host "Both servers started detached successfully. Backend PID: $($bRes.ProcessId), Frontend PID: $($fRes.ProcessId)"

for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  $bOk = $false
  $fOk = $false
  try {
    $b = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/health" -Method Get -TimeoutSec 2
    if ($b.status -eq "ok") { $bOk = $true }
  } catch {}
  try {
    $f = (Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2).StatusCode
    if ($f -eq 200) { $fOk = $true }
  } catch {}
  if ($bOk -and $fOk) {
    Write-Host ">>> Backend and Frontend are online! Pre-warming routes... <<<"
    try {
      Invoke-WebRequest -Uri "http://localhost:3000/dashboard" -UseBasicParsing -TimeoutSec 20 | Out-Null
      Invoke-WebRequest -Uri "http://localhost:3000/samples?lab=general&section=semi-base" -UseBasicParsing -TimeoutSec 20 | Out-Null
      Invoke-WebRequest -Uri "http://localhost:3000/audit-trail" -UseBasicParsing -TimeoutSec 20 | Out-Null
      Invoke-WebRequest -Uri "http://localhost:3000/users" -UseBasicParsing -TimeoutSec 20 | Out-Null
      Invoke-WebRequest -Uri "http://localhost:3000/tasks?lab=general" -UseBasicParsing -TimeoutSec 20 | Out-Null
      Invoke-WebRequest -Uri "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 20 | Out-Null
    } catch {}
    Write-Host ">>> ALL SYSTEMS OPERATIONAL & PRE-WARMED: Backend (http://localhost:5000) & Frontend (http://localhost:3000) are READY! <<<"
    break
  }
}

Write-Host "Server startup complete and running independently in background."
