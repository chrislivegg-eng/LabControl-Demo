# LabControl - Checklist de prueba e instalacion

Marca cada punto. Si algo falla, anota que paso y toma captura del panel y de cualquier error.

## A. Antes de ir al laboratorio

- [ ] Elegir la PC o Mac que sera el servidor. Debe quedarse encendida durante las clases.
- [ ] Reservar una IP fija para esa PC en el router (o pedirsela a sistemas).
- [ ] Anotar la IP: `________________`
- [ ] Poner esa IP en `pc-bridge/config/labcontrol-config.json`.
- [ ] Compilar el instalador con `Crear instalador Windows.cmd`.
- [ ] Confirmar con sistemas que las cuentas de alumno en Windows son **estandar**, sin permisos de administrador.

## B. Servidor

- [ ] Instalar Node.js 22 o superior en el servidor.
- [ ] Iniciar con `Iniciar servidor.cmd` (Windows) o `Iniciar servidor.command` (Mac).
- [ ] Permitir el puerto 3100 en el firewall, solo para la red local.
- [ ] Desde otra PC del laboratorio, abrir `http://IP:3100`. Debe aparecer el login del panel.
- [ ] Crear las cuentas reales de maestros y alumnos con `npm run users` (ver `pc-bridge/README.md`).
- [ ] Ejecutar `npm run users -- remove-demo`.
- [ ] Repartir las contrasenas y **borrar** el CSV de contrasenas generado.

## C. Prueba piloto en 2 o 3 PCs

Panel en **Solo alertas** durante toda esta seccion.

- [ ] Instalar el `.exe` como administrador.
- [ ] Reiniciar la PC y entrar con la cuenta estandar del alumno.
- [ ] La ventana de LabControl aparece sola al iniciar Windows.
- [ ] Antes del login, la PC aparece en el panel como "Login pendiente".
- [ ] Un login con contrasena incorrecta es rechazado.
- [ ] Despues del login correcto, la ventana se oculta y el panel muestra el nombre del alumno.
- [ ] Abrir Word: en unos 5 segundos el panel lo muestra como Permitido.
- [ ] Abrir YouTube en Chrome o Edge: el panel lo marca como No permitido.
- [ ] Abrir Roblox u otra app de la lista: el panel la marca como No permitida.
- [ ] Anotar el proceso y el titulo que se ve en el panel para cada prueba.
- [ ] Intentar cerrar la ventana de LabControl: debe seguir reportando.
- [ ] En el icono de la bandeja **no** debe existir la opcion "Salir".
- [ ] Reiniciar el servidor: en unos segundos la app vuelve a pedir login.
- [ ] Desde la PC de un alumno abrir `http://IP:3100`: sin cuenta de maestro no se ve nada.

## D. Prueba de bloqueo (una sola PC)

- [ ] En el panel, activar **Bloqueo activo**.
- [ ] Abrir YouTube: se cierra **solo la pestana**, no todo el navegador.
- [ ] Abrir una app bloqueada: se cierra.
- [ ] Abrir Word y el Explorador de archivos: **no** se cierran.
- [ ] Agregar una excepcion (por ejemplo YouTube) y comprobar que deja de cerrarse.
- [ ] Revisar `pc-bridge/server/audit.log`: aparecen el cambio y el usuario que lo hizo.
- [ ] Regresar a **Solo alertas**.

## E. Instalacion en todo el laboratorio

Solo cuando C y D esten completos sin errores.

- [ ] Instalar el `.exe` en el resto de las PCs.
- [ ] Revisar en el panel que todas aparecen.
- [ ] Decidir con el coordinador si las clases empiezan en Solo alertas o en Bloqueo activo.
- [ ] Guardar una copia de `server/users.json` y `server/rules.json` fuera del servidor.

## Resultados

| PC | Fecha | Prueba | Resultado | Notas |
| --- | --- | --- | --- | --- |
| | | | | |
