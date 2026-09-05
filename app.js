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
const titles = { dashboard: 'Resumen del laboratorio', activity: 'Sesiones del laboratorio', students: 'Usuarios registrados', report: 'Reportes del Colegio Ciudadano' };
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