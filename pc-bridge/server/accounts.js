// Cuentas de LabControl: contrasenas y codigos de activacion de un solo uso.
//
// Un alumno se identifica con su matricula (usuario). La primera vez, o despues
// de que un maestro le restablece el acceso, entra con un codigo de activacion
// y crea su propia contrasena. Contrasenas y codigos se guardan solo como hash.
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';

export const MIN_PASSWORD = 8;
export const ACTIVATION_DAYS = 14;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I/L

function hashSecret(secret, salt) {
  return scryptSync(String(secret), salt, 32).toString('hex');
}

function safeEqualHex(a, b) {
  const left = Buffer.from(String(a || ''), 'hex');
  const right = Buffer.from(String(b || ''), 'hex');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

export function hashPassword(password) {
  const passwordSalt = randomBytes(16).toString('hex');
  return { passwordSalt, passwordHash: hashSecret(password, passwordSalt) };
}

export function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.passwordSalt) return false;
  return safeEqualHex(hashSecret(String(password || ''), user.passwordSalt), user.passwordHash);
}

// Codigo legible de 6 caracteres, por ejemplo K7Q-4M2.
export function generateActivationCode() {
  const pick = () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}`;
}

export function normalizeCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Asigna un codigo nuevo a la cuenta y devuelve el codigo en claro (una sola vez).
export function issueActivation(user, now = Date.now()) {
  const code = generateActivationCode();
  user.activationSalt = randomBytes(16).toString('hex');
  user.activationHash = hashSecret(normalizeCode(code), user.activationSalt);
  user.activationExpires = now + ACTIVATION_DAYS * 24 * 60 * 60 * 1000;
  return code;
}

export function verifyActivation(code, user, now = Date.now()) {
  if (!user?.activationHash || !user?.activationSalt) return false;
  if (Number(user.activationExpires || 0) < now) return false;
  return safeEqualHex(hashSecret(normalizeCode(code), user.activationSalt), user.activationHash);
}

export function clearActivation(user) {
  delete user.activationSalt;
  delete user.activationHash;
  delete user.activationExpires;
}

export function validateNewPassword(password, user) {
  const value = String(password || '');
  if (value.length < MIN_PASSWORD) return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  if (user?.username && value.toLowerCase().includes(String(user.username).toLowerCase())) {
    return 'La contraseña no puede contener tu matrícula.';
  }
  return '';
}

// Escritura segura: primero un archivo temporal y luego se reemplaza.
export function writeUsersFile(file, users) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(users, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}

// Datos de un alumno que puede ver el maestro (nunca hashes ni codigos).
export function publicStudent(user, now = Date.now()) {
  let status = 'activo';
  if (!user.passwordHash) status = Number(user.activationExpires || 0) > now ? 'pendiente' : 'codigo vencido';
  return {
    username: user.username,
    matricula: user.matricula || String(user.username || '').toUpperCase(),
    name: user.displayName,
    group: user.group || '',
    status
  };
}
