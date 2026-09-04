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
