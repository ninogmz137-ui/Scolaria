// Prouve que les scripts de sauvegarde / restauration / vérification REFUSENT toute destination située dans le dépôt.
// Cas unitaires (chemin résolu : « .. », dossier inexistant, jonction), puis REFUS RÉEL de chaque script : sortie 2 et rien d'écrit.
// Usage : npm run test:garde-destination   (aucune base, aucun réseau : le refus survient avant toute connexion)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { estDansDepot } from './garde-destination.mjs';

const depot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let echecs = 0;
const ok = (c, m) => {
  console.log(`${c ? 'OK    ' : 'ECHEC '} ${m}`);
  if (!c) echecs++;
};

// 1. Cas unitaires
const dedans = [
  depot,
  path.join(depot, 'sauvegardes'),
  path.join(depot, 'a', 'b', 'inexistant'),
  path.join(depot, 'scripts', '..', 'x'),
  path.join(depot, '..', path.basename(depot), 'x'),
  depot.toUpperCase() + path.sep + 'x', // casse différente (Windows)
];
const dehors = [
  path.join(path.dirname(depot), 'ScolariaBackups', 'hebdo'),
  path.join(path.dirname(depot), path.basename(depot) + '-copie'), // même préfixe, autre dossier
  path.join(os.tmpdir(), 'sauvegarde-test'),
  'C:\\Users\\admin\\ScolariaBackups\\avant_M99',
];
for (const c of dedans) ok(estDansDepot(c, depot), `dans le dépôt : ${c}`);
for (const c of dehors) ok(!estDansDepot(c, depot), `hors du dépôt : ${c}`);

// 2. Jonction : un chemin hors dépôt qui MÈNE dans le dépôt est refusé (chemin résolu)
const jonction = path.join(os.tmpdir(), `jonction-garde-${process.pid}`);
try {
  fs.symlinkSync(path.join(depot, 'scripts'), jonction, 'junction');
  ok(estDansDepot(path.join(jonction, 'nouveau'), depot), 'jonction hors dépôt menant au dépôt : refusée');
} catch (e) {
  ok(false, `jonction non testable : ${e.code}`);
} finally {
  try { fs.rmSync(jonction, { recursive: false, force: true }); } catch { /* jonction seule retirée */ }
}

// 3. Refus réel de chaque script (sortie 2, message, RIEN écrit dans le dépôt)
const cibleDepot = path.join(depot, `essai-garde-${process.pid}`);
const lancer = (script, args) =>
  spawnSync(process.execPath, [path.join('scripts', script), ...args], { cwd: depot, encoding: 'utf8', timeout: 20000 });
const cas = [
  ['sauvegarde-semaine.mjs', ['--racine', cibleDepot]],
  ['sauvegarde-semaine.mjs', ['--cible', 'local', '--racine', path.join(depot, 'scripts', '..', 'x-' + process.pid)]],
  ['restaurer-sauvegarde.mjs', [cibleDepot]],
  ['verifier-sauvegarde.mjs', [cibleDepot]],
];
for (const [script, args] of cas) {
  const r = lancer(script, args);
  ok(r.status === 2 && /garde de destination/.test(r.stderr), `${script} ${args[0]} : refus (sortie ${r.status})`);
}
ok(!fs.existsSync(cibleDepot), 'rien n\'a été créé dans le dépôt');
ok(fs.readdirSync(depot).every((f) => !/^(essai-garde|x-)/.test(f)), 'aucun dossier d\'essai dans le dépôt');

// 4. Aucun refus à tort : un dossier hors dépôt passe la garde (vérifier-sauvegarde échoue ensuite pour une autre raison : dossier absent)
const hors = path.join(os.tmpdir(), `hors-depot-${process.pid}`);
const r = lancer('verifier-sauvegarde.mjs', [hors]);
ok(!/garde de destination/.test(r.stderr + r.stdout), 'dossier hors dépôt : la garde ne refuse pas');

console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nGARDE DE DESTINATION : tout est conforme.');
process.exit(echecs ? 1 : 0);
