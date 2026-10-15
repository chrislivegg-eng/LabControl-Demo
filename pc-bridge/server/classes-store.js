// Clases y grupos del laboratorio (server/classes.json, fuera de Git).
//
// {
//   "groups": [
//     { "id": "sexto-logistica", "name": "Sexto Logistica",
//       "students": ["jperez", "mlopez"],     cuentas de alumno del grupo
//       "pcs": ["LAB-PC-01", "LAB-PC-02"],    PCs asignadas (opcional)
//       "teachers": ["profe.ruiz"] }          maestros del grupo (vacio = todos)
//   ]
// }
//
// Un equipo aparece en la clase si el alumno con sesion es del grupo, o si la
// PC esta asignada al grupo (asi tambien se ven las PCs en "Login pendiente").
import fs from 'node:fs';
import path from 'node:path';

export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const lower = value => String(value || '').trim().toLowerCase();
const uniqueLower = list => [...new Set((list || []).map(lower).filter(Boolean))];

export class ClassesStore {
  constructor(serverDir, file = process.env.LABCONTROL_CLASSES) {
    this.file = file || path.join(serverDir, 'classes.json');
  }

  load() {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      const groups = Array.isArray(data.groups) ? data.groups : [];
      return {
        groups: groups.map(group => ({
          id: String(group.id || slugify(group.name)),
          name: String(group.name || group.id),
          students: uniqueLower(group.students),
          pcs: uniqueLower(group.pcs),
          teachers: uniqueLower(group.teachers)
        }))
      };
    } catch {
      return { groups: [] };
    }
  }

  save(data) {
    fs.writeFileSync(this.file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }

  // Clases que puede elegir un maestro: las suyas, las que no tienen maestros
  // asignados, o todas si es admin.
  visibleTo(teacher) {
    return this.load().groups.filter(group =>
      teacher.role === 'admin'
      || group.teachers.length === 0
      || group.teachers.includes(lower(teacher.username)));
  }

  find(id) {
    return this.load().groups.find(group => group.id === id) || null;
  }

  // ¿Este reporte pertenece a la clase?
  static includes(group, { username, pc }) {
    if (!group) return true;
    return (username && group.students.includes(lower(username)))
      || (pc && group.pcs.includes(lower(pc)));
  }
}
