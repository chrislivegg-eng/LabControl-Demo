@echo off
setlocal DisableDelayedExpansion
title LabControl - Desinstalar servidor
cd /d "%~dp0"

net session >nul 2>&1
if errorlevel 1 (
  echo Este archivo necesita permisos de administrador.
  echo Clic derecho sobre el archivo ^> Ejecutar como administrador.
  pause
  exit /b 1
)

choice /c SN /m "Quitar el arranque automatico y las reglas de firewall de LabControl"
if errorlevel 2 exit /b 0

schtasks /End /TN "LabControl Servidor" >nul 2>&1
schtasks /Delete /TN "LabControl Servidor" /F >nul 2>&1

rem Detiene el servidor de LabControl que siga corriendo (solo node con server\index.js).
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*server\index.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"

netsh advfirewall firewall delete rule name="LabControl Panel" >nul 2>&1
netsh advfirewall firewall delete rule name="LabControl Busqueda" >nul 2>&1
if exist "server\servicio-labcontrol.cmd" del "server\servicio-labcontrol.cmd"

echo.
echo Servidor de LabControl desinstalado de esta PC.
echo Las cuentas, reglas, bitacora y la llave siguen en la carpeta server.
pause
