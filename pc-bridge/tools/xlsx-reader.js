// Lector minimo de Excel (.xlsx) sin dependencias: devuelve las filas de la
// primera hoja como arreglos de texto. Un .xlsx es un ZIP con archivos XML.
import fs from 'node:fs';
import zlib from 'node:zlib';

function readZipEntries(buffer) {
  // Fin del directorio central (firma 0x06054b50), buscando desde el final.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('el archivo no parece un Excel (.xlsx) valido.');

  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();

  for (let n = 0; n < count; n += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('el Excel esta danado.');
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    entries.set(name, { method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return name => {
    const entry = entries.get(name);
    if (!entry) return null;
    const local = entry.localOffset;
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(start, start + entry.compressedSize);
    if (entry.method === 0) return data.toString('utf8');
    if (entry.method === 8) return zlib.inflateRawSync(data).toString('utf8');
    throw new Error('formato de compresion no soportado en el Excel.');
  };
}

function decodeXml(text) {
  return String(text)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&');
}

function textOf(xml) {
  return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(match => decodeXml(match[1])).join('');
}

function columnIndex(ref) {
  const letters = String(ref).match(/^[A-Z]+/)?.[0] || 'A';
  return [...letters].reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0) - 1;
}

function firstSheetPath(read) {
  const workbook = read('xl/workbook.xml');
  const rels = read('xl/_rels/workbook.xml.rels');
  const firstId = workbook?.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  if (firstId && rels) {
    const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map(m => m[0]).find(tag => tag.includes(`Id="${firstId}"`));
    const target = rel?.match(/Target="([^"]+)"/)?.[1];
    if (target) return target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  }
  return 'xl/worksheets/sheet1.xml';
}

export function readXlsxRows(file) {
  const read = readZipEntries(fs.readFileSync(file));
  const shared = read('xl/sharedStrings.xml');
  const strings = shared ? [...shared.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(match => textOf(match[1])) : [];
  const sheet = read(firstSheetPath(read));
  if (!sheet) throw new Error('no encontre la primera hoja del Excel.');

  const rows = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cell of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cell[1];
      const body = cell[2] || '';
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
      const type = attrs.match(/\bt="([^"]+)"/)?.[1];
      const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = '';
      if (type === 's') value = strings[Number(raw)] ?? '';
      else if (type === 'inlineStr') value = textOf(body);
      else if (raw !== undefined) value = decodeXml(raw);
      row[ref ? columnIndex(ref) : row.length] = String(value).trim();
    }
    rows.push(Array.from(row, cell => cell ?? ''));
  }
  return rows;
}
