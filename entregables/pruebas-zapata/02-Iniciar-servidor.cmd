@echo off
setlocal DisableDelayedExpansion
title LabControl - Servidor de prueba local
cd /d "%~dp0pc-bridge"
where node >nul 2>&1
if errorlevel 1 (
  echo Primero ejecuta 01-Preparar.cmd.
  pause
  exit /b 1
)
set "HOST=127.0.0.1"
set "PORT=3100"
echo El panel se abrira en http://127.0.0.1:3100
echo Deja esta ventana abierta durante la prueba.
echo Ahora abre 03-Abrir-app.cmd.
node server/index.js
echo El servidor se detuvo. Si hay un error arriba, comparte una captura.
pause
