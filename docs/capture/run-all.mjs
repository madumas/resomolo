/** Run all capture scripts sequentially. */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scripts = [
  '01-concret.mjs',
  '02-proportionnel.mjs',
  '03-structure.mjs',
  '04-calculer.mjs',
  '05-annoter.mjs',
];

for (const script of scripts) {
  console.log(`\n=== ${script} ===`);
  try {
    execSync(`node ${path.join(__dirname, script)}`, { stdio: 'inherit', timeout: 120000 });
  } catch (e) {
    console.error(`FAILED: ${script} — ${e.message}`);
  }
}
console.log('\n=== All done ===');
