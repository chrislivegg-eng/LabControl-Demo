# LabControl PC Bridge

Servidor local, agente para las PCs Windows y herramientas de administracion.

```
pc-bridge/
  server/index.js            servidor (panel + API), sin dependencias npm
  server/rules.json          reglas de bloqueo
  server/users.demo.json     cuentas demo (se copian a users.json la primera vez)
  server/users.json          cuentas reales  -> NO se sube a Git
  server/audit.log           bitacora de cambios -> NO se sube a Git
  server/discovery-private.pem  llave privada del servidor -> NO se sube a Git
  server/discovery.js        responde a la busqueda automatica (UDP 3101)
  agent/discovery.js         busca el servidor y verifica la firma
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

**PC del laboratorio (recomendado):**
1. Copia la carpeta del proyecto a un lugar fijo, por ejemplo `C:\LabControl`.
2. Clic derecho en `Instalar servidor en esta PC.cmd` > **Ejecutar como administrador**. Solo se hace una vez.

Ese script:
- Crea la tarea programada "LabControl Servidor", que arranca el servidor al prender la PC (aunque nadie inicie sesion) y lo vuelve a iniciar si se detiene.
- Abre en el firewall TCP 80 y 3100 y UDP 3101, **solo para la red local**.
- Descarga la copia local del panel, si hay internet.
- Ofrece renombrar la PC a `LABCONTROL`.

El registro queda en `server/servidor.log`. Para quitarlo: `Desinstalar servidor de esta PC.cmd`, como administrador. Las cuentas, reglas y la llave se conservan.

**Arranque manual** (pruebas o sin instalar):
Windows: doble clic en `Iniciar servidor.cmd`. Si el servidor ya esta instalado como servicio, solo avisa y no abre otro.
Mac: doble clic en `Iniciar servidor.command` (la primera vez: clic derecho > Abrir).
Terminal: `npm start` desde `pc-bridge`.

El servidor usa el puerto 80, asi que no hace falta escribir puerto. Si el 80 esta ocupado, usa el 3100 y lo indica en la ventana.

Panel:
- En la misma PC: `http://127.0.0.1`.
- Desde otra PC o laptop: **`http://labcontrol`**, si la PC servidor se llama `LABCONTROL`. Si no, `http://IP-DEL-SERVIDOR`.
- En Mac, si `http://labcontrol` no abre, prueba `http://labcontrol.local`.

### Esquema recomendado

- Una PC del laboratorio (de preferencia la del escritorio del maestro) es el servidor y se llama `LABCONTROL`.
- Los maestros abren el panel desde su laptop con el navegador. No se instala nada en las laptops.
- Las laptops deben estar en la **misma red** que las PCs del laboratorio.

### Sin internet

LabControl **no necesita internet**: las PCs, el servidor y las laptops se comunican por la red local. Si se cae el internet pero el router o switch sigue encendido, el monitoreo, los reportes y los bloqueos siguen funcionando.

El panel usa Tailwind y Chart.js. `Iniciar servidor` descarga una copia local la primera vez que hay internet (`npm run vendor`, en `assets/vendor/`); despues el panel ya no depende de internet. Si la copia no existe, se usan los CDN.

El asistente de ayuda del panel es local (sin IA), asi que tampoco necesita internet.

### Si el servidor esta apagado

La app del alumno no estorba: oculta la ventana de login, se queda en la bandeja ("sin servidor: registrando actividad") y la PC se usa normal. **No bloquea nada** sin servidor.

Mientras tanto, guarda cada cambio de app o ventana con su hora, en `%APPDATA%\LabControl Agent\offline-log.json`, hasta 7 dias. Cuando el servidor vuelve:
1. La app envia lo pendiente y lo borra de la PC.
2. Vuelve a pedir login.
3. El panel lo muestra en **Reportes > Actividad sin conexion**, por PC, con las apps o paginas no permitidas marcadas.

Sin servidor no hay login, asi que esa actividad se identifica por **PC y usuario de Windows**. Si el servidor se apago en plena sesion, tambien guarda el alumno que estaba conectado.

Integridad:
- Cada entrada lleva numero de secuencia y un hash encadenado con la anterior.
- El servidor marca las entradas editadas, los huecos y si el archivo se borro y empezo de nuevo ("registro reiniciado").
- Esto hace visible una alteracion, pero **no la impide**. El archivo esta en la cuenta del alumno, y alguien que conozca el formato podria rehacerlo. Tampoco se detecta si el archivo se borra antes del primer envio de esa PC.

El servidor guarda esa actividad en `server/offline-activity.jsonl` y `server/offline-state.json`, que no se suben a Git.

La PC del servidor necesita:
- De preferencia, IP fija en la red del laboratorio (reservala en el router).
- Abiertos en su firewall, solo para la red local: TCP 80 y 3100 (panel y reportes) y UDP 3101 (busqueda automatica).
- No exponer esos puertos a internet.

### Busqueda automatica del servidor

Si la IP de `labcontrol-config.json` no responde (o vale `"auto"`), la app del alumno pregunta por toda la red local donde esta el servidor:

- El servidor contesta con su direccion **firmada** con una llave privada Ed25519 que solo existe en la PC del servidor (`server/discovery-private.pem`).
- La app solo acepta respuestas firmadas por esa llave. La llave publica viaja en el instalador.
- Cada pregunta lleva un numero aleatorio y una hora. Asi no sirve repetir una respuesta vieja ni alterar la direccion.
- Un alumno que lea la llave publica no puede hacerse pasar por el servidor.
- Si la app pierde la conexion varias veces seguidas, vuelve a buscar. Si el servidor cambio de IP, lo encuentra solo.

Configuracion:

1. Arranca el servidor una vez en la PC definitiva del servidor. Crea la llave y escribe `discoveryPublicKey` en `config/labcontrol-config.json`.
2. Compila el instalador con **ese** `labcontrol-config.json`. Si compilas en otra PC, copia el archivo desde el servidor.
3. Respalda `server/discovery-private.pem` fuera del servidor. Si se pierde o cambias de PC servidor, hay que generar otra llave y reinstalar el agente en las PCs. Mientras tanto, siguen funcionando con la IP del archivo.

Sin `discoveryPublicKey` en la configuracion, la app solo usa la IP escrita.

Limitacion: la busqueda evita servidores falsos, pero la conexion despues sigue siendo HTTP. Alguien con control de la red (por ejemplo, con ARP spoofing) aun podria interceptar el trafico.

## 2. Cuentas

La primera vez que arranca el servidor se copian las cuentas demo. Antes de usar el laboratorio se crean las cuentas reales y se borran las demo.

### Alumnos: desde la lista de la escuela (Excel)

Un Excel (`.xlsx`) o CSV con estos titulos en la primera fila, en cualquier orden:

| nombre | apellido | matricula | grupo |
| --- | --- | --- | --- |
| Christian | Peters Lopez | DES0444 | 5 Seguridad Informatica |

```powershell
npm run alumnos -- importar alumnos.xlsx
npm run alumnos -- lista
```

- **Usuario = matricula.** El alumno entra en la PC con su matricula.
- **Nombre visible = primer nombre + primer apellido** ("Christian Peters"). En el panel se ve el nombre, con la matricula y el grupo debajo.
- **Grupo** = la columna del Excel. El alumno no lo elige y no puede cambiarlo.
- Si hay filas con errores (matricula invalida o repetida, datos faltantes), **no se importa nada** y se listan las filas a corregir.
- Volver a importar actualiza nombre y grupo, y conserva la contrasena de cada alumno.

**Codigos de activacion.** Cada alumno nuevo recibe un codigo de un solo uso (por ejemplo `K7Q-4M2`). La importacion crea `codigos-activacion-<fecha>.html` junto al Excel: abrelo, imprimelo, recorta y entrega cada recuadro. Despues **borra esa hoja**.

La primera vez, el alumno escribe su matricula y el codigo, y la app le pide crear su propia contrasena (minimo 8 caracteres y sin su matricula). El codigo vence en 14 dias.

**Contrasena olvidada.** En el panel, en **Usuarios**, el maestro busca al alumno y pulsa **Restablecer** y luego **Confirmar**. Aparece un codigo nuevo para darselo en persona. La contrasena anterior deja de funcionar y queda en la bitacora quien lo hizo. Tambien desde la terminal: `npm run alumnos -- nuevo-codigo DES0444`.

El Excel y las hojas de codigos tienen datos personales: **nunca los subas a Git**. `.gitignore` ya los excluye.

### Maestros y administradores

```powershell
npm run users -- add profe.garcia maestro "Prof. Garcia"
npm run users -- add coordlab admin "Coordinador de Laboratorio"
npm run users -- remove-demo
npm run users -- list
```

Sin contrasena en el comando, se genera una y se muestra una sola vez. `passwd <usuario>` genera otra y `remove <usuario>` borra la cuenta.

Las contrasenas y los codigos se guardan con scrypt y salt, nunca en texto plano.

### Grupos en el panel

El grupo de cada alumno aparece debajo de su nombre, junto a la matricula, en Inicio, Sesiones y Usuarios. Sale de la columna "grupo" del Excel; no hay que crearlo aparte. En **Usuarios**, el buscador encuentra por nombre, matricula o grupo.

### Historial y reportes

El servidor guarda cuanto tiempo usa cada alumno cada aplicacion, por dia, en `server/history/AAAA-MM-DD.json` (fuera de Git; se conservan 120 dias).

- Solo se guarda el nombre de la app y si estaba permitida. De las paginas prohibidas tambien el sitio ("Google Chrome · youtube.com"). **No** se guardan titulos de ventanas, textos ni teclas.
- En el panel, **Reportes** muestra el uso por periodo (hoy, ayer, 7 o 30 dias), con detalle por alumno y boton Imprimir.
- La grafica **Tiempo por aplicacion** de Inicio usa el mismo historial; en rojo, lo no permitido.
- Si una PC deja de reportar, el hueco no se cuenta como uso (maximo 15 s entre reportes).
- La actividad registrada sin servidor sigue en su propio reporte, "Actividad sin conexion".

## 3. Instalador para las PCs de alumnos

1. Revisa `config/labcontrol-config.json`. Por defecto apunta a `http://labcontrol`. Si la PC servidor tiene otro nombre, pon su nombre o su IP fija. Comprueba que tenga `discoveryPublicKey` (ver Busqueda automatica).
2. En una PC Windows, doble clic en `Crear instalador Windows.cmd`.
3. El resultado queda en `dist/LabControl-Agent-<version>-x64.exe`.

Si falla con "Cannot create symbolic link", ejecuta `Crear instalador Windows.cmd` como administrador (o activa el Modo de programador de Windows).

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
npm run mock-agent -- --server auto    # prueba la busqueda automatica
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
- No hay selector de clase activa: el grupo de cada alumno se muestra y se busca, pero el panel no filtra por clase.
