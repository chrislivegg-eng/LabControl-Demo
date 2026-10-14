// Administracion de cuentas de LabControl (server/users.json).
// Las contrasenas se guardan con scrypt + salt, nunca en texto plano.
//
//   npm run users -- list
//   npm run users -- add <usuario> <alumno|maestro|admin> "<Nombre>" [contrasena]
//   npm run users -- passwd <usuario> [contrasena]
//   npm run users -- remove <usuario>
//   npm run users -- import alumnos.csv        (columnas: usuario,nombre,rol[,contrasena])
//   npm run users -- remove-demo               (borra las cuentas demo)
//
// Si no se da contrasena, se genera una y se muestra UNA vez en pantalla.
// En import, las contrasenas generadas se guardan en un CSV para repartirlas.

import { randomBytes, randomInt, scryptSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const usersPath = process.env.LABCONTROL_USERS || path.resolve(__dirname, '..', 'server', 'users.json');

const DEMO_USERS = ['chris', 'bebe1', 'alumno1', 'maestro', 'docente', 'profeana', 'coordlab'];
const ROLE_ALIASES = {
  alumno: 'student', student: 'student',
  maestro: 'teacher', docente: 'teacher', teacher: 'teacher',
  admin: 'admin', administrador: 'admin'
};
const ROLE_LABELS = { student: 'Alumno', teacher: 'Maestro', admin: 'Admin' };
const MIN_PASSWORD = 8;

function load() {
  if (fs.existsSync(usersPath)) return JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  const demoPath = path.resolve(__dirname, '..', 'server', 'users.demo.json');
  return !process.env.LABCONTROL_USERS && fs.existsSync(demoPath) ? JSON.parse(fs.readFileSync(demoPath, 'utf8')) : [];
}

function save(users) {
  fs.writeFileSync(usersPath, `${JSON.stringify(users, null, 2)}\n`, 'utf8');
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function normalizeUsername(value) {
  const username = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    fail(`usuario no valido "${value}". Usa 3-40 letras, numeros, punto, guion o guion bajo, sin espacios ni acentos.`);
  }
  return username;
}

function normalizeRole(value) {
  const role = ROLE_ALIASES[String(value || '').trim().toLowerCase()];
  if (!role) fail(`rol no valido "${value}". Usa alumno, maestro o admin.`);
  return role;
}

// Sin caracteres que se confunden (0/O, 1/l/I).
function generatePassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const pick = set => set[randomInt(set.length)];
  return `${pick(upper)}${Array.from({ length: 5 }, () => pick(letters)).join('')}-${Array.from({ length: 4 }, () => pick(digits)).join('')}`;
}

function hashPassword(password) {
  if (String(password).length < MIN_PASSWORD) fail(`la contrasena debe tener al menos ${MIN_PASSWORD} caracteres.`);
  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = scryptSync(String(password), passwordSalt, 32).toString('hex');
  return { passwordSalt, passwordHash };
}

function parseCsvLine(line) {
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
}

const [command, ...args] = process.argv.slice(2);
const users = load();
const findIndex = username => users.findIndex(user => user.username === username);

switch (command) {
  case 'list': {
    if (!users.length) console.log('No hay cuentas.');
    for (const user of users) {
      const demo = DEMO_USERS.includes(user.username) ? '  (demo)' : '';
      console.log(`${user.username.padEnd(20)} ${ROLE_LABELS[user.role] || user.role}`.padEnd(30) + ` ${user.displayName}${demo}`);
    }
    break;
  }

  case 'add': {
    const [rawUser, rawRole, displayName, givenPassword] = args;
    if (!rawUser || !rawRole || !displayName) fail('uso: add <usuario> <alumno|maestro|admin> "<Nombre>" [contrasena]');
    const username = normalizeUsername(rawUser);
    if (findIndex(username) >= 0) fail(`el usuario ${username} ya existe. Usa passwd para cambiar su contrasena.`);
    const password = givenPassword || generatePassword();
    users.push({ username, displayName: displayName.trim(), ...hashPassword(password), role: normalizeRole(rawRole) });
    save(users);
    console.log(`Cuenta creada: ${username}${givenPassword ? '' : `  contrasena: ${password}`}`);
    break;
  }

  case 'passwd': {
    const [rawUser, givenPassword] = args;
    const username = normalizeUsername(rawUser);
    const index = findIndex(username);
    if (index < 0) fail(`no existe el usuario ${username}.`);
    const password = givenPassword || generatePassword();
    Object.assign(users[index], hashPassword(password));
    save(users);
    console.log(`Contrasena actualizada: ${username}${givenPassword ? '' : `  nueva: ${password}`}`);
    break;
  }

  case 'remove': {
    const username = normalizeUsername(args[0]);
    const index = findIndex(username);
    if (index < 0) fail(`no existe el usuario ${username}.`);
    users.splice(index, 1);
    save(users);
    console.log(`Cuenta eliminada: ${username}`);
    break;
  }

  case 'remove-demo': {
    const remaining = users.filter(user => !DEMO_USERS.includes(user.username));
    const removed = users.length - remaining.length;
    if (!remaining.some(user => user.role === 'teacher' || user.role === 'admin')) {
      fail('primero crea al menos una cuenta de maestro o admin real; si no, nadie podria entrar al panel.');
    }
    save(remaining);
    console.log(`Cuentas demo eliminadas: ${removed}`);
    break;
  }

  case 'import': {
    const file = args[0];
    if (!file || !fs.existsSync(file)) fail('uso: import <archivo.csv>  (columnas: usuario,nombre,rol[,contrasena])');
    const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(line => line.trim());
    const header = parseCsvLine(lines[0]).map(cell => cell.toLowerCase());
    const hasHeader = header.includes('usuario') || header.includes('username');
    const rows = (hasHeader ? lines.slice(1) : lines).map(parseCsvLine);
    const issued = [];
    let created = 0;
    let skipped = 0;

    for (const [rawUser, displayName, rawRole = 'alumno', givenPassword] of rows) {
      if (!rawUser) continue;
      const username = normalizeUsername(rawUser);
      if (findIndex(username) >= 0) {
        console.log(`Omitido (ya existe): ${username}`);
        skipped += 1;
        continue;
      }
      const password = givenPassword || generatePassword();
      users.push({ username, displayName: displayName || username, ...hashPassword(password), role: normalizeRole(rawRole) });
      if (!givenPassword) issued.push([username, displayName || username, password]);
      created += 1;
    }

    save(users);
    console.log(`Importadas: ${created}. Omitidas: ${skipped}.`);
    if (issued.length) {
      const out = path.join(path.dirname(path.resolve(file)), `contrasenas-${Date.now()}.csv`);
      fs.writeFileSync(out, `usuario,nombre,contrasena\n${issued.map(row => row.map(c => `"${c}"`).join(',')).join('\n')}\n`, 'utf8');
      console.log(`Contrasenas generadas en: ${out}`);
      console.log('Repartelas a cada alumno y despues BORRA ese archivo.');
    }
    break;
  }

  default:
    console.log('Comandos: list | add | passwd | remove | import | remove-demo');
    console.log('Ejemplo: npm run users -- add jperez alumno "Juan Perez"');
}
