// Historial de uso por dia (server/history/AAAA-MM-DD.json, fuera de Git).
//
// Con cada reporte de una PC se suma el tiempo transcurrido desde su reporte
// anterior a la app que esta usando el alumno. Por privacidad solo se guarda
// el nombre de la app y si estaba permitida; para paginas prohibidas tambien
// el sitio que coincidio con la regla (por ejemplo "youtube.com"), nunca el
// titulo de la ventana.
import fs from 'node:fs';
import path from 'node:path';

const MAX_GAP_MS = 15000;       // si una PC deja de reportar, no se cuenta el hueco
const SAVE_EVERY_MS = 30000;
const KEEP_DAYS = 120;

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isDayKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

export class HistoryStore {
  constructor(dataDir) {
    this.dir = path.join(dataDir, 'history');
    fs.mkdirSync(this.dir, { recursive: true });
    this.days = new Map();      // dia -> datos en memoria
    this.dirty = new Set();
    this.lastBeat = new Map();  // agentId -> { time, username }
    this.timer = setInterval(() => this.flush(), SAVE_EVERY_MS);
    this.timer.unref?.();
    this.prune();
  }

  file(day) {
    return path.join(this.dir, `${day}.json`);
  }

  load(day) {
    if (this.days.has(day)) return this.days.get(day);
    let data = { date: day, students: {} };
    try {
      data = JSON.parse(fs.readFileSync(this.file(day), 'utf8'));
    } catch { /* dia sin datos */ }
    this.days.set(day, data);
    return data;
  }

  // Un reporte de una PC con sesion de alumno.
  record({ agentId, username, name, matricula, group, pc, app, blocked, site }, now = Date.now()) {
    const previous = this.lastBeat.get(agentId);
    this.lastBeat.set(agentId, { time: now, username });
    if (!previous || previous.username !== username) return;
    const delta = Math.min(now - previous.time, MAX_GAP_MS);
    if (delta <= 0) return;

    const day = dayKey(new Date(now));
    const data = this.load(day);
    const student = data.students[username] || (data.students[username] = {
      name, matricula, group, pcs: [], firstSeen: now, lastSeen: now, apps: {}
    });
    Object.assign(student, { name, matricula, group });
    if (pc && !student.pcs.includes(pc)) student.pcs.push(pc);
    student.lastSeen = now;

    const label = blocked && site ? `${app} · ${site}` : app;
    const entry = student.apps[label] || (student.apps[label] = { seconds: 0, blocked: false });
    entry.seconds += delta / 1000;
    if (blocked) entry.blocked = true;
    this.dirty.add(day);
  }

  flush() {
    for (const day of this.dirty) {
      try {
        const tmp = `${this.file(day)}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(this.days.get(day)), 'utf8');
        fs.renameSync(tmp, this.file(day));
      } catch (error) {
        console.error(`No pude guardar el historial ${day}: ${error.message}`);
      }
    }
    this.dirty.clear();
    // Solo se queda en memoria el dia de hoy.
    const today = dayKey();
    for (const day of this.days.keys()) if (day !== today) this.days.delete(day);
  }

  prune(now = Date.now()) {
    const limit = dayKey(new Date(now - KEEP_DAYS * 86400000));
    for (const file of fs.readdirSync(this.dir)) {
      const day = file.replace(/\.json$/, '');
      if (isDayKey(day) && day < limit) fs.rmSync(this.file(day), { force: true });
    }
  }

  // Suma de un rango de dias: por alumno y por app.
  summary(from, to) {
    if (!isDayKey(from) || !isDayKey(to) || from > to) throw new Error('Rango de fechas no valido.');
    this.flush();
    const students = new Map();
    const apps = new Map();
    const cursor = new Date(`${from}T12:00:00`);
    const end = new Date(`${to}T12:00:00`);
    let days = 0;

    while (cursor <= end && days < 370) {
      const data = this.load(dayKey(cursor));
      for (const [username, s] of Object.entries(data.students || {})) {
        const total = students.get(username) || {
          username, name: s.name, matricula: s.matricula, group: s.group,
          pcs: new Set(), firstSeen: s.firstSeen, lastSeen: s.lastSeen, seconds: 0, blockedSeconds: 0, apps: new Map()
        };
        s.pcs.forEach(pc => total.pcs.add(pc));
        total.firstSeen = Math.min(total.firstSeen, s.firstSeen);
        total.lastSeen = Math.max(total.lastSeen, s.lastSeen);
        for (const [label, a] of Object.entries(s.apps || {})) {
          total.seconds += a.seconds;
          if (a.blocked) total.blockedSeconds += a.seconds;
          const per = total.apps.get(label) || { name: label, seconds: 0, blocked: false };
          per.seconds += a.seconds;
          per.blocked = per.blocked || a.blocked;
          total.apps.set(label, per);
          const all = apps.get(label) || { name: label, seconds: 0, blocked: false };
          all.seconds += a.seconds;
          all.blocked = all.blocked || a.blocked;
          apps.set(label, all);
        }
        students.set(username, total);
      }
      cursor.setDate(cursor.getDate() + 1);
      days += 1;
    }

    const round = item => ({ ...item, seconds: Math.round(item.seconds) });
    return {
      from,
      to,
      students: [...students.values()]
        .map(s => ({
          ...s,
          pcs: [...s.pcs],
          seconds: Math.round(s.seconds),
          blockedSeconds: Math.round(s.blockedSeconds),
          apps: [...s.apps.values()].map(round).sort((a, b) => b.seconds - a.seconds)
        }))
        .sort((a, b) => b.seconds - a.seconds),
      apps: [...apps.values()].map(round).sort((a, b) => b.seconds - a.seconds)
    };
  }
}
