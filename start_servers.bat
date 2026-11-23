@echo off
start "LIMS-Backend" /min "%~dp0backend\run.bat"
start "LIMS-Frontend" /min "%~dp0frontend\run.bat"
