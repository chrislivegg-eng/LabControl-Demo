# LabControl - Guia completa del proyecto

## 1. Proposito

LabControl es una herramienta para administrar el uso academico de computadoras en un laboratorio escolar. El sistema tiene dos partes:

1. Un panel web para el maestro.
2. Un servidor local y un agente para las PCs Windows del laboratorio.

El objetivo es mostrar sesiones, equipos conectados, actividad actual, alertas, reportes y reglas de apps o sitios prohibidos. El proyecto debe usarse de forma autorizada y transparente. No debe capturar contrasenas, mensajes privados ni pulsaciones de teclado.

## 2. Estado actual

La rama de trabajo actual es `pc-agent-bridge`. El destino final del codigo es `main`, pero antes de hacer merge se debe probar el agente en una PC Windows real.

Actualmente existe:

- Panel web de LabControl.
- Servidor local en Node.js.
- Simulador de varias PCs para pruebas desde Mac.
- Agente Windows base.
- App visual de Electron para el agente.
- Login de alumnos, maestros y administrador.
- Reporte de actividad al servidor cada 5 segundos.
- Dashboard con equipos, sesiones, aplicaciones y estados.
- Reglas de apps, dominios, sufijos y palabras clave.
- Modo `Solo alertas` y `Bloqueo activo`.
- Excepciones configurables desde el panel.
- Instalador Windows todo en uno (por maquina, con inicio automatico).
- Panel y API de reglas protegidos con sesion de maestro (token).
- Limite de intentos de login y bitacora de cambios (`server/audit.log`).
- Herramienta de cuentas `npm run users` (alta, baja, CSV, quitar demo).

Nota (14 de octubre de 2026): el codigo de `pc-bridge` se recupero del paquete de pruebas de Zapata (rama `pc-agent-bridge`, commit `2c03568`, 12 de septiembre) porque la PC original ya no esta disponible. El simulador, el archivo de configuracion y la documentacion se rehicieron.

No debe considerarse version final hasta comprobar en hardware real:

- Conexion de una PC Windows al servidor central.
- Inicio de sesion con usuario de alumno.
- Aparicion correcta de la PC en el panel.
- Deteccion de aplicaciones reales.
- Bloqueo real de una app autorizadamente seleccionada.
- Captura de URL exacta en el navegador.
- Inicio automatico despues de instalar el agente.

## 3. Arquitectura

### Panel web

Archivos principales:

- `index.html`: estructura del login, dashboard, actividad, reportes, usuarios y configuracion.
- `app.js`: navegacion, datos, llamadas al servidor, reglas, excepciones y asistente.
- `styles.css`: estilos principales.
- `mobile.css`: ajustes para pantallas pequenas.
- `assets/`: logotipo, wordmark, fondo y favicons.

La interfaz es HTML, CSS y JavaScript sin compilacion. Usa Tailwind y Chart.js desde CDN en la demo web. El panel puede abrirse como demo estatica o servirse desde el servidor local para recibir datos reales.

### Servidor local

Archivo principal: `pc-bridge/server/index.js`.

Funciones principales:

- Sirve la web de LabControl.
- Valida credenciales.
- Registra agentes pendientes de login.
- Crea sesiones de agente.
- Recibe heartbeats de las PCs.
- Decide si una app o pagina esta bloqueada.
- Expone el estado de los equipos al panel.
- Lee y guarda las reglas en `server/rules.json`.

Configuracion por defecto:

- Puerto: `3100`.
- Host: `0.0.0.0`.
- Ventana de equipo en linea: 15 segundos.
- Intervalo de reporte: 5 segundos.

### Agente Windows

Archivos principales:

- `pc-bridge/agent/windows-agent.js`: agente de consola.
- `pc-bridge/app/main.js`: app Electron visual, bandeja e inicio automatico.
- `pc-bridge/app/renderer.html`: ventana de login del agente.
- `pc-bridge/app/renderer.js`: comportamiento visual del login.
- `pc-bridge/app/renderer.css`: estilos de la app Windows.

El agente:

1. Se conecta al servidor configurado.
2. Reporta la PC como `Sin sesion` si aun no hay login.
3. Solicita usuario y contrasena.
4. Valida la sesion con el servidor.
5. Detecta la ventana activa de Windows.
6. Envia proceso, titulo, PID y tiempo activo.
7. Consulta las reglas en cada ciclo.
8. Puede cerrar la pestana activa del navegador o terminar un proceso cuando el bloqueo esta activo.

En una app empaquetada de Windows se activa el inicio con Windows. Esto no es una garantia absoluta contra un administrador del sistema. Para el laboratorio, las cuentas de alumnos deben ser cuentas normales sin permisos de administrador y la instalacion debe hacerse con permisos administrativos.

## 4. Usuarios demo

Las cuentas demo estan en `pc-bridge/server/users.demo.json` (con hash y salt, nunca en texto plano). La primera vez que arranca el servidor se copian a `server/users.json`, que es el archivo de cuentas reales y no se sube a Git.

Cuentas demo: `chris`, `bebe1` y `alumno1` (alumno); `maestro`, `docente` y `profeana` (maestro); `coordlab` (admin). Las contrasenas demo no se escriben en documentos que se suban a Git; pidelas al equipo.

Antes de usar el laboratorio se crean las cuentas reales y se borran las demo con `npm run users` (ver `pc-bridge/README.md`).

El panel web solo permite entrar a usuarios con rol `teacher` o `admin`. Los usuarios `student` se usan en el login de las PCs Windows.

Las cuentas demo son solo para pruebas. En el laboratorio deben eliminarse con `npm run users -- remove-demo` despues de crear las cuentas reales.

## 5. Ejecutar el proyecto

### Servidor local

Desde la raiz de `pc-bridge`:

```powershell
cd pc-bridge
npm install
npm start
```

Abrir el panel en:

```text
http://127.0.0.1:3100
```

Para que otras PCs de la red se conecten, el servidor debe escuchar en `0.0.0.0` y el firewall debe permitir el puerto `3100`.

### Simulador local

En otra terminal:

```powershell
cd pc-bridge
npm run mock-agent -- --pcs 8
```

El simulador permite comprobar el dashboard sin instalar Windows ni conectar equipos fisicos.

### Agente Windows por consola

```powershell
cd pc-bridge
$env:LABCONTROL_SERVER="http://IP-DE-LA-MAC:3100"
npm run windows-agent
```

Para activar el cierre de apps o pestañas durante una prueba autorizada:

```powershell
npm run windows-agent -- --enable-blocking
```

El agente de consola solo cierra algo con `--enable-blocking` y con `Bloqueo activo` en el panel. La app instalada obedece solo al interruptor del panel.

## 6. Configuracion de red

Esquema acordado: una PC del laboratorio llamada `LABCONTROL` es el servidor (puerto 80) y los maestros abren el panel desde su laptop en `http://labcontrol`. Las PCs de alumnos y las laptops deben estar en la misma red local. Si el servidor esta apagado, la app del alumno se oculta y la PC se usa normal.

Archivo:

`pc-bridge/config/labcontrol-config.json`

Configuracion actual de referencia:

```json
{
  "serverUrl": "http://labcontrol",
  "mode": "lab-managed"
}
```

Si no hay servidor, la app del alumno no estorba ni bloquea. Guarda la actividad en la PC hasta 7 dias y la envia cuando el servidor vuelve; el panel la muestra en Reportes > Actividad sin conexion. Detalles en `pc-bridge/README.md`.

Si la IP configurada no responde, la app busca el servidor en la red local por UDP 3101 y solo acepta respuestas firmadas con la llave del servidor (Ed25519). La llave privada esta en `server/discovery-private.pem`, que no se sube a Git y se debe respaldar. La llave publica se escribe sola en `discoveryPublicKey`. Detalles en `pc-bridge/README.md`.

Antes de distribuir el instalador:

1. Confirmar la IP local fija de la Mac.
2. Actualizar `serverUrl`.
3. Levantar el servidor con esa IP disponible en la red.
4. Permitir TCP `80` y `3100` y UDP `3101` en el firewall, solo para la red local.
5. Probar desde dos o tres PCs.
6. Despues instalar en todas las PCs autorizadas.

Si se va el acceso a internet, las PCs siguen comunicandose por Ethernet o Wi-Fi mientras permanezcan en la misma red local y el router o switch siga encendido. El panel usa copias locales de Tailwind y Chart.js (`npm run vendor`, que `Iniciar servidor` ejecuta solo la primera vez), asi que funciona sin internet. Solo el asistente de IA remoto necesita internet; sin el, usa respuestas locales.

## 7. Reglas de bloqueo

Archivo:

`pc-bridge/server/rules.json`

Campos importantes:

- `blockEnabled`: activa o desactiva el bloqueo real.
- `blockedApps`: nombres de procesos o apps prohibidas.
- `blockedPages`: lista compatible con reglas anteriores.
- `blockedDomains`: dominios exactos y sus subdominios.
- `blockedDomainSuffixes`: sufijos como `.io`.
- `blockedKeywords`: palabras o patrones simples.
- `allowedApps`: apps conocidas como permitidas para la demo.
- `exceptions`: valores que tienen prioridad y evitan el bloqueo.

Ejemplos:

- `youtube.com` cubre `youtube.com` y `www.youtube.com`.
- `mercadolibre.com.mx` cubre `autos.mercadolibre.com.mx` y otros subdominios.
- `.io` cubre dominios que terminan en `.io`, como `agar.io`.
- Una URL como `https://autos.mercadolibre.com.mx/` se normaliza al dominio `autos.mercadolibre.com.mx`.

El formulario de Configuracion permite agregar:

- Dominio o URL: se guarda como dominio.
- Valor que empieza con `.` o `*.`: se guarda como sufijo.
- Texto sin punto: se guarda como palabra clave.

### Limitacion actual de URL

El servidor ya puede evaluar `pageUrl` o `url` cuando un agente los envia. Sin embargo, el agente Windows actual obtiene principalmente el proceso y el titulo de la ventana. Por eso una regla como `mercadolibre.com.mx` puede no detectar una subpagina si el titulo no contiene ese dominio.

Para bloqueo confiable por URL completa se necesita una de estas opciones:

- Extension administrada para Chrome, Edge o Brave.
- Integracion de navegador que reporte la pestaña activa.
- DNS, proxy o firewall del laboratorio.

Una pagina web por si sola no puede bloquear otra computadora. LabControl puede ser el panel que administra las reglas, pero el bloqueo lo ejecuta el agente, el DNS, el router, el proxy o el firewall.

## 8. Excepciones

El panel permite:

- Permitir una app, pagina, dominio o usuario como excepcion.
- Quitar una excepcion escribiendo el mismo valor.
- Ver las excepciones actuales.
- Mantener la excepcion de forma registrada en `rules.json`.

Las excepciones deben mostrarse como excepciones activas. No se debe falsificar la actividad de un alumno ni mostrar que usa otra aplicacion. Para el equipo de desarrollo puede existir una excepcion administrativa etiquetada y registrada, pero no debe ocultarse del historial.

## 9. Comportamiento del bloqueo

- Si el proceso activo es un navegador, el agente solo cierra la pestana activa con `Ctrl+W`; nunca cierra el navegador completo.
- Si la regla coincide con otra aplicacion, el agente puede terminar el proceso.
- Nunca se cierran procesos del sistema (explorer, svchost, etc.) ni el propio agente.
- Si `blockEnabled` es `false`, el servidor reporta la coincidencia pero el agente no debe cerrar nada.
- Para pruebas iniciales se recomienda comenzar en `Solo alertas`.
- El cierre de procesos debe probarse unicamente en equipos autorizados.

## 10. Instalador todo en uno para laboratorio

El instalador se configura en `pc-bridge/package.json` y usa Electron Builder.

Incluye:

- App Electron.
- Runtime de Electron, que incorpora Node.js necesario para la app.
- Agente Windows.
- Configuracion de la IP del servidor (`resources\labcontrol-config.json`).
- Instalacion por maquina.
- Elevacion administrativa.
- Acceso directo de escritorio y menu Inicio.
- Inicio automatico con Windows para todos los usuarios (`HKLM\...\Run`, en `build/installer.nsh`).
- Sin opcion de salir desde la bandeja y una sola instancia por PC.

El instalador ya no incluye el servidor ni `users.json`, para no dejar los hashes de las cuentas en las PCs de alumnos.

Node.js no debe instalarse por separado en las PCs del laboratorio cuando se use el instalador empaquetado. Node.js si es necesario en la PC de desarrollo que construye el instalador.

### Crear instalador

En Windows de desarrollo:

```powershell
cd pc-bridge
npm install
npm run build:win -- --x64
```

El resultado esperado es:

```text
pc-bridge/dist/LabControl-Agent-1.0.0-x64.exe
```

Para equipos Windows ARM:

```powershell
npm run build:win -- --arm64
```

Tambien existe el archivo `Crear instalador Windows.cmd` para automatizar `npm install` y la compilacion.

## 11. Prueba recomendada en laboratorio

1. Instalar el agente en dos o tres PCs autorizadas.
2. Confirmar que todas apuntan a la misma IP de la Mac.
3. Abrir el servidor local en la Mac.
4. Iniciar sesion en cada PC con un usuario de alumno.
5. Confirmar que las PCs aparecen en el dashboard.
6. Abrir Word o una app permitida y comprobar que se reporta.
7. Abrir YouTube, Roblox o una regla de prueba.
8. Revisar primero el estado en `Solo alertas`.
9. Activar `Bloqueo activo` y repetir una sola prueba.
10. Confirmar que el cierre solo ocurre en el equipo y app esperados.
11. Comprobar que cerrar la ventana del agente no elimina el reporte ni el inicio automatico.
12. Registrar resultados y errores antes de instalar en todo el laboratorio.

## 12. Validaciones ya realizadas

Se han validado en el servidor local:

- Sintaxis de `app.js`.
- Sintaxis de `pc-bridge/server/index.js`.
- Integridad de espacios y cambios.
- Login de agente.
- Heartbeat con `pageUrl`.
- Coincidencia de `https://autos.mercadolibre.com.mx/` contra `mercadolibre.com.mx`.
- Deduplicacion y normalizacion de reglas.
- Rutas del panel rechazadas sin token de maestro (401) y aceptadas con token.
- Bloqueo tras 5 intentos fallidos de login (429).
- Bitacora con usuario en cada cambio de reglas y excepciones.
- Importacion de cuentas por CSV y login con una cuenta importada.
- Simulador con varias PCs y una en login pendiente.

No se pudo compilar el `.exe` desde el entorno de desarrollo en la nube; se compila en una PC Windows con `Crear instalador Windows.cmd`.

La validacion del servidor no sustituye la prueba del agente empaquetado en Windows real.

## 13. Asistente de IA

Archivo cliente: `api/chat.js`.

El panel puede usar un endpoint remoto de Gemini. La clave debe permanecer en el servidor, nunca en el navegador ni en Git.

Variables esperadas:

- `GEMINI_API_KEY`: obligatoria para el servicio remoto.
- `GEMINI_MODEL`: opcional.

El cliente tiene un respaldo local por reglas cuando la consulta remota falla. Sin internet, la parte remota y las dependencias CDN pueden fallar, pero el panel local y el puente LAN deben separarse de esa dependencia.

## 14. Clases y grupos

La idea funcional es que el maestro seleccione una clase activa, por ejemplo `Sexto Logistica`, y vea solo los alumnos y equipos asignados a ese grupo.

Esto aun debe implementarse como modelo real. Actualmente hay roles, pero no existe una base completa de:

- Grupos.
- Clases.
- Horarios.
- Alumnos asignados.
- Equipos asignados.
- Clase activa del maestro.

No presentar el selector de clase como funcional hasta agregar persistencia, asignaciones y filtrado real.

## 15. Computadoras personales

En una PC personal del alumno no se debe prometer control total del dispositivo. Si se conecta a la red escolar, el colegio puede aplicar politicas de red mediante router, DNS, proxy o firewall. Si usa otra red, datos moviles, VPN o DNS propio, el control puede evadirse salvo que la infraestructura escolar bloquee esas salidas.

El bloqueo desde red es una fase posterior. No depende solo del panel web.

## 16. Seguridad y administracion

- Usar cuentas de alumno sin permisos administrativos.
- Instalar el agente con permisos de administrador.
- Mantener el servidor en una PC administrada.
- No exponer el puerto local a internet sin autenticacion y cifrado.
- No distribuir credenciales demo en un entorno real.
- No subir `server/users.json`, `server/audit.log` ni los CSV de contrasenas a Git.
- La conexion es HTTP dentro de la red local; no exponer el puerto 3100 a internet.
- Registrar excepciones administrativas (se hace solo en `server/audit.log`).
- No ocultar actividad ni falsificar aplicaciones.
- Probar cierres y bloqueo solamente con autorizacion.

## 17. Flujo Git antes de `main`

El camino correcto es:

1. Trabajar en una rama de funcionalidad, actualmente `pc-agent-bridge`.
2. Revisar los cambios y separar archivos generados o ajenos.
3. Ejecutar validaciones de sintaxis y pruebas del servidor.
4. Probar en Windows real.
5. Documentar fallos y resultados.
6. Crear commit en la rama de trabajo.
7. Subir la rama al remoto.
8. Crear un PR hacia `main`.
9. Revisar el PR.
10. Hacer merge a `main` solo cuando el flujo principal este validado.

No usar `staging` como base de desarrollo ni publicar en produccion sin aprobacion.

## 18. Archivos y entregables importantes

- `pc-bridge/README.md`: instrucciones del puente y agente.
- `pc-bridge/server/index.js`: servidor local.
- `pc-bridge/server/users.demo.json`: cuentas demo.
- `pc-bridge/server/users.json`: cuentas reales (no se sube a Git).
- `pc-bridge/tools/users.js`: administracion de cuentas.
- `CHECKLIST-INSTALACION.md`: prueba piloto e instalacion en el laboratorio.
- `pc-bridge/server/rules.json`: reglas actuales.
- `pc-bridge/config/labcontrol-config.json`: direccion del servidor.
- `pc-bridge/package.json`: scripts y configuracion del instalador.
- `pc-bridge/dist/`: instaladores generados, no codigo fuente.
- `entregables/pruebas-zapata/`: paquete de pruebas para una PC Windows.
- `entregables/trailer-labcontrol/`: recursos, capturas, audio y videos del trailer.

## 19. Reglas para continuar el proyecto

Antes de modificar algo:

1. Leer este archivo y `pc-bridge/README.md`.
2. Revisar `git status` y la rama activa.
3. Distinguir demo web, servidor, agente Windows e instalador.
4. No afirmar que una funcion esta lista sin probarla en el entorno correspondiente.
5. No reemplazar cambios de otra persona sin revisarlos.
6. Mantener las credenciales y secretos fuera de los entregables publicos.
7. Comunicar en espanol.
8. Dejar claro que se hizo, donde se hizo, que falta y que debe revisar el equipo.
