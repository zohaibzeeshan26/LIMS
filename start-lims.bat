@echo off
title Star LIMS Launcher
echo ========================================================
echo Starting City Pharma Star LIMS (Next.js + Node.js + DB)...
echo ========================================================

set "PATH=E:\nodejs;C:\Program Files\nodejs;%PATH%"

echo [1/2] Starting Backend Server on http://localhost:5000 ...
start "Star LIMS Backend (Port 5000)" cmd /k "cd /d %~dp0backend && set PATH=E:\nodejs;C:\Program Files\nodejs;%%PATH%% && run.bat"

echo [2/2] Starting Frontend Next.js on http://localhost:3000 ...
start "Star LIMS Frontend (Port 3000)" cmd /k "cd /d %~dp0frontend && set PATH=E:\nodejs;C:\Program Files\nodejs;%%PATH%% && run.bat"

echo.
echo ========================================================
echo Both servers are starting up:
echo - Frontend: http://localhost:3000
echo - Documentation: http://localhost:3000/documentation-manager
echo - Backend:  http://localhost:5000/api/v1
echo ========================================================
