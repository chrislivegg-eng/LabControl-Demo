// Guarda la actividad que las PCs registraron mientras el servidor estaba
// apagado y revisa su integridad (secuencia y hashes encadenados).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_HASHES = 2000;

// Debe coincidir con agent/offline-log.js (llaves ordenadas).
function entryHash(entry) {
  const { hash, ...rest } = entry;
  const canonical = Object.keys(rest).sort().map(key => [key, rest[key]]);
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export class OfflineStore {
  constructor(serverDir) {
    this.dataFile = path.join(serverDir, 'offline-activity.jsonl');
    this.stateFile = path.join(serverDir, 'offline-state.json');
    try {
      this.state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
    } catch {
      this.state = {};
    }
  }

  saveState() {
    fs.writeFileSync(this.stateFile, `${JSON.stringify(this.state, null, 2)}\n`, 'utf8');
  }

  // Recibe un lote de una PC. Devuelve cuantas entradas se guardaron y avisos.
  ingest({ agentId, pc, windowsUser, entries }, { now = Date.now() } = {}) {
    const agentState = this.state[agentId] || { lastSeq: 0, lastHash: '', recent: [] };
    const lines = [];
    let stored = 0;
    let duplicates = 0;

    for (const raw of entries) {
      const entry = {
        seq: Number(raw.seq),
        prevHash: String(raw.prevHash || ''),
        start: Number(raw.start),
        end: Number(raw.end),
        processName: String(raw.processName || '').slice(0, 80),
        title: String(raw.title || '').slice(0, 200),
        windowsUser: String(raw.windowsUser || '').slice(0, 80),
        student: String(raw.student || '').slice(0, 80),
        hash: String(raw.hash || '')
      };
      if (!Number.isFinite(entry.seq) || !Number.isFinite(entry.start) || !Number.isFinite(entry.end)) continue;

      // Reenvio de un lote que ya llego (por ejemplo, se perdio la respuesta).
      if (agentState.recent.includes(entry.hash)) {
        duplicates += 1;
        continue;
      }

      const flags = [];
      if (entryHash(entry) !== entry.hash) flags.push('alterada');
      if (agentState.lastSeq && entry.seq <= agentState.lastSeq) flags.push('registro reiniciado');
      else if (agentState.lastSeq && entry.seq !== agentState.lastSeq + 1) flags.push('faltan entradas');
      else if (agentState.lastHash && entry.prevHash !== agentState.lastHash) flags.push('faltan entradas');
      if (entry.start > now + 5 * 60 * 1000 || entry.end < entry.start) flags.push('hora invalida');

      lines.push(JSON.stringify({ agentId, pc, windowsUser, receivedAt: now, flags, ...entry }));
      agentState.lastSeq = entry.seq;
      agentState.lastHash = entry.hash;
      agentState.recent.push(entry.hash);
      stored += 1;
    }

    agentState.recent = agentState.recent.slice(-RECENT_HASHES);
    this.state[agentId] = agentState;
    if (lines.length) fs.appendFileSync(this.dataFile, `${lines.join('\n')}\n`, 'utf8');
    this.saveState();
    return { stored, duplicates };
  }

  // Ultimos 7 dias, agrupado por PC, con la decision de reglas de cada entrada.
  summary(evaluate, { now = Date.now() } = {}) {
    let raw = '';
    try {
      raw = fs.readFileSync(this.dataFile, 'utf8');
    } catch {
      return { pcs: [] };
    }

    const byPc = new Map();
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      if (entry.end < now - MAX_AGE_MS) continue;

      const decision = evaluate(entry);
      const group = byPc.get(entry.agentId) || {
        agentId: entry.agentId,
        pc: entry.pc,
        windowsUsers: new Set(),
        students: new Set(),
        from: entry.start,
        to: entry.end,
        totalSeconds: 0,
        alerts: 0,
        integrityIssues: 0,
        entries: []
      };
      if (entry.windowsUser) group.windowsUsers.add(entry.windowsUser);
      if (entry.student) group.students.add(entry.student);
      group.from = Math.min(group.from, entry.start);
      group.to = Math.max(group.to, entry.end);
      group.totalSeconds += Math.max(0, Math.round((entry.end - entry.start) / 1000));
      if (decision.blocked) group.alerts += 1;
      if (entry.flags?.length) group.integrityIssues += 1;
      group.entries.push({
        start: entry.start,
        end: entry.end,
        app: decision.app,
        title: entry.title,
        student: entry.student,
        windowsUser: entry.windowsUser,
        allowed: !decision.blocked,
        matchedRule: decision.matchedRule || '',
        flags: entry.flags || []
      });
      byPc.set(entry.agentId, group);
    }

    const pcs = [...byPc.values()]
      .map(group => ({
        ...group,
        windowsUsers: [...group.windowsUsers],
        students: [...group.students],
        entries: group.entries.sort((a, b) => b.start - a.start).slice(0, 300)
      }))
      .sort((a, b) => b.to - a.to);

    return { pcs };
  }
}
