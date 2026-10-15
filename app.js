let activities = [
  { name: 'Ana Lopez', pc: 'PC-LAB-07', app: 'Microsoft Word', time: '32 min', status: 'Permitido', allowed: true },
  { name: 'Carlos Ruiz', pc: 'PC-LAB-12', app: 'Google Chrome', time: '21 min', status: 'Permitido', allowed: true },
  { name: 'Sofia Torres', pc: 'PC-LAB-03', app: 'Minecraft', time: '7 min', status: 'No permitido', allowed: false },
  { name: 'Diego Martinez', pc: 'PC-LAB-18', app: 'PowerPoint', time: '16 min', status: 'Permitido', allowed: true },
  { name: 'Mia Garcia', pc: 'PC-LAB-02', app: 'Google Chrome', time: '45 min', status: 'Permitido', allowed: true },
  { name: 'Luis Herrera', pc: 'PC-LAB-14', app: 'Visual Studio', time: '50 min', status: 'Permitido', allowed: true },
  { name: 'Valentina Gomez', pc: 'PC-LAB-05', app: 'YouTube', time: '12 min', status: 'No permitido', allowed: false },
  { name: 'Mateo Silva', pc: 'PC-LAB-09', app: 'Microsoft Word', time: '28 min', status: 'Permitido', allowed: true },
  { name: 'Camila Rojas', pc: 'PC-LAB-11', app: 'PDF Reader', time: '15 min', status: 'Permitido', allowed: true },
  { name: 'Lucas Morales', pc: 'PC-LAB-04', app: 'Python IDLE', time: '35 min', status: 'Permitido', allowed: true }
];

let students = [ 
  ['Ana Lopez', 'PC-LAB-07 · Sesion activa'], 
  ['Carlos Ruiz', 'PC-LAB-12 · Sesion activa'], 
  ['Sofia Torres', 'PC-LAB-03 · Alerta pendiente'], 
  ['Diego Martinez', 'PC-LAB-18 · Sesion activa'], 
  ['Mia Garcia', 'PC-LAB-02 · Sesion activa'], 
  ['Luis Herrera', 'PC-LAB-14 · Sesion activa'],
  ['Valentina Gomez', 'PC-LAB-05 · Alerta pendiente'],
  ['Mateo Silva', 'PC-LAB-09 · Sesion activa'],
  ['Camila Rojas', 'PC-LAB-11 · Sesion activa'],
  ['Lucas Morales', 'PC-LAB-04 · Sesion activa']
];

// Actualizar la fecha del dashboard sin el día de la semana
const dateElement = document.querySelector('#current-date');
if (dateElement) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-ES', options);
  dateElement.textContent = `Hoy, ${formattedDate}`;
}

// Función para generar filas de una lista dada
function renderActivityRows(list) {
  return list.map(item => {
    const badgeColor = item.allowed 
      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
      : 'bg-red-50 text-red-600 border-red-100';
    const iconState = item.allowed ? '✓' : '⚠️';
    const pageDetail = item.detail || 'Sin página detectada';

    return `
      <tr class="hover:bg-gray-50/50 transition">
          <td class="py-3.5 px-2 font-medium text-gray-900">${escapeHtml(item.name)}${item.matricula ? `<span class="student-id">${escapeHtml([item.matricula, item.group].filter(Boolean).join(' · '))}</span>` : ''}</td>
          <td class="py-3.5 px-2 text-gray-500">${escapeHtml(item.pc)}</td>
          <td class="py-3.5 px-2 text-gray-800">
              <span class="activity-app">${escapeHtml(item.app)}</span>
          </td>
          <td class="py-3.5 px-2 text-gray-600">
              <span class="activity-detail">${escapeHtml(pageDetail)}</span>
          </td>
          <td class="py-3.5 px-2 text-gray-600">${item.time}</td>
          <td class="py-3.5 px-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeColor}">
                  <span>${iconState}</span> ${item.status}
              </span>
          </td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));
}

function renderStudentsList(list) {
  const studentsList = document.querySelector('#students-list');
  if (!studentsList) return;
  studentsList.innerHTML = list.map(([name, detail]) => {
  const initials = escapeHtml(name.split(' ').map(n => n[0]).join('').slice(0, 2));
  const isAlert = detail.includes('Alerta');
  const badgeClass = isAlert 
    ? 'bg-red-50 text-red-600 border-red-100' 
    : 'bg-emerald-50 text-emerald-600 border-emerald-100';

  return `
    <div class="bg-gray-50/80 border border-gray-100 hover:border-orange-200 p-5 rounded-2xl flex items-start gap-4 transition group">
      <div class="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-600 font-bold flex items-center justify-center shrink-0 group-hover:bg-orange-500 group-hover:text-white transition">
        ${initials}
      </div>
      <div class="min-w-0 flex-1">
        <h4 class="text-sm font-bold text-gray-900 truncate">${escapeHtml(name)}</h4>
        <p class="text-xs text-gray-500 mt-0.5 mb-3">${escapeHtml(detail.split('·')[0].trim())}</p>
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass}">
          ${detail.split('·')[1] || 'Sesión activa'}
        </span>
      </div>
    </div>
  `;
  }).join('');
}

function renderLabData(list, summary = {}) {
  const activityBody = document.querySelector('#activity-body');
  const activityFullBody = document.querySelector('#activity-full-body');
  const metricSessions = document.querySelector('#metric-sessions');
  const metricPcs = document.querySelector('#metric-pcs');
  const metricAlerts = document.querySelector('#metric-alerts');
  const metricAcademic = document.querySelector('#metric-academic');

  activities = list;
  students = list.map(item => [
    item.name,
    `${item.pc} · ${item.allowed ? 'Sesion activa' : 'Alerta pendiente'}`
  ]);

  if (activityBody) activityBody.innerHTML = renderActivityRows(list.slice(0, 4));
  if (activityFullBody) activityFullBody.innerHTML = renderActivityRows(list);
  renderStudentsList(students);

  const sessions = list.filter(item => item.sessionId !== null);
  const alertCount = sessions.filter(item => !item.allowed).length;
  const academicPercent = sessions.length ? Math.round((sessions.length - alertCount) / sessions.length * 100) : 0;

  if (metricSessions) metricSessions.textContent = summary.activeSessions ?? sessions.length;
  if (metricPcs) metricPcs.textContent = summary.connectedPcs ?? new Set(list.map(item => item.pc)).size;
  if (metricAlerts) metricAlerts.textContent = summary.alerts ?? alertCount;
  if (metricAcademic) metricAcademic.textContent = `${summary.academicUsePercent ?? academicPercent}%`;
}

renderLabData(activities);

// 2. GRÁFICA DE CHART.JS CON EL EJE DE MINUTOS
const contenedorBarras = document.querySelector('#app-bars');
contenedorBarras.innerHTML = '<canvas id="graficaUso"></canvas>';
const ctxGrafica = document.getElementById('graficaUso').getContext('2d');

const usageChart = new Chart(ctxGrafica, {
    type: 'bar',
    data: {
        labels: ["Google Chrome", "Microsoft Word", "PowerPoint", "YouTube", "Minecraft", "PDF Reader"],
        datasets: [{
            data: [52, 41, 27, 18, 12, 9],
            backgroundColor: '#f97316',
            borderRadius: 6,
            barThickness: 26
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { left: 10, right: 15, top: 10, bottom: 0 } },
        plugins: { legend: { display: false } },
        scales: {
            y: { 
                beginAtZero: true, 
                grid: { color: '#f3f4f6' },
                ticks: { font: { size: 11 } },
                title: {
                    display: true,
                    text: 'Minutos',
                    color: '#6b7280',
                    font: { size: 12, weight: 'bold' }
                }
            },
            x: { 
                grid: { display: false },
                ticks: { font: { size: 11 } }
            }
        }
    }
});

function updateUsageChart(list) {
  if (!usageChart) return;
  const minutesByApp = list.reduce((accumulator, item) => {
    const minutes = Number.parseInt(item.time, 10) || 0;
    accumulator[item.app] = (accumulator[item.app] || 0) + minutes;
    return accumulator;
  }, {});
  usageChart.data.labels = Object.keys(minutesByApp);
  usageChart.data.datasets[0].data = Object.values(minutesByApp);
  usageChart.update();
}

const AGENT_API_URL = window.LABCONTROL_AGENT_API_URL || '';
const RULES_API_URL = AGENT_API_URL ? '/api/lab/rules' : '';
const RULES_EXCEPTION_API_URL = AGENT_API_URL ? '/api/lab/rules/exception' : '';
const TEACHER_LOGIN_API_URL = AGENT_API_URL ? '/api/teacher/login' : '';
let activeTeacher = null;
// Con el servidor del laboratorio el panel no es una demo: se ajustan los textos
// y se oculta el reporte por alumno de ejemplo (sus datos son inventados).
if (AGENT_API_URL) {
  const demoReport = document.querySelector('#report-page > article');
  if (demoReport) demoReport.hidden = true;
  document.title = 'LabControl';
  const eyebrow = document.querySelector('#topbar-eyebrow');
  if (eyebrow) eyebrow.textContent = 'COLEGIO CIUDADANO · LABORATORIO';
  const loginNote = document.querySelector('#login-message');
  if (loginNote) loginNote.textContent = 'LabControl no registra contraseñas, mensajes ni teclas.';
}

// El token vive solo en memoria: al recargar la pagina hay que volver a entrar.
let teacherToken = '';

function setTeacherToken(token) {
  teacherToken = token || '';
}

// Llamadas al servidor local con la sesion del maestro.
async function teacherFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (teacherToken) headers.Authorization = `Bearer ${teacherToken}`;
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 && activeTeacher) {
    endTeacherSession('Tu sesión expiró. Vuelve a iniciar sesión.');
  }
  return response;
}

const agentStatus = document.querySelector('#agent-status');
const notifiedAlertKeys = new Set();
let browserNotificationsEnabled = window.localStorage.getItem('labcontrol-browser-notifications') === 'enabled' && 'Notification' in window && Notification.permission === 'granted';

async function refreshAgentData() {
  if (!AGENT_API_URL || !teacherToken) return;

  try {
    const response = await teacherFetch(AGENT_API_URL);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No fue posible leer los equipos.');
    if (Array.isArray(payload.activities)) {
      renderLabData(payload.activities, payload.summary || {});
      if (rosterStudents.length) renderRoster();
      updateUsageChart(payload.activities);
      notifyNewAlerts(payload.activities);
    }
    if (agentStatus) {
      agentStatus.textContent = `En vivo · ${payload.summary?.connectedPcs ?? 0} PCs`;
      agentStatus.classList.add('online');
    }
  } catch (error) {
    if (agentStatus) {
      agentStatus.textContent = 'Servidor local sin datos';
      agentStatus.classList.remove('online');
    }
  }
}

if (AGENT_API_URL) {
  window.setInterval(refreshAgentData, 5000);
}

const ruleBlockEnabled = document.querySelector('#rule-block-enabled');
const ruleBlockLabel = document.querySelector('#rule-block-label');
const blockedList = document.querySelector('#blocked-list');
const blockedWebList = document.querySelector('#blocked-web-list');
const exceptionsList = document.querySelector('#exceptions-list');
const rulesMessage = document.querySelector('#rules-message');
const webRuleForm = document.querySelector('#web-rule-form');
const webRuleInput = document.querySelector('#web-rule-input');

function formatRuleList(list = []) {
  return list.length ? list.map(item => item.charAt(0).toUpperCase() + item.slice(1)).join(', ') : 'Ninguna regla configurada.';
}

function formatWebRuleList(rules = {}) {
  const groups = [
    ['Dominios', rules.blockedDomains || []],
    ['Sufijos', rules.blockedDomainSuffixes || []],
    ['Palabras', rules.blockedKeywords || []]
  ].filter(([, list]) => list.length);

  if (!groups.length) return 'Ninguna regla web configurada.';

  return groups
    .map(([label, list]) => `${label}: ${list.join(', ')}`)
    .join(' · ');
}

function renderRulesPanel(rules) {
  if (!ruleBlockEnabled) return;
  ruleBlockEnabled.checked = Boolean(rules.blockEnabled);
  if (ruleBlockLabel) ruleBlockLabel.textContent = rules.blockEnabled ? 'Bloqueo activo' : 'Solo alertas';
  if (blockedList) blockedList.textContent = formatRuleList([...(rules.blockedApps || []), ...(rules.blockedPages || [])]);
  if (blockedWebList) blockedWebList.textContent = formatWebRuleList(rules);
  if (exceptionsList) exceptionsList.textContent = formatRuleList(rules.exceptions || []).replace('Ninguna regla configurada.', 'Sin excepciones por ahora.');
}

async function loadRulesPanel() {
  if (!RULES_API_URL || !ruleBlockEnabled || !teacherToken) return;
  try {
    const response = await teacherFetch(RULES_API_URL);
    const rules = await response.json();
    if (!response.ok) throw new Error(rules.error || 'No fue posible leer reglas.');
    renderRulesPanel(rules);
  } catch (error) {
    if (rulesMessage) rulesMessage.textContent = error.message;
  }
}

async function saveRulesPatch(patch) {
  const response = await teacherFetch(RULES_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'No fue posible guardar reglas.');
  renderRulesPanel(payload.rules);
  if (rulesMessage) rulesMessage.textContent = 'Reglas actualizadas para la siguiente lectura de los agentes.';
}

ruleBlockEnabled?.addEventListener('change', () => {
  saveRulesPatch({ blockEnabled: ruleBlockEnabled.checked }).catch(error => {
    if (rulesMessage) rulesMessage.textContent = error.message;
    ruleBlockEnabled.checked = !ruleBlockEnabled.checked;
  });
});

webRuleForm?.addEventListener('submit', event => {
  event.preventDefault();
  const value = webRuleInput?.value.trim();

  if (!value) {
    if (rulesMessage) rulesMessage.textContent = 'Escribe una página, dominio, sufijo o palabra para bloquear.';
    return;
  }

  saveRulesPatch({ addBlockedWebRule: value })
    .then(() => {
      if (webRuleInput) webRuleInput.value = '';
      if (rulesMessage) rulesMessage.textContent = `${value} quedó guardado como regla web prohibida.`;
    })
    .catch(error => {
      if (rulesMessage) rulesMessage.textContent = error.message;
    });
});

document.querySelectorAll('[data-exception-action]').forEach(button => {
  button.addEventListener('click', async () => {
    try {
      const response = await teacherFetch(RULES_EXCEPTION_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: button.dataset.exception,
          action: button.dataset.exceptionAction
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No fue posible cambiar la excepción.');
      renderRulesPanel(payload.rules);
      if (rulesMessage) {
        rulesMessage.textContent = button.dataset.exceptionAction === 'allow'
          ? 'YouTube permitido por excepción para esta clase.'
          : 'YouTube vuelve a estar sujeto a las reglas del laboratorio.';
      }
    } catch (error) {
      if (rulesMessage) rulesMessage.textContent = error.message;
    }
  });
});


function getAlertKey(item) {
  return [item.pc, item.app, item.detail || '', item.status].join('|');
}

function buildAlertMessage(item) {
  const page = item.detail ? ` · ${item.detail}` : '';
  return `${item.name} en ${item.pc}: ${item.app}${page}`;
}

function sendBrowserAlert(item) {
  if (!browserNotificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;

  const notification = new Notification('Alerta de LabControl', {
    body: buildAlertMessage(item),
    tag: getAlertKey(item),
    renotify: false
  });

  notification.onclick = () => {
    window.focus();
    openView('activity');
    notification.close();
  };
}

function notifyNewAlerts(list = []) {
  list.filter(item => !item.allowed).forEach(item => {
    const key = getAlertKey(item);
    if (notifiedAlertKeys.has(key)) return;

    notifiedAlertKeys.add(key);
    showLabToast({
      title: item.status === 'Requiere login' ? 'Login pendiente' : 'Alerta detectada',
      message: buildAlertMessage(item),
      type: 'warning'
    });
    sendBrowserAlert(item);
  });
}

function getNotificationHelpMessage() {
  if (!('Notification' in window)) return 'Este navegador no soporta notificaciones del sistema.';
  if (Notification.permission === 'denied') {
    return 'Las notificaciones están bloqueadas por el navegador. Abre el candado/controles del sitio junto a la URL, cambia Notificaciones a Permitir y recarga la página.';
  }
  if (!window.isSecureContext) {
    return 'El navegador puede bloquear notificaciones en esta IP. Si no aparece el permiso, usa localhost en la misma PC o una URL con HTTPS.';
  }
  return 'Presiona Activar notificaciones para permitir alertas del sistema.';
}

function updateNotificationButtonState() {
  const button = document.querySelector('#enable-browser-notifications');
  const testButton = document.querySelector('#test-browser-notification');
  if (!button) return;

  if (!('Notification' in window)) {
    button.textContent = 'No soportadas';
    button.disabled = true;
    if (testButton) testButton.disabled = true;
    return;
  }

  if (Notification.permission === 'granted') {
    browserNotificationsEnabled = true;
    window.localStorage.setItem('labcontrol-browser-notifications', 'enabled');
    button.textContent = 'Notificaciones activas';
    button.classList.remove('blocked');
    if (testButton) testButton.disabled = false;
    return;
  }

  browserNotificationsEnabled = false;
  window.localStorage.removeItem('labcontrol-browser-notifications');
  if (Notification.permission === 'denied') {
    button.textContent = 'Bloqueadas por navegador';
    button.classList.add('blocked');
    if (testButton) testButton.disabled = true;
  } else {
    button.textContent = 'Activar notificaciones';
    button.classList.remove('blocked');
    if (testButton) testButton.disabled = false;
  }
}

async function requestBrowserNotifications() {
  if (!('Notification' in window)) {
    if (rulesMessage) rulesMessage.textContent = getNotificationHelpMessage();
    return;
  }

  if (Notification.permission === 'denied') {
    const help = getNotificationHelpMessage();
    if (rulesMessage) rulesMessage.textContent = help;
    showLabToast({ title: 'Notificaciones bloqueadas', message: help, type: 'warning' });
    updateNotificationButtonState();
    return;
  }

  const permission = await Notification.requestPermission();
  browserNotificationsEnabled = permission === 'granted';
  updateNotificationButtonState();

  if (browserNotificationsEnabled) {
    showLabToast({
      title: 'Notificaciones activadas',
      message: 'Las alertas nuevas también aparecerán como notificación del navegador.'
    });
  } else {
    const help = getNotificationHelpMessage();
    if (rulesMessage) rulesMessage.textContent = help;
    showLabToast({ title: 'No se activaron', message: help, type: 'warning' });
  }
}

function testBrowserNotification() {
  if (!browserNotificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') {
    const help = getNotificationHelpMessage();
    if (rulesMessage) rulesMessage.textContent = help;
    showLabToast({ title: 'Notificación no disponible', message: help, type: 'warning' });
    updateNotificationButtonState();
    return;
  }

  new Notification('LabControl funcionando', {
    body: 'Las alertas del laboratorio ya pueden salir como notificación del navegador.',
    tag: 'labcontrol-test-notification'
  });
}

const enableBrowserNotificationsButton = document.querySelector('#enable-browser-notifications');
if (enableBrowserNotificationsButton) {
  updateNotificationButtonState();
  enableBrowserNotificationsButton.addEventListener('click', () => {
    requestBrowserNotifications().catch(error => {
      if (rulesMessage) rulesMessage.textContent = error.message;
    });
  });
}

const testBrowserNotificationButton = document.querySelector('#test-browser-notification');
testBrowserNotificationButton?.addEventListener('click', testBrowserNotification);

loadRulesPanel();


// 3. NAVEGACIÓN Y ACCIONES DEL SISTEMA
const titles = { 
  dashboard: 'Resumen del laboratorio', 
  activity: 'Sesiones del laboratorio', 
  report: 'Reportes del Colegio Ciudadano', 
  students: 'Usuarios registrados',
  settings: 'Configuración del sistema' 
};
// --- Reporte de actividad sin conexion ---
const OFFLINE_API_URL = AGENT_API_URL ? '/api/lab/offline' : '';
const offlineReport = document.querySelector('#offline-report');
const offlineReportBody = document.querySelector('#offline-report-body');

function formatClock(ms) {
  return new Date(ms).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function renderOfflineReport({ pcs = [] }) {
  if (!offlineReportBody) return;
  if (!pcs.length) {
    offlineReportBody.innerHTML = '<p class="text-gray-400">Sin actividad sin conexión en los últimos 7 días.</p>';
    return;
  }
  offlineReportBody.innerHTML = pcs.map(pc => {
    const studentLabels = pc.studentNames || pc.students;
    const who = [...studentLabels, ...pc.windowsUsers.map(user => `Windows: ${user}`)].filter(Boolean).join(', ') || 'Usuario desconocido';
    const integrity = pc.integrityIssues
      ? `<span class="inline-block bg-red-50 text-red-700 border border-red-100 rounded-lg px-2 py-0.5 text-xs font-semibold">${pc.integrityIssues} con posible alteración</span>`
      : '<span class="inline-block bg-green-50 text-green-700 border border-green-100 rounded-lg px-2 py-0.5 text-xs font-semibold">Registro íntegro</span>';
    const alerts = pc.alerts
      ? `<span class="inline-block bg-orange-50 text-orange-700 border border-orange-100 rounded-lg px-2 py-0.5 text-xs font-semibold">${pc.alerts} no permitidas</span>`
      : '';
    const rows = pc.entries.map(entry => `
      <tr class="${entry.allowed ? '' : 'bg-orange-50/50'}">
        <td class="py-2 px-2 whitespace-nowrap">${escapeHtml(formatClock(entry.start))}</td>
        <td class="py-2 px-2">${escapeHtml(entry.app)}</td>
        <td class="py-2 px-2 text-gray-500">${escapeHtml(entry.title)}</td>
        <td class="py-2 px-2 whitespace-nowrap">${escapeHtml(formatDuration((entry.end - entry.start) / 1000))}</td>
        <td class="py-2 px-2 whitespace-nowrap">${entry.allowed ? 'Permitido' : '<strong class="text-orange-700">No permitido</strong>'}${entry.flags.length ? `<br><span class="text-xs text-red-600">${escapeHtml(entry.flags.join(', '))}</span>` : ''}</td>
      </tr>`).join('');
    return `
      <section class="border border-gray-100 rounded-2xl p-5">
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <strong class="text-base text-gray-900">${escapeHtml(pc.pc)}</strong>
          <span class="text-gray-500">· ${escapeHtml(who)}</span>
          <span class="text-gray-500">· ${escapeHtml(formatClock(pc.from))} a ${escapeHtml(formatClock(pc.to))}</span>
          <span class="text-gray-500">· ${escapeHtml(formatDuration(pc.totalSeconds))}</span>
          ${alerts} ${integrity}
        </div>
        <div class="table-wrap overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead><tr class="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <th class="pb-2 px-2">Hora</th><th class="pb-2 px-2">Aplicación</th><th class="pb-2 px-2">Ventana</th><th class="pb-2 px-2">Duración</th><th class="pb-2 px-2">Estado</th>
            </tr></thead>
            <tbody class="divide-y divide-gray-50">${rows}</tbody>
          </table>
        </div>
      </section>`;
  }).join('');
}

async function loadOfflineReport() {
  if (!OFFLINE_API_URL || !teacherToken || !offlineReport) return;
  offlineReport.classList.remove('hidden');
  try {
    const response = await teacherFetch(OFFLINE_API_URL);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No fue posible leer la actividad sin conexión.');
    renderOfflineReport(payload);
  } catch (error) {
    if (offlineReportBody) offlineReportBody.innerHTML = `<p class="text-red-600">${escapeHtml(error.message)}</p>`;
  }
}

document.querySelector('#offline-refresh')?.addEventListener('click', loadOfflineReport);

// --- Alumnos registrados (con el servidor del laboratorio) ---
const roster = document.querySelector('#roster');
const rosterBody = document.querySelector('#roster-body');
const rosterSearch = document.querySelector('#roster-search');
const rosterCount = document.querySelector('#roster-count');
const rosterCode = document.querySelector('#roster-code');
let rosterStudents = [];

const ACCOUNT_LABELS = {
  activo: ['Activa', 'bg-emerald-50 text-emerald-600 border-emerald-100'],
  pendiente: ['Sin activar', 'bg-amber-50 text-amber-700 border-amber-100'],
  'codigo vencido': ['Código vencido', 'bg-red-50 text-red-600 border-red-100']
};

function plainText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function renderRoster() {
  if (!rosterBody) return;
  const query = plainText(rosterSearch?.value);
  const live = new Map(activities.filter(item => item.matricula).map(item => [item.matricula, item]));
  const list = rosterStudents.filter(student => !query
    || plainText(`${student.name} ${student.matricula} ${student.group}`).includes(query));

  if (rosterCount) {
    rosterCount.textContent = `${list.length} ${list.length === 1 ? 'alumno' : 'alumnos'}`;
  }
  if (!list.length) {
    rosterBody.innerHTML = `<tr><td colspan="5" class="py-6 px-2 text-gray-400">${rosterStudents.length ? 'Ningún alumno coincide con la búsqueda.' : 'Todavía no hay alumnos. El coordinador los importa con npm run alumnos.'}</td></tr>`;
    return;
  }
  rosterBody.innerHTML = list.map(student => {
    const [label, chip] = ACCOUNT_LABELS[student.status] || ACCOUNT_LABELS.activo;
    const now = live.get(student.matricula);
    return `
      <tr>
        <td class="py-3 px-2"><span class="font-medium text-gray-900">${escapeHtml(student.name)}</span><span class="student-id">${escapeHtml(student.matricula)}</span></td>
        <td class="py-3 px-2 text-gray-600">${escapeHtml(student.group || '—')}</td>
        <td class="py-3 px-2 text-gray-600">${now ? `${escapeHtml(now.pc)} · ${escapeHtml(now.app)}` : '<span class="text-gray-400">Sin conexión</span>'}</td>
        <td class="py-3 px-2"><span class="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${chip}">${label}</span></td>
        <td class="py-3 px-2 text-right"><button type="button" class="roster-reset" data-reset="${escapeHtml(student.username)}" data-name="${escapeHtml(student.name)}">Restablecer</button></td>
      </tr>`;
  }).join('');
}

async function loadRoster() {
  if (!AGENT_API_URL || !teacherToken || !roster) return;
  roster.hidden = false;
  const demoCards = document.querySelector('#students-list')?.closest('article');
  if (demoCards) demoCards.hidden = true;
  try {
    const response = await teacherFetch('/api/lab/students');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudo leer la lista de alumnos.');
    rosterStudents = payload.students || [];
    renderRoster();
  } catch (error) {
    if (rosterBody) rosterBody.innerHTML = `<tr><td colspan="5" class="py-6 px-2 text-red-600">${escapeHtml(error.message)}</td></tr>`;
  }
}

rosterSearch?.addEventListener('input', renderRoster);

// Restablecer: el primer clic pide confirmar; el segundo genera el codigo nuevo.
rosterBody?.addEventListener('click', async event => {
  const button = event.target.closest('[data-reset]');
  if (!button) return;
  if (button.dataset.confirm !== 'yes') {
    button.dataset.confirm = 'yes';
    button.textContent = '¿Confirmar?';
    button.classList.add('confirming');
    window.setTimeout(() => {
      if (!button.isConnected) return;
      button.dataset.confirm = '';
      button.textContent = 'Restablecer';
      button.classList.remove('confirming');
    }, 4000);
    return;
  }
  button.disabled = true;
  try {
    const response = await teacherFetch('/api/lab/students/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: button.dataset.reset })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No se pudo restablecer.');
    const expires = new Date(payload.expiresAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
    rosterCode.hidden = false;
    rosterCode.innerHTML = `
      <p>Código nuevo para <strong>${escapeHtml(payload.student.name)}</strong> (${escapeHtml(payload.student.matricula)}):</p>
      <p class="roster-code-value"><span id="roster-code-text">${escapeHtml(payload.code)}</span><button type="button" id="roster-code-copy">Copiar</button></p>
      <p class="roster-code-note">Entrégaselo en persona. Sirve una sola vez y vence el ${escapeHtml(expires)}. Su contraseña anterior ya no funciona.</p>`;
    await loadRoster();
  } catch (error) {
    showLabToast({ title: 'No se restableció', message: error.message, type: 'warning' });
    button.disabled = false;
  }
});

rosterCode?.addEventListener('click', event => {
  if (event.target.id !== 'roster-code-copy') return;
  const text = document.querySelector('#roster-code-text')?.textContent || '';
  navigator.clipboard?.writeText(text).then(() => {
    event.target.textContent = 'Copiado';
  }).catch(() => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#roster-code-text'));
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  });
});

function openView(name) {
  if (name === 'report') loadOfflineReport();
  if (name === 'students') loadRoster();
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelector(`#${name}-page`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === name));
  document.querySelector('#page-title').textContent = titles[name];
}

document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => openView(button.dataset.view)));
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openView(button.dataset.open)));

document.querySelector('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const loginMessage = document.querySelector('#login-message');
  const usernameInput = document.querySelector('#username');
  const passwordInput = document.querySelector('#password');

  if (loginMessage) loginMessage.textContent = 'Validando acceso de maestro...';

  try {
    if (TEACHER_LOGIN_API_URL) {
      const response = await fetch(TEACHER_LOGIN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameInput?.value,
          password: passwordInput?.value
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No fue posible iniciar sesión.');
      activeTeacher = payload;
      setTeacherToken(payload.token);
      if (passwordInput) passwordInput.value = '';
      refreshAgentData();
      loadRulesPanel();
      loadRoster();
    } else {
      activeTeacher = { displayName: usernameInput?.value || 'Docente Demo', role: 'teacher' };
    }

    document.querySelector('#login-view').classList.add('hidden');
    document.querySelector('#dashboard-view').classList.remove('hidden');
    showLabToast({
      title: 'Sesión de maestro iniciada',
      message: `Bienvenido, ${activeTeacher.displayName}.`
    });
  } catch (error) {
    if (loginMessage) loginMessage.textContent = error.message;
    showLabToast({
      title: 'Acceso rechazado',
      message: error.message,
      type: 'warning'
    });
  }
});

function endTeacherSession(message) {
  activeTeacher = null;
  setTeacherToken('');
  rosterStudents = [];
  if (rosterCode) { rosterCode.hidden = true; rosterCode.innerHTML = ''; }
  document.querySelector('#dashboard-view').classList.add('hidden');
  document.querySelector('#login-view').classList.remove('hidden');
  const loginMessage = document.querySelector('#login-message');
  if (loginMessage) loginMessage.textContent = message || '';
}

document.querySelector('#logout').addEventListener('click', () => {
  if (TEACHER_LOGIN_API_URL && teacherToken) {
    fetch('/api/teacher/logout', { method: 'POST', headers: { Authorization: `Bearer ${teacherToken}` } }).catch(() => {});
  }
  endTeacherSession('');
});

document.querySelector('#print-report').addEventListener('click', () => window.print());

// Funciones interactivas de los botones de la demo
function showLabToast({ title, message, type = 'success' }) {
  let toast = document.querySelector('#lab-toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'lab-toast';
    toast.className = 'lab-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <div class="lab-toast-icon">${type === 'success' ? '✓' : '!'}</div>
    <div>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(message)}</p>
    </div>
  `;

  toast.classList.remove('show', 'success', 'warning');
  toast.classList.add(type, 'show');

  window.clearTimeout(showLabToast.hideTimer);
  showLabToast.hideTimer = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

function actualizarDatosDashboard() {
  if (AGENT_API_URL) {
    refreshAgentData();
  }

  showLabToast({
    title: 'Datos actualizados',
    message: 'La información del laboratorio se sincronizó correctamente.'
  });
}

function verTodasLasActividades() {
    openView('activity');
}

// 4. ASISTENTE DE AYUDA (100% local: sin IA, sin internet y sin enviar datos fuera)
// Basado en la rama asistente-local. Responde que es LabControl, donde esta cada
// cosa y como usarla, y resume la actividad con los datos que el panel ya tiene.
const aiPanel = document.querySelector('#ai-panel');
const aiMessages = document.querySelector('#ai-messages');
const aiInput = document.querySelector('#ai-input');
const LIVE_DATA = Boolean(AGENT_API_URL);

const viewNames = {
  dashboard: 'Inicio',
  activity: 'Sesiones',
  report: 'Reportes',
  students: 'Usuarios',
  settings: 'Configuración'
};

function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Palabras que indican que la persona pide ayuda sobre el uso del sistema.
const helpCues = [
  'que es', 'para que', 'sirve', 'que hace', 'que hago', 'como', 'donde', 'ayuda', 'usar', 'uso ',
  'funciona', 'encuentro', 'encontrar', 'veo', 'ver ', 'puedo', 'se hace', 'explica', 'explicame',
  'significa', 'que muestra', 'que tiene', 'hay en', 'para que es', 'pasa si', 'por que'
];

const helpTopics = [
  {
    id: 'logout',
    keys: ['cerrar sesion', 'cierro sesion', 'cierro', 'cerrar', 'salgo', 'inicio sesion', 'inicio de sesion', 'salir', 'iniciar sesion', 'login', 'contrasena', 'entrar'],
    answer: () => `**Iniciar y cerrar sesión**\nPara entrar al panel usa tu **usuario y contraseña de maestro**. Si no los tienes o los olvidaste, pídeselos al coordinador del laboratorio.\nLos **alumnos** entran en la PC con su **matrícula** y su contraseña (la primera vez, con su código de activación).\nPara salir, pulsa **Cerrar sesión** en el menú lateral. Por seguridad, si recargas la página tendrás que entrar de nuevo.`
  },
  {
    id: 'about',
    keys: ['labcontrol', 'lab control', 'sistema', 'proyecto', 'plataforma', 'pagina', 'aplicacion', 'portal', 'esto'],
    answer: () => `**LabControl** sirve para **supervisar el uso responsable de las computadoras del laboratorio**.\n\nCon él puedes:\n• Ver qué aplicación usa cada estudiante y durante cuánto tiempo.\n• Detectar actividades **no permitidas** (juegos, videos, redes sociales).\n• Elegir entre **Solo alertas** o **Bloqueo activo**.\n• Revisar reportes, incluida la actividad registrada cuando el servidor estaba apagado.\n\nNo registra contraseñas, mensajes ni teclas.`
  },
  {
    id: 'dashboard',
    keys: ['inicio', 'resumen', 'panel', 'tarjetas', 'metricas', 'grafica', 'uso academico', 'actualizar', 'equipos conectados', 'tiempo por aplicacion'],
    view: 'dashboard',
    answer: () => `**Inicio** es la pantalla principal. Ahí encuentras:\n• **Tarjetas** con las sesiones activas, los equipos conectados, las alertas y el porcentaje de uso académico.\n• **Actividad reciente**: estudiante, equipo, aplicación, tiempo y estado.\n• **Tiempo por aplicación**: una gráfica con los minutos de cada programa.\n\nLos datos se actualizan solos cada 5 segundos.`
  },
  {
    id: 'activity',
    keys: ['sesiones', 'actividad', 'actividades', 'tabla', 'historial', 'que estan haciendo', 'que usan', 'login pendiente'],
    view: 'activity',
    answer: () => `En **Sesiones** está la tabla completa: **estudiante**, **equipo**, **aplicación**, **tiempo** y **estado**.\n• **Permitido**: uso académico o autorizado.\n• **No permitido**: actividad que conviene revisar.\n• **Requiere login**: la PC está prendida pero el alumno aún no inicia sesión en LabControl.`
  },
  {
    id: 'reset',
    keys: ['olvide mi contrasena', 'olvido mi contrasena', 'olvido su contrasena', 'olvide la contrasena', 'olvido la contrasena', 'olvido', 'olvide', 'olvidaron', 'restablecer', 'restablezco', 'codigo', 'codigo de activacion', 'activacion', 'activar', 'nueva contrasena', 'contrasena del alumno', 'matricula'],
    view: 'students',
    answer: () => `**Si un alumno olvida su contraseña:**\n1. Abre **Usuarios** y búscalo por nombre o matrícula.\n2. Pulsa **Restablecer** y luego **¿Confirmar?**.\n3. Aparece un **código nuevo**: dáselo en persona.\n4. El alumno entra en la PC con su **matrícula** y ese código, y crea una contraseña nueva.\n\nEl código sirve una sola vez, vence en 14 días y la contraseña anterior deja de funcionar. Queda registrado quién lo restableció.`
  },
  {
    id: 'groups',
    keys: ['grupo', 'grupos', 'clase', 'clases', 'carrera'],
    view: 'students',
    answer: () => `El **grupo** de cada alumno aparece debajo de su nombre, junto a su matrícula, en Inicio, Sesiones y Usuarios. Viene de la lista de la escuela que importa el coordinador.\nEn **Usuarios** puedes escribir el grupo en el buscador para ver solo a sus alumnos.`
  },
  {
    id: 'report',
    keys: ['reporte', 'reportes', 'imprimir', 'impresion', 'imprimo', 'pdf', 'informe'],
    view: 'report',
    answer: () => `En **Reportes**:\n1. Elige al estudiante en el selector de arriba.\n2. Revisa su **sesión total** y las aplicaciones que más usó.\n3. Pulsa **Imprimir** para imprimirlo o guardarlo como PDF.\n\nAbajo está **Actividad sin conexión**, con lo que registraron las PCs mientras el servidor estaba apagado.`
  },
  {
    id: 'offline',
    keys: ['sin conexion', 'sin servidor', 'servidor apagado', 'apagado', 'offline', 'registro', 'alterada', 'faltan entradas', 'reiniciado', 'integro'],
    view: 'report',
    answer: () => `Si el servidor está apagado, las PCs **se usan normal y no bloquean nada**, pero guardan qué aplicaciones se abrieron. Cuando el servidor vuelve, lo envían y aparece en **Reportes > Actividad sin conexión**.\n\nComo sin servidor no hay inicio de sesión, esa actividad se identifica por **PC y usuario de Windows**.\nSi ves **alterada**, **faltan entradas** o **registro reiniciado**, alguien pudo modificar o borrar el registro de esa PC.`
  },
  {
    id: 'internet',
    keys: ['internet', 'sin red', 'wifi', 'red'],
    answer: () => `LabControl **no necesita internet**. Las PCs, el servidor y tu laptop se comunican por la red del laboratorio. Si se cae el internet pero el router sigue prendido, todo funciona igual. Este asistente también funciona sin internet.`
  },
  {
    id: 'students',
    keys: ['usuarios', 'usuario', 'estudiantes', 'estudiante', 'alumnos', 'alumno', 'lista', 'cuentas', 'cuenta'],
    view: 'students',
    answer: () => `En **Usuarios** ves a los estudiantes con el equipo que usan y su estado:\n• **Sesión activa**: todo en orden.\n• **Alerta pendiente**: tiene una actividad por revisar.\n\nLas cuentas de alumnos y maestros las da de alta el coordinador del laboratorio.`
  },
  {
    id: 'settings',
    keys: ['configuracion', 'configurar', 'ajustes', 'ajustar', 'bloqueo', 'bloquear', 'solo alertas', 'regla', 'reglas', 'prohibir', 'pagina prohibida', 'dominio'],
    view: 'settings',
    answer: () => `En **Configuración** ajustas las reglas del laboratorio:\n• **Solo alertas**: el panel avisa, pero no se cierra nada.\n• **Bloqueo activo**: la PC cierra la pestaña o la aplicación no permitida.\n• **Agregar regla**: escribe un dominio (youtube.com), un sufijo (.io) o una palabra para prohibirla.\n\nCada cambio queda registrado con tu usuario.`
  },
  {
    id: 'exceptions',
    keys: ['excepcion', 'excepciones', 'permitir', 'desbloquear', 'autorizar'],
    view: 'settings',
    answer: () => `Una **excepción** permite algo que normalmente está prohibido, por ejemplo **YouTube** para una clase que lo necesita.\nSe activa y se quita en **Configuración**. Queda visible en la lista de excepciones y registrada con tu usuario.`
  },
  {
    id: 'alerts',
    keys: ['alerta', 'alertas', 'no permitido', 'no permitida', 'rojo', 'advertencia'],
    view: 'activity',
    answer: () => {
      const alerts = activities.filter(activity => !activity.allowed && activity.sessionId !== null);
      const now = alerts.length
        ? `Ahora mismo hay **${alerts.length}**: ${alerts.map(a => `${a.name} (${a.app})`).join(', ')}.`
        : 'Ahora mismo **no hay alertas**.';
      return `Una **alerta** aparece cuando un estudiante usa algo **no permitido** (juegos, videos o una página prohibida). Se ven en la tarjeta **Alertas** de Inicio y en **Sesiones**, marcadas como No permitido.\n\n${now}`;
    }
  },
  {
    id: 'assistant',
    keys: ['asistente', 'ia', 'inteligencia artificial', 'chat', 'bot'],
    answer: () => `Soy el **asistente de ayuda de LabControl**. Puedo explicarte cómo usar cada sección, decirte dónde encontrar algo y resumir la actividad del laboratorio.\n\nNo soy una inteligencia artificial: respondo con información guardada en el panel. Funciono sin internet y no envío datos a ningún lado.`
  },
  {
    id: 'privacy',
    keys: ['privacidad', 'privado', 'ficticio', 'ficticios', 'reales', 'teclas', 'espia', 'espiar', 'seguro', 'seguridad', 'transparente'],
    answer: () => `LabControl muestra **qué aplicación o ventana** usa cada PC y durante cuánto tiempo. **No registra contraseñas, mensajes, teclas ni contenido privado.**\nLas reglas y excepciones solo las cambia un maestro con sesión, y cada cambio queda registrado.${LIVE_DATA ? '' : '\n\nEsta es una demostración: los datos que ves son ficticios.'}`
  },
  {
    id: 'mobile',
    keys: ['celular', 'movil', 'telefono', 'tablet', 'laptop'],
    answer: () => `Puedes abrir el panel desde tu laptop, tablet o celular, siempre que estés conectado a **la red del laboratorio**. En pantallas pequeñas el menú aparece abajo.`
  }
];

const helpMenu = `Puedo ayudarte con:\n• **¿Qué es LabControl?** y para qué sirve.\n• **Dónde ver** sesiones, alertas, reportes o usuarios.\n• **Cómo** bloquear páginas, poner excepciones o imprimir un reporte.\n• **Resumir** la actividad o **detectar alertas**.\n\nEscribe tu pregunta o usa los botones de abajo.`;

function localHelp(question) {
  const q = normalizeText(question);
  const padded = ` ${q} `;
  const words = q.split(' ').filter(Boolean);

  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|que tal)\b/.test(q) && words.length <= 4) {
    return { text: `¡Hola! Soy el asistente de LabControl. ${helpMenu}` };
  }
  if (/^(ayuda|help|menu|opciones)$/.test(q) || q.includes('que puedes hacer') || q.includes('en que me ayudas')) {
    return { text: helpMenu };
  }
  if (/^(gracias|muchas gracias|ok|vale|perfecto)$/.test(q)) {
    return { text: '¡Con gusto! Si tienes otra duda sobre LabControl, aquí estoy.' };
  }
  if (/\b(que|quien) eres\b/.test(q) || q.includes('como te llamas')) {
    return { text: helpTopics.find(topic => topic.id === 'assistant').answer() };
  }

  const hasCue = helpCues.some(cue => padded.includes(` ${cue}`));
  if (!hasCue) return null;

  // El tema con la coincidencia mas especifica (la frase mas larga) gana.
  let best = null;
  let bestScore = 0;
  helpTopics.forEach(topic => {
    topic.keys.forEach(key => {
      if (padded.includes(` ${key} `) && key.length > bestScore) {
        best = topic;
        bestScore = key.length;
      }
    });
  });
  if (!best) return null;
  return { text: best.answer(), view: best.view };
}

function formatAiText(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\n)\s*\*\s+/g, '$1&bull; ')
    .replace(/\*(?![\s*])([^*\n]+?)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function actionButton(view) {
  if (!view || !viewNames[view]) return '';
  return `<br><button type="button" class="ai-action" data-go="${view}">Ir a ${viewNames[view]} →</button>`;
}

function addAiMessage(text, role = 'assistant', view) {
  aiMessages.insertAdjacentHTML('beforeend', `<div class="ai-message ${role}">${formatAiText(text)}${actionButton(view)}</div>`);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}

// Respuestas calculadas con los datos que el panel tiene en este momento.
const dataKeywords = ['resum', 'alerta', 'revis', 'modulo', 'categor', 'quien', 'detect', 'como va', 'estado del laboratorio', 'hoy'];

function answerAi(question) {
  const normalized = normalizeText(question);
  const withSession = activities.filter(activity => activity.sessionId !== null);
  const pending = activities.length - withSession.length;
  const alerts = withSession.filter(activity => !activity.allowed);
  const allowed = withSession.filter(activity => activity.allowed);
  const source = LIVE_DATA ? '' : ' (datos de demostración)';

  if (!activities.length) {
    return 'Todavía no hay equipos reportando. Cuando las PCs del laboratorio inicien sesión, aquí podré resumir su actividad.';
  }
  if (normalized.includes('alerta') || normalized.includes('revis') || normalized.includes('detect')) {
    if (!alerts.length) return `No hay alertas en este momento${source}. Todas las sesiones activas tienen uso permitido.`;
    return `Detecté **${alerts.length} ${alerts.length === 1 ? 'alerta' : 'alertas'}**${source}: ${alerts.map(a => `${a.name} en ${a.pc} usa ${a.app} (${a.time})`).join('; ')}. Conviene revisarlas antes de tomar una decisión.`;
  }
  if (normalized.includes('modulo') || normalized.includes('categor')) {
    const academic = [...new Set(allowed.map(a => a.app))];
    const flagged = [...new Set(alerts.map(a => a.app))];
    return `**Uso por tipo**${source}:\n• **Permitido:** ${academic.length ? academic.join(', ') : 'ninguno por ahora'}.\n• **Para revisar:** ${flagged.length ? flagged.join(', ') : 'nada por ahora'}.`;
  }
  if (normalized.includes('quien') || normalized.includes('alumno') || normalized.includes('estudiante')) {
    if (!alerts.length) return `Ningún estudiante requiere atención ahora${source}.`;
    return `Requieren atención${source}: ${alerts.map(a => `**${a.name}** (${a.pc}, ${a.app})`).join(', ')}. El resto de las sesiones tienen uso permitido.`;
  }
  return `**Resumen del laboratorio**${source}: ${withSession.length} ${withSession.length === 1 ? 'sesión activa' : 'sesiones activas'}, ${allowed.length} con uso permitido y ${alerts.length} para revisar${alerts.length ? ` (${alerts.map(a => `${a.name} con ${a.app}`).join(', ')})` : ''}.${pending ? ` Además, ${pending} ${pending === 1 ? 'PC espera' : 'PCs esperan'} que el alumno inicie sesión.` : ''}`;
}

function askAi(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;
  addAiMessage(cleanQuestion, 'user');

  let reply;
  const help = localHelp(cleanQuestion);
  if (help) {
    reply = help;
  } else if (dataKeywords.some(key => normalizeText(cleanQuestion).includes(key))) {
    reply = { text: answerAi(cleanQuestion) };
  } else {
    reply = { text: `No estoy seguro de haber entendido tu pregunta. ${helpMenu}` };
  }
  window.setTimeout(() => addAiMessage(reply.text, 'assistant', reply.view), 260);
}

// Botones "Ir a ..." dentro de las respuestas.
aiMessages?.addEventListener('click', event => {
  const button = event.target.closest('[data-go]');
  if (!button) return;
  openView(button.dataset.go);
  if (window.innerWidth <= 760) {
    aiPanel.classList.remove('open');
    aiPanel.setAttribute('aria-hidden', 'true');
  }
});

const aiToggle = document.querySelector('#ai-toggle');
const aiClose = document.querySelector('#ai-close');

if (aiToggle) {
  aiToggle.addEventListener('click', (e) => {
    e.preventDefault();
    aiPanel.classList.add('open');
    aiPanel.setAttribute('aria-hidden', 'false');
    if (!aiMessages.children.length) {
      addAiMessage('Hola, soy el asistente de LabControl. Puedo explicarte cómo usar el panel, decirte dónde encontrar cada cosa, resumir la actividad y detectar alertas.');
    }
    if (aiInput) aiInput.focus();
  });
}

if (aiClose) {
  aiClose.addEventListener('click', (e) => {
    e.preventDefault();
    aiPanel.classList.remove('open');
    aiPanel.setAttribute('aria-hidden', 'true');
  });
}

document.querySelectorAll('[data-ai-prompt]').forEach(button => {
  button.addEventListener('click', () => askAi(button.dataset.aiPrompt));
});

const aiForm = document.querySelector('#ai-form');
if (aiForm) {
  aiForm.addEventListener('submit', event => { 
    event.preventDefault(); 
    if (aiInput && aiInput.value.trim()) {
      askAi(aiInput.value); 
      aiInput.value = ''; 
    }
  });
}

// 5. CONTROLADOR DINÁMICO DE REPORTES POR ESTUDIANTE
const studentReportsData = {
  "Ana Lopez": { total: "53 min", app1Time: "32 min", app1Name: "Microsoft Word", app2Time: "21 min", app2Name: "Google Chrome" },
  "Carlos Ruiz": { total: "45 min", app1Time: "25 min", app1Name: "Google Chrome", app2Time: "20 min", app2Name: "PowerPoint" },
  "Sofia Torres": { total: "30 min", app1Time: "18 min", app1Name: "Minecraft", app2Time: "12 min", app2Name: "YouTube" },
  "Diego Martinez": { total: "40 min", app1Time: "22 min", app1Name: "PowerPoint", app2Time: "18 min", app2Name: "PDF Reader" },
  "Mia Garcia": { total: "45 min", app1Time: "45 min", app1Name: "Google Chrome", app2Time: "0 min", app2Name: "N/A" },
  "Luis Herrera": { total: "50 min", app1Time: "50 min", app1Name: "Visual Studio", app2Time: "0 min", app2Name: "N/A" },
  "Valentina Gomez": { total: "12 min", app1Time: "12 min", app1Name: "YouTube", app2Time: "0 min", app2Name: "N/A" },
  "Mateo Silva": { total: "28 min", app1Time: "28 min", app1Name: "Microsoft Word", app2Time: "0 min", app2Name: "N/A" },
  "Camila Rojas": { total: "15 min", app1Time: "15 min", app1Name: "PDF Reader", app2Time: "0 min", app2Name: "N/A" },
  "Lucas Morales": { total: "35 min", app1Time: "35 min", app1Name: "Python IDLE", app2Time: "0 min", app2Name: "N/A" }
};

const studentSelect = document.querySelector('#student-report-select');
if (studentSelect) {
  // Poblar dinámicamente el select con todos los estudiantes
  studentSelect.innerHTML = Object.keys(studentReportsData).map(name => 
    `<option value="${name}">${name}</option>`
  ).join('');

  studentSelect.addEventListener('change', (e) => {
    const studentName = e.target.value;
    const data = studentReportsData[studentName];
    if (data) {
      document.querySelector('#report-student-title').textContent = `Resumen de ${studentName}`;
      document.querySelector('#rep-total').textContent = data.total;
      document.querySelector('#rep-app1').textContent = data.app1Time;
      document.querySelector('#rep-app1-name').textContent = data.app1Name;
      document.querySelector('#rep-app2').textContent = data.app2Time;
      document.querySelector('#rep-app2-name').textContent = data.app2Name;
    }
  });
}
