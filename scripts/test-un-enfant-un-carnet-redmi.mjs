// NON-RÉGRESSION « un enfant = un carnet » sur le Redmi (adb, USB), réseau COUPÉ : au changement d'enfant, aucune donnée
// de l'enfant précédent (prénom, niveau / année, couleur, éléments) ne reste affichée, sur Accueil, Suivi, Agenda et Messages.
// Défaut trouvé le 4 oct 2026 par le test en mode avion : Suivi gardait « 2026–2027 · CP » de Laia sous Evan (CM2).
// Méthode : en ligne, relever les marqueurs de chaque enfant (prénom, niveau, couleur de l'avatar, lus par uiautomator et
// par une capture brute) ; mode avion ; changer d'enfant dans les DEUX sens ; sur chaque onglet, vérifier l'absence des
// marqueurs de l'autre enfant ET la présence de l'enfant courant (sinon le test serait vide) ; toujours rétablir le réseau.
// GARDE-FOUS : Scolaria au premier plan avant CHAQUE appui (sinon arrêt) ; aucun appui sur un texte contenant un mot interdit
// (déconnexion, suppression, signature, envoi, enregistrement…) ; un seul « retour » à la fois ; jamais d'identifiant saisi.
// Prérequis : téléphone déverrouillé, compte réel avec ≥ 2 enfants de niveaux différents, Scolaria sur l'Accueil, Metro joint.
// Usage : node scripts/test-un-enfant-un-carnet-redmi.mjs [PrénomA PrénomB]   (défaut : Laia Evan)
import { spawnSync } from 'node:child_process';

const DEV = process.env.ADB_DEVICE ?? 'a3a0cfea';
const [A, B] = process.argv.slice(2).length === 2 ? process.argv.slice(2) : ['Laia', 'Evan'];
const INTERDITS = /deconnect|deconnexion|quitter|logout|sign out|supprim|effac|retir|revoqu|reinitialis|vider|sign|envoy|publi|confirm|valider|payer|acheter|enregistr/;
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const adb = (...a) => spawnSync('adb', ['-s', DEV, ...a], { encoding: 'utf8', maxBuffer: 1 << 26 }).stdout ?? '';
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const premierPlan = () => /com\.scolaria\.app/.test(adb('shell', 'dumpsys window').split('\n').find((l) => l.includes('mCurrentFocus')) ?? '');

function lire() {
  adb('shell', 'uiautomator dump /sdcard/w.xml');
  const xml = adb('exec-out', 'cat /sdcard/w.xml');
  return [...xml.matchAll(/<node [^>]*>/g)].map((m) => {
    const n = m[0];
    const g = (k) => (n.match(new RegExp(` ${k}="([^"]*)"`)) ?? [])[1] ?? '';
    const b = (n.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/) ?? []).slice(1).map(Number);
    return { t: g('text'), d: g('content-desc'), b };
  });
}
const textes = (noeuds) => noeuds.flatMap((n) => [n.t, n.d]).filter(Boolean).join(' | ');
const trouver = (noeuds, f) => noeuds.find((n) => n.b.length === 4 && f(n));
const dessous = (noeuds, x, y) => noeuds.filter((n) => n.b.length === 4 && n.b[0] <= x && x <= n.b[2] && n.b[1] <= y && y <= n.b[3]).map((n) => `${n.t} ${n.d}`).join(' ');

function appuyerSur(noeuds, noeud, fractionY = 0.5) {
  const x = (noeud.b[0] + noeud.b[2]) >> 1;
  // fractionY < 0,5 : viser le haut d'un grand élément (les lignes du sélecteur d'enfant, tout en bas de l'écran, ne
  // réagissent pas à un appui vers leur bas : constaté sur ce Redmi, la ligne basse ne répond qu'à y ≲ 1975).
  const y = Math.round(noeud.b[1] + (noeud.b[3] - noeud.b[1]) * fractionY);
  if (!premierPlan()) {
    console.log('ARRÊT : Scolaria n’est pas au premier plan.');
    sortir(3);
  }
  if (INTERDITS.test(norm(dessous(noeuds, x, y) + ' ' + noeud.t + noeud.d))) {
    console.log(`REFUSÉ (mot interdit) : ${noeud.t || noeud.d}`);
    return false;
  }
  adb('shell', `input tap ${x} ${y}`);
  return true;
}

/** Couleur du pixel (x, y) d'après la capture brute de l'écran (RGBA 8888, en-tête de 12 octets). */
function pixel(x, y) {
  const r = spawnSync('adb', ['-s', DEV, 'exec-out', 'screencap'], { maxBuffer: 1 << 28 });
  const buf = r.stdout;
  const w = buf.readUInt32LE(0);
  const off = 12 + (y * w + x) * 4;
  return [buf[off], buf[off + 1], buf[off + 2]];
}
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

let reseauCoupe = false;
function avion(actif) {
  adb('shell', `cmd connectivity airplane-mode ${actif ? 'enable' : 'disable'}`);
  reseauCoupe = actif;
}
function sortir(code) {
  if (reseauCoupe) avion(false);
  process.exit(code);
}
process.on('exit', () => {
  if (reseauCoupe) avion(false);
});

let ok = 0;
let ko = 0;
const noter = (nom, cond, detail = '') => {
  console.log(`${cond ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + detail : ''}`);
  cond ? ok++ : ko++;
};

async function surAccueil() {
  for (let i = 0; i < 3; i++) {
    const n = lire();
    if (n.some((e) => e.t === 'Bonjour')) return true;
    if (!premierPlan()) return false;
    const a = trouver(n, (e) => e.d === 'Accueil');
    if (a && appuyerSur(n, a)) await attendre(2000);
    else {
      adb('shell', 'input keyevent KEYCODE_BACK');
      await attendre(2000);
    }
  }
  return lire().some((e) => e.t === 'Bonjour');
}
async function ouvrirOnglet(nom) {
  const n = lire();
  const o = trouver(n, (e) => e.d === nom);
  if (!o) { console.log(`  (ouvrirOnglet : « ${nom} » introuvable ; vu : ${textes(n).slice(0, 160)})`); return false; }
  if (!appuyerSur(n, o)) return false;
  await attendre(2500);
  return true;
}
async function choisirEnfant(prenom) {
  const n = lire();
  const bouton = trouver(n, (e) => e.d === "Changer d'enfant");
  if (!bouton) { console.log('  (choisirEnfant : bouton du sélecteur introuvable)'); return false; }
  if (!appuyerSur(n, bouton)) return false;
  await attendre(1500);
  const n2 = lire();
  const ligne = trouver(n2, (e) => new RegExp(`^Avatar d.{1,2}${prenom}, ${prenom},`).test(e.d));
  if (!ligne) { console.log(`  (choisirEnfant : ligne de ${prenom} introuvable ; vu : ${textes(n2).slice(0, 160)})`); return false; }
  if (!appuyerSur(n2, ligne, 0.25)) return false;
  // Attendre que le changement soit EFFECTIF (le sélecteur est fermé et l'avatar porte l'initiale du nouvel enfant),
  // puis laisser finir le fondu : sinon on relèverait la couleur de l'enfant précédent.
  for (let i = 0; i < 10; i++) {
    await attendre(1000);
    const n3 = lire();
    const ferme = !n3.some((e) => /^Avatar d.{1,2}\S+, \S+, /.test(e.d) && e.b.length === 4 && e.b[3] - e.b[1] > 100);
    const avatarCourant = n3.some((e) => e.d === `Avatar d’${prenom}` || e.d === `Avatar de ${prenom}`);
    if (ferme && avatarCourant) break;
  }
  await attendre(1500);
  return true;
}
const avatar = () => {
  const n = lire();
  const a = trouver(n, (e) => e.d === "Changer d'enfant");
  return a ? [(a.b[0] + a.b[2]) >> 1, a.b[1] + 6] : [1000, 142];
};

const ONGLETS = ['Accueil', 'Suivi', 'Agenda', 'Messages'];

if (!premierPlan() || !(await surAccueil())) {
  console.log('ARRÊT : Scolaria doit être au premier plan, sur l’Accueil.');
  sortir(3);
}

// ── 1. En ligne : marqueurs de chaque enfant (niveau lu dans le sélecteur, couleur de l'avatar) ──
const marqueurs = {};
{
  const n0 = lire();
  const bouton = trouver(n0, (e) => e.d === "Changer d'enfant");
  appuyerSur(n0, bouton);
  await attendre(1500);
  const n = lire();
  for (const p of [A, B]) {
    const l = trouver(n, (e) => new RegExp(`^Avatar d.{1,2}${p}, ${p},`).test(e.d));
    const niveau = l ? (l.d.match(/, ([A-Za-z0-9]+) — /) ?? [])[1] : undefined;
    marqueurs[p] = { niveau };
  }
  adb('shell', 'input keyevent KEYCODE_BACK');
  await attendre(1500);
}
for (const p of [A, B]) {
  if (!(await surAccueil()) || !(await choisirEnfant(p))) {
    console.log(`ARRÊT : impossible de choisir ${p}.`);
    sortir(3);
  }
  const [x, y] = avatar();
  marqueurs[p].couleur = pixel(x, y);
}
console.log(`Marqueurs : ${A} = niveau ${marqueurs[A].niveau}, couleur ${marqueurs[A].couleur} ; ${B} = niveau ${marqueurs[B].niveau}, couleur ${marqueurs[B].couleur}`);
if (!marqueurs[A].niveau || !marqueurs[B].niveau || marqueurs[A].niveau === marqueurs[B].niveau || distance(marqueurs[A].couleur, marqueurs[B].couleur) < 40) {
  console.log('ARRÊT : les deux enfants doivent avoir des niveaux ET des couleurs différents pour que le test ait un sens.');
  sortir(3);
}

// ── 2. Mode avion, puis changement d'enfant dans les deux sens ──
avion(true);
await attendre(5000);
noter('mode avion actif', adb('shell', 'settings get global airplane_mode_on').trim() === '1');

for (const [de, vers] of [[A, B], [B, A]]) {
  if (!(await surAccueil())) {
    console.log('ARRÊT : retour à l’Accueil impossible.');
    sortir(3);
  }
  // Se placer d'abord sur « de » (hors ligne, sans rien relever), puis basculer vers « vers » : c'est CE changement
  // d'enfant, réseau coupé, que l'on contrôle ensuite onglet par onglet.
  await choisirEnfant(de);
  await choisirEnfant(vers);
  for (const onglet of ONGLETS) {
    if (!(await ouvrirOnglet(onglet))) {
      noter(`${de} → ${vers} : onglet ${onglet} ouvert`, false);
      continue;
    }
    const n = lire();
    const tout = textes(n);
    const autre = marqueurs[de];
    const courant = marqueurs[vers];
    const contientNom = new RegExp(`\\b${de}\\b`).test(tout);
    const contientNiveauAutre = new RegExp(`(^|[^A-Za-z0-9])${autre.niveau}([^A-Za-z0-9]|$)`).test(tout.replace(/ — /g, ' '));
    // Couleur : l'avatar de la barre du haut doit être celui de l'enfant courant.
    const [x, y] = avatar();
    const c = pixel(x, y);
    const couleurOk = distance(c, courant.couleur) < 40 && distance(c, autre.couleur) >= 40;
    // L'enfant courant est bien affiché quelque part (prénom ou niveau), sinon la vérification serait vide.
    const presentCourant = new RegExp(`\\b${vers}\\b`).test(tout) || new RegExp(`(^|[^A-Za-z0-9])${courant.niveau}([^A-Za-z0-9]|$)`).test(tout);
    noter(
      `${de} → ${vers}, réseau coupé, onglet ${onglet} : ni « ${de} », ni « ${autre.niveau} », ni sa couleur ; ${vers} présent`,
      !contientNom && !contientNiveauAutre && couleurOk && presentCourant,
      `nom ${de}: ${contientNom ? 'PRÉSENT' : 'absent'} · niveau ${autre.niveau}: ${contientNiveauAutre ? 'PRÉSENT' : 'absent'} · couleur: ${couleurOk ? 'ok' : 'FAUSSE ' + c} · ${vers}: ${presentCourant ? 'présent' : 'ABSENT'}`,
    );
  }
}

// ── 3. Réseau rétabli ──
avion(false);
await attendre(8000);
noter('mode avion désactivé', adb('shell', 'settings get global airplane_mode_on').trim() === '0');
console.log(`\n${ok} OK, ${ko} échec(s)`);
await surAccueil();
process.exit(ko ? 1 : 0);
