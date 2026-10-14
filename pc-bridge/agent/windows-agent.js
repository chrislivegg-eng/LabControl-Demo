import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SERVER_URL = process.env.LABCONTROL_SERVER || 'http://127.0.0.1:3100';
const AGENT_ID = process.env.LABCONTROL_AGENT_ID || os.hostname();
const ENABLE_BLOCKING = process.argv.includes('--enable-blocking');
const LOGIN_RETRY_MS = Number(process.env.LABCONTROL_LOGIN_RETRY_MS || 5000);

let reportIntervalMs = 5000;
let currentApp = '';
let appStartedAt = Date.now();
let activeSession = null;

function powershellSingleQuote(value = '') {
  return String(value).replace(/'/g, "''");
}

async function promptForCredentials(errorMessage = '') {
  if (process.env.LABCONTROL_USER && process.env.LABCONTROL_PASSWORD) {
    return {
      username: process.env.LABCONTROL_USER,
      password: process.env.LABCONTROL_PASSWORD
    };
  }

  if (process.platform !== 'win32') {
    return {
      username: process.env.LABCONTROL_USER || os.userInfo().username,
      password: process.env.LABCONTROL_PASSWORD || 'Lab2026!'
    };
  }

  const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$defaultName = $env:USERNAME
$errorMessage = '${powershellSingleQuote(errorMessage)}'

$form = New-Object System.Windows.Forms.Form
$form.Text = "LabControl - Inicio de sesión"
$form.StartPosition = "CenterScreen"
$form.Size = New-Object System.Drawing.Size(440, 380)
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true
$form.KeyPreview = $true
$form.BackColor = [System.Drawing.Color]::FromArgb(255, 247, 242)

$title = New-Object System.Windows.Forms.Label
$title.Text = "LabControl"
$title.Font = New-Object System.Drawing.Font("Segoe UI", 22, [System.Drawing.FontStyle]::Bold)
$title.ForeColor = [System.Drawing.Color]::FromArgb(234, 88, 12)
$title.Location = New-Object System.Drawing.Point(30, 24)
$title.Size = New-Object System.Drawing.Size(360, 44)
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "Inicia sesión para usar esta PC del laboratorio."
$subtitle.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(89, 79, 70)
$subtitle.Location = New-Object System.Drawing.Point(32, 74)
$subtitle.Size = New-Object System.Drawing.Size(360, 24)
$form.Controls.Add($subtitle)

$hint = New-Object System.Windows.Forms.Label
$hint.Text = "Si no puedes escribir, haz clic dentro del campo Usuario."
$hint.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$hint.ForeColor = [System.Drawing.Color]::FromArgb(120, 113, 108)
$hint.Location = New-Object System.Drawing.Point(32, 96)
$hint.Size = New-Object System.Drawing.Size(360, 18)
$form.Controls.Add($hint)

$userLabel = New-Object System.Windows.Forms.Label
$userLabel.Text = "Usuario"
$userLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$userLabel.Location = New-Object System.Drawing.Point(34, 118)
$userLabel.Size = New-Object System.Drawing.Size(120, 20)
$form.Controls.Add($userLabel)

$userBox = New-Object System.Windows.Forms.TextBox
$userBox.Text = $defaultName
$userBox.Font = New-Object System.Drawing.Font("Segoe UI", 11)
$userBox.Location = New-Object System.Drawing.Point(34, 142)
$userBox.Size = New-Object System.Drawing.Size(360, 32)
$form.Controls.Add($userBox)

$passwordLabel = New-Object System.Windows.Forms.Label
$passwordLabel.Text = "Contraseña"
$passwordLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$passwordLabel.Location = New-Object System.Drawing.Point(34, 188)
$passwordLabel.Size = New-Object System.Drawing.Size(120, 20)
$form.Controls.Add($passwordLabel)

$passwordBox = New-Object System.Windows.Forms.TextBox
$passwordBox.Font = New-Object System.Drawing.Font("Segoe UI", 11)
$passwordBox.Location = New-Object System.Drawing.Point(34, 212)
$passwordBox.Size = New-Object System.Drawing.Size(360, 32)
$passwordBox.UseSystemPasswordChar = $true
$form.Controls.Add($passwordBox)

$errorLabel = New-Object System.Windows.Forms.Label
$errorLabel.Text = $errorMessage
$errorLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$errorLabel.ForeColor = [System.Drawing.Color]::FromArgb(220, 38, 38)
$errorLabel.Location = New-Object System.Drawing.Point(34, 254)
$errorLabel.Size = New-Object System.Drawing.Size(360, 24)
$form.Controls.Add($errorLabel)

$loginButton = New-Object System.Windows.Forms.Button
$loginButton.Text = "Iniciar sesión"
$loginButton.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$loginButton.Location = New-Object System.Drawing.Point(244, 292)
$loginButton.Size = New-Object System.Drawing.Size(150, 34)
$loginButton.DialogResult = [System.Windows.Forms.DialogResult]::OK
$form.AcceptButton = $loginButton
$form.Controls.Add($loginButton)

$cancelButton = New-Object System.Windows.Forms.Button
$cancelButton.Text = "Cancelar"
$cancelButton.Location = New-Object System.Drawing.Point(132, 292)
$cancelButton.Size = New-Object System.Drawing.Size(100, 34)
$cancelButton.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$form.CancelButton = $cancelButton
$form.Controls.Add($cancelButton)

$form.Add_Shown({
  $form.Activate()
  $userBox.Select()
  $userBox.Focus()
})

$dialogResult = $form.ShowDialog()
if ($dialogResult -eq [System.Windows.Forms.DialogResult]::OK) {
  @{
    cancelled = $false
    username = $userBox.Text.Trim()
    password = $passwordBox.Text
  } | ConvertTo-Json -Compress
} else {
  @{
    cancelled = $true
  } | ConvertTo-Json -Compress
}
`;

  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    script
  ], { windowsHide: false });

  return JSON.parse(stdout.trim());
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function reportLoginPending() {
  try {
    await fetch(`${SERVER_URL}/api/agent/pending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        pc: os.hostname(),
        pid: process.pid
      })
    });
  } catch (error) {
    console.error(`No pude reportar login pendiente: ${error.message}`);
  }
}

async function loginAgent() {
  let errorMessage = '';

  while (!activeSession) {
    await reportLoginPending();
    const credentials = await promptForCredentials(errorMessage);
    if (!credentials || credentials.cancelled) {
      errorMessage = 'Debes iniciar sesión para usar esta PC.';
      console.log(`Login cancelado. Volverá a aparecer en ${LOGIN_RETRY_MS / 1000} segundos.`);
      await wait(LOGIN_RETRY_MS);
      continue;
    }

    const response = await fetch(`${SERVER_URL}/api/agent/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        pc: os.hostname(),
        username: credentials.username,
        password: credentials.password
      })
    });
    const payload = await response.json();

    if (response.ok && payload.ok) {
      activeSession = payload;
      return payload;
    }

    errorMessage = payload.error || 'Usuario o contraseña incorrectos.';
  }

  return activeSession;
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
  const response = await fetch(`${SERVER_URL}/api/agent/config`);
  if (!response.ok) throw new Error(`No pude leer configuracion: ${response.status}`);
  const config = await response.json();
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

async function blockProcess(activeWindow) {
  if (process.platform !== 'win32' || !activeWindow.pid) return;
  await execFileAsync('taskkill.exe', ['/PID', String(activeWindow.pid), '/F'], { windowsHide: true });
}

async function applyBlock(activeWindow, result) {
  if (!result.blockEnabled || !result.blocked) return;
  if (result.blockType === 'page' && isBrowserProcess(activeWindow.processName)) {
    await closeBrowserTab(activeWindow);
    return;
  }
  await blockProcess(activeWindow);
}

async function reportLoop() {
  try {
    const config = await getConfig();
    const activeWindow = await getActiveWindow();

    if (activeWindow.processName !== currentApp) {
      currentApp = activeWindow.processName;
      appStartedAt = Date.now();
    }

    const activeSeconds = Math.round((Date.now() - appStartedAt) / 1000);
    const response = await fetch(`${SERVER_URL}/api/agent/heartbeat`, {
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
    const result = await response.json();

    if (result.blockEnabled && result.blocked) {
      await applyBlock(activeWindow, result);
      console.log(result.blockType === 'page' ? `Pestaña bloqueada: ${activeWindow.app}` : `Aplicación bloqueada: ${activeWindow.processName}`);
    } else {
      console.log(`Reportado: ${activeWindow.processName || activeWindow.app} | bloqueado=${result.blocked}`);
    }
  } catch (error) {
    console.error(error.message);
  } finally {
    setTimeout(reportLoop, reportIntervalMs);
  }
}

async function main() {
  const session = await loginAgent();
  console.log(`LabControl Windows Agent conectado a ${SERVER_URL}`);
  console.log(`Sesion iniciada como: ${session.displayName}`);
  console.log(ENABLE_BLOCKING ? 'Bloqueo local habilitado por bandera.' : 'Modo reporte: no se cerraran aplicaciones.');
  reportLoop();
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
