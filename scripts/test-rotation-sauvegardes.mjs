// Test de la rotation par âge sur des dossiers FACTICES datés (dossier temporaire hors dépôt) — aucune vraie sauvegarde touchée.
//   npm run test:rotation-sauvegardes
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { appliquerRotation, planifierRotation } from './rotation-sauvegardes.mjs';

let echecs = 0;
const ok = (c, m) => {
  console.log(`${c ? 'OK    ' : 'ECHEC '} ${m}`);
  if (!c) echecs++;
};

const maintenant = new Date(2026, 9, 20, 12, 0); // 20 oct 2026, midi
const ilYa = (j, h = 10, mi = 30) => {
  const d = new Date(maintenant.getTime() - j * 86_400_000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(h)}${p(mi)}`;
};
const racineTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rotation-test-'));
const parent = racineTmp;
const racine = path.join(parent, 'hebdo');
fs.mkdirSync(racine);
const mk = (d, avecManifeste = false) => {
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'donnees.txt'), 'x');
  if (avecManifeste) fs.writeFileSync(path.join(d, 'manifeste.json'), '{}');
};

// hebdomadaires : 0, 10, 55, 57, 200 jours ; un dossier SANS manifeste (incomplet) de 300 jours : ignoré
for (const j of [0, 10, 55, 57, 200]) mk(path.join(racine, ilYa(j)), true);
mk(path.join(racine, ilYa(300)), false);
// avant_Mxx : date dans le nom (5, 29, 31 jours), sans date dans le nom mais sous-dossier daté (40 jours), sans rien (mtime 3 jours)
mk(path.join(parent, `${ilYa(5).slice(0, 10)}_avant_M90`));
mk(path.join(parent, `${ilYa(29).slice(0, 10)}_avant_M91`));
mk(path.join(parent, `${ilYa(31).slice(0, 10)}_avant_M92`));
mk(path.join(parent, 'avant_M93', ilYa(40)));
fs.mkdirSync(path.join(parent, 'avant_M94'));
const t3 = new Date(maintenant.getTime() - 3 * 86_400_000);
fs.utimesSync(path.join(parent, 'avant_M94'), t3, t3);
// jamais touchés : ni « avant », ni hebdo
mk(path.join(parent, 'captures-vieilles'));
mk(path.join(parent, 'migrations-en-attente'));
fs.utimesSync(path.join(parent, 'captures-vieilles'), new Date(2020, 0, 1), new Date(2020, 0, 1));

const plan = planifierRotation({ racine, parent, maintenant });
const aPurger = plan.tous.filter((x) => x.aPurger).map((x) => path.basename(x.dossier)).sort();
const attendu = [ilYa(57), ilYa(200), `${ilYa(31).slice(0, 10)}_avant_M92`, 'avant_M93'].sort();
ok(JSON.stringify(aPurger) === JSON.stringify(attendu), `plan : à purger = hebdo 57 et 200 jours, avant_M92 (31 j), avant_M93 (40 j) — obtenu : ${aPurger.length}`);
ok(plan.hebdo.length === 5, '5 sauvegardes complètes vues (le dossier sans manifeste est ignoré)');
ok(plan.avant.find((x) => x.nom === 'avant_M94').jours === 3, 'dossier sans date : âge pris sur la date de modification (3 jours)');
ok(plan.avant.find((x) => x.nom === 'avant_M93').source === 'sous-dossier', 'avant_M93 : âge pris sur le sous-dossier daté');
ok(!plan.tous.some((x) => /captures|migrations-en-attente/.test(x.nom)), 'captures-… et migrations-en-attente ne sont pas des candidats');
ok(plan.hebdo.find((x) => x.nom === ilYa(55)).aPurger === false, 'hebdomadaire de 55 jours conservé (< 56)');

const journal = [];
const supprimes = appliquerRotation(plan, { racine, parent, journaliser: (s, d) => journal.push([s, d]) });
ok(supprimes.length === 4 && journal.length === 4 && journal.every(([s]) => s === 'PURGE'), `4 suppressions, 4 lignes de journal « PURGE » (${journal.map((j) => j[1]).join(' | ')})`);
ok(!fs.existsSync(path.join(racine, ilYa(57))) && !fs.existsSync(path.join(racine, ilYa(200))), 'hebdomadaires de 57 et 200 jours supprimés');
ok(fs.existsSync(path.join(racine, ilYa(0))) && fs.existsSync(path.join(racine, ilYa(55))), 'hebdomadaires de 0 et 55 jours conservés');
ok(fs.existsSync(path.join(racine, ilYa(300))), 'dossier incomplet (sans manifeste) non touché');
ok(!fs.existsSync(path.join(parent, 'avant_M93')) && fs.existsSync(path.join(parent, `${ilYa(29).slice(0, 10)}_avant_M91`)), 'avant_M93 supprimé, avant_M91 (29 j) conservé');
ok(fs.existsSync(path.join(parent, 'captures-vieilles')) && fs.existsSync(path.join(parent, 'migrations-en-attente')), 'dossiers étrangers intacts, même très vieux');

// La plus récente sauvegarde complète n'est jamais supprimée, même si elle a plus de 56 jours
const racine2 = path.join(parent, 'hebdo2');
fs.mkdirSync(racine2);
mk(path.join(racine2, ilYa(100)), true);
const plan2 = planifierRotation({ racine: racine2, parent: '', maintenant });
ok(plan2.hebdo[0].aPurger === false, 'seule sauvegarde (100 jours) : conservée');
// Sans dossier « avant » désigné : aucune purge des voisins
ok(plan2.avant.length === 0, 'sans parent désigné : aucun dossier « avant » examiné');

fs.rmSync(racineTmp, { recursive: true, force: true });
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nROTATION : tout est conforme.');
process.exit(echecs ? 1 : 0);
