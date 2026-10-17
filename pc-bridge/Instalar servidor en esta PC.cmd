@echo off
setlocal EnableExtensions DisableDelayedExpansion
title LabControl - Instalar servidor en esta PC
cd /d "%~dp0"

rem ==========================================================================
rem  Instala el servidor de LabControl en la PC del laboratorio:
rem   1. Tarea programada "LabControl Servidor": arranca al prender la PC
rem      (aunque nadie inicie sesion) y reinicia el servidor si se detiene.
rem   2. Firewall: TCP 80 y 3100 y UDP 3101, SOLO para la red local.
rem   3. Opcional: renombrar la PC a LABCONTROL (para http://labcontrol).
rem  Para quitarlo: "Desinstalar servidor de esta PC.cmd".
rem ==========================================================================

net session >nul 2>&1
if errorlevel 1 (
  echo Este archivo necesita permisos de administrador.
  echo Clic derecho sobre el archivo ^> Ejecutar como administrador.
  pause
  exit /b 1
)

set "NODE_EXE="
for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if not defined NODE_EXE (
  echo Instala Node.js LTS ^(22 o superior^) desde https://nodejs.org/en/download
  echo y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

echo.
echo Servidor de LabControl para esta PC del laboratorio
echo   Node.js: %NODE_EXE%
echo   Carpeta: %CD%
echo.
echo Recomendado: que esta carpeta este en un lugar fijo, por ejemplo C:\LabControl,
echo y no en Descargas o en el Escritorio de un usuario.
echo.
choice /c SN /m "Continuar con la instalacion"
if errorlevel 2 exit /b 0

rem Copia local del panel para usarlo sin internet (si hay internet ahora).
if not exist "..\assets\vendor\tailwindcss.js" (
  echo Descargando copia local del panel...
  "%NODE_EXE%" tools\fetch-vendor.js
)

rem 1. Script que corre el servidor y lo vuelve a iniciar si se detiene.
(
  echo @echo off
  echo rem Generado por "Instalar servidor en esta PC.cmd". No editar a mano.
  echo cd /d "%CD%"
  echo set "PORT=80"
  echo :inicio
  echo "%NODE_EXE%" server\index.js ^>^> server\servidor.log 2^>^&1
  echo timeout /t 5 /nobreak ^>nul
  echo goto inicio
) > "server\servicio-labcontrol.cmd"

rem 2. Tarea programada al encender la PC.
schtasks /Delete /TN "LabControl Servidor" /F >nul 2>&1
schtasks /Create /TN "LabControl Servidor" /TR "\"%CD%\server\servicio-labcontrol.cmd\"" /SC ONSTART /RU SYSTEM /RL HIGHEST /F >nul
if errorlevel 1 goto error
echo [OK] Tarea programada "LabControl Servidor".

rem 3. Firewall solo para la red local.
netsh advfirewall firewall delete rule name="LabControl Panel" >nul 2>&1
netsh advfirewall firewall delete rule name="LabControl Busqueda" >nul 2>&1
netsh advfirewall firewall add rule name="LabControl Panel" dir=in action=allow protocol=TCP localport=80,3100 remoteip=localsubnet profile=any >nul
if errorlevel 1 goto error
netsh advfirewall firewall add rule name="LabControl Busqueda" dir=in action=allow protocol=UDP localport=3101 remoteip=localsubnet profile=any >nul
if errorlevel 1 goto error
echo [OK] Firewall: TCP 80 y 3100, UDP 3101, solo red local.

rem 4. Arrancar ahora.
schtasks /Run /TN "LabControl Servidor" >nul
timeout /t 5 /nobreak >nul
echo [OK] Servidor iniciado.

echo.
echo Listo. El servidor arranca solo cada vez que se prenda esta PC.
echo   Panel en esta PC:  http://127.0.0.1
echo   Desde las laptops: http://%COMPUTERNAME%   ^(o la IP de esta PC^)
echo   Registro:          %CD%\server\servidor.log
echo.
echo Siguiente paso: crear las cuentas reales con "npm run users" ^(ver README^).
echo.

if /i not "%COMPUTERNAME%"=="LABCONTROL" (
  echo Para que el panel quede en http://labcontrol, esta PC debe llamarse LABCONTROL.
  echo Si la PC pertenece al dominio de la escuela, pide a sistemas que la renombren.
  choice /c SN /m "Renombrar esta PC a LABCONTROL ahora (requiere reiniciar)"
  if not errorlevel 2 (
    powershell -NoProfile -Command "Rename-Computer -NewName 'LABCONTROL' -Force"
    echo Reinicia la PC para aplicar el nombre.
  )
)
pause
exit /b 0

:error
echo.
echo No se pudo completar la instalacion. Comparte una captura de este error.
pause
exit /b 1
