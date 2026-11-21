// Zones tactiles du sprint « Carnet vivant » : toute pastille de moins de 44 dp de haut reçoit un hitSlop pour atteindre 44,
// sans chevauchement avec ses voisines. Contrôle sur le CODE SOURCE (hauteur du visuel + hitSlop, marges entre voisines).
// La preuve par APPUIS réels (méthode STAB-2) est dans scripts/preuve-zones-tactiles-redmi.mjs (téléphone requis).
// npm run test:zones-tactiles
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = join(import.meta.dirname, '..', '..');
const lire = (f: string) => readFileSync(join(RACINE, f), 'utf8').replace(/\r\n/g, '\n');
let ok = 0;
let echecs = 0;
function verifier(nom: string, bon: boolean, detail = '') {
  console.log(`${bon ? 'OK ' : 'ÉCHEC'} ${nom}${bon ? '' : ` : ${detail}`}`);
  if (bon) ok++;
  else echecs++;
}
const nombre = (src: string, motif: RegExp): number => {
  const m = motif.exec(src);
  if (!m) throw new Error('motif introuvable : ' + motif);
  return Number(m[1]);
};

// ── Pilules compactes des mots : 40 + 2 + 2 = 44 ; voisines espacées de 8 (≥ 2 + 2) ──
{
  const s = lire('src/components/messages/ActionsMot.tsx');
  const h = nombre(s, /pilule: \{\s*height: (\d+)/);
  const nbSlops = (s.match(/hitSlop=\{\{ top: 2, bottom: 2 \}\}/g) ?? []).length;
  const pressables = (s.match(/<Pressable/g) ?? []).length;
  verifier(`pilules des mots : visuel ${h} dp + hitSlop 2 + 2 = ${h + 4} dp`, h + 4 >= 44 && h + 4 === 44);
  verifier('toutes les pilules des mots (J\'autorise, Non, Je participe, Peut-être, Signer) ont ce hitSlop', nbSlops === pressables && pressables === 2, `${nbSlops} hitSlop / ${pressables} Pressable`);
  const marge = nombre(s, /pilule: \{[^}]*marginTop: (\d+)/);
  verifier(`pas de chevauchement vertical entre lignes de pilules : écart ${marge} ≥ 4 (2 + 2)`, marge >= 4);
  verifier('aucun hitSlop horizontal (pas de chevauchement entre pilules voisines)', !/hitSlop=\{\{[^}]*(left|right)/.test(s));
}
// ── « Signer » de l'Accueil : 30 + 7 + 7 = 44, dans une ligne de 58 (marge verticale 14 ≥ 7) ──
{
  const s = lire('src/components/accueil/CorpsCarnet.tsx');
  const h = nombre(s, /pilule: \{\s*height: (\d+)/);
  const hs = nombre(s, /hitSlop=\{\{ top: (\d+), bottom: \d+ \}\}/);
  const ligne = nombre(s, /ligne: \{[^}]*minHeight: (\d+)/);
  verifier(`« Signer » de l'Accueil : ${h} + ${hs} + ${hs} = ${h + 2 * hs} dp`, h + 2 * hs === 44);
  verifier(`la zone reste dans sa ligne (${ligne} dp : marge ${(ligne - h) / 2} ≥ ${hs}) : aucun chevauchement avec les lignes voisines`, (ligne - h) / 2 >= hs);
  verifier('case ronde 22 dp : hitSlop 11 → 44', /width: 22,\s*height: 22/.test(s) && /hitSlop=\{11\}/.test(s));
}
// ── Pilule d'année de l'en-tête : 26 + 9 + 9 = 44 ──
{
  const s = lire('src/screens/suivi/BoutonAnnee.tsx');
  const h = nombre(s, /pilule: \{\s*height: (\d+)/);
  const hs = nombre(s, /hitSlop=\{\{ top: (9), bottom: 9 \}\}/);
  verifier(`pilule d'année : ${h} + ${hs} + ${hs} = ${h + 2 * hs} dp`, h + 2 * hs === 44);
}
// ── Badge appareil photo : 26 + 9 + 9 = 44 (masqué tant que PHOTO_ENFANT_ACTIVE est false) ──
{
  const s = lire('src/components/accueil/EnteteCarnet.tsx');
  const t = nombre(s, /badge: \{[^}]*width: (\d+)/);
  const hs = nombre(s, /hitSlop=\{(\d+)\}/);
  verifier(`badge : ${t} + ${hs} + ${hs} = ${t + 2 * hs} dp`, t + 2 * hs === 44);
}
// ── Pilule « Ajouter au carnet » de l'Accueil vide : 40 + 2 + 2 = 44 ──
{
  const s = lire('src/components/accueil/CarnetVide.tsx');
  const h = nombre(s, /pilule: \{[^}]*height: (\d+)/);
  verifier(`pilule « Ajouter au carnet » : ${h} + 2 + 2 = ${h + 4} dp`, h + 4 === 44 && /hitSlop=\{\{ top: 2, bottom: 2 \}\}/.test(s));
}
// ── Autres éléments du sprint : déjà ≥ 44 ──
verifier('« Plus tard » (création) : minHeight 44', /photoPlusTard: \{ minHeight: 44/.test(lire('src/screens/AjouterEnfantScreen.tsx')));
verifier('lignes de la feuille de photo : minHeight 48', /ligne: \{[^}]*minHeight: 48/.test(lire('src/components/FeuillePhotoEnfant.tsx')));
verifier('ligne « Photo » du profil : minHeight 48', /lignePhoto: \{[^}]*minHeight: 48/.test(lire('src/screens/ProfilEnfantScreen.tsx')));

console.log(`\n${ok} réussis, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
