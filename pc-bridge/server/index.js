import { createReadStream } from 'node:fs';
import { access, readFile, writeFile } from 'node:fs/promises';
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bridgeDir = path.resolve(__dirname, '..');
const labControlDir = path.resolve(bridgeDir, '..');
const rulesPath = path.join(__dirname, 'rules.json');
const usersPath = path.join(__dirname, 'users.json');

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
  '/assets/labcontrol-wordmark.png'
]);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 50_000) {
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

async function loadUsers() {
  const raw = await readFile(usersPath, 'utf8');
  return JSON.parse(raw);
}

function verifyPassword(password, user) {
  const attemptedHash = scryptSync(String(password || ''), user.passwordSalt, 32);
  const storedHash = Buffer.from(user.passwordHash, 'hex');
  if (attemptedHash.length !== storedHash.length) return false;
  return timingSafeEqual(attemptedHash, storedHash);
}


async function handleTeacherLogin(request, response) {
  try {
    const body = await readRequestJson(request);
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    const users = await loadUsers();
    const user = users.find(entry => entry.username.toLowerCase() === username);
    const allowedRoles = new Set(['teacher', 'admin']);

    if (!username || !password || !user || !allowedRoles.has(user.role) || !verifyPassword(password, user)) {
      sendJson(response, 401, {
        ok: false,
        error: 'Usuario o contraseña de maestro incorrectos.'
      });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
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

    if (!agentId || !username || !password || !user || !verifyPassword(password, user)) {
      sendJson(response, 401, {
        ok: false,
        error: 'Usuario o contraseña incorrectos.'
      });
      return;
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

    sendJson(response, 200, {
      ok: true,
      sessionToken,
      username: session.username,
      displayName: session.displayName,
      role: session.role
    });
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
    exceptions: uniqueRules(rules.exceptions)
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

function hasException(fields, rules) {
  return matchesAnyRule(fields, rules.exceptions);
}

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

  const matchedDomain = matchesDomain(hostnames, rules.blockedDomains);
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

    const normalizedRules = normalizeRules(nextRules);
    await saveRules(normalizedRules);
    sendJson(response, 200, { ok: true, rules: normalizedRules });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
}

async function handleExceptionUpdate(request, response) {
  try {
    const body = await readRequestJson(request);
    const exceptionName = String(body.name || '').trim().toLowerCase();
    const action = String(body.action || 'allow');
    const rules = await loadRules();

    if (!exceptionName) {
      sendJson(response, 400, { ok: false, error: 'Nombre de excepción requerido.' });
      return;
    }

    const exceptions = new Set(rules.exceptions.map(item => String(item).toLowerCase()));
    if (action === 'remove') {
      exceptions.delete(exceptionName);
    } else {
      exceptions.add(exceptionName);
    }

    rules.exceptions = [...exceptions];
    await saveRules(rules);
    sendJson(response, 200, { ok: true, rules });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
}

function buildStatusPayload() {
  const activities = getOnlineReports().map(report => ({
    name: report.name,
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
  const alerts = activities.filter(activity => !activity.allowed).length;
  const academicUsePercent = activities.length
    ? Math.round((activities.length - alerts) / activities.length * 100)
    : 0;

  return {
    updatedAt: new Date().toISOString(),
    activities,
    summary: {
      activeSessions: activities.length,
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

  if (request.method === 'GET' && request.url === '/api/lab/rules') {
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
    sendJson(response, 200, buildStatusPayload());
    return;
  }

  if (request.method === 'GET' && request.url === '/api/agent/config') {
    handleAgentConfig(response);
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

server.listen(PORT, HOST, () => {
  console.log(`LabControl PC Bridge listo en http://${HOST}:${PORT}`);
  console.log(`En esta Mac: http://127.0.0.1:${PORT}`);
});
