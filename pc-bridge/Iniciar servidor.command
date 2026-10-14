#!/bin/bash
# Servidor de LabControl en Mac. Doble clic para iniciarlo.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Instala Node.js LTS (22 o superior) desde https://nodejs.org/en/download"
  read -r -p "Presiona Enter para cerrar"
  exit 1
fi
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
echo "Panel del maestro: http://127.0.0.1"
[ -n "$IP" ] && echo "Desde otras PCs: http://$IP (si el puerto 80 no se pudo usar, agrega :3100)"
echo "Deja esta ventana abierta mientras se use el laboratorio."
PORT=80 node server/index.js
read -r -p "El servidor se detuvo. Presiona Enter para cerrar"
