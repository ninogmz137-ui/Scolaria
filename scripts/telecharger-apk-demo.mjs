// Télécharge l'APK du dernier build EAS TERMINÉ du profil « demo », HORS du dépôt, sans jamais afficher le lien d'artefact
// (le lien EAS n'est pas à partager : il donne accès au fichier). N'imprime que : identifiant court, identifiant d'application,
// taille et SHA-256. Aucune base, aucun secret : la CLI EAS utilise la session de l'utilisateur Windows (eas login).
//   node scripts/telecharger-apk-demo.mjs [--profil demo] [--dest C:\Users\admin\ScolariaDemo] [--liste-seulement]
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { refuserDansDepot } from './garde-destination.mjs';

const depot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => {
  const i = process.argv.indexOf('--' + n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const profil = arg('profil', 'demo');
const dest = arg('dest', 'C:\\Users\\admin\\ScolariaDemo');
const listeSeulement = process.argv.includes('--liste-seulement');
refuserDansDepot(dest, depot, 'la destination de l\'APK');

const r = spawnSync(
  'npx',
  ['eas-cli@latest', 'build:list', '--platform', 'android', '--build-profile', profil, '--status', 'finished', '--limit', '1', '--non-interactive', '--json'],
  { encoding: 'utf8', shell: true, cwd: depot },
);
const sortie = (r.stdout ?? '') + '';
const debut = sortie.indexOf('[');
if (r.status !== 0 || debut < 0) {
  console.error('ECHEC : liste des builds illisible (session EAS ? « npx eas-cli@latest login » à faire par toi).');
  process.exit(1);
}
const builds = JSON.parse(sortie.slice(debut));
if (!builds.length) {
  console.error(`Aucun build terminé pour le profil « ${profil} ».`);
  process.exit(1);
}
const b = builds[0];
console.log(`Build ${b.id.slice(0, 8)} · profil ${b.buildProfile} · ${b.appIdentifier} · ${b.status} · ${b.completedAt ?? ''}`);
if (b.buildProfile !== profil) throw new Error(`profil inattendu : ${b.buildProfile}`);
if (profil === 'demo' && b.appIdentifier !== 'com.scolaria.app.demo') {
  console.error(`REFUS : l'identifiant du build est « ${b.appIdentifier} », pas la variante démo : je ne télécharge pas.`);
  process.exit(2);
}
const lien = b.artifacts?.buildUrl;
if (!lien) throw new Error('aucun fichier APK disponible (expiré ?)');
if (listeSeulement) {
  console.log('(--liste-seulement : rien téléchargé ; le lien n\'est pas affiché)');
  process.exit(0);
}
fs.mkdirSync(dest, { recursive: true });
const fichier = path.join(dest, `carnet-demo-${b.id.slice(0, 8)}.apk`);
const rep = await fetch(lien);
if (!rep.ok) throw new Error(`téléchargement refusé (HTTP ${rep.status})`);
fs.writeFileSync(fichier, Buffer.from(await rep.arrayBuffer()));
const sha = createHash('sha256').update(fs.readFileSync(fichier)).digest('hex').toUpperCase();
console.log(`APK : ${fichier}\nTaille : ${(fs.statSync(fichier).size / 1048576).toFixed(1)} Mo\nSHA-256 : ${sha}`);
