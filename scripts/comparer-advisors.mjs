// Compare deux relevés d'advisors Supabase (sortie de `npx supabase@latest db advisors --linked`, enregistrée dans un fichier)
// PAR CLÉ « niveau | contrôle | objet » (cacheKey), jamais par nombre — même méthode qu'au cycle M36 (8 oct. 2026).
// Ne lit que les deux fichiers : aucune base, aucun réseau.
// Verdict OK seulement si : 0 ERROR après, et chaque clé NOUVELLE figure dans --attendu (les WARN déclarés et validés AVANT
// l'application, tasks/warns-attendus.md). Une clé disparue est signalée (à expliquer), sans faire échouer.
// Usage : node scripts/comparer-advisors.mjs <avant.txt> <apres.txt> [--attendu "<cacheKey>"]...
import fs from 'node:fs';

const args = process.argv.slice(2);
const attendus = [];
const fichiers = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--attendu') attendus.push(args[++i]);
  else fichiers.push(args[i]);
}
if (fichiers.length !== 2) {
  console.error('Usage : node scripts/comparer-advisors.mjs <avant.txt> <apres.txt> [--attendu "<cacheKey>"]...');
  process.exit(2);
}

function lire(fichier) {
  const t = fs.readFileSync(fichier, 'utf8');
  const debut = t.indexOf('{');
  if (debut < 0) throw new Error(`${fichier} : aucun JSON (la commande a-t-elle échoué ?)`);
  const j = JSON.parse(t.slice(debut));
  if (!Array.isArray(j.results)) throw new Error(`${fichier} : champ « results » absent`);
  return j.results.map((r) => ({ cle: `${r.level} | ${r.name} | ${r.cacheKey}`, niveau: r.level, cacheKey: r.cacheKey }));
}

const avant = lire(fichiers[0]);
const apres = lire(fichiers[1]);
const clesAvant = new Set(avant.map((r) => r.cle));
const clesApres = new Set(apres.map((r) => r.cle));
const nouvelles = apres.filter((r) => !clesAvant.has(r.cle));
const disparues = avant.filter((r) => !clesApres.has(r.cle));
const erreurs = apres.filter((r) => r.niveau === 'ERROR');
const inattendues = nouvelles.filter((r) => !attendus.includes(r.cacheKey));
const attendusAbsents = attendus.filter((a) => !nouvelles.some((r) => r.cacheKey === a));

const compte = (l) => ['ERROR', 'WARN', 'INFO'].map((n) => `${l.filter((r) => r.niveau === n).length} ${n}`).join(', ');
console.log(`Avant : ${compte(avant)}`);
console.log(`Après : ${compte(apres)}`);
console.log(`Nouvelles clés (${nouvelles.length}) :`);
for (const r of nouvelles) console.log(`  ${attendus.includes(r.cacheKey) ? 'attendue  ' : 'INATTENDUE'} ${r.cle}`);
console.log(`Clés disparues (${disparues.length}) :`);
for (const r of disparues) console.log(`  ${r.cle}`);
for (const a of attendusAbsents) console.log(`Note : la clé attendue « ${a} » n'est pas apparue.`);

const ok = erreurs.length === 0 && inattendues.length === 0;
console.log(ok ? 'VERDICT : OK (0 ERROR, aucune clé nouvelle hors liste attendue)' : 'VERDICT : ARRÊT (ERROR ou clé nouvelle inattendue) — appliquer l’inverse ?');
process.exitCode = ok ? 0 : 1;
