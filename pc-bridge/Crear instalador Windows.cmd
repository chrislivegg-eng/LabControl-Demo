@echo off
setlocal DisableDelayedExpansion
title LabControl - Crear instalador Windows
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Instala Node.js LTS ^(22 o superior^) desde https://nodejs.org/en/download
  pause
  exit /b 1
)

echo.
echo Revisa la IP del servidor antes de continuar:
type "config\labcontrol-config.json"
echo.
echo Si la IP no es la del servidor del laboratorio, cierra esta ventana,
echo corrige config\labcontrol-config.json y vuelve a abrir este archivo.
pause

echo Instalando dependencias ^(requiere internet^)...
call npm ci --no-audit --no-fund
if errorlevel 1 goto error

set "ARCH=--x64"
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" set "ARCH=--arm64"

echo Compilando instalador %ARCH%...
call npm run build:win -- %ARCH%
if errorlevel 1 goto error

echo.
echo Listo. El instalador esta en la carpeta dist:
dir /b dist\*.exe
explorer dist
pause
exit /b 0

:error
echo.
echo No se pudo crear el instalador. Comparte una captura de este error.
pause
exit /b 1
