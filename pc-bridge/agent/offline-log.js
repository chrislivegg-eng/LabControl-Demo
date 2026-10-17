// Registro de actividad mientras el servidor no responde.
//
// - Solo guarda cambios de app o ventana (no cada 5 segundos) y su duracion.
// - Cada entrada lleva un numero de secuencia y un hash encadenado con la
//   anterior, para que el servidor note si faltan entradas o fueron editadas.
//   No impide que alguien borre el archivo; solo hace visible la alteracion.
// - Se conservan como maximo MAX_AGE_DAYS dias y MAX_ENTRIES entradas.
// - No bloquea nada: solo registra.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const MAX_AGE_DAYS = 7;
const MAX_ENTRIES = 20000;
const MAX_TITLE = 200;
const UPLOAD_BATCH = 500;

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function entryHash(entry) {
  const { hash, ...rest } = entry;
  // Forma canonica: llaves ordenadas, igual que en el servidor.
  const canonical = Object.keys(rest).sort().map(key => [key, rest[key]]);
  return sha256(JSON.stringify(canonical));
}

export class OfflineLog {
  constructor(dir) {
    this.file = path.join(dir, 'offline-log.json');
    this.state = { nextSeq: 1, lastHash: '', entries: [] };
    this.current = null;
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (Array.isArray(saved.entries)) this.state = saved;
    } catch {
      // Primer uso o archivo danado: se empieza de nuevo.
    }
  }

  get pendingCount() {
    return this.state.entries.length + (this.current ? 1 : 0);
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.state), 'utf8');
    } catch (error) {
      console.error(`No pude guardar el registro sin conexion: ${error.message}`);
    }
  }

  prune(now = Date.now()) {
    const minTime = now - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    let entries = this.state.entries.filter(entry => entry.end >= minTime);
    if (entries.length > MAX_ENTRIES) entries = entries.slice(entries.length - MAX_ENTRIES);
    this.state.entries = entries;
  }

  // Llamar en cada ciclo sin servidor con la ventana activa.
  record({ processName, title, windowsUser, student }, now = Date.now()) {
    const cleanTitle = String(title || '').slice(0, MAX_TITLE);
    const cleanProcess = String(processName || 'desconocido').slice(0, 80);
    const same = this.current
      && this.current.processName === cleanProcess
      && this.current.title === cleanTitle
      && this.current.student === String(student || '').slice(0, 80);

    if (same) {
      this.current.end = now;
      return;
    }
    this.closeCurrent(now);
    this.current = {
      start: now,
      end: now,
      processName: cleanProcess,
      title: cleanTitle,
      windowsUser: String(windowsUser || '').slice(0, 80),
      student: String(student || '').slice(0, 80)
    };
  }

  // Cierra la entrada en curso y la agrega a la cadena.
  closeCurrent(now = Date.now()) {
    if (!this.current) return;
    const entry = {
      seq: this.state.nextSeq,
      prevHash: this.state.lastHash,
      ...this.current,
      end: Math.max(this.current.end, Math.min(now, this.current.end + 10000))
    };
    entry.hash = entryHash(entry);
    this.state.entries.push(entry);
    this.state.nextSeq += 1;
    this.state.lastHash = entry.hash;
    this.current = null;
    this.prune(now);
    this.save();
  }

  // Envia lo pendiente al servidor por lotes. `send` recibe un arreglo de
  // entradas y debe lanzar error si no se pudo entregar.
  async flush(send, now = Date.now()) {
    this.closeCurrent(now);
    while (this.state.entries.length) {
      const batch = this.state.entries.slice(0, UPLOAD_BATCH);
      await send(batch);
      this.state.entries = this.state.entries.slice(batch.length);
      this.save();
    }
  }
}
