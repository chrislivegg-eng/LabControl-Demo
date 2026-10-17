@echo off
setlocal DisableDelayedExpansion
cd /d "%~dp0pc-bridge"
where node >nul 2>&1
if errorlevel 1 goto falta_node
where npm >nul 2>&1
if errorlevel 1 goto falta_node
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"
if errorlevel 1 goto falta_node
echo Preparando LabControl. Esta primera descarga requiere internet.
call npm ci --no-audit --no-fund
if errorlevel 1 (
  echo No se completo la preparacion. Comparte una captura de este error.
  pause
  exit /b 1
)
echo Listo. Abre 02-Iniciar-servidor.cmd y luego 03-Abrir-app.cmd.
pause
exit /b 0
:falta_node
echo Instala Node.js LTS para Windows desde https://nodejs.org/en/download
echo Despues cierra esta ventana y vuelve a abrir 01-Preparar.cmd.
pause
exit /b 1
