// Descarga una copia local de las librerias del panel (Tailwind y Chart.js)
// para que el panel funcione aunque el laboratorio se quede sin internet.
// Se ejecuta una vez, con internet:  npm run vendor
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vendorDir = path.resolve(__dirname, '..', '..', 'assets', 'vendor');

const FILES = [
  { name: 'tailwindcss.js', url: 'https://cdn.tailwindcss.com/3.4.17' },
  { name: 'chart.umd.min.js', url: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js' }
];

fs.mkdirSync(vendorDir, { recursive: true });
let failed = false;

for (const file of FILES) {
  try {
    const response = await fetch(file.url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length < 10_000) throw new Error('archivo demasiado pequeno');
    fs.writeFileSync(path.join(vendorDir, file.name), body);
    console.log(`Listo: assets/vendor/${file.name} (${Math.round(body.length / 1024)} KB)`);
  } catch (error) {
    failed = true;
    console.error(`No se pudo descargar ${file.name}: ${error.message}`);
  }
}

if (failed) {
  console.error('Revisa la conexion a internet y vuelve a intentar.');
  process.exit(1);
}
console.log('El panel ya puede funcionar sin internet.');
