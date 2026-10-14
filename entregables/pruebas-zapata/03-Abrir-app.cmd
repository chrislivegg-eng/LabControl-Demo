@echo off
setlocal DisableDelayedExpansion
title LabControl - App del alumno
cd /d "%~dp0pc-bridge"
where node >nul 2>&1
if errorlevel 1 goto falta_preparacion
if not exist "node_modules\electron\dist\electron.exe" goto falta_preparacion
set "LABCONTROL_SERVER=http://127.0.0.1:3100"
node -e "fetch(process.env.LABCONTROL_SERVER + '/api/agent/config', {signal: AbortSignal.timeout(4000)}).then(async r => {const c = await r.json(); if(!r.ok || !Array.isArray(c.blockedApps)) process.exit(1);}).catch(() => process.exit(1));"
if errorlevel 1 (
  echo No se encontro el servidor. Abre 02-Iniciar-servidor.cmd primero.
  pause
  exit /b 1
)
echo Abriendo el panel del maestro y la app del alumno.
start "" "http://127.0.0.1:3100"
call npm run agent-app
pause
exit /b 0
:falta_preparacion
echo Primero ejecuta 01-Preparar.cmd y espera a que termine.
pause
exit /b 1
