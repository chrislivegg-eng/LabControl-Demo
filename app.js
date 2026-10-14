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
          <td class="py-3.5 px-2 font-medium text-gray-900">${escapeHtml(item.name)}</td>
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
  const initials = name.split(' ').map(n => n[0]).join('');
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
        <h4 class="text-sm font-bold text-gray-900 truncate">${name}</h4>
        <p class="text-xs text-gray-500 mt-0.5 mb-3">${detail.split('·')[0].trim()}</p>
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

  const alertCount = list.filter(item => !item.allowed).length;
  const academicPercent = list.length ? Math.round((list.length - alertCount) / list.length * 100) : 0;

  if (metricSessions) metricSessions.textContent = summary.activeSessions ?? list.length;
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
function openView(name) {
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

// 4. ASISTENTE IA
const aiPanel = document.querySelector('#ai-panel');
const aiMessages = document.querySelector('#ai-messages');
const aiInput = document.querySelector('#ai-input');
const AI_API_URL = window.LABCONTROL_API_URL || 'https://labcontrol-ai-server.vercel.app/api/chat';

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

function addAiMessage(text, role = 'assistant') {
  aiMessages.insertAdjacentHTML('beforeend', `<div class="ai-message ${role}">${formatAiText(text)}</div>`);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}

function answerAi(question) {
  const normalized = question.toLowerCase();
  const alerts = activities.filter(activity => !activity.allowed);
  const academic = activities.filter(activity => activity.allowed);

  if (normalized.includes('alerta') || normalized.includes('revis')) {
    return `Detecté **${alerts.length} alerta pendiente**: ${alerts.map(activity => `${activity.name} en ${activity.pc} usó ${activity.app} durante ${activity.time}`).join('. ')}. Recomiendo revisarla con el docente antes de tomar una decisión.`;
  }
  if (normalized.includes('módulo') || normalized.includes('modulo') || normalized.includes('categor')) {
    return `**Módulos identificados:**\nAcadémico: Microsoft Word y PowerPoint (${academic.length} sesiones permitidas).\nNavegación: Google Chrome (uso permitido en la demo).\nEntretenimiento: Minecraft, marcado para revisar. Estos módulos ayudan a explicar el panel sin revisar contenido privado.`;
  }
  if (normalized.includes('quien') || normalized.includes('alumno') || normalized.includes('estudiante')) {
    return `La actividad que requiere atención es la de **Sofia Torres** en ${alerts[0].pc}, por ${alerts[0].app}. El resto de las sesiones visibles están clasificadas como permitidas.`;
  }
  return `Resumen del laboratorio: hay **12 sesiones activas**, 18 equipos conectados y 86% de uso académico en los datos de demostración. ${academic.map(activity => `${activity.name} usa ${activity.app}`).join(', ')}. ${alerts.length ? `Hay ${alerts.length} actividad marcada para revisar: ${alerts[0].app}.` : ''}`;
}

async function askAi(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;
  addAiMessage(cleanQuestion, 'user');
  if (!AI_API_URL) {
    window.setTimeout(() => addAiMessage(answerAi(cleanQuestion)), 260);
    return;
  }

  const loading = document.createElement('div');
  loading.className = 'ai-message';
  loading.textContent = 'Analizando la actividad...';
  aiMessages.append(loading);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  try {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: cleanQuestion, activities })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No fue posible contactar al asistente.');
    loading.innerHTML = formatAiText(payload.reply);
  } catch (error) {
    loading.textContent = `${error.message} La demo local seguira disponible.`;
  }
}

const aiToggle = document.querySelector('#ai-toggle');
const aiClose = document.querySelector('#ai-close');

if (aiToggle) {
  aiToggle.addEventListener('click', (e) => {
    e.preventDefault();
    aiPanel.classList.add('open');
    aiPanel.setAttribute('aria-hidden', 'false');
    if (!aiMessages.children.length) {
      addAiMessage('Hola, soy el asistente de LabControl. Puedo resumir la actividad, detectar alertas e identificar módulos de uso.');
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
