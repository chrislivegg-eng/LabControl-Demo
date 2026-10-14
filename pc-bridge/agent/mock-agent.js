// Simulador de PCs del laboratorio para probar el panel sin equipos Windows.
// Uso: npm run mock-agent
//      npm run mock-agent -- --pcs 8 --server http://127.0.0.1:3100
//      npm run mock-agent -- --server auto   (busca el servidor en la red)
// No cierra nada: solo envia reportes como lo haria el agente real.

import { loadAgentConfig } from './config.js';
import { resolveServerUrl } from './discovery.js';

const args = process.argv.slice(2);

function readArg(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

// --server auto: busca el servidor en la red como lo haria la app instalada.
let SERVER_URL = String(readArg('server', process.env.LABCONTROL_SERVER || 'http://127.0.0.1:3100')).replace(/\/+$/, '');
const PC_COUNT = Math.max(1, Math.min(30, Number(readArg('pcs', 6)) || 6));
const REPORT_MS = Number(readArg('interval', 5000)) || 5000;

// Cuentas demo de alumno (pc-bridge/server/users.json).
const STUDENTS = [
  { username: 'chris', password: 'Lab2026!' },
  { username: 'bebe1', password: 'Bebe2026!' },
  { username: 'alumno1', password: 'Alumno2026!' }
];

// Actividades posibles. Las ultimas coinciden con reglas de prueba.
const ACTIVITIES = [
  { processName: 'WINWORD', windowTitle: 'Practica 3 - Word' },
  { processName: 'EXCEL', windowTitle: 'Inventario.xlsx - Excel' },
  { processName: 'POWERPNT', windowTitle: 'Exposicion final - PowerPoint' },
  { processName: 'Code', windowTitle: 'main.py - Visual Studio Code' },
  { processName: 'chrome', windowTitle: 'Classroom - Google Chrome', pageUrl: 'https://classroom.google.com/' },
  { processName: 'msedge', windowTitle: 'Wikipedia - Microsoft Edge', pageUrl: 'https://es.wikipedia.org/wiki/Logistica' },
  { processName: 'chrome', windowTitle: 'YouTube - Google Chrome', pageUrl: 'https://www.youtube.com/watch?v=demo' },
  { processName: 'chrome', windowTitle: 'Agar.io - Google Chrome', pageUrl: 'https://agar.io/' },
  { processName: 'RobloxPlayerBeta', windowTitle: 'Roblox' }
];

const pick = list => list[Math.floor(Math.random() * list.length)];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function post(path, body) {
  const response = await fetch(`${SERVER_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, payload };
}

async function runPc(index) {
  const pc = `LAB-PC-${String(index + 1).padStart(2, '0')}`;
  const agentId = `mock-${pc}`;
  // La ultima PC se queda sin sesion para mostrar el estado "Login pendiente".
  const staysPending = PC_COUNT > 2 && index === PC_COUNT - 1;
  let session = null;
  let activity = pick(ACTIVITIES);
  let activityStart = Date.now();

  await wait(index * 400);

  while (true) {
    try {
      if (!session) {
        await post('/api/agent/pending', { agentId, pc, pid: process.pid });
        if (!staysPending) {
          const student = STUDENTS[index % STUDENTS.length];
          const { ok, payload } = await post('/api/agent/login', { agentId, pc, ...student });
          if (ok && payload.ok) {
            session = payload;
            console.log(`${pc}: sesion iniciada como ${payload.displayName}`);
          } else {
            console.log(`${pc}: login rechazado (${payload.error || 'sin detalle'})`);
          }
        }
      } else {
        // Cada ~30 s en promedio cambia de actividad.
        if (Math.random() < REPORT_MS / 30000) {
          activity = pick(ACTIVITIES);
          activityStart = Date.now();
        }
        const { ok, payload } = await post('/api/agent/heartbeat', {
          agentId,
          pc,
          sessionToken: session.sessionToken,
          app: activity.windowTitle,
          ...activity,
          pid: 1000 + index,
          activeSeconds: Math.round((Date.now() - activityStart) / 1000)
        });
        if (!ok) {
          // El servidor se reinicio y olvido la sesion: volver a entrar.
          console.log(`${pc}: ${payload.error || 'heartbeat rechazado'}; reintentando login`);
          session = null;
        } else if (payload.blocked) {
          console.log(`${pc}: ${activity.windowTitle} -> no permitido (${payload.matchedRule})`);
        }
      }
    } catch (error) {
      console.log(`${pc}: sin conexion con ${SERVER_URL} (${error.message})`);
    }
    await wait(REPORT_MS);
  }
}

if (SERVER_URL === 'auto') {
  SERVER_URL = await resolveServerUrl({ ...loadAgentConfig(), serverUrl: 'auto', source: 'archivo' }, { log: console.log });
}
console.log(`Simulando ${PC_COUNT} PCs contra ${SERVER_URL}. Ctrl+C para detener.`);
for (let i = 0; i < PC_COUNT; i += 1) runPc(i);
