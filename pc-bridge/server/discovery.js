// Descubrimiento del servidor en la red local (UDP) con respuesta firmada.
//
// 1. El agente envia por broadcast: {"type":"labcontrol-discover","nonce":"<aleatorio>"}
// 2. El servidor responde con su URL firmada con su llave privada Ed25519.
// 3. El agente solo acepta la respuesta si la firma es valida con la llave
//    publica que trae el instalador, el nonce es el suyo y la hora es reciente.
//
// La llave privada (discovery-private.pem) nunca sale de esta PC ni se sube a Git.
// La llave publica se escribe en config/labcontrol-config.json para el instalador.

import { createPrivateKey, createPublicKey, generateKeyPairSync, sign } from 'node:crypto';
import dgram from 'node:dgram';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DISCOVERY_PORT = Number(process.env.LABCONTROL_DISCOVERY_PORT || 3101);

function ipToInt(ip) {
  return ip.split('.').reduce((acc, part) => ((acc << 8) + Number(part)) >>> 0, 0);
}

function localIPv4Interfaces() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(item => item && item.family === 'IPv4' && !item.internal);
}

// Elige la IP de esta PC que esta en la misma subred que quien pregunta.
export function pickAddressFor(remoteAddress) {
  const interfaces = localIPv4Interfaces();
  if (remoteAddress && /^\d+\.\d+\.\d+\.\d+$/.test(remoteAddress)) {
    const remote = ipToInt(remoteAddress);
    const match = interfaces.find(item => {
      const mask = ipToInt(item.netmask);
      return (ipToInt(item.address) & mask) === (remote & mask);
    });
    if (match) return match.address;
    if (remoteAddress.startsWith('127.')) return '127.0.0.1';
  }
  return interfaces[0]?.address || '127.0.0.1';
}

// Carga la llave privada o la crea la primera vez. Devuelve la llave publica en base64.
export function loadOrCreateKeys({ privateKeyPath, configPath }) {
  let privateKey;
  if (fs.existsSync(privateKeyPath)) {
    privateKey = createPrivateKey(fs.readFileSync(privateKeyPath));
  } else {
    const pair = generateKeyPairSync('ed25519');
    privateKey = pair.privateKey;
    fs.writeFileSync(privateKeyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    console.log('Se creo la llave de descubrimiento del servidor (server/discovery-private.pem).');
  }

  const publicKey = createPublicKey(privateKey).export({ type: 'spki', format: 'der' }).toString('base64');

  // Mantiene la llave publica al dia en la configuracion del instalador.
  try {
    const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
    if (config.discoveryPublicKey !== publicKey) {
      config.discoveryPublicKey = publicKey;
      fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
      console.log('Llave publica guardada en config/labcontrol-config.json. Vuelve a compilar el instalador con este archivo.');
    }
  } catch (error) {
    console.error(`No pude actualizar ${configPath}: ${error.message}`);
  }

  return { privateKey, publicKey };
}

export function startDiscoveryResponder({ privateKey, httpPort }) {
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

  socket.on('message', (message, remote) => {
    let request;
    try {
      request = JSON.parse(message.toString('utf8'));
    } catch {
      return;
    }
    if (request?.type !== 'labcontrol-discover') return;
    const nonce = String(request.nonce || '');
    if (!/^[a-f0-9]{32}$/.test(nonce)) return;

    const url = `http://${pickAddressFor(remote.address)}:${httpPort}`;
    const payload = JSON.stringify({ type: 'labcontrol-server', url, ts: Date.now(), nonce });
    const sig = sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');
    const reply = Buffer.from(JSON.stringify({ payload, sig }), 'utf8');
    socket.send(reply, remote.port, remote.address);
  });

  socket.on('error', error => {
    console.error(`Descubrimiento automatico no disponible (UDP ${DISCOVERY_PORT}): ${error.message}`);
    socket.close();
  });

  socket.bind(DISCOVERY_PORT, () => {
    const tty = Boolean(process.stdout.isTTY);
    const ok = tty ? '\x1b[38;5;41m' : '';
    const dim = tty ? '\x1b[90m' : '';
    const r = tty ? '\x1b[0m' : '';
    console.log(`${ok}✓${r} ${dim}Busqueda automatica activa — los equipos encuentran el servidor solos.${r}`);
  });

  return socket;
}

export function defaultPaths(serverDir) {
  return {
    privateKeyPath: path.join(serverDir, 'discovery-private.pem'),
    configPath: path.resolve(serverDir, '..', 'config', 'labcontrol-config.json')
  };
}
