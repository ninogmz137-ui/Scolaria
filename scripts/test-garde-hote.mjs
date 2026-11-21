// Prouve le refus de la garde d'hôte : cas unitaires, puis REFUS réel de chaque script de test local lorsqu'on lui force une URL
// de Paris (SCOLARIA_TEST_FORCER_URL, lue seulement par la garde, qui ne peut que la durcir — voir garde-hote.mjs ; aucune
// requête n'est émise : le refus survient avant toute connexion).
// Usage : npm run test:garde-hote
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { verifierHoteLocal } from './garde-hote.mjs';

let echecs = 0;
const ok = (c, m) => {
  console.log(`${c ? 'OK    ' : 'ECHEC '} ${m}`);
  if (!c) echecs++;
};

const refus = [
  'https://nmizwmymhqleasnxcyvu.supabase.co',
  'https://nmizwmymhqleasnxcyvu.supabase.co/?h=localhost',
  'http://localhost.evil.example',
  'https://exemple.supabase.co/?x=127.0.0.1',
  'http://192.168.1.20:54321',
  'http://127.0.0.1.nip.io:54321',
  'n-importe-quoi',
  '',
];
for (const u of refus) ok(!verifierHoteLocal(u).ok, `refusée : « ${u || '(vide)'} »`);
for (const u of ['http://127.0.0.1:54321', 'http://localhost:54321', 'http://[::1]:54321']) ok(verifierHoteLocal(u).ok, `acceptée : ${u}`);

// Chaque script local doit appeler la garde (balayage) ET refuser pour de vrai.
const scripts = readdirSync('scripts').filter((f) => /^(test-.*-local\.mts|audit-securite-local\.mts|seed-web-local\.mjs|web-local\.mjs)$/.test(f));
for (const f of scripts) {
  const src = readFileSync(`scripts/${f}`, 'utf8');
  ok(/exigerHoteLocal\(/.test(src), `${f} appelle exigerHoteLocal`);
  ok(!/\/127\\\.0\\\.0\\\.1\|localhost\//.test(src), `${f} n'utilise plus l'ancien test « contient localhost »`);
  const r = spawnSync(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', `scripts/${f}`], {
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, SCOLARIA_TEST_FORCER_URL: 'https://nmizwmymhqleasnxcyvu.supabase.co' },
  });
  ok(r.status === 2 && /REFUS \(garde d'hôte\)/.test(r.stderr ?? ''), `${f} refuse une URL de Paris (code ${r.status})`);
}
console.log(echecs ? `\n${echecs} échec(s).` : '\nGarde d’hôte : tout est refusé comme prévu.');
process.exit(echecs ? 1 : 0);
