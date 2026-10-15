import { createReadStream } from 'node:fs';
import { access, appendFile, copyFile, readFile, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultPaths, loadOrCreateKeys, startDiscoveryResponder } from './discovery.js';
import { OfflineStore } from './offline-store.js';
import { HistoryStore, dayKey } from './history-store.js';
import {
  clearActivation, issueActivation, publicStudent, validateNewPassword,
  verifyActivation, verifyPassword, hashPassword, writeUsersFile
} from './accounts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bridgeDir = path.resolve(__dirname, '..');
const labControlDir = path.resolve(bridgeDir, '..');
const rulesPath = path.join(__dirname, 'rules.json');
const usersPath = path.join(__dirname, 'users.json');
const usersDemoPath = path.join(__dirname, 'users.demo.json');
const auditPath = path.join(__dirname, 'audit.log');

const PORT = Number(process.env.PORT || 3100);
const HOST = process.env.HOST || '0.0.0.0';
const ONLINE_WINDOW_MS = 15000;

const agentReports = new Map();
const agentSessions = new Map();
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8'
};

const localBridgeScript = '<script>window.LABCONTROL_AGENT_API_URL="/api/lab/status";</script>';
const allowedStaticFiles = new Set([
  '/index.html',
  '/app.js',
  '/styles.css',
  '/mobile.css',
  '/assets/favicon.svg',
  '/assets/favicon.png',
  '/assets/cyber-lab-background.png',
  '/assets/labcontrol-wordmark.png',
  '/assets/vendor/tailwindcss.js',
  '/assets/vendor/chart.umd.min.js'
]);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

// --- Seguridad: sesiones de maestro, limite de intentos y bitacora ---
const TEACHER_SESSION_MS = Number(process.env.LABCONTROL_TEACHER_SESSION_HOURS || 10) * 60 * 60 * 1000;
const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK_MS = 60 * 1000;
const teacherSessions = new Map();
const loginFailures = new Map();

function clientKey(request, username) {
  return `${request.socket.remoteAddress || 'local'}|${username}`;
}

function isLoginLocked(key) {
  const entry = loginFailures.get(key);
  if (!entry) return false;
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) return true;
  if (entry.lockedUntil) loginFailures.delete(key);
  return false;
}

function registerLoginFailure(key) {
  const entry = loginFailures.get(key) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= LOGIN_MAX_FAILS) {
    entry.lockedUntil = Date.now() + LOGIN_LOCK_MS;
    entry.count = 0;
  }
  loginFailures.set(key, entry);
}

function lockedResponse(response) {
  sendJson(response, 429, { ok: false, error: 'Demasiados intentos. Espera un minuto y vuelve a intentar.' });
}

function getTeacherSession(request) {
  const header = String(request.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const session = token ? teacherSessions.get(token) : null;
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    teacherSessions.delete(token);
    return null;
  }
  return session;
}

function requireTeacher(request, response) {
  const session = getTeacherSession(request);
  if (!session) {
    sendJson(response, 401, { ok: false, error: 'Inicia sesión como maestro para continuar.' });
    return null;
  }
  return session;
}

async function appendAudit(entry) {
  try {
    await appendFile(auditPath, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, 'utf8');
  } catch (error) {
    console.error(`No pude escribir la bitacora: ${error.message}`);
  }
}

function readRequestJson(request, maxBytes = 50_000) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > maxBytes) {
        request.destroy();
        reject(new Error('Payload demasiado grande.'));
      }
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('JSON invalido.'));
      }
    });
    request.on('error', reject);
  });
}

async function loadRules() {
  const raw = await readFile(rulesPath, 'utf8');
  const rules = JSON.parse(raw);
  return normalizeRules({
    reportIntervalMs: 5000,
    blockEnabled: false,
    blockedApps: [],
    blockedPages: [],
    blockedDomains: [],
    blockedDomainSuffixes: [],
    blockedKeywords: [],
    allowedApps: [],
    exceptions: [],
    ...rules
  });
}

async function saveRules(rules) {
  await writeFile(rulesPath, `${JSON.stringify(normalizeRules(rules), null, 2)}\n`, 'utf8');
}

// Cuentas en memoria mientras users.json no cambie (los reportes llegan cada 5 s).
let usersCache = { mtimeMs: -1, users: [] };
async function loadUsersCached() {
  try {
    const { mtimeMs } = await stat(usersPath);
    if (mtimeMs === usersCache.mtimeMs) return usersCache.users;
    const users = await loadUsers();
    usersCache = { mtimeMs, users };
    return users;
  } catch {
    return loadUsers();
  }
}

async function loadUsers() {
  // Primera ejecucion: se parte de las cuentas demo. Las cuentas reales se
  // guardan en users.json, que no se sube a Git.
  try {
    await access(usersPath);
  } catch {
    await copyFile(usersDemoPath, usersPath);
    console.log('users.json no existia: se copiaron las cuentas demo. Cambialas con npm run users.');
  }
  const raw = await readFile(usersPath, 'utf8');
  return JSON.parse(raw);
}

async function saveUsers(users) {
  writeUsersFile(usersPath, users);
}


async function handleTeacherLogin(request, response) {
  try {
    const body = await readRequestJson(request);
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    const users = await loadUsers();
    const user = users.find(entry => entry.username.toLowerCase() === username);
    const allowedRoles = new Set(['teacher', 'admin']);
    const key = clientKey(request, `teacher:${username}`);

    if (isLoginLocked(key)) {
      lockedResponse(response);
      return;
    }

    if (!username || !password || !user || !allowedRoles.has(user.role) || !verifyPassword(password, user)) {
      registerLoginFailure(key);
      sendJson(response, 401, {
        ok: false,
        error: 'Usuario o contraseña de maestro incorrectos.'
      });
      return;
    }

    loginFailures.delete(key);
    const token = randomUUID();
    teacherSessions.set(token, {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      expiresAt: Date.now() + TEACHER_SESSION_MS
    });
    await appendAudit({ event: 'teacher-login', username: user.username });

    sendJson(response, 200, {
      ok: true,
      token,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
}

function handleTeacherLogout(request, response) {
  const header = String(request.headers.authorization || '');
  if (header.startsWith('Bearer ')) teacherSessions.delete(header.slice(7).trim());
  sendJson(response, 200, { ok: true });
}

async function handleAgentLogin(request, response) {
  try {
    const body = await readRequestJson(request);
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    const agentId = String(body.agentId || body.pc || '').trim();
    const pc = String(body.pc || agentId || 'PC-SIN-NOMBRE').trim();
    const users = await loadUsers();
    const user = users.find(entry => entry.username.toLowerCase() === username);
    const key = clientKey(request, `agent:${username}`);

    if (isLoginLocked(key)) {
      lockedResponse(response);
      return;
    }

    if (!agentId || !username || !password || !user) {
      registerLoginFailure(key);
      sendJson(response, 401, { ok: false, error: 'Matrícula o contraseña incorrectas.' });
      return;
    }

    if (verifyPassword(password, user)) {
      loginFailures.delete(key);
      sendJson(response, 200, createAgentSession(user, agentId, pc));
      return;
    }

    // Codigo de activacion (primera vez o acceso restablecido): pide crear contrasena.
    if (verifyActivation(password, user)) {
      loginFailures.delete(key);
      const setupToken = randomUUID();
      setupTokens.set(setupToken, { username: user.username, agentId, pc, expiresAt: Date.now() + SETUP_TOKEN_MS });
      sendJson(response, 200, { ok: true, mustSetPassword: true, setupToken, displayName: user.displayName });
      return;
    }

    registerLoginFailure(key);
    sendJson(response, 401, { ok: false, error: 'Matrícula o contraseña incorrectas.' });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
}

// Una PC solo tiene una sesion activa: al volver a entrar se reemplaza la anterior.
function createAgentSession(user, agentId, pc) {
  for (const [token, existing] of agentSessions) {
    if (existing.agentId === agentId) agentSessions.delete(token);
  }
  const sessionToken = randomUUID();
  const session = {
    sessionToken,
    agentId,
    pc,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    startedAt: new Date().toISOString()
  };
  agentSessions.set(sessionToken, session);
  return { ok: true, sessionToken, username: session.username, displayName: session.displayName, role: session.role };
}

const SETUP_TOKEN_MS = 10 * 60 * 1000;
const setupTokens = new Map();

// El alumno crea su contrasena despues de entrar con el codigo de activacion.
async function handleSetPassword(request, response) {
  try {
    const body = await readRequestJson(request);
    const setup = setupTokens.get(String(body.setupToken || ''));
    if (!setup || setup.expiresAt < Date.now()) {
      sendJson(response, 401, { ok: false, error: 'El tiempo para crear la contraseña terminó. Vuelve a entrar con tu código.' });
      return;
    }
    const users = await loadUsers();
    const user = users.find(entry => entry.username === setup.username);
    if (!user) {
      sendJson(response, 404, { ok: false, error: 'La cuenta ya no existe.' });
      return;
    }
    const problem = validateNewPassword(body.newPassword, user);
    if (problem) {
      sendJson(response, 400, { ok: false, error: problem });
      return;
    }
    Object.assign(user, hashPassword(String(body.newPassword)));
    clearActivation(user);
    await saveUsers(users);
    setupTokens.delete(String(body.setupToken));
    await appendAudit({ event: 'password-set', username: user.username, pc: setup.pc });
    sendJson(response, 200, createAgentSession(user, setup.agentId, setup.pc));
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
}

// --- Alumnos (para el panel del maestro) ---
async function handleStudentList(teacher, response) {
  try {
    const users = await loadUsers();
    const students = users.filter(user => user.role === 'student').map(user => publicStudent(user))
      .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
    sendJson(response, 200, { ok: true, students });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
}

// El maestro restablece el acceso: se genera un codigo nuevo de un solo uso.
async function handleStudentReset(teacher, request, response) {
  try {
    const body = await readRequestJson(request);
    const username = String(body.username || '').trim().toLowerCase();
    const users = await loadUsers();
    const user = users.find(entry => entry.username === username && entry.role === 'student');
    if (!user) {
      sendJson(response, 404, { ok: false, error: 'No existe un alumno con esa matrícula.' });
      return;
    }
    // La contrasena anterior deja de servir: el alumno entra con el codigo nuevo.
    delete user.passwordHash;
    delete user.passwordSalt;
    const code = issueActivation(user);
    await saveUsers(users);
    for (const [token, session] of agentSessions) {
      if (session.username === user.username) agentSessions.delete(token);
    }
    await appendAudit({ event: 'password-reset', username: teacher.username, student: user.username });
    sendJson(response, 200, { ok: true, code, expiresAt: user.activationExpires, student: publicStudent(user) });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
}

async function handleAgentPending(request, response) {
  try {
    const body = await readRequestJson(request);
    const agentId = String(body.agentId || body.pc || '').trim();
    const pc = String(body.pc || agentId || 'PC-SIN-NOMBRE').trim();

    if (!agentId) {
      sendJson(response, 400, { ok: false, error: 'agentId es requerido.' });
      return;
    }

    agentReports.set(agentId, {
      agentId,
      sessionId: null,
      pc,
      name: 'Sin sesión',
      username: '',
      app: 'Login pendiente',
      windowTitle: 'El alumno todavía no inició sesión en LabControl.',
      processName: 'labcontrol-login',
      pid: body.pid || null,
      time: '0 min',
      allowed: false,
      status: 'Requiere login',
      receivedAt: Date.now()
    });

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
}

function normalizeAppName(name = '') {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeRuleValue(value = '') {
  return String(value).trim().toLowerCase();
}

function uniqueRules(list = [], transform = normalizeRuleValue) {
  const seen = new Set();
  return list
    .map(transform)
    .filter(Boolean)
    .filter(item => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function normalizeDomain(value = '') {
  let clean = normalizeRuleValue(value)
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0];
  clean = clean.replace(/:\d+$/, '');
  return clean;
}

function normalizeDomainSuffix(value = '') {
  const clean = normalizeDomain(value).replace(/^\*+/, '');
  if (!clean) return '';
  return clean.startsWith('.') ? clean : `.${clean}`;
}

function normalizeRules(rules = {}) {
  return {
    ...rules,
    blockedApps: uniqueRules(rules.blockedApps),
    blockedPages: uniqueRules(rules.blockedPages),
    blockedDomains: uniqueRules(rules.blockedDomains, normalizeDomain),
    blockedDomainSuffixes: uniqueRules(rules.blockedDomainSuffixes, normalizeDomainSuffix),
    blockedKeywords: uniqueRules(rules.blockedKeywords),
    allowedApps: uniqueRules(rules.allowedApps),
    exceptions: uniqueRules(rules.exceptions, normalizeException)
  };
}

function classifyWebRule(value = '') {
  const clean = normalizeRuleValue(value);
  if (!clean) return null;
  if (clean.startsWith('.') || clean.startsWith('*.')) {
    return { key: 'blockedDomainSuffixes', value: normalizeDomainSuffix(clean) };
  }
  if (/^https?:\/\//.test(clean) || clean.includes('.')) {
    return { key: 'blockedDomains', value: normalizeDomain(clean) };
  }
  return { key: 'blockedKeywords', value: clean };
}

function matchesAnyRule(fields, ruleNames = []) {
  return fields.some(field => {
    const normalized = normalizeAppName(field);
    return ruleNames.some(name => normalized.includes(normalizeAppName(name)));
  });
}

// Una excepcion puede ser un nombre ("canva", "scratch") o un dominio
// ("canva.com"). Un dominio tambien se reconoce por su nombre en el titulo de
// la ventana ("Canva - Diseno"), porque el agente no siempre ve la URL.
function hasException(fields, rules) {
  const exceptions = rules.exceptions || [];
  if (matchesAnyRule(fields, exceptions)) return true;
  const domains = exceptions.filter(item => item.includes('.'));
  if (!domains.length) return false;
  if (matchesDomain(getCandidateHostnames(fields), domains)) return true;
  return Boolean(matchesDomainName(fields.join(' '), domains));
}

// Nombre mas especifico de un dominio: "mercadolibre.com.mx" -> "mercadolibre",
// "www.canva.com" -> "canva", "classroom.google.com" -> "classroom".
const COMMON_TLD_PARTS = new Set(['com', 'net', 'org', 'edu', 'gob', 'gov', 'mx', 'io', 'co', 'tv', 'app', 'me', 'es', 'us', 'info', 'dev', 'ai', 'gg']);
// Palabras que aparecen en el titulo de casi toda ventana de navegador.
const BROWSER_WORDS = new Set(['google', 'chrome', 'microsoft', 'edge', 'brave', 'mozilla', 'firefox', 'opera', 'windows', 'nueva', 'pestana']);
function domainName(domain = '') {
  const parts = String(domain).replace(/^www\./, '').split('.').filter(Boolean);
  while (parts.length > 1 && COMMON_TLD_PARTS.has(parts[parts.length - 1])) parts.pop();
  const name = parts[0] || '';
  return BROWSER_WORDS.has(name) ? '' : name;
}

// El agente muchas veces solo ve el titulo de la ventana ("Canva - Diseno"),
// no la URL. Se busca el nombre del dominio como palabra completa del titulo.
function matchesDomainName(text, domains = []) {
  const words = new Set(String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(Boolean));
  for (const domain of domains) {
    const name = domainName(domain);
    if (name.length >= 4 && words.has(name)) return domain;
  }
  return '';
}

// Normaliza una excepcion: dominios sin http/www, nombres en minusculas.
function normalizeException(value = '') {
  const clean = normalizeRuleValue(value);
  if (!clean) return '';
  return /^https?:\/\//.test(clean) || clean.includes('.') ? normalizeDomain(clean) : clean;
}

const REMOVABLE_RULE_LISTS = new Set(['blockedApps', 'blockedPages', 'blockedDomains', 'blockedDomainSuffixes', 'blockedKeywords']);

function extractHostname(value = '') {
  const text = normalizeRuleValue(value);
  if (!text) return '';

  try {
    const url = text.includes('://') ? new URL(text) : new URL(`https://${text}`);
    return normalizeDomain(url.hostname);
  } catch {
    const hostnameMatch = text.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i);
    return hostnameMatch ? normalizeDomain(hostnameMatch[1]) : '';
  }
}

function getCandidateHostnames(fields = []) {
  return uniqueRules(fields.map(extractHostname), normalizeDomain);
}

function matchesDomain(hostnames = [], domains = []) {
  for (const hostname of hostnames) {
    for (const domain of domains) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return domain;
      }
    }
  }
  return '';
}

function matchesDomainSuffix(hostnames = [], suffixes = []) {
  for (const hostname of hostnames) {
    for (const suffix of suffixes) {
      if (hostname.endsWith(suffix)) {
        return suffix;
      }
    }
  }
  return '';
}

function matchesKeyword(fields = [], keywords = []) {
  for (const field of fields) {
    const normalized = normalizeRuleValue(field);
    const compact = normalizeAppName(field);
    for (const keyword of keywords) {
      const cleanKeyword = normalizeRuleValue(keyword);
      if (normalized.includes(cleanKeyword) || compact.includes(normalizeAppName(cleanKeyword))) {
        return cleanKeyword;
      }
    }
  }
  return '';
}

function getBlockDecision({ app, windowTitle, processName, url, pageUrl }, rules) {
  const browserProcesses = new Set(['chrome', 'msedge', 'opera', 'operagx', 'firefox', 'brave']);
  const normalizedProcess = normalizeAppName(processName);
  const isBrowser = browserProcesses.has(normalizedProcess);
  const pageFields = [url, pageUrl, windowTitle, app].filter(Boolean);
  const appFields = [processName, app];
  const allFields = [app, windowTitle, processName, url, pageUrl].filter(Boolean);
  const hostnames = getCandidateHostnames(pageFields);

  if (hasException(allFields, rules)) {
    return { blocked: false, blockType: 'none', matchedRule: '' };
  }

  const matchedDomain = matchesDomain(hostnames, rules.blockedDomains)
    || (isBrowser ? matchesDomainName(windowTitle || app, rules.blockedDomains) : '');
  if (matchedDomain) {
    return { blocked: true, blockType: 'page', matchedRule: `blockedDomains:${matchedDomain}` };
  }

  const matchedSuffix = matchesDomainSuffix(hostnames, rules.blockedDomainSuffixes);
  if (matchedSuffix) {
    return { blocked: true, blockType: 'page', matchedRule: `blockedDomainSuffixes:${matchedSuffix}` };
  }

  const matchedKeyword = matchesKeyword(pageFields, rules.blockedKeywords);
  if (matchedKeyword) {
    return { blocked: true, blockType: 'page', matchedRule: `blockedKeywords:${matchedKeyword}` };
  }

  if (matchesAnyRule(pageFields, rules.blockedPages)) {
    return { blocked: true, blockType: 'page', matchedRule: 'blockedPages' };
  }

  if (isBrowser && matchesAnyRule(pageFields, rules.blockedApps)) {
    return { blocked: true, blockType: 'page', matchedRule: 'blockedApps' };
  }

  if (matchesAnyRule(appFields, rules.blockedApps)) {
    return { blocked: true, blockType: 'app', matchedRule: 'blockedApps' };
  }

  return { blocked: false, blockType: 'none', matchedRule: '' };
}

function getFriendlyAppName(processName, fallbackTitle) {
  const normalizedProcess = normalizeAppName(processName);
  const knownApps = {
    chrome: 'Google Chrome',
    msedge: 'Microsoft Edge',
    opera: 'Opera',
    firefox: 'Firefox',
    winword: 'Microsoft Word',
    powerpnt: 'PowerPoint',
    excel: 'Microsoft Excel',
    notepad: 'Bloc de notas',
    code: 'Visual Studio Code',
    python: 'Python',
    acrord32: 'PDF Reader'
  };

  return knownApps[normalizedProcess] || fallbackTitle || processName || 'Sin actividad';
}

function formatSeconds(seconds) {
  const minutes = Math.max(1, Math.round(Number(seconds || 0) / 60));
  return `${minutes} min`;
}

function getOnlineReports() {
  const now = Date.now();
  return [...agentReports.values()]
    .filter(report => now - report.receivedAt <= ONLINE_WINDOW_MS)
    .sort((a, b) => a.pc.localeCompare(b.pc));
}

const offlineStore = new OfflineStore(__dirname);
const historyStore = new HistoryStore(__dirname);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    historyStore.flush();
    process.exit(0);
  });
}
process.on('exit', () => historyStore.flush());

// Historial por rango: /api/lab/history?from=AAAA-MM-DD&to=AAAA-MM-DD (por defecto hoy).
function handleHistory(request, response) {
  try {
    const params = new URL(request.url, 'http://localhost').searchParams;
    const today = dayKey();
    const from = params.get('from') || today;
    const to = params.get('to') || from;
    sendJson(response, 200, { ok: true, ...historyStore.summary(from, to) });
  } catch (error) {
    sendJson(response, 400, { ok: false, error: error.message });
  }
}

// Actividad que una PC registro mientras el servidor estaba apagado.
async function handleOfflineLog(request, response) {
  try {
    const body = await readRequestJson(request, 1_000_000);
    const agentId = String(body.agentId || '').trim().slice(0, 120);
    const pc = String(body.pc || agentId).trim().slice(0, 120);
    if (!agentId || !Array.isArray(body.entries)) {
      sendJson(response, 400, { ok: false, error: 'agentId y entries son requeridos.' });
      return;
    }
    if (body.entries.length > 1000) {
      sendJson(response, 413, { ok: false, error: 'Envia como maximo 1000 entradas por lote.' });
      return;
    }
    const result = offlineStore.ingest({
      agentId,
      pc,
      windowsUser: String(body.windowsUser || '').slice(0, 80),
      entries: body.entries
    });
    sendJson(response, 200, { ok: true, ...result });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
}

async function handleOfflineSummary(teacher, response) {
  try {
    const rules = await loadRules();
    const summary = offlineStore.summary(entry => {
      const app = getFriendlyAppName(entry.processName, entry.title).trim();
      const decision = getBlockDecision({ app, windowTitle: entry.title, processName: entry.processName }, rules);
      return { ...decision, app };
    });
    const users = await loadUsers();
    const byUsername = new Map(users.map(user => [user.username, user]));
    for (const pc of summary.pcs) {
      pc.studentNames = pc.students.map(username => {
        const user = byUsername.get(username);
        return user ? `${user.displayName} (${user.matricula || username.toUpperCase()})` : username;
      });
    }
    sendJson(response, 200, summary);
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
}

async function handleHeartbeat(request, response) {
  try {
    const body = await readRequestJson(request);
    const rules = await loadRules();
    const agentId = String(body.agentId || body.pc || '').trim();
    const pc = String(body.pc || agentId || 'PC-SIN-NOMBRE').trim();
    const session = agentSessions.get(String(body.sessionToken || ''));
    const windowTitle = String(body.app || body.windowTitle || '').trim();
    const processName = String(body.processName || windowTitle || 'Sin actividad').trim();
    const pageUrl = String(body.pageUrl || body.url || '').trim();
    const app = getFriendlyAppName(processName, windowTitle).trim();
    const blockDecision = getBlockDecision({ app, windowTitle, processName, pageUrl }, rules);
    const blocked = blockDecision.blocked;

    if (!agentId || !session || session.agentId !== agentId) {
      sendJson(response, 401, { error: 'La PC no tiene una sesión válida de LabControl.' });
      return;
    }

    // Historial: suma el tiempo de esta PC a la app que esta usando el alumno.
    const account = (await loadUsersCached()).find(user => user.username === session.username);
    const site = blockDecision.blockType === 'page' ? String(blockDecision.matchedRule || '').split(':')[1] || '' : '';
    historyStore.record({
      agentId,
      username: session.username,
      name: session.displayName,
      matricula: account?.matricula || String(session.username).toUpperCase(),
      group: account?.group || '',
      pc,
      app,
      blocked,
      site
    });

    agentReports.set(agentId, {
      agentId,
      sessionId: session.sessionToken,
      pc,
      name: session.displayName,
      username: session.username,
      app,
      windowTitle,
      pageUrl,
      processName,
      pid: body.pid || null,
      time: formatSeconds(body.activeSeconds),
      allowed: !blocked,
      status: blocked ? 'No permitido' : 'Permitido',
      receivedAt: Date.now()
    });

    sendJson(response, 200, {
      ok: true,
      blocked,
      blockEnabled: Boolean(rules.blockEnabled),
      blockType: blockDecision.blockType,
      matchedRule: blockDecision.matchedRule,
      rules: {
        reportIntervalMs: rules.reportIntervalMs,
        blockedApps: rules.blockedApps,
        blockedDomains: rules.blockedDomains,
        blockedDomainSuffixes: rules.blockedDomainSuffixes,
        blockedKeywords: rules.blockedKeywords
      }
    });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
}

async function handleAgentConfig(response) {
  try {
    const rules = await loadRules();
    sendJson(response, 200, rules);
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
}

async function handleRulesUpdate(request, response) {
  const teacher = requireTeacher(request, response);
  if (!teacher) return;
  try {
    const body = await readRequestJson(request);
    const currentRules = await loadRules();
    const nextRules = { ...currentRules };

    if (typeof body.blockEnabled === 'boolean') nextRules.blockEnabled = body.blockEnabled;
    if (Array.isArray(body.blockedApps)) nextRules.blockedApps = body.blockedApps.map(String);
    if (Array.isArray(body.blockedPages)) nextRules.blockedPages = body.blockedPages.map(String);
    if (Array.isArray(body.blockedDomains)) nextRules.blockedDomains = body.blockedDomains.map(String);
    if (Array.isArray(body.blockedDomainSuffixes)) nextRules.blockedDomainSuffixes = body.blockedDomainSuffixes.map(String);
    if (Array.isArray(body.blockedKeywords)) nextRules.blockedKeywords = body.blockedKeywords.map(String);
    if (Array.isArray(body.exceptions)) nextRules.exceptions = body.exceptions.map(String);

    if (body.addBlockedWebRule) {
      const rule = classifyWebRule(body.addBlockedWebRule);
      if (!rule?.value) {
        sendJson(response, 400, { ok: false, error: 'Escribe un dominio, sufijo o palabra para bloquear.' });
        return;
      }
      nextRules[rule.key] = [...(nextRules[rule.key] || []), rule.value];
    }

    // Quitar una regla: { removeRule: { list: 'blockedDomains', value: 'tiktok.com' } }
    if (body.removeRule) {
      const list = String(body.removeRule.list || '');
      const value = normalizeRuleValue(body.removeRule.value);
      if (!REMOVABLE_RULE_LISTS.has(list) || !value) {
        sendJson(response, 400, { ok: false, error: 'Regla no valida.' });
        return;
      }
      const before = (nextRules[list] || []).length;
      nextRules[list] = (nextRules[list] || []).filter(item => normalizeRuleValue(item) !== value);
      if (nextRules[list].length === before) {
        sendJson(response, 404, { ok: false, error: 'Esa regla ya no existe.' });
        return;
      }
    }

    const normalizedRules = normalizeRules(nextRules);
    await saveRules(normalizedRules);
    await appendAudit({
      event: 'rules-update',
      username: teacher.username,
      blockEnabled: normalizedRules.blockEnabled,
      changes: Object.keys(body),
      ...(body.addBlockedWebRule ? { added: String(body.addBlockedWebRule).slice(0, 120) } : {}),
      ...(body.removeRule ? { removed: `${body.removeRule.list}:${String(body.removeRule.value).slice(0, 120)}` } : {})
    });
    sendJson(response, 200, { ok: true, rules: normalizedRules });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
}

async function handleExceptionUpdate(request, response) {
  const teacher = requireTeacher(request, response);
  if (!teacher) return;
  try {
    const body = await readRequestJson(request);
    const exceptionName = normalizeException(body.name);
    const action = String(body.action || 'allow');
    const rules = await loadRules();

    if (!exceptionName) {
      sendJson(response, 400, { ok: false, error: 'Nombre de excepción requerido.' });
      return;
    }

    const exceptions = new Set(rules.exceptions.map(normalizeException));
    if (action === 'remove') {
      exceptions.delete(exceptionName);
    } else {
      exceptions.add(exceptionName);
    }

    rules.exceptions = [...exceptions];
    await saveRules(rules);
    await appendAudit({ event: action === 'remove' ? 'exception-remove' : 'exception-add', username: teacher.username, value: exceptionName });
    sendJson(response, 200, { ok: true, rules });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
}

function buildStatusPayload(users) {
  const byUsername = new Map(users.map(user => [user.username, user]));
  const activities = getOnlineReports().map(report => ({
    name: report.name,
    matricula: report.username ? (byUsername.get(report.username)?.matricula || report.username.toUpperCase()) : '',
    group: byUsername.get(report.username)?.group || '',
    pc: report.pc,
    sessionId: report.sessionId,
    app: report.app,
    detail: report.windowTitle && report.windowTitle !== report.app ? report.windowTitle : '',
    pageUrl: report.pageUrl || '',
    time: report.time,
    status: report.status,
    allowed: report.allowed
  }));

  const connectedPcs = new Set(activities.map(activity => activity.pc)).size;
  // Una PC en "Login pendiente" no es una alerta ni una sesion activa.
  const sessions = activities.filter(activity => activity.sessionId);
  const alerts = sessions.filter(activity => !activity.allowed).length;
  const academicUsePercent = sessions.length
    ? Math.round((sessions.length - alerts) / sessions.length * 100)
    : 0;

  return {
    updatedAt: new Date().toISOString(),
    activities,
    summary: {
      activeSessions: sessions.length,
      connectedPcs,
      alerts,
      academicUsePercent
    }
  };
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const normalizedPath = path.posix.normalize(pathname);

  if (!allowedStaticFiles.has(normalizedPath)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const filePath = path.join(labControlDir, normalizedPath);
  const extension = path.extname(filePath);

  try {
    await access(filePath);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  if (normalizedPath === '/index.html') {
    const html = await readFile(filePath, 'utf8');
    response.writeHead(200, { 'Content-Type': mimeTypes[extension] });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    response.end(html.replace('<script src="app.js"></script>', `${localBridgeScript}\n    <script src="app.js"></script>`));
    return;
  }

  response.writeHead(200, { 'Content-Type': mimeTypes[extension] || 'application/octet-stream' });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/api/teacher/login') {
    handleTeacherLogin(request, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/teacher/logout') {
    handleTeacherLogout(request, response);
    return;
  }

  if (request.method === 'GET' && request.url === '/api/lab/rules') {
    if (!requireTeacher(request, response)) return;
    handleAgentConfig(response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/lab/rules') {
    handleRulesUpdate(request, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/lab/rules/exception') {
    handleExceptionUpdate(request, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/agent/pending') {
    handleAgentPending(request, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/agent/login') {
    handleAgentLogin(request, response);
    return;
  }

  if (request.method === 'GET' && request.url === '/api/lab/status') {
    const teacher = requireTeacher(request, response);
    if (!teacher) return;
    loadUsers()
      .then(users => sendJson(response, 200, buildStatusPayload(users)))
      .catch(error => sendJson(response, 500, { ok: false, error: error.message }));
    return;
  }

  if (request.method === 'GET' && request.url.split('?')[0] === '/api/lab/history') {
    if (!requireTeacher(request, response)) return;
    handleHistory(request, response);
    return;
  }

  if (request.method === 'GET' && request.url === '/api/lab/students') {
    const teacher = requireTeacher(request, response);
    if (!teacher) return;
    handleStudentList(teacher, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/lab/students/reset') {
    const teacher = requireTeacher(request, response);
    if (!teacher) return;
    handleStudentReset(teacher, request, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/agent/set-password') {
    handleSetPassword(request, response);
    return;
  }

  if (request.method === 'GET' && request.url === '/api/agent/config') {
    handleAgentConfig(response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/agent/offline-log') {
    handleOfflineLog(request, response);
    return;
  }

  if (request.method === 'GET' && request.url === '/api/lab/offline') {
    const teacher = requireTeacher(request, response);
    if (!teacher) return;
    handleOfflineSummary(teacher, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/agent/heartbeat') {
    handleHeartbeat(request, response);
    return;
  }

  if (request.method === 'GET' || request.method === 'HEAD') {
    serveStatic(request, response).catch(error => {
      sendJson(response, 500, { error: error.message });
    });
    return;
  }

  response.writeHead(405, { Allow: 'GET, HEAD, POST' });
  response.end('Method not allowed');
});

const FALLBACK_PORT = 3100;

function startDiscovery(httpPort) {
  if (process.env.LABCONTROL_DISCOVERY === 'off') return;
  try {
    const { privateKey } = loadOrCreateKeys(defaultPaths(__dirname));
    startDiscoveryResponder({ privateKey, httpPort });
  } catch (error) {
    console.error(`Descubrimiento automatico desactivado: ${error.message}`);
  }
}

// Primera IPv4 de la red local (para mostrarla sin tener que correr ipconfig).
function lanIPv4() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

function printReady(port) {
  const tty = Boolean(process.stdout.isTTY);
  const c = tty
    ? { r: '\x1b[0m', o: '\x1b[38;5;208m', b: '\x1b[1m', g: '\x1b[90m', ok: '\x1b[38;5;41m', w: '\x1b[97m' }
    : { r: '', o: '', b: '', g: '', ok: '', w: '' };
  const suffix = port === 80 ? '' : `:${port}`;
  const ip = lanIPv4();
  const host = os.hostname().toLowerCase();
  const W = 54;
  const vis = s => [...s.replace(/\x1b\[[0-9;]*m/g, '')].length;
  const pad = s => s + ' '.repeat(Math.max(0, W - vis(s)));
  const bar = ch => ch.repeat(W + 2);
  const row = s => `${c.o}║${c.r} ${pad(s)} ${c.o}║${c.r}`;

  const out = [
    '',
    `${c.o}╔${bar('═')}╗${c.r}`,
    row(`${c.b}${c.o}▌${c.r} ${c.b}${c.w}LabControl${c.r}${c.g}  ·  Servidor del laboratorio${c.r}`),
    row(`${c.g}Colegio Ciudadano${c.r}`),
    `${c.o}╠${bar('═')}╣${c.r}`,
    row(`${c.ok}● EN LÍNEA${c.r}${c.g}    —    Puerto ${port}${c.r}`),
    row(''),
    row(`${c.g}En esta PC${c.r}     ${c.w}http://127.0.0.1${suffix}${c.r}`),
    row(`${c.g}Desde otras${c.r}    ${c.w}http://${ip || 'IP-DE-ESTA-PC'}${suffix}${c.r}`),
    row(`               ${c.w}http://${host}${suffix}${c.r}`),
    row(''),
    row(`${c.g}Entra como maestro para ver el panel.${c.r}`),
    row(`${c.g}Deja esta ventana abierta durante la clase.${c.r}`),
    `${c.o}╚${bar('═')}╝${c.r}`,
    ''
  ];
  console.log(out.join('\n'));
}

// Si el puerto pedido (por ejemplo 80) esta ocupado o no esta permitido,
// se usa el 3100 para que el laboratorio no se quede sin servidor.
server.once('error', error => {
  if (PORT !== FALLBACK_PORT && (error.code === 'EADDRINUSE' || error.code === 'EACCES')) {
    console.log(`Puerto ${PORT} ocupado; el servidor usara el ${FALLBACK_PORT}.`);
    server.listen(FALLBACK_PORT, HOST);
    return;
  }
  console.error(`No se pudo iniciar el servidor: ${error.message}`);
  process.exit(1);
});

// Un solo aviso de "listo", con el puerto que realmente quedo en uso.
server.once('listening', () => {
  const { port } = server.address();
  printReady(port);
  startDiscovery(port);
});

server.listen(PORT, HOST);
