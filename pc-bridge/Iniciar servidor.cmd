@echo off
setlocal DisableDelayedExpansion
title LabControl - Servidor del laboratorio
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Instala Node.js LTS ^(22 o superior^) desde https://nodejs.org/en/download
  pause
  exit /b 1
)
echo Panel del maestro en esta PC: http://127.0.0.1:3100
echo Las PCs de alumnos se conectan a la IP de esta PC, puerto 3100.
echo Deja esta ventana abierta mientras se use el laboratorio.
node server\index.js
echo El servidor se detuvo. Si hay un error arriba, comparte una captura.
pause
