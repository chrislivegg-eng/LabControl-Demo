const activities = [
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

const students = [
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

    return `
      <tr class="hover:bg-gray-50/50 transition">
          <td class="py-3.5 px-2 font-medium text-gray-900">${item.name}</td>
          <td class="py-3.5 px-2 text-gray-500">${item.pc}</td>
          <td class="py-3.5 px-2 text-gray-800">${item.app}</td>
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

document.querySelector('#activity-body').innerHTML = renderActivityRows(activities.slice(0, 4));
document.querySelector('#activity-full-body').innerHTML = renderActivityRows(activities);
document.querySelector('#students-list').innerHTML = students.map(([name, detail]) => {
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

// 2. GRÁFICA DE CHART.JS CON EL EJE DE MINUTOS
const contenedorBarras = document.querySelector('#app-bars');
contenedorBarras.innerHTML = '<canvas id="graficaUso"></canvas>';
const ctxGrafica = document.getElementById('graficaUso').getContext('2d');

new Chart(ctxGrafica, {
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

document.querySelector('#login-form').addEventListener('submit', event => {
  event.preventDefault();
  document.querySelector('#login-view').classList.add('hidden');
  document.querySelector('#dashboard-view').classList.remove('hidden');
});

document.querySelector('#logout').addEventListener('click', () => {
  document.querySelector('#dashboard-view').classList.add('hidden');
  document.querySelector('#login-view').classList.remove('hidden');
});

document.querySelector('#print-report').addEventListener('click', () => window.print());

// Funciones interactivas de los botones de la demo
function actualizarDatosDashboard() {
    alert("¡Datos del laboratorio actualizados correctamente!");
}

function verTodasLasActividades() {
    openView('activity');
}

// 4. ASISTENTE DE AYUDA (100% local, sin IA ni conexión a servidores)
// Responde qué es LabControl, para qué sirve, dónde ver cada cosa y cómo usarla,
// además de resúmenes y alertas calculados con los datos ficticios de la demo.
const aiPanel = document.querySelector('#ai-panel');
const aiMessages = document.querySelector('#ai-messages');
const aiInput = document.querySelector('#ai-input');

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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Palabras que indican que la persona pide ayuda sobre el uso del sistema
const helpCues = [
  'que es', 'para que', 'sirve', 'que hace', 'que hago', 'como', 'donde', 'ayuda', 'usar', 'uso ',
  'funciona', 'encuentro', 'encontrar', 'veo', 'ver ', 'puedo', 'se hace', 'explica', 'explicame',
  'significa', 'que muestra', 'que tiene', 'hay en', 'para que es'
];

const helpTopics = [
  {
    id: 'logout',
    keys: ['cerrar sesion', 'cierro sesion', 'cierro', 'cerrar', 'salgo', 'inicio sesion', 'inicio de sesion', 'salir', 'desconectar', 'iniciar sesion', 'login', 'contrasena', 'entrar'],
    answer: () => `**Iniciar y cerrar sesión**\nPara entrar, usa el usuario **docente** y la contraseña **demo** en la pantalla de inicio.\nPara salir, pulsa **Cerrar sesión** en la parte inferior del menú lateral (debajo de tu perfil de docente).`
  },
  {
    id: 'about',
    keys: ['labcontrol', 'lab control', 'sistema', 'proyecto', 'plataforma', 'pagina', 'aplicacion', 'portal', 'esto'],
    answer: () => `**LabControl** es un portal para docentes del Colegio Ciudadano que sirve para **supervisar el uso responsable de los equipos del laboratorio de cómputo**.\n\nCon él puedes:\n• Ver qué aplicación usa cada estudiante y durante cuánto tiempo.\n• Detectar actividades **no permitidas** (juegos, videos, redes sociales).\n• Consultar e imprimir reportes por estudiante.\n• Ajustar las reglas del laboratorio.\n\nEs una demostración: todos los datos son ficticios y no registra contraseñas, mensajes ni teclas.`
  },
  {
    id: 'dashboard',
    keys: ['inicio', 'resumen', 'panel', 'tarjetas', 'metricas', 'grafica', 'uso academico', 'actualizar', 'equipos conectados', 'tiempo por aplicacion'],
    view: 'dashboard',
    answer: () => `**Inicio** es la pantalla principal. Ahí encuentras:\n• **Tarjetas** con las sesiones activas, los equipos conectados, las alertas y el porcentaje de uso académico.\n• **Actividad reciente**: los últimos estudiantes con su equipo, aplicación, tiempo y estado.\n• **Tiempo por aplicación**: una gráfica con los minutos de uso de cada programa.\n\nEl botón **Actualizar datos** refresca la información del laboratorio.`
  },
  {
    id: 'activity',
    keys: ['sesiones', 'actividad', 'actividades', 'tabla', 'historial', 'que estan haciendo', 'que usan'],
    view: 'activity',
    answer: () => `En **Sesiones** está la tabla completa con la actividad de todos los estudiantes: **equipo**, **aplicación**, **tiempo de uso** y **estado**.\n• ✓ **Permitido** (verde): uso académico o autorizado.\n• ⚠️ **No permitido** (rojo): actividad que conviene revisar.\n\nTambién puedes llegar ahí desde Inicio con **Ver todas las actividades**.`
  },
  {
    id: 'report',
    keys: ['reporte', 'reportes', 'imprimir', 'impresion', 'imprimo', 'pdf', 'informe'],
    view: 'report',
    answer: () => `Para ver o imprimir un reporte:\n1. Abre **Reportes** en el menú.\n2. Elige al estudiante en el selector de la parte superior.\n3. Revisa su **sesión total** y las dos aplicaciones que más usó.\n4. Pulsa **Imprimir** para imprimirlo o guardarlo como PDF.`
  },
  {
    id: 'students',
    keys: ['usuarios', 'usuario', 'estudiantes', 'estudiante', 'alumnos', 'alumno', 'lista'],
    view: 'students',
    answer: () => `En **Usuarios** aparecen todos los estudiantes registrados (${students.length} en la demo) con el equipo que usan y su estado:\n• **Sesión activa** (verde): todo en orden.\n• **Alerta pendiente** (rojo): tiene una actividad por revisar.`
  },
  {
    id: 'settings',
    keys: ['configuracion', 'configurar', 'ajustes', 'ajustar', 'bloqueo', 'bloquear', 'sonido', 'tiempo limite', 'limite', 'duracion'],
    view: 'settings',
    answer: () => `En **Configuración** puedes ajustar las reglas del laboratorio:\n• **Bloqueo automático** de aplicaciones no permitidas (juegos y redes sociales).\n• **Alertas de sonido** en tiempo real cuando un equipo rompe las reglas.\n• **Tiempo límite de sesión**: 50 minutos (estándar) o 100 minutos (doble).`
  },
  {
    id: 'alerts',
    keys: ['alerta', 'alertas', 'no permitido', 'no permitida', 'rojo', 'advertencia'],
    view: 'activity',
    answer: () => {
      const alerts = activities.filter(activity => !activity.allowed);
      return `Una **alerta** aparece cuando un estudiante usa una aplicación **no permitida** (por ejemplo, juegos o videos). Se ven:\n• En la tarjeta **Alertas** de Inicio.\n• En **Sesiones**, marcadas en rojo con ⚠️.\n• En **Usuarios**, como **Alerta pendiente**.\n\nAhora mismo hay **${alerts.length}**: ${alerts.map(a => `${a.name} (${a.app})`).join(' y ')}.`;
    }
  },
  {
    id: 'assistant',
    keys: ['asistente', 'ia', 'inteligencia artificial', 'chat', 'bot'],
    answer: () => `Soy el **asistente de LabControl**. Puedo:\n• Explicarte qué es el sistema y cómo usar cada sección.\n• Decirte dónde encontrar algo (reportes, alertas, ajustes…).\n• Resumir la actividad del laboratorio y detectar alertas.\n\nFunciono sin internet y solo con los datos de la demo. Ábreme con el botón **Asistente** de la parte superior.`
  },
  {
    id: 'privacy',
    keys: ['privacidad', 'privado', 'ficticio', 'ficticios', 'reales', 'teclas', 'espia', 'espiar', 'seguro', 'seguridad'],
    answer: () => `Esta demo usa **solo datos ficticios**. LabControl muestra qué aplicación se usa y durante cuánto tiempo, pero **no registra contraseñas, mensajes, teclas ni contenido privado**. Un reporte real solo incluiría los datos que la escuela autorice.`
  },
  {
    id: 'mobile',
    keys: ['celular', 'movil', 'telefono', 'tablet'],
    answer: () => `Sí, LabControl funciona en el celular y la tablet. En pantallas pequeñas el menú aparece **abajo**, y el asistente se abre con el botón **✦** de la parte superior.`
  }
];

const helpMenu = `Puedo ayudarte con:\n• **¿Qué es LabControl?** y para qué sirve.\n• **Dónde ver** sesiones, alertas, reportes o usuarios.\n• **Cómo** imprimir un reporte o cambiar la configuración.\n• **Resumir** la actividad o **detectar alertas**.\n\nEscribe tu pregunta o usa los botones de abajo.`;

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

  // Elige el tema con la coincidencia más específica (la frase más larga)
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

// Respuestas sobre los datos ficticios (resumen, alertas, módulos)
const dataKeywords = ['resum', 'alerta', 'revis', 'modulo', 'categor', 'quien', 'detect', 'como va', 'estado del laboratorio', 'hoy'];

function answerAi(question) {
  const normalized = normalizeText(question);
  const alerts = activities.filter(activity => !activity.allowed);
  const allowed = activities.filter(activity => activity.allowed);
  const alertList = alerts.map(a => `${a.name} en ${a.pc} usó ${a.app} durante ${a.time}`).join('; ');

  if (normalized.includes('alerta') || normalized.includes('revis')) {
    return `Detecté **${alerts.length} ${alerts.length === 1 ? 'alerta pendiente' : 'alertas pendientes'}**: ${alertList}. Recomiendo revisarlas antes de tomar una decisión.`;
  }
  if (normalized.includes('modulo') || normalized.includes('categor')) {
    const academicApps = [...new Set(allowed.filter(a => a.app !== 'Google Chrome').map(a => a.app))].join(', ');
    const entertainment = [...new Set(alerts.map(a => a.app))].join(' y ');
    return `**Módulos identificados:**\n• **Académico:** ${academicApps}.\n• **Navegación:** Google Chrome (uso permitido).\n• **Entretenimiento:** ${entertainment}, marcados para revisar.`;
  }
  if (normalized.includes('quien') || normalized.includes('alumno') || normalized.includes('estudiante')) {
    return `Requieren atención: ${alerts.map(a => `**${a.name}** (${a.pc}, ${a.app})`).join(' y ')}. El resto de las sesiones están clasificadas como permitidas.`;
  }
  return `**Resumen del laboratorio:** hay ${activities.length} sesiones registradas; ${allowed.length} con uso permitido y ${alerts.length} marcadas para revisar (${alerts.map(a => `${a.name} con ${a.app}`).join(' y ')}).`;
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

// Botones "Ir a ..." dentro de las respuestas
aiMessages.addEventListener('click', event => {
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
      addAiMessage('Hola, soy el asistente de LabControl. Puedo explicarte cómo usar el sistema, decirte dónde encontrar cada cosa, resumir la actividad y detectar alertas.');
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