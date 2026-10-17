import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Ventana grafica del servidor de LabControl. Reemplaza la ventana negra:
// arranca el servidor (si no hay uno ya corriendo) y muestra su estado.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.join(__dirname, '..');
let win = null;
let child = null;
let poll = null;

function lanIPv4() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

async function ping(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function startServer() {
  if (child) return;
  child = spawn(process.execPath, ['server/index.js'], {
    cwd: projectDir,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: 'ignore',
    windowsHide: true
  });
  child.on('exit', () => { child = null; });
}

async function pollStatus() {
  const data = (await ping(80)) || (await ping(3100));
  if (data) {
    win?.webContents.send('status', { online: true, ...data });
  } else {
    win?.webContents.send('status', {
      online: false,
      ip: lanIPv4(),
      hostname: os.hostname().toLowerCase()
    });
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 540,
    height: 736,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'LabControl · Servidor',
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#fff7f2',
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  win.loadFile(path.join(__dirname, 'server-ui.html'));
  win.on('closed', () => { win = null; });
}

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });
  app.whenReady().then(async () => {
    app.setAppUserModelId('com.labcontrol.servidor');
    Menu.setApplicationMenu(null);
    createWindow();
    // Si ya hay un servidor corriendo, solo lo monitorea; si no, lo arranca.
    const existing = (await ping(80)) || (await ping(3100));
    if (!existing) startServer();
    poll = setInterval(pollStatus, 2500);
    setTimeout(pollStatus, 700);
  });
}

ipcMain.on('open-panel', (_event, url) => { if (url) shell.openExternal(url); });
ipcMain.on('stop-server', () => { app.quit(); });

app.on('before-quit', () => {
  if (poll) clearInterval(poll);
  if (child) {
    try { child.kill(); } catch { /* ya terminado */ }
    child = null;
  }
});
app.on('window-all-closed', () => app.quit());
