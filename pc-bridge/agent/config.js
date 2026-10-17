// Lee la direccion del servidor central para el agente y la app Electron.
// Prioridad: variable LABCONTROL_SERVER > labcontrol-config.json > 127.0.0.1.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SERVER_URL = 'http://127.0.0.1:3100';

function candidatePaths() {
  const paths = [];
  if (process.env.LABCONTROL_CONFIG) paths.push(process.env.LABCONTROL_CONFIG);
  // App empaquetada: el instalador copia el archivo a la carpeta resources.
  if (process.resourcesPath) paths.push(path.join(process.resourcesPath, 'labcontrol-config.json'));
  paths.push(path.resolve(__dirname, '..', 'config', 'labcontrol-config.json'));
  return paths;
}

function cleanUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

export function loadAgentConfig() {
  let fileConfig = {};
  let configPath = '';

  for (const candidate of candidatePaths()) {
    try {
      if (!fs.existsSync(candidate)) continue;
      fileConfig = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      configPath = candidate;
      break;
    } catch (error) {
      console.error(`No pude leer ${candidate}: ${error.message}`);
    }
  }

  const serverUrl = cleanUrl(process.env.LABCONTROL_SERVER) || cleanUrl(fileConfig.serverUrl) || DEFAULT_SERVER_URL;

  return {
    ...fileConfig,
    serverUrl,
    configPath,
    source: process.env.LABCONTROL_SERVER ? 'LABCONTROL_SERVER' : configPath ? 'archivo' : 'predeterminado'
  };
}
