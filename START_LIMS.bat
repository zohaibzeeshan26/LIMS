@echo off
title Citi Pharma LIMS - Server Launcher
echo ============================================================
echo Starting Citi Pharma LIMS Servers...
echo Backend:  http://localhost:5000/api/v1
echo Frontend: http://localhost:3000
echo ============================================================
powershell.exe -ExecutionPolicy Bypass -File "%~dp0run_all.ps1"
pause
