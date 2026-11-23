@echo off
cd /d "%~dp0"
set "PATH=E:\nodejs;C:\Program Files\nodejs;%PATH%"
if not exist "dist\src\server.js" (
    echo Compiling backend TypeScript...
    call npx tsc
)
node dist\src\server.js
