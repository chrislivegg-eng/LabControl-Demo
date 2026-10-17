@echo off
setlocal DisableDelayedExpansion
title LabControl - Servidor del laboratorio
cd /d "%~dp0"
schtasks /Query /TN "LabControl Servidor" >nul 2>&1
if not errorlevel 1 (
  echo El servidor ya esta instalado en esta PC y arranca solo.
  echo Abre el panel en http://127.0.0.1 . No hace falta usar este archivo.
  pause
  exit /b 0
)
where node >nul 2>&1
if errorlevel 1 (
  echo Instala Node.js LTS ^(22 o superior^) desde https://nodejs.org/en/download
  pause
  exit /b 1
)
echo Panel del maestro en esta PC: http://127.0.0.1
echo Desde las laptops: http://%COMPUTERNAME% o la IP de esta PC.
echo Si el puerto 80 esta ocupado se usara el 3100 ^(se indica abajo^).
echo Deja esta ventana abierta mientras se use el laboratorio.
if not exist "..\assets\vendor\tailwindcss.js" (
  echo Descargando copia local del panel para usarlo sin internet...
  node tools\fetch-vendor.js
)
set "PORT=80"
node server\index.js
echo El servidor se detuvo. Si hay un error arriba, comparte una captura.
pause
