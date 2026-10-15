// Alta de alumnos desde la lista de la escuela (Excel o CSV).
//
//   npm run alumnos -- importar alumnos.xlsx
//   npm run alumnos -- lista
//   npm run alumnos -- nuevo-codigo DES0444
//
// Columnas (la primera fila son los titulos, en cualquier orden):
//   nombre | apellido | matricula | grupo
//
// - El usuario es la matricula. En el panel se muestra "Nombre Apellido"
//   (primer nombre y primer apellido).
// - Cada alumno nuevo recibe un codigo de activacion de un solo uso. Con el
//   entra la primera vez y crea su propia contrasena.
// - Si la matricula ya existe, se actualizan nombre y grupo y se conserva su
//   contrasena.
// - Los codigos se guardan en una hoja para imprimir y recortar
//   (codigos-activacion-<fecha>.html). Repartelos y despues BORRA esa hoja.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTIVATION_DAYS, issueActivation, publicStudent, writeUsersFile } from '../server/accounts.js';
import { readXlsxRows } from './xlsx-reader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '..', 'server');
const usersPath = process.env.LABCONTROL_USERS || path.join(serverDir, 'users.json');
const demoPath = path.join(serverDir, 'users.demo.json');
const MATRICULA = /^[A-Z]{2,5}\d{2,10}$/;
const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'san', 'santa', 'van', 'von', 'da', 'di']);

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function loadUsers() {
  for (const file of [usersPath, demoPath]) {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  return [];
}

function normalizeHeader(text) {
  return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
}

function titleCase(text) {
  return String(text).toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase());
}

// Primer nombre o primer apellido, respetando "De la Cruz", "Del Valle", etc.
function firstPart(text) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const taken = [];
  for (const word of words) {
    const lowerWord = word.toLowerCase();
    // "de", "la", "del"... van en minuscula, salvo al inicio: "De la Cruz".
    taken.push(PARTICLES.has(lowerWord) && taken.length ? lowerWord : titleCase(word));
    if (!PARTICLES.has(lowerWord)) break;
  }
  return taken.join(' ');
}

function parseCsv(text) {
  return text.replace(/^﻿/, '').split(/\r?\n/).filter(line => line.trim()).map(line => {
    const cells = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && quoted && line[i + 1] === '"') { current += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if ((char === ',' || char === ';') && !quoted) { cells.push(current.trim()); current = ''; }
      else current += char;
    }
    cells.push(current.trim());
    return cells;
  });
}

function readRows(file) {
  if (!fs.existsSync(file)) fail(`no encontre el archivo ${file}`);
  const ext = path.extname(file).toLowerCase();
  if (ext === '.xlsx') return readXlsxRows(file);
  if (ext === '.csv') return parseCsv(fs.readFileSync(file, 'utf8'));
  fail('usa un archivo .xlsx (Excel) o .csv. Los .xls antiguos: abrelos en Excel y guardalos como .xlsx.');
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Hoja imprimible con un recuadro por alumno para recortar y repartir.
function writeSlips(outFile, issued) {
  const expires = new Date(Date.now() + ACTIVATION_DAYS * 86400000).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const slips = issued.map(item => `
    <div class="slip">
      <p class="name">${escapeHtml(item.name)}</p>
      <p class="meta">${escapeHtml(item.group)}</p>
      <dl>
        <dt>Usuario (matrícula)</dt><dd>${escapeHtml(item.matricula)}</dd>
        <dt>Código de activación</dt><dd class="code">${escapeHtml(item.code)}</dd>
      </dl>
      <p class="help">Escribe tu matrícula y este código en LabControl. Después crea tu propia contraseña. El código sirve una sola vez y vence el ${escapeHtml(expires)}.</p>
    </div>`).join('');
  fs.writeFileSync(outFile, `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Códigos de activación LabControl</title>
<style>
  body { font-family: system-ui, "Segoe UI", sans-serif; margin: 16px; color: #1f1d1c; }
  h1 { font-size: 16px; margin: 0 0 4px; } .note { font-size: 12px; color: #6b6461; margin: 0 0 12px; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0; }
  .slip { border: 1px dashed #9a918d; padding: 12px 14px; break-inside: avoid; }
  .name { font-weight: 700; font-size: 15px; margin: 0; } .meta { font-size: 12px; color: #6b6461; margin: 2px 0 8px; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; margin: 0 0 8px; font-size: 12px; }
  dt { color: #6b6461; } dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
  .code { font-family: ui-monospace, Consolas, monospace; font-size: 16px; letter-spacing: .08em; }
  .help { font-size: 11px; color: #4a4542; margin: 0; }
  @media print { .note { display: none; } body { margin: 8mm; } }
</style></head><body>
<h1>LabControl · Códigos de activación</h1>
<p class="note">Imprime esta hoja (Ctrl+P), recorta y entrega cada recuadro a su alumno. Después borra este archivo: los códigos solo existen aquí.</p>
<div class="grid">${slips}</div>
</body></html>
`, 'utf8');
}

const [command, ...args] = process.argv.slice(2);

if (command === 'importar') {
  const file = args[0];
  if (!file) fail('uso: npm run alumnos -- importar alumnos.xlsx');
  const rows = readRows(file).filter(row => row.some(cell => String(cell || '').trim()));
  if (rows.length < 2) fail('el archivo no tiene alumnos (se esperan titulos en la primera fila y un alumno por fila).');

  const header = rows[0].map(normalizeHeader);
  const col = names => header.findIndex(h => names.includes(h));
  const cols = {
    nombre: col(['nombre', 'nombres', 'primernombre']),
    apellido: col(['apellido', 'apellidos', 'apellidopaterno', 'primerapellido']),
    matricula: col(['matricula', 'matriculas', 'numerodecontrol', 'id']),
    grupo: col(['grupo', 'carrera', 'grupocarrera', 'clase'])
  };
  const missing = Object.entries(cols).filter(([, index]) => index < 0).map(([name]) => name);
  if (missing.length) fail(`faltan columnas en la primera fila: ${missing.join(', ')}. Se esperan: nombre, apellido, matricula, grupo.`);

  const problems = [];
  const seen = new Set();
  const parsed = [];
  rows.slice(1).forEach((row, i) => {
    const line = i + 2;
    const matricula = String(row[cols.matricula] || '').trim().toUpperCase().replace(/\s+/g, '');
    const nombre = firstPart(row[cols.nombre] || '');
    const apellido = firstPart(row[cols.apellido] || '');
    const grupo = String(row[cols.grupo] || '').trim().replace(/\s+/g, ' ');
    if (!matricula || !nombre || !apellido || !grupo) problems.push(`fila ${line}: falta nombre, apellido, matricula o grupo.`);
    else if (!MATRICULA.test(matricula)) problems.push(`fila ${line}: la matricula "${matricula}" no es valida (ejemplo: DES0444).`);
    else if (seen.has(matricula)) problems.push(`fila ${line}: la matricula ${matricula} esta repetida.`);
    else {
      seen.add(matricula);
      parsed.push({ matricula, name: `${nombre} ${apellido}`, group: grupo });
    }
  });
  if (problems.length) {
    console.error('No se importo nada. Corrige estas filas en el archivo y vuelve a intentar:');
    problems.slice(0, 30).forEach(problem => console.error(`  - ${problem}`));
    if (problems.length > 30) console.error(`  ... y ${problems.length - 30} mas.`);
    process.exit(1);
  }

  const users = loadUsers();
  const issued = [];
  let updated = 0;
  for (const item of parsed) {
    const username = item.matricula.toLowerCase();
    const existing = users.find(user => user.username === username);
    if (existing) {
      if (existing.role !== 'student') fail(`la matricula ${item.matricula} ya es una cuenta de ${existing.role}.`);
      Object.assign(existing, { matricula: item.matricula, displayName: item.name, group: item.group });
      updated += 1;
      continue;
    }
    const user = { username, matricula: item.matricula, displayName: item.name, group: item.group, role: 'student' };
    const code = issueActivation(user);
    users.push(user);
    issued.push({ ...item, code });
  }

  writeUsersFile(usersPath, users);
  console.log(`Alumnos nuevos: ${issued.length}. Actualizados: ${updated}.`);
  if (issued.length) {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const out = path.join(path.dirname(path.resolve(file)), `codigos-activacion-${stamp}.html`);
    writeSlips(out, issued);
    console.log(`Hoja de codigos para imprimir: ${out}`);
    console.log('Abrela en el navegador, imprimela, reparte los recuadros y despues BORRA ese archivo.');
  }
} else if (command === 'lista') {
  const students = loadUsers().filter(user => user.role === 'student').map(user => publicStudent(user))
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  if (!students.length) console.log('No hay alumnos.');
  for (const s of students) console.log(`${s.matricula.padEnd(12)} ${s.name.padEnd(28)} ${s.group.padEnd(28)} ${s.status}`);
} else if (command === 'nuevo-codigo') {
  const username = String(args[0] || '').trim().toLowerCase();
  const users = loadUsers();
  const user = users.find(entry => entry.username === username && entry.role === 'student');
  if (!user) fail(`no existe un alumno con la matricula ${args[0] || ''}.`);
  delete user.passwordHash;
  delete user.passwordSalt;
  const code = issueActivation(user);
  writeUsersFile(usersPath, users);
  console.log(`${user.displayName} (${user.matricula}): codigo nuevo ${code}. Vence en ${ACTIVATION_DAYS} dias.`);
} else {
  console.log('Comandos: importar <archivo.xlsx|csv> | lista | nuevo-codigo <matricula>');
}
