const activities = [
  { name: 'Ana Lopez', pc: 'PC-LAB-07', app: 'Microsoft Word', time: '32 min', status: 'Permitido', allowed: true },
  { name: 'Carlos Ruiz', pc: 'PC-LAB-12', app: 'Google Chrome', time: '21 min', status: 'Permitido', allowed: true },
  { name: 'Sofia Torres', pc: 'PC-LAB-03', app: 'Minecraft', time: '7 min', status: 'Revisar', allowed: false },
  { name: 'Diego Martinez', pc: 'PC-LAB-18', app: 'PowerPoint', time: '16 min', status: 'Permitido', allowed: true }
];

const bars = [ ['Word', 85], ['Chrome', 65], ['PowerPoint', 48], ['Minecraft', 18] ];
const students = [ ['Ana Lopez', 'PC-LAB-07 · Sesion activa'], ['Carlos Ruiz', 'PC-LAB-12 · Sesion activa'], ['Sofia Torres', 'PC-LAB-03 · Alerta pendiente'], ['Diego Martinez', 'PC-LAB-18 · Sesion activa'], ['Mia Garcia', 'PC-LAB-02 · Sesion activa'], ['Luis Herrera', 'PC-LAB-14 · Sesion activa'] ];

function activityRows() {
  return activities.map(item => `<tr><td><strong>${item.name}</strong></td><td>${item.pc}</td><td>${item.app}</td><td>${item.time}</td><td><span class="status ${item.allowed ? 'allowed' : 'blocked'}">${item.status}</span></td></tr>`).join('');
}

document.querySelector('#activity-body').innerHTML = activityRows();
document.querySelector('#activity-full-body').innerHTML = activityRows();
document.querySelector('#app-bars').innerHTML = bars.map(([label, value]) => `<div class="bar-item"><div class="bar" style="height:${value}%"></div><span>${label}</span></div>`).join('');
document.querySelector('#students-list').innerHTML = students.map(([name, detail]) => `<div class="student"><strong>${name}</strong><span>${detail}</span></div>`).join('');

const titles = { dashboard: 'Resumen del laboratorio', activity: 'Sesiones del laboratorio', students: 'Usuarios registrados', report: 'Reportes del Colegio Ciudadano' };
function openView(name) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelector(`#${name}-page`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === name));
  document.querySelector('#page-title').textContent = titles[name];
}
document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => openView(button.dataset.view)));
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openView(button.dataset.open)));
document.querySelector('#login-form').addEventListener('submit', event => { event.preventDefault(); document.querySelector('#login-view').classList.add('hidden'); document.querySelector('#dashboard-view').classList.remove('hidden'); });
document.querySelector('#logout').addEventListener('click', () => { document.querySelector('#dashboard-view').classList.add('hidden'); document.querySelector('#login-view').classList.remove('hidden'); });
document.querySelector('#print-report').addEventListener('click', () => window.print());

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

document.querySelector('#ai-toggle').addEventListener('click', () => {
  aiPanel.classList.add('open');
  aiPanel.setAttribute('aria-hidden', 'false');
  if (!aiMessages.children.length) addAiMessage('Hola, soy el asistente de LabControl. Puedo resumir la actividad, detectar alertas e identificar módulos de uso.');
  aiInput.focus();
});
document.querySelector('#ai-close').addEventListener('click', () => { aiPanel.classList.remove('open'); aiPanel.setAttribute('aria-hidden', 'true'); });
document.querySelectorAll('[data-ai-prompt]').forEach(button => button.addEventListener('click', () => askAi(button.dataset.aiPrompt)));
document.querySelector('#ai-form').addEventListener('submit', event => { event.preventDefault(); askAi(aiInput.value); aiInput.value = ''; });
