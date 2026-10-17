# LabControl - Guia completa del proyecto

## 1. Proposito

LabControl es una herramienta para administrar el uso academico de computadoras en un laboratorio escolar. El sistema tiene dos partes:

1. Un panel web para el maestro.
2. Un servidor local y un agente para las PCs Windows del laboratorio.

El objetivo es mostrar sesiones, equipos conectados, actividad actual, alertas, reportes y reglas de apps o sitios prohibidos. El proyecto debe usarse de forma autorizada y transparente. No debe capturar contrasenas, mensajes privados ni pulsaciones de teclado.

## 2. Estado actual

El codigo vive en `main` (repositorio `chrislivegg-eng/LabControl-Demo`). La rama `pc-agent-bridge` se uso para desarrollar el servidor y el agente, y se lleva a `main` despues de la prueba en Windows real del 14 de octubre de 2026 (seccion 12).

Actualmente existe:

- Panel web de LabControl.
- Servidor local en Node.js, con ventana grafica (`Servidor (ventana).cmd`) o como servicio de Windows.
- Simulador de varias PCs para pruebas sin Windows.
- Agente Windows de consola (pruebas).
- App visual de Electron para el agente, con pantalla de bloqueo hasta iniciar sesion.
- Login de alumnos (matricula y codigo de activacion), maestros y administrador.
- Alumnos importados desde el Excel de la escuela, con su grupo.
- Historial de uso por alumno y reportes por periodo.
- Actividad registrada sin servidor, enviada cuando el servidor vuelve.
- Busqueda automatica y firmada del servidor en la red local.
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

Comprobado en Windows real (14 de octubre de 2026, una PC): conexion al servidor, busqueda automatica, login de alumno, aparicion en el panel, deteccion de apps, alertas, excepciones, reportes y bloqueo.

Pendiente:

- Prueba piloto en el laboratorio con varias PCs (`CHECKLIST-INSTALACION.md`), incluido el inicio automatico tras reiniciar.
- Cargar alumnos y maestros reales y borrar las cuentas demo.
- La URL exacta del navegador no se captura (seccion 7).

## 3. Arquitectura

### Panel web

Archivos principales:

- `index.html`: estructura del login, dashboard, actividad, reportes, usuarios y configuracion.
- `app.js`: navegacion, datos, llamadas al servidor, reglas, excepciones y asistente.
- `styles.css`: estilos principales.
- `mobile.css`: ajustes para pantallas pequenas.
- `assets/`: logotipo, wordmark, fondo y favicons.

La interfaz es HTML, CSS y JavaScript sin compilacion. Usa Tailwind y Chart.js: copias locales en `assets/vendor/` (`npm run vendor`, no se suben a Git) y, si no existen, los CDN. El panel puede abrirse como demo estatica o servirse desde el servidor local para recibir datos reales.

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

- Puerto: `80` con `Iniciar servidor.cmd` y el servicio (si esta ocupado, `3100`); `3100` con `npm start`. Se cambia con la variable `PORT`.
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
- `pc-bridge/app/server-window.js` y `server-ui.html`: ventana grafica del servidor.
- `pc-bridge/app/icon.ico` y `logo.png`: logo oficial de la ventana, la bandeja y el login.

El agente:

1. Se conecta al servidor configurado.
2. Reporta la PC como `Sin sesion` si aun no hay login.
3. Bloquea la pantalla y solicita matricula y contrasena (o codigo de activacion la primera vez).
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

En Windows, doble clic en `pc-bridge/Servidor (ventana).cmd` (ventana con el estado y las direcciones del panel) o en `pc-bridge/Iniciar servidor.cmd` (consola). Usan el puerto 80, asi que el panel queda en `http://127.0.0.1`.

Desde terminal:

```powershell
cd pc-bridge
npm install
npm start
```

Con `npm start` el panel queda en `http://127.0.0.1:3100`.

Para que otras PCs de la red se conecten, el firewall debe permitir TCP 80 y 3100 y UDP 3101 solo para la red local. `Instalar servidor en esta PC.cmd` lo configura.

Si `npm install` avisa que no corrio el script de instalacion de Electron, ejecuta `npm install-scripts approve electron` y vuelve a instalar. Sin ese paso, Electron queda incompleto y las ventanas se ven como texto sin estilos.

### Simulador local

En otra terminal:

```powershell
cd pc-bridge
npm run mock-agent -- --pcs 8
```

El simulador permite comprobar el dashboard sin instalar Windows ni conectar equipos fisicos. Necesita `pc-bridge/agent/mock-students.json` con las cuentas demo de alumno (`[{ "username": "...", "password": "..." }]`); ese archivo no se sube a Git, pidelo al equipo.

### Agente Windows por consola

```powershell
cd pc-bridge
$env:LABCONTROL_SERVER="http://IP-DEL-SERVIDOR"
$env:LABCONTROL_USER="matricula"
$env:LABCONTROL_PASSWORD="contrasena"
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
  "mode": "lab-managed",
  "discoveryPublicKey": "(la escribe el servidor la primera vez que arranca)"
}
```

Si no hay servidor, la app del alumno no estorba ni bloquea. Guarda la actividad en la PC hasta 7 dias y la envia cuando el servidor vuelve; el panel la muestra en Reportes > Actividad sin conexion. Detalles en `pc-bridge/README.md`.

Si la IP configurada no responde, la app busca el servidor en la red local por UDP 3101 y solo acepta respuestas firmadas con la llave del servidor (Ed25519). La llave privada esta en `server/discovery-private.pem`, que no se sube a Git y se debe respaldar. La llave publica se escribe sola en `discoveryPublicKey`. Detalles en `pc-bridge/README.md`.

En la PC del laboratorio, el servidor se instala una vez con `pc-bridge/Instalar servidor en esta PC.cmd` (como administrador): arranca solo al prender la PC, se reinicia si falla y el firewall queda abierto solo para la red local.

Antes de distribuir el instalador:

1. Confirmar el nombre (`LABCONTROL`) o la IP fija de la PC servidor.
2. Actualizar `serverUrl` y comprobar que el archivo tenga `discoveryPublicKey`.
3. Levantar el servidor en esa PC.
4. Permitir TCP `80` y `3100` y UDP `3101` en el firewall, solo para la red local.
5. Probar desde dos o tres PCs.
6. Despues instalar en todas las PCs autorizadas.

Si se va el acceso a internet, las PCs siguen comunicandose por Ethernet o Wi-Fi mientras permanezcan en la misma red local y el router o switch siga encendido. El panel usa copias locales de Tailwind y Chart.js (`npm run vendor`, que `Iniciar servidor` ejecuta solo la primera vez), asi que funciona sin internet. El asistente de ayuda es local y tampoco necesita internet.

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
- Tarea programada "LabControl Agent - Vigilante": si cierran el agente, se vuelve a abrir en menos de un minuto.

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

Tambien existe el archivo `Crear instalador Windows.cmd` para automatizar `npm install` y la compilacion. Ejecutalo como administrador (o activa el Modo de programador de Windows); sin permisos falla al crear enlaces simbolicos.

El instalador lleva el logo oficial (`build/icon.ico`, `installerHeader.bmp` e `installerSidebar.bmp`). No esta firmado digitalmente, asi que Windows SmartScreen puede mostrar "Editor desconocido"; se continua con "Mas informacion > Ejecutar de todas formas".

## 11. Prueba recomendada en laboratorio

La lista completa, para marcar, esta en `CHECKLIST-INSTALACION.md`. Resumen:

1. Instalar el agente en dos o tres PCs autorizadas.
2. Confirmar que todas apuntan al servidor (`http://labcontrol` o su IP).
3. Comprobar que el servidor del laboratorio esta en linea.
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

El `.exe` se compila en una PC Windows con `Crear instalador Windows.cmd`. El 15 de octubre de 2026 se volvio a compilar y se comprobo que el instalador y la app llevan el logo oficial.

Prueba en Windows real (14 de octubre de 2026, PC de Christian, Windows 11, servidor y agente en la misma PC, panel desde un telefono en la misma red):

- `Iniciar servidor.cmd` arranco en el puerto 80 y creo la llave de descubrimiento.
- `Crear instalador Windows.cmd` genero `LabControl-Agent-1.0.0-x64.exe` (ejecutado como administrador; sin permisos falla al extraer winCodeSign).
- El agente instalado encontro el servidor con la busqueda automatica (la configuracion apuntaba a `labcontrol`).
- Login de alumno, reporte en el panel del telefono, alerta por app no permitida, excepciones, quitar reglas, reportes y bloqueo: funcionaron.

Falta la prueba piloto en el laboratorio con varias PCs (`CHECKLIST-INSTALACION.md`).

## 13. Asistente de ayuda

El asistente es **100% local**: no usa IA, no necesita internet y no envia datos fuera del panel. Esta en `app.js` (seccion 4) y se basa en la rama `asistente-local`.

- Responde dudas de uso por temas: que es LabControl, inicio de sesion, sesiones, alertas, reportes, actividad sin conexion, bloqueo, reglas, excepciones, internet y privacidad. Cada respuesta puede incluir un boton "Ir a ..." a la seccion.
- Resume la actividad, detecta alertas y agrupa el uso con los datos que el panel ya tiene: en vivo con el servidor y de demostracion en la demo estatica.
- Si no entiende la pregunta, muestra el menu de temas.

Se elimino `api/chat.js` (Gemini). Para agregar un tema nuevo, se suma una entrada a `helpTopics` en `app.js`.

## 14. Clases y grupos

Ya existe:

- Cada alumno tiene un grupo, tomado de la columna "grupo" del Excel de la escuela (`npm run alumnos -- importar alumnos.xlsx`). El alumno no lo elige ni lo cambia.
- El panel muestra el grupo debajo del nombre, con la matricula, en Inicio, Sesiones y Usuarios.
- En Usuarios, el buscador encuentra alumnos por nombre, matricula o grupo.

El selector de clase activa se quito del panel porque no filtraba. Queda como mejora futura, y necesitaria:

- Clases y horarios.
- Equipos asignados a cada clase.
- Clase activa del maestro y filtrado real del panel.

## 15. Computadoras personales

En una PC personal del alumno no se debe prometer control total del dispositivo. Si se conecta a la red escolar, el colegio puede aplicar politicas de red mediante router, DNS, proxy o firewall. Si usa otra red, datos moviles, VPN o DNS propio, el control puede evadirse salvo que la infraestructura escolar bloquee esas salidas.

El bloqueo desde red es una fase posterior. No depende solo del panel web.

## 16. Seguridad y administracion

- Usar cuentas de alumno sin permisos administrativos.
- Instalar el agente con permisos de administrador.
- Mantener el servidor en una PC administrada.
- No exponer el puerto local a internet sin autenticacion y cifrado.
- No distribuir credenciales demo en un entorno real.
- No subir `server/users.json`, `server/audit.log`, `server/discovery-private.pem`, el Excel de alumnos, las hojas de codigos ni `agent/mock-students.json` a Git.
- La conexion es HTTP dentro de la red local; no exponer los puertos 80, 3100 ni 3101 a internet.
- Las contrasenas demo estuvieron escritas en commits anteriores al 15 de octubre de 2026. Las cuentas demo nunca deben quedar activas en el laboratorio.
- Las sesiones viven en memoria: si el servidor se reinicia, alumnos y maestros vuelven a iniciar sesion.
- Registrar excepciones administrativas (se hace solo en `server/audit.log`).
- Quitar a los alumnos el Administrador de tareas, el simbolo del sistema, PowerShell y taskkill con directivas locales o de dominio (ver `pc-bridge/README.md`). Sin eso, un alumno puede cerrar el agente y la PC queda libre hasta que la tarea vigilante lo vuelve a abrir.
- No ocultar actividad ni falsificar aplicaciones.
- Probar cierres y bloqueo solamente con autorizacion.

## 17. Flujo Git

`main` tiene la version estable. Para cada cambio nuevo:

1. Crear una rama de funcionalidad desde `main`.
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
- `entregables/pruebas-zapata/`: paquete de pruebas para una PC Windows (copia de septiembre; para pruebas nuevas usar `pc-bridge` directamente).

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
