$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
Write-Host "Starting Backend..."
$backend = Start-Process -FilePath "C:\Program Files\nodejs\node.exe" -ArgumentList "dist\src\server.js" -WorkingDirectory "C:\Star LIMS\backend" -PassThru

Write-Host "Starting Frontend..."
$frontend = Start-Process -FilePath "C:\Program Files\nodejs\node.exe" -ArgumentList "node_modules\next\dist\bin\next", "start", "-p", "3000" -WorkingDirectory "C:\Star LIMS\frontend" -PassThru

Write-Host "Both servers started. Backend PID: $($backend.Id), Frontend PID: $($frontend.Id)"
Wait-Process -Id $backend.Id, $frontend.Id

