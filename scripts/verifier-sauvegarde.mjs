// Vérifie une sauvegarde (ou sa COPIE sur un disque externe) sans toucher à aucune base :
// manifeste complet, fichiers SQL non vides, comptes de lignes lisibles, et SHA-256 de chaque fichier du bucket.
// Usage : node scripts/verifier-sauvegarde.mjs <dossier de sauvegarde> [autre dossier à comparer]
// Avec un second dossier (la copie) : les fichiers du premier doivent exister à l'identique dans le second.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [a, b] = process.argv.slice(2);
if (!a) {
  console.error('Usage : node scripts/verifier-sauvegarde.mjs <dossier> [copie]');
  process.exit(2);
}
const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
const erreurs = [];
const ok = (cond, msg) => {
  console.log(`${cond ? 'OK    ' : 'ECHEC '} ${msg}`);
  if (!cond) erreurs.push(msg);
};

function verifier(dossier) {
  console.log(`\n== ${dossier}`);
  const mf = path.join(dossier, 'manifeste.json');
  ok(fs.existsSync(mf), 'manifeste.json présent');
  if (!fs.existsSync(mf)) return;
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  ok(m.statut === 'complete', `statut complet (${m.fin})`);
  for (const f of ['roles.sql', 'schema.sql', 'data.sql', 'extras-auth-storage.sql']) {
    const p = path.join(dossier, f);
    ok(fs.existsSync(p) && fs.statSync(p).size > 100, `${f} présent et non vide`);
  }
  const comptes = JSON.parse(fs.readFileSync(path.join(dossier, 'comptes.json'), 'utf8'));
  ok(Object.keys(comptes).length === m.tables, `comptes.json : ${m.tables} tables`);
  const fichiers = JSON.parse(fs.readFileSync(path.join(dossier, 'fichiers.json'), 'utf8'));
  ok(fichiers.length === m.fichiers, `${m.fichiers} fichier(s) annoncé(s)`);
  let mauvais = 0;
  for (const f of fichiers) {
    const p = path.join(dossier, 'fichiers', ...f.chemin.split('/'));
    if (!fs.existsSync(p) || fs.statSync(p).size !== f.octets || sha(p) !== f.sha256) mauvais++;
  }
  ok(mauvais === 0, `fichiers du bucket identiques (SHA-256) : ${fichiers.length - mauvais} / ${fichiers.length}`);
}

verifier(a);
if (b) {
  verifier(b);
  console.log('\n== comparaison avec la copie');
  let diff = 0;
  const marche = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? marche(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of marche(a)) {
    const rel = path.relative(a, f);
    const g = path.join(b, rel);
    if (!fs.existsSync(g) || fs.statSync(g).size !== fs.statSync(f).size || sha(g) !== sha(f)) diff++;
  }
  ok(diff === 0, `copie identique à l'original (${diff} différence(s))`);
}

if (erreurs.length) {
  console.log(`\nVÉRIFICATION EN ÉCHEC : ${erreurs.length} contrôle(s).`);
  process.exit(1);
}
console.log('\nVÉRIFICATION RÉUSSIE.');
