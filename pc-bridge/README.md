# LabControl PC Bridge

Servidor local, agente para las PCs Windows y herramientas de administracion.

```
pc-bridge/
  server/index.js            servidor (panel + API), sin dependencias npm
  server/rules.json          reglas de bloqueo
  server/users.demo.json     cuentas demo (se copian a users.json la primera vez)
  server/users.json          cuentas reales  -> NO se sube a Git
  server/audit.log           bitacora de cambios -> NO se sube a Git
  config/labcontrol-config.json   IP del servidor para las PCs de alumnos
  app/                       app Electron del alumno (login, bandeja)
  agent/windows-agent.js     agente de consola (solo pruebas)
  agent/mock-agent.js        simulador de PCs
  agent/config.js            lector de labcontrol-config.json
  tools/users.js             alta y baja de cuentas
  build/installer.nsh        inicio automatico con Windows (HKLM Run)
```

## Requisitos

- **Servidor** (la PC o Mac del maestro): Node.js 22 o superior. No necesita `npm install`.
- **Compilar el instalador**: una PC Windows con Node.js 22 e internet.
- **PCs de alumnos**: nada. El instalador ya incluye todo.

## 1. Servidor

Windows: doble clic en `Iniciar servidor.cmd`.
Mac: doble clic en `Iniciar servidor.command` (la primera vez: clic derecho > Abrir).
Terminal: `npm start` desde `pc-bridge`.

Panel: `http://127.0.0.1:3100` en la misma PC, o `http://IP-DEL-SERVIDOR:3100` desde otra.

La PC del servidor necesita:
- IP fija en la red del laboratorio (reservala en el router).
- El puerto 3100 abierto en su firewall solo para la red local.
- No exponer el puerto a internet.

## 2. Cuentas

La primera vez que arranca el servidor se copian las cuentas demo. Antes de usar el laboratorio:

```powershell
npm run users -- add profe.garcia maestro "Prof. Garcia"
npm run users -- import alumnos.csv
npm run users -- remove-demo
npm run users -- list
```

Formato del CSV (con o sin encabezado):

```
usuario,nombre,rol
jperez,"Perez, Juan",alumno
mlopez,Maria Lopez,alumno
```

Si no hay columna de contrasena, se genera una por cuenta y se guarda en `contrasenas-<fecha>.csv`. Repartelas a cada alumno y despues **borra ese archivo**.

Otros comandos:
- `passwd <usuario>`: genera una contrasena nueva.
- `remove <usuario>`: borra la cuenta.

Las contrasenas se guardan con scrypt y salt, nunca en texto plano.

## 3. Instalador para las PCs de alumnos

1. Edita `config/labcontrol-config.json` con la IP fija del servidor.
2. En una PC Windows, doble clic en `Crear instalador Windows.cmd`.
3. El resultado queda en `dist/LabControl-Agent-<version>-x64.exe`.

El instalador:
- Pide permisos de administrador.
- Instala para todos los usuarios de la PC.
- Registra el inicio automatico en `HKLM\...\Run`.
- Copia la IP a `resources\labcontrol-config.json` dentro de la carpeta de instalacion.

Para cambiar la IP despues, edita ese archivo como administrador y reinicia la PC.

**Las cuentas de alumno en Windows deben ser cuentas estandar, sin permisos de administrador.** Si no lo son, el alumno puede cerrar el agente o desinstalarlo.

## 4. Bloqueo

| Panel: Bloqueo | App instalada | Agente de consola |
| --- | --- | --- |
| Solo alertas | Reporta, no cierra nada | Reporta, no cierra nada |
| Bloqueo activo | Cierra la pestana o la app | Solo cierra con `--enable-blocking` |

Cuando cierra algo:
- En un navegador solo cierra la pestana activa (Ctrl+W), nunca el navegador completo.
- Nunca cierra procesos del sistema (explorer, svchost, etc.) ni el propio agente.

Las reglas y las excepciones solo las puede cambiar un maestro con sesion iniciada. Cada cambio queda en `server/audit.log` con el usuario que lo hizo.

## 5. Pruebas sin Windows

```powershell
npm start
npm run mock-agent -- --pcs 8
```

El simulador crea PCs con sesion y una en "Login pendiente".

## Seguridad: lo que ya esta y lo que no

Ya esta:
- El panel y la API de reglas piden sesion de maestro (token, 10 horas).
- Bloqueo de 1 minuto tras 5 intentos fallidos de login.
- Bitacora de cambios.
- Cuentas reales fuera de Git.
- El instalador no incluye el servidor ni las cuentas.

Limitaciones conocidas:
- **La conexion es HTTP, no HTTPS.** Dentro de la red local, las contrasenas viajan sin cifrar. Es aceptable en una red de laboratorio cerrada, pero no se debe exponer el puerto a internet.
- Las sesiones viven en memoria. Si se reinicia el servidor, los alumnos y el maestro vuelven a iniciar sesion; la app lo pide sola.
- La URL exacta no se captura: el agente ve el proceso y el titulo de la ventana. Para bloquear por URL completa se necesita una extension administrada de navegador o un filtro en DNS, proxy o firewall.
- El selector de clases y grupos del panel es visual; no filtra todavia.
