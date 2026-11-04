$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

Write-Host "Stopping any existing node processes on port 3000 and 5000..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "Starting Backend API on port 5000..."
$backend = Start-Process -FilePath "C:\Program Files\nodejs\node.exe" -ArgumentList "dist\src\server.js" -WorkingDirectory "C:\Star LIMS\backend" -PassThru

Write-Host "Starting Frontend Next.js on port 3000..."
$frontend = Start-Process -FilePath "C:\Program Files\nodejs\node.exe" -ArgumentList "node_modules\next\dist\bin\next", "dev", "-p", "3000" -WorkingDirectory "C:\Star LIMS\frontend" -PassThru

Write-Host "Both servers started successfully. Backend PID: $($backend.Id), Frontend PID: $($frontend.Id)"

for ($i = 0; $i -lt 15; $i++) {
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
    Write-Host ">>> ALL SYSTEMS OPERATIONAL: Backend (http://localhost:5000) & Frontend (http://localhost:3000) are READY! <<<"
    break
  }
}

Wait-Process -Id $backend.Id, $frontend.Id
