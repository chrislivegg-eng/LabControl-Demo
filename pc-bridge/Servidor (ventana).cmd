@echo off
setlocal
cd /d "%~dp0"
where node >/dev/null 2>&1
if errorlevel 1 (
  echo Instala Node.js LTS desde https://nodejs.org/en/download
  pause
  exit /b 1
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo Instalando dependencias por unica vez. Requiere internet, tarda un poco...
  call npm install
)
if not exist "..\assets\vendor\tailwindcss.js" node tools\fetch-vendor.js
start "" "node_modules\electron\dist\electron.exe" "app\server-window.js"
exit /b 0
