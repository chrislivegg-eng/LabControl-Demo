// Busca el servidor de LabControl en la red local y verifica que la respuesta
// este firmada por el servidor real (ver server/discovery.js).
import { createPublicKey, randomBytes, verify } from 'node:crypto';
import dgram from 'node:dgram';
import os from 'node:os';

const DISCOVERY_PORT = Number(process.env.LABCONTROL_DISCOVERY_PORT || 3101);
const MAX_CLOCK_SKEW_MS = 2 * 60 * 1000;

function ipToInt(ip) {
  return ip.split('.').reduce((acc, part) => ((acc << 8) + Number(part)) >>> 0, 0);
}

function intToIp(value) {
  return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');
}

// Direcciones de broadcast de cada red de esta PC, mas la general.
function broadcastAddresses() {
  const addresses = new Set(['255.255.255.255']);
  for (const item of Object.values(os.networkInterfaces()).flat()) {
    if (!item || item.family !== 'IPv4' || item.internal) continue;
    const mask = ipToInt(item.netmask);
    addresses.add(intToIp((ipToInt(item.address) & mask) | (~mask >>> 0)));
  }
  if (process.env.LABCONTROL_DISCOVERY_TARGET) addresses.add(process.env.LABCONTROL_DISCOVERY_TARGET);
  return [...addresses];
}

// Valida una respuesta. Devuelve la URL del servidor o null si no es confiable.
export function verifyDiscoveryReply(raw, { publicKey, nonce, now = Date.now() }) {
  try {
    const { payload, sig } = JSON.parse(String(raw));
    if (typeof payload !== 'string' || typeof sig !== 'string') return null;
    const valid = verify(null, Buffer.from(payload, 'utf8'), publicKey, Buffer.from(sig, 'base64'));
    if (!valid) return null;
    const data = JSON.parse(payload);
    if (data.type !== 'labcontrol-server' || data.nonce !== nonce) return null;
    if (Math.abs(now - Number(data.ts)) > MAX_CLOCK_SKEW_MS) return null;
    if (!/^http:\/\/[0-9.]+:\d+$/.test(String(data.url))) return null;
    return data.url;
  } catch {
    return null;
  }
}

export function parsePublicKey(base64) {
  if (!base64) return null;
  try {
    return createPublicKey({ key: Buffer.from(base64, 'base64'), format: 'der', type: 'spki' });
  } catch {
    return null;
  }
}

// Envia la pregunta por broadcast y espera la primera respuesta firmada valida.
export function discoverServer({ publicKeyBase64, timeoutMs = 3000 } = {}) {
  const publicKey = parsePublicKey(publicKeyBase64);
  if (!publicKey) return Promise.resolve(null);

  return new Promise(resolve => {
    const nonce = randomBytes(16).toString('hex');
    const socket = dgram.createSocket('udp4');
    let finished = false;

    const finish = url => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { socket.close(); } catch { /* ya cerrado */ }
      resolve(url);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    socket.on('message', message => {
      const url = verifyDiscoveryReply(message, { publicKey, nonce });
      if (url) finish(url);
    });
    socket.on('error', () => finish(null));

    socket.bind(0, () => {
      socket.setBroadcast(true);
      const question = Buffer.from(JSON.stringify({ type: 'labcontrol-discover', nonce }), 'utf8');
      for (const address of broadcastAddresses()) {
        socket.send(question, DISCOVERY_PORT, address, () => {});
      }
    });
  });
}

async function serverResponds(url) {
  try {
    const response = await fetch(`${url}/api/agent/config`, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

// Decide a que servidor conectarse:
// - LABCONTROL_SERVER manda siempre.
// - Si serverUrl es "auto" o no esta, se busca en la red.
// - Si serverUrl no responde y hay llave publica, se busca en la red.
export async function resolveServerUrl(config, { log = () => {} } = {}) {
  if (config.source === 'LABCONTROL_SERVER') return config.serverUrl;

  const configured = config.serverUrl && config.serverUrl !== 'auto' ? config.serverUrl : '';
  if (configured && await serverResponds(configured)) return configured;

  if (config.discoveryPublicKey) {
    log(configured ? `No responde ${configured}; buscando el servidor en la red...` : 'Buscando el servidor en la red...');
    const found = await discoverServer({ publicKeyBase64: config.discoveryPublicKey });
    if (found) {
      log(`Servidor encontrado en ${found}`);
      return found;
    }
    log('No se encontro el servidor en la red.');
  }

  return configured || 'http://127.0.0.1:3100';
}
