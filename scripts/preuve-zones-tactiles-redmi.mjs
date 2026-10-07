// PREUVE des zones tactiles ≥ 44 dp sur le Redmi (adb, USB) — protocole révisé du 7 oct. 2026, MODE DÉMO.
// (a) UN seul processus : fichier verrou + contrôle qu'aucun autre « node … preuve-zones » ne tourne.
// (b) appui à 3 dp à l'extérieur du visuel quand la zone de 44 dp le permet ((44 − visuel) / 2 ≥ 3). Pour les boutons de 40 dp
//     (Rechercher, pilule d'Aria, « + » : hitSlop 2), la zone ne dépasse que de 2 dp : on sonde à 1,5 dp (doit ouvrir) et à 3 dp
//     (CONTRÔLE NÉGATIF : doit NE PAS ouvrir, la zone s'arrête à 2 dp ; si cela s'ouvrait, le hitSlop serait plus grand que dit).
// (c) trois appuis par élément et par côté : « passé » seulement si les trois réussissent.
// (d) dump uiautomator vide : attendre 2 s et le refaire avant d'enregistrer un échec ; l'écran d'Aria n'a PAS d'arbre
//     d'accessibilité (dump vide constaté) : l'ouverture est donc aussi prouvée par différence de captures d'écran.
// (e) tableau complet écrit dans tasks/preuve-zones-tactiles-redmi.md (élément, taille mesurée, hitSlop du code, résultat des 3 appuis).
// GARDE-FOUS : Scolaria au premier plan avant CHAQUE appui, sinon arrêt ; aucun appui sur un texte interdit (déconnexion,
// suppression, signature, envoi, enregistrement…) ; jamais de saisie ni d'identifiant ; appuis non destructifs seulement.
// Prérequis : téléphone déverrouillé, app en démo sur l'Accueil d'un enfant de primaire (pastilles P1–P5), Metro joint.
// Usage : node scripts/preuve-zones-tactiles-redmi.mjs
import { spawnSync } from 'node:child_process';
import { creerOutilAppuis, AppuiRefuse } from './appui-redmi.mjs';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DEV = process.env.ADB_DEVICE ?? 'a3a0cfea';
const DP = 2.75;
// STAB2_SEULEMENT=barre : ne rejoue que la barre du bas (tableau écrit à part, le tableau complet n'est pas écrasé).
const SEUL_BARRE = process.env.STAB2_SEULEMENT === 'barre';
const SORTIE = process.env.STAB2_OFFSETS
  ? 'tasks/preuve-zones-tactiles-redmi-balayage.md'
  : SEUL_BARRE ? 'tasks/preuve-zones-tactiles-redmi-barre.md' : 'tasks/preuve-zones-tactiles-redmi.md';
const INTERDITS = /deconnect|deconnexion|quitter|logout|sign out|supprim|effac|retir|revoqu|reinitialis|vider|sign|envoy|publi|confirm|valider|payer|acheter|enregistr/;
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

// ── (a) Un seul processus ───────────────────────────────────────────────────────────────────────
const VERROU = join(tmpdir(), 'stab2-redmi.lock');
{
  const ps = spawnSync(
    'powershell',
    ['-NoProfile', '-Command', `Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -match 'preuve-zones' -and $_.ProcessId -ne ${process.pid} } | Select-Object -ExpandProperty ProcessId`],
    { encoding: 'utf8' },
  );
  const autres = (ps.stdout ?? '').split(/\s+/).filter(Boolean);
  if (autres.length) {
    console.log(`ARRÊT : un autre processus de la preuve tourne déjà (PID ${autres.join(', ')}).`);
    process.exit(2);
  }
  if (existsSync(VERROU)) {
    const pid = Number(readFileSync(VERROU, 'utf8'));
    let vivant = false;
    try { process.kill(pid, 0); vivant = true; } catch { /* mort */ }
    if (vivant) {
      console.log(`ARRÊT : verrou détenu par le PID ${pid}.`);
      process.exit(2);
    }
  }
  writeFileSync(VERROU, String(process.pid));
  process.on('exit', () => { try { unlinkSync(VERROU); } catch { /* déjà retiré */ } });
}

const adb = (...a) => spawnSync('adb', ['-s', DEV, ...a], { encoding: 'utf8', maxBuffer: 1 << 26 }).stdout ?? '';
// Tout appui et tout retour passent par l'outil unique (scripts/appui-redmi.mjs) : premier plan relu AVANT chaque action, refus sinon.
const outil = creerOutilAppuis();
const premierPlan = outil.premierPlan;
/** Exécute une action gardée ; un refus « hors premier plan » arrête la preuve (code 3), un mot interdit renvoie false. */
function gardee(action) {
  try {
    action();
    return true;
  } catch (e) {
    if (!(e instanceof AppuiRefuse)) throw e;
    if (/premier plan/.test(e.message)) {
      console.log(`ARRÊT : ${e.message} (relancer l'app avec am start, sans appui).`);
      process.exit(3);
    }
    console.log(e.message);
    return false;
  }
}

// ── Dump (avec nouvelle tentative si vide) ────────────────────────────────────────────────────
function dumpUne() {
  // Le fichier est supprimé AVANT chaque dump : l'écran d'Aria est animé en continu, uiautomator n'y atteint pas l'état « idle »,
  // ne réécrit pas le fichier et on relisait l'ancien dump de l'Accueil (constaté le 7 oct. : séries « rien » même à l'intérieur du bouton).
  adb('shell', 'rm -f /sdcard/w.xml; uiautomator dump /sdcard/w.xml');
  const xml = adb('exec-out', 'cat /sdcard/w.xml');
  return [...xml.matchAll(/<node [^>]*>/g)].map((m) => {
    const n = m[0];
    const g = (k) => (n.match(new RegExp(` ${k}="([^"]*)"`)) ?? [])[1] ?? '';
    const b = (n.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/) ?? []).slice(1).map(Number);
    return { t: g('text'), d: g('content-desc'), b, sel: g('selected') === 'true', clic: g('clickable') === 'true', cls: g('class') };
  });
}
async function lire() {
  let n = dumpUne();
  if (n.length === 0) {
    await attendre(2000);
    n = dumpUne();
  }
  return n;
}
const trouver = (noeuds, libelle) => noeuds.find((n) => (n.d === libelle || n.t === libelle) && n.b.length === 4);
const texteSous = (noeuds, x, y) =>
  noeuds.filter((n) => n.b.length === 4 && n.b[0] <= x && x <= n.b[2] && n.b[1] <= y && y <= n.b[3]).map((n) => `${n.t} ${n.d}`).join(' ');
// Suivi porte aussi un bouton « Année …, CM2. Ouvrir les années » : l'Accueil = cette pilule SANS le segment « Apprentissages » de Suivi.
const estSuivi = (n) => n.some((e) => e.t === 'Apprentissages');
const estAccueil = (n) => !estSuivi(n) && n.some((e) => e.t === 'ARIA' || e.t === 'Bienvenue' || (/^Année /.test(e.d) && /Ouvrir les années/.test(e.d)));

// ── Captures (octets bruts RGBA) ──────────────────────────────────────────────────────────────
function capture() {
  // `adb exec-out screencap` s'est figé une fois (20 min) : délai de 20 s, une nouvelle tentative.
  let b = spawnSync('adb', ['-s', DEV, 'exec-out', 'screencap'], { maxBuffer: 1 << 28, timeout: 20000 }).stdout;
  if (!b || b.length < 100) b = spawnSync('adb', ['-s', DEV, 'exec-out', 'screencap'], { maxBuffer: 1 << 28, timeout: 20000 }).stdout;
  const w = b.readUInt32LE(0);
  const h = b.readUInt32LE(4);
  return { b, w, h, off: b.length - w * h * 4 };
}
const px = (c, x, y) => {
  const i = c.off + (y * c.w + x) * 4;
  return [c.b[i], c.b[i + 1], c.b[i + 2]];
};
function changement(a, b) {
  let d = 0;
  let t = 0;
  for (let y = 0; y < a.h; y += 40) {
    for (let x = 0; x < a.w; x += 40) {
      t++;
      const p = px(a, x, y);
      const q = px(b, x, y);
      if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) > 60) d++;
    }
  }
  return d / t;
}
/** Étendue verticale (px) de la forme grise du bouton autour de y0, mesurée sur la colonne x (≠ fond de page). */
function mesurerVertical(c, x, y0) {
  const ref = px(c, x, y0 - 40);
  const diff = (y) => { const p = px(c, x, y); return Math.abs(p[0] - ref[0]) + Math.abs(p[1] - ref[1]) + Math.abs(p[2] - ref[2]) > 25; };
  // Un seul bloc contigu : du haut du bouton jusqu'au premier trou de 4 px (le bouton ne contient pas de vide ; ce qui suit — voile,
  // filet de la barre de navigation — n'est pas le bouton).
  let haut = null;
  let bas = null;
  let trou = 0;
  for (let y = y0 - 6; y < Math.min(c.h, y0 + 200); y++) {
    if (diff(y)) { if (haut === null) haut = y; bas = y; trou = 0; } else if (haut !== null && ++trou >= 4) break;
  }
  return haut === null ? null : [haut, bas + 1];
}

// ── Résultats ───────────────────────────────────────────────────────────────────────────────────
const lignes = [];
let ok = 0;
let ko = 0;
function noterSerie({ nom, taille, hitslop, cote, off, attendu = true, essais }) {
  const reussis = essais.filter((e) => e === attendu).length;
  const passe = reussis === 3;
  console.log(`${passe ? 'OK   ' : 'ÉCHEC'} ${nom} · ${cote} · ${off} dp · ${attendu ? 'doit ouvrir' : 'contrôle négatif (ne doit pas ouvrir)'} · appuis ${essais.map((e) => (e ? 'ouvre' : 'rien')).join(' / ')}`);
  lignes.push({ nom, taille, hitslop, cote, off, attendu, essais, passe });
  passe ? ok++ : ko++;
  ecrireTableau();
}
function ecrireTableau() {
  const l = [
    '# Preuve d\'appuis STAB-2 — Redmi, mode démo',
    '',
    `*Généré par \`node scripts/preuve-zones-tactiles-redmi.mjs\` (densité ${DP}, 3 appuis par ligne, « passé » = 3 sur 3). Résultat partiel ou final : ${ok} passé(s), ${ko} échec(s).*`,
    '',
    '| Élément | Taille mesurée | hitSlop du code | Côté | Décalage hors visuel | Attendu | Appui 1 | Appui 2 | Appui 3 | Résultat |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...lignes.map((r) => `| ${r.nom} | ${r.taille} | ${r.hitslop} | ${r.cote} | ${r.off} dp | ${r.attendu ? 'ouvre' : 'n\'ouvre pas (contrôle négatif)'} | ${r.essais.map((e) => (e ? 'ouvre' : 'rien')).join(' | ')} | ${r.passe ? 'PASSÉ' : 'ÉCHEC'} |`),
    '',
  ];
  writeFileSync(SORTIE, l.join('\n'));
}

// ── Appui gardé ─────────────────────────────────────────────────────────────────────────────────
function appuyer(x, y, noeuds) {
  return gardee(() => outil.tap(x, y, { textesSous: texteSous(noeuds, x, y) }));
}
const viser = (b, cote, offDp) => {
  const [x1, y1, x2, y2] = b;
  const o = offDp * DP;
  return cote === 'droite' ? [x2 + o, (y1 + y2) / 2] : cote === 'gauche' ? [x1 - o, (y1 + y2) / 2] : cote === 'haut' ? [(x1 + x2) / 2, y1 - o] : [(x1 + x2) / 2, y2 + o];
};
const taillDp = (b) => `${Math.round((b[2] - b[0]) / DP)}×${Math.round((b[3] - b[1]) / DP)} dp`;
const retour = async (ms = 1500) => { gardee(() => outil.retour()); await attendre(ms); };

async function retourAccueil() {
  for (let i = 0; i < 4; i++) {
    const n = await lire();
    if (estAccueil(n)) return true;
    if (!premierPlan()) return false;
    const accueil = n.length ? trouver(n, 'Accueil') : null;
    const cx = (accueil?.b[0] + accueil?.b[2]) / 2;
    const cy = (accueil?.b[1] + accueil?.b[3]) / 2;
    if (accueil && !INTERDITS.test(norm(texteSous(n, cx, cy)))) gardee(() => outil.tap(cx, cy));
    else gardee(() => outil.retour()); // écran d'Aria (dump vide) ou feuille ouverte
    await attendre(2000);
    if (!premierPlan()) {
      // Un retour de trop a fermé l'app : on la relance (aucun appui) et on repart de l'Accueil.
      outil.relancer();
      await attendre(4000);
    }
  }
  return estAccueil(await lire());
}
async function allerSur(onglet) {
  if (!(await retourAccueil())) return false;
  const n = await lire();
  const o = trouver(n, onglet);
  if (!o || !appuyer((o.b[0] + o.b[2]) / 2, (o.b[1] + o.b[3]) / 2, n)) return false;
  await attendre(2500);
  return true;
}

if (!premierPlan()) {
  console.log('ARRÊT : Scolaria n’est pas au premier plan (relancer avec am start).');
  process.exit(3);
}
if (!(await retourAccueil())) {
  console.log('ARRÊT : impossible de se placer sur l’Accueil.');
  process.exit(3);
}

/** Série de 3 appuis. `essai(i)` renvoie true si l'élément a réagi. */
async function serie(meta, essai) {
  if (SEUL_BARRE && !meta.barre) return;
  const essais = [];
  for (let i = 0; i < 3; i++) essais.push(!!(await essai(i)));
  noterSerie({ ...meta, essais });
}

// ── Barre du haut : burger (hitSlop 5), avatar (hitSlop 5) ─────────────────────────────────────
for (const [nom, libelle, hs, verifier, defaire] of [
  ['Burger', 'Famille et paramètres', 'hitSlop=5 (TopBar.tsx:119)', (n) => n.some((e) => e.t === 'Famille & paramètres' || e.t === 'Famille &amp; paramètres'), () => retour()],
  ['Avatar de l\'enfant', "Changer d'enfant", 'hitSlop=5 (TopBar.tsx:173)', (n) => n.some((e) => /Avatar d/.test(e.d) && e.clic && e.b[3] - e.b[1] > 100), () => retour()],
]) {
  for (const cote of ['droite', 'gauche', 'haut', 'bas']) {
    let taille = '';
    await serie({ nom, hitslop: hs, cote, off: 3, get taille() { return taille; } }, async () => {
      if (!(await retourAccueil())) return false;
      const n = await lire();
      const el = trouver(n, libelle);
      if (!el) return false;
      taille = taillDp(el.b);
      const [x, y] = viser(el.b, cote, 3);
      if (!appuyer(x, y, n)) return false;
      await attendre(2000);
      const ouvert = verifier(await lire());
      if (ouvert) await defaire();
      return ouvert;
    });
  }
}

// ── En-tête du carnet : pilule d'année (hitSlop 9 → 26 + 18 = 44) ─────────────────────────────────
for (const cote of ['haut', 'bas']) {
  let taille = '';
  await serie({ nom: 'Pilule d\'année de l\'Accueil', hitslop: 'hitSlop=9 (EnteteCarnet.tsx:77)', cote, off: 3, get taille() { return taille; } }, async () => {
    if (!(await retourAccueil())) return false;
    const n = await lire();
    const p = n.find((e) => /^Année .*Ouvrir les années/.test(e.d) && e.b.length === 4 && e.b[1] < 1400);
    if (!p) return false;
    taille = taillDp(p.b);
    const [x, y] = viser(p.b, cote, 3);
    if (!appuyer(x, y, n)) return false;
    await attendre(1500);
    const ouvert = (await lire()).some((e) => /^\d{4}–\d{4} · /.test(e.t));
    if (ouvert) await retour(1200);
    return ouvert;
  });
}

// ── Onglets (hitSlop vertical 7 ; horizontal 5 pour l'onglet inactif) ──────────────────────────────
for (const [nom, attendu] of [
  ['Suivi', (e) => estSuivi(e)],
  ['Agenda', (e) => e.some((x) => x.t === 'Emploi du temps' || /^Octobre|^Novembre|^Septembre|^Décembre/.test(x.t))],
  ['Messages', (e) => e.some((x) => x.d === 'Général')],
]) {
  for (const cote of ['gauche', 'droite', 'haut', 'bas']) {
    let taille = '';
    await serie({ nom: `Onglet ${nom}`, hitslop: 'inactif {7,7,5,5} · actif {7,7} (TopBar.tsx:145)', cote, off: 3, get taille() { return taille; } }, async () => {
      if (!(await retourAccueil())) return false;
      const n = await lire();
      const el = trouver(n, nom);
      if (!el) return false;
      taille = taillDp(el.b);
      const [x, y] = viser(el.b, cote === 'haut' ? 'haut' : cote === 'bas' ? 'bas' : cote, 3);
      if (!appuyer(x, y, n)) return false;
      await attendre(2200);
      return attendu(await lire());
    });
  }
}

// ── Agenda : jours (hitSlop gauche/droite 4 → 36 + 8 = 44) ─────────────────────────────────────────
for (const cote of ['gauche', 'droite']) {
  let taille = '';
  await serie({ nom: 'Jour de l\'Agenda', hitslop: 'hitSlop {left:4,right:4} (AgendaScreen.tsx:1147)', cote, off: 3, get taille() { return taille; } }, async () => {
    if (!(await allerSur('Agenda'))) return false;
    const n = await lire();
    const jours = n.filter((e) => /^[LMJVSD], \d+$/.test(e.d)).sort((a, b) => a.b[0] - b.b[0]);
    const cible = jours[2];
    const autre = jours[0];
    if (!cible || !autre) return false;
    appuyer((autre.b[0] + autre.b[2]) / 2, (autre.b[1] + autre.b[3]) / 2, n); // repartir d'un autre jour
    await attendre(1000);
    taille = taillDp(cible.b);
    const numero = cible.d.split(', ')[1];
    const [x, y] = viser(cible.b, cote, 3);
    if (!appuyer(x, y, await lire())) return false;
    await attendre(1500);
    const titre = (await lire()).find((e) => /^(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche) \d+/.test(e.t));
    return !!titre && titre.t.split(' ')[1] === numero;
  });
}

// ── Agenda : filtre « Événements » (hitSlop 7 + 7) ───────────────────────────────────────────────
for (const cote of ['haut', 'bas']) {
  let taille = '';
  await serie({ nom: 'Filtre « Événements » de l\'Agenda', hitslop: 'hitSlop {top:7,bottom:7} (AgendaScreen.tsx:1191)', cote, off: 3, get taille() { return taille; } }, async () => {
    if (!(await allerSur('Agenda'))) return false;
    const tout = (await lire()).find((e) => e.d === 'Filtre Tout');
    if (tout && !tout.sel) { appuyer((tout.b[0] + tout.b[2]) / 2, (tout.b[1] + tout.b[3]) / 2, await lire()); await attendre(800); }
    const f = (await lire()).find((e) => e.d === 'Filtre Événements');
    if (!f) return false;
    taille = taillDp(f.b);
    const [x, y] = viser(f.b, cote, 3);
    if (!appuyer(x, y, await lire())) return false;
    await attendre(1000);
    const apres = (await lire()).find((e) => e.d === 'Filtre Événements');
    const r = !!apres?.sel;
    const t2 = (await lire()).find((e) => e.d === 'Filtre Tout');
    if (t2) appuyer((t2.b[0] + t2.b[2]) / 2, (t2.b[1] + t2.b[3]) / 2, await lire());
    return r;
  });
}

// ── Suivi : pastille P3 (hitSlop {top:8,bottom:4,left:2,right:2}) ───────────────────────────────────
for (const cote of ['haut', 'bas']) {
  let taille = '';
  await serie({ nom: 'Pastille de période P3', hitslop: 'hitSlop {top:8,bottom:4,left:2,right:2} (ApprentissagesVue.tsx:122)', cote, off: 3, get taille() { return taille; } }, async () => {
    if (!(await allerSur('Suivi'))) return false;
    const n = await lire();
    const p1 = n.find((e) => e.d === 'P1');
    const p = n.find((e) => e.d === 'P3');
    if (!p || !p1) return false;
    appuyer((p1.b[0] + p1.b[2]) / 2, (p1.b[1] + p1.b[3]) / 2, n);
    await attendre(800);
    taille = taillDp(p.b);
    const [x, y] = viser(p.b, cote, 3);
    if (!appuyer(x, y, await lire())) return false;
    await attendre(1200);
    return !!(await lire()).find((e) => e.d === 'P3')?.sel;
  });
}

// ── Messages : segment du prénom (hitSlop {6,6}) ───────────────────────────────────────────────────
for (const cote of ['haut', 'bas']) {
  let taille = '';
  await serie({ nom: 'Segment du prénom (Messages)', hitslop: 'hitSlop {top:6,bottom:6} (Segmented.tsx:32)', cote, off: 3, get taille() { return taille; } }, async () => {
    if (!(await allerSur('Messages'))) return false;
    const general = (await lire()).find((e) => e.d === 'Général');
    if (general && !general.sel) { appuyer((general.b[0] + general.b[2]) / 2, (general.b[1] + general.b[3]) / 2, await lire()); await attendre(1000); }
    const seg = (await lire()).filter((e) => e.sel === false && e.d !== 'Général' && e.d !== '' && e.clic && e.b[3] - e.b[1] > 60 && e.b[3] - e.b[1] < 130 && e.b[2] - e.b[0] > 300 && e.b[1] < 700).sort((a, b) => a.b[1] - b.b[1] || a.b[0] - b.b[0])[0];
    if (!seg) return false;
    taille = taillDp(seg.b);
    const [x, y] = viser(seg.b, cote, 3);
    if (!appuyer(x, y, await lire())) return false;
    await attendre(1200);
    return !!(await lire()).find((e) => e.d === seg.d && e.b.length === 4 && e.b[1] < 700)?.sel;
  });
}

// ── Suivi : bouton année (hitSlop {5,5}) ─────────────────────────────────────────────────────────
for (const cote of ['haut', 'bas']) {
  let taille = '';
  await serie({ nom: 'Bouton année de Suivi', hitslop: 'hitSlop {top:5,bottom:5} (BoutonAnnee.tsx:66)', cote, off: 3, get taille() { return taille; } }, async () => {
    if (!(await allerSur('Suivi'))) return false;
    const n = await lire();
    const b = n.find((e) => /^Année /.test(e.d) && !/Ouvrir les années/.test(e.d)) ?? n.find((e) => /^Année /.test(e.d));
    if (!b) return false;
    taille = taillDp(b.b);
    const [x, y] = viser(b.b, cote, 3);
    if (!appuyer(x, y, n)) return false;
    await attendre(1200);
    const ouvert = (await lire()).some((e) => e.d === 'Fermer');
    if (ouvert) await retour(1200);
    return ouvert;
  });
}

// ── Barre du bas : trois boutons de 40 dp, hitSlop 2 → zone de 44 dp, soit 2 dp hors visuel ────────────
// Sondes : 1,5 dp (doit ouvrir) ; 3 dp (contrôle négatif : hors zone, ne doit pas ouvrir).
const BARRE = [
  // ouvert(n) : ce que l'élément ouvre, reconnu par son CONTENU (jamais par « l'écran a changé » : sous les points sondés au-dessus de
  // la barre se trouve une carte cliquable de l'Accueil — preuve du 7 oct. par hit-test uiautomator — qui ferait un faux positif).
  { nom: 'Bouton Rechercher', libelle: 'Rechercher', hs: 'hitSlop 2 ×4 (BottomBar.tsx:116)', cotes: ['haut', 'bas'], colonne: 0.5, mesure: true, ouvert: (n) => n.some((e) => /EditText/.test(e.cls)) },
  { nom: 'Pilule « Demander à Aria »', libelle: 'Demander à Aria', hs: 'hitSlop {top:2,bottom:2} (BottomBar.tsx:127)', cotes: ['haut', 'bas'], colonne: 0.85, mesure: false, ouvert: (n) => n.length === 0 },
  { nom: 'Bouton « + » (Ajouter au carnet)', libelle: 'Ajouter au carnet', hs: 'hitSlop 2 ×4 (BottomBar.tsx:142)', cotes: ['droite', 'bas'], colonne: 0.5, mesure: true, ouvert: (n) => n.some((e) => e.t === 'Photographier') },
];
// STAB2_OFFSETS=0,0.5,1,1.5 : balayage de la limite réelle de la zone (une seule face par élément) ; les lignes sont informatives.
const BALAYAGE = process.env.STAB2_OFFSETS ? process.env.STAB2_OFFSETS.split(',').map(Number) : null;
for (const el of BARRE) {
  for (const cote of BALAYAGE ? el.cotes.slice(0, 1) : el.cotes) {
    for (const [off, attendu] of BALAYAGE ? BALAYAGE.map((o) => [o, true]) : [[1.5, true], [3, false]]) {
      let taille = '';
      await serie({ nom: el.nom, hitslop: el.hs, cote, off, attendu, barre: true, get taille() { return taille; } }, async () => {
        if (!(await retourAccueil())) return false;
        const n = await lire();
        const noeud = trouver(n, el.libelle);
        if (!noeud) return false;
        // Haut = haut uiautomator (non tronqué de ce côté) ; hauteur = 40 dp du style (BottomBar.tsx : roundBtn / ariaPill, height: 40) ;
        // pour les deux boutons ronds, la hauteur est recoupée sur la capture (colonne du bouton, un seul bloc contigu).
        const haut = noeud.b[1];
        let bas = haut + 40 * DP;
        let mesure = 'hauteur du style (40 dp)';
        if (el.mesure) {
          const m = mesurerVertical(capture(), Math.round(noeud.b[0] + (noeud.b[2] - noeud.b[0]) * el.colonne), haut);
          // Mesure acceptée seulement si elle vaut 40 dp ± 2 (le 7 oct., la colonne du « + » a débordé jusqu'à 72,7 dp : mesure rejetée).
          if (m && Math.abs((m[1] - m[0]) / DP - 40) <= 2) { mesure = `mesuré sur capture : ${m[0]}–${m[1]} px`; bas = m[1]; }
          else mesure = `hauteur du style (40 dp) ; mesure sur capture rejetée (${m ? m[0] + '–' + m[1] + ' px' : 'aucune'})`;
        }
        taille = `${Math.round((noeud.b[2] - noeud.b[0]) / DP)}×${Math.round(((bas - haut) / DP) * 10) / 10} dp (${mesure} ; uiautomator tronqué ${noeud.b[1]}–${noeud.b[3]})`;
        const [x, y] = viser([noeud.b[0], haut, noeud.b[2], bas], cote, off);
        if (!appuyer(x, y, n)) return false;
        await attendre(2200);
        const ouvert = el.ouvert(await lire());
        if (ouvert) await retour(1500);
        return ouvert;
      });
    }
  }
}

await retourAccueil();
if (!premierPlan()) outil.relancer(); // ne jamais laisser l'app fermée
console.log(`\n${ok} passé(s), ${ko} échec(s) — tableau : ${SORTIE}`);
process.exit(ko ? 1 : 0);
