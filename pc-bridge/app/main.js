import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Tray } from 'electron';
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { loadAgentConfig } from '../agent/config.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENT_CONFIG = loadAgentConfig();
const SERVER_URL = AGENT_CONFIG.serverUrl;
const AGENT_ID = process.env.LABCONTROL_AGENT_ID || os.hostname();
const LOGIN_RETRY_MS = Number(process.env.LABCONTROL_LOGIN_RETRY_MS || 5000);
const ENABLE_BLOCKING = process.argv.includes('--enable-blocking');

let mainWindow;
let tray;
let activeSession = null;
let reportIntervalMs = 5000;
let currentProcess = '';
let appStartedAt = Date.now();
let reportTimer = null;
let pendingTimer = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 460,
    height: 620,
    resizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    title: 'LabControl Agent',
    backgroundColor: '#fff7f2',
    alwaysOnTop: !activeSession,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer.html'));

  mainWindow.on('close', event => {
    if (!app.isQuiting) {
      event.preventDefault();
      if (activeSession) {
        mainWindow.hide();
        return;
      }
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('login-required', 'Debes iniciar sesión para usar esta PC.');
    }
  });
}

function createTray() {
  const trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFElEQVR4AWP4z8Dwn4ECwESJ5lEDACu9AhG4oc3FAAAAAElFTkSuQmCC');
  tray = new Tray(trayIcon);
  const menuItems = [{ label: 'Mostrar LabControl', click: () => showLoginWindow() }];
  // En la app instalada el alumno no puede cerrar el agente desde la bandeja.
  if (!app.isPackaged) {
    menuItems.push({ type: 'separator' }, { label: 'Salir (solo desarrollo)', click: () => { app.isQuiting = true; app.quit(); } });
  }
  const contextMenu = Menu.buildFromTemplate(menuItems);
  tray.setToolTip('LabControl Agent');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => showLoginWindow());
}

function showLoginWindow() {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
  mainWindow.setAlwaysOnTop(!activeSession);
}

async function fetchJson(pathname, options = {}) {
  const response = await fetch(`${SERVER_URL}${pathname}`, { ...options, signal: AbortSignal.timeout(8000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

// Si el servidor se reinicio, la sesion ya no existe: se pide login otra vez.
function requireLoginAgain(message) {
  activeSession = null;
  if (reportTimer) clearTimeout(reportTimer);
  reportTimer = null;
  showLoginWindow();
  mainWindow?.webContents.send('login-required', message);
  startPendingLoop();
}

async function reportLoginPending() {
  try {
    await fetchJson('/api/agent/pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        pc: os.hostname(),
        pid: process.pid
      })
    });
  } catch (error) {
    mainWindow?.webContents.send('agent-status', `Sin conexión con servidor: ${error.message}`);
  }
}

function startPendingLoop() {
  if (pendingTimer) return;
  reportLoginPending();
  pendingTimer = setInterval(() => {
    if (!activeSession) {
      reportLoginPending();
      showLoginWindow();
    }
  }, LOGIN_RETRY_MS);
}

function stopPendingLoop() {
  if (pendingTimer) clearInterval(pendingTimer);
  pendingTimer = null;
}

async function getActiveWindow() {
  if (process.platform !== 'win32') {
    return {
      app: 'Demo local',
      processName: 'demo',
      pid: process.pid
    };
  }

  const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@
$hwnd = [Win32]::GetForegroundWindow()
$processId = 0
[Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
$p = Get-Process -Id $processId
@{
  processName = $p.ProcessName
  pid = $p.Id
  title = $p.MainWindowTitle
} | ConvertTo-Json -Compress
`;

  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    script
  ], { windowsHide: true });

  const windowInfo = JSON.parse(stdout.trim());
  return {
    app: windowInfo.title || windowInfo.processName || 'Sin titulo',
    processName: windowInfo.processName,
    pid: Number(windowInfo.pid)
  };
}

async function getConfig() {
  const config = await fetchJson('/api/agent/config');
  reportIntervalMs = Number(config.reportIntervalMs || reportIntervalMs);
  return config;
}

function normalizeAppName(name = '') {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isBrowserProcess(processName = '') {
  return ['chrome', 'msedge', 'opera', 'operagx', 'firefox', 'brave'].includes(normalizeAppName(processName));
}

async function closeBrowserTab(activeWindow) {
  if (process.platform !== 'win32' || !activeWindow.pid) return;
  const script = `
Add-Type -AssemblyName Microsoft.VisualBasic
Add-Type -AssemblyName System.Windows.Forms
[Microsoft.VisualBasic.Interaction]::AppActivate([int]${activeWindow.pid}) | Out-Null
Start-Sleep -Milliseconds 180
[System.Windows.Forms.SendKeys]::SendWait('^w')
`;
  await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    script
  ], { windowsHide: true });
}

// Procesos que nunca se cierran aunque coincidan con una regla.
const PROTECTED_PROCESSES = new Set([
  'explorer', 'system', 'svchost', 'winlogon', 'csrss', 'lsass', 'services', 'dwm',
  'taskmgr', 'labcontrolagent', 'electron', 'powershell', 'conhost'
]);

async function blockProcess(activeWindow) {
  if (process.platform !== 'win32' || !activeWindow.pid) return;
  if (activeWindow.pid === process.pid) return;
  if (PROTECTED_PROCESSES.has(normalizeAppName(activeWindow.processName))) return;
  await execFileAsync('taskkill.exe', ['/PID', String(activeWindow.pid), '/F'], { windowsHide: true });
}

async function applyBlock(activeWindow, result) {
  if (!result.blockEnabled || !result.blocked) return;
  // En un navegador solo se cierra la pestana, nunca el navegador completo.
  if (isBrowserProcess(activeWindow.processName)) {
    await closeBrowserTab(activeWindow);
    return;
  }
  await blockProcess(activeWindow);
}

async function reportLoop() {
  if (!activeSession) return;

  try {
    const config = await getConfig();
    const activeWindow = await getActiveWindow();

    if (activeWindow.processName !== currentProcess) {
      currentProcess = activeWindow.processName;
      appStartedAt = Date.now();
    }

    const activeSeconds = Math.round((Date.now() - appStartedAt) / 1000);
    const result = await fetchJson('/api/agent/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        sessionToken: activeSession.sessionToken,
        pc: os.hostname(),
        app: activeWindow.app,
        processName: activeWindow.processName,
        pid: activeWindow.pid,
        activeSeconds
      })
    });

    await applyBlock(activeWindow, result);

    mainWindow?.webContents.send('agent-status', `Reportando: ${activeWindow.processName || activeWindow.app} · bloqueado=${result.blocked}`);
  } catch (error) {
    if (error.status === 401) {
      requireLoginAgain('La sesión terminó. Vuelve a iniciar sesión.');
      return;
    }
    mainWindow?.webContents.send('agent-status', error.message);
  }
  if (activeSession) reportTimer = setTimeout(reportLoop, reportIntervalMs);
}

function startReporting() {
  if (reportTimer) clearTimeout(reportTimer);
  reportLoop();
}

ipcMain.handle('agent:get-context', () => ({
  serverUrl: SERVER_URL,
  pc: os.hostname(),
  agentId: AGENT_ID,
  loggedIn: Boolean(activeSession),
  displayName: activeSession?.displayName || ''
}));

ipcMain.handle('agent:login', async (_event, credentials) => {
  const username = String(credentials?.username || '').trim();
  const password = String(credentials?.password || '');

  if (!username || !password) {
    throw new Error('Escribe usuario y contraseña.');
  }

  const payload = await fetchJson('/api/agent/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: AGENT_ID,
      pc: os.hostname(),
      username,
      password
    })
  });

  activeSession = payload;
  stopPendingLoop();
  mainWindow.setAlwaysOnTop(false);
  mainWindow.webContents.send('login-success', payload);
  startReporting();
  setTimeout(() => mainWindow.hide(), 1200);
  return payload;
});

// Solo una copia del agente por PC.
const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => showLoginWindow());
}

app.whenReady().then(() => {
  if (!hasInstanceLock) return;
  Menu.setApplicationMenu(null);
  createWindow();
  createTray();
  startPendingLoop();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  showLoginWindow();
});

app.on('window-all-closed', event => {
  event?.preventDefault?.();
});

app.on('before-quit', () => {
  app.isQuiting = true;
  if (reportTimer) clearTimeout(reportTimer);
  if (pendingTimer) clearInterval(pendingTimer);
});

process.on('uncaughtException', error => {
  dialog.showErrorBox('LabControl Agent', error.message);
});
