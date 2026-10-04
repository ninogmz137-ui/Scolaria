// PREUVE des zones tactiles ≥ 44 dp sur le Redmi (adb, USB), sans rien changer aux visuels.
// Pour chaque élément : un appui à ~4 dp À L'EXTÉRIEUR du visuel (donc dans la zone agrandie à 44) doit déclencher
// SON action (navigation / ouverture, jamais une action destructive). Les bornes du visuel viennent de uiautomator
// (qui n'inclut PAS le hitSlop) ; pour la barre du bas elles sont recalculées d'après la mise en page (uiautomator les
// tronque à la fin de la fenêtre qu'il voit : « 40 × 11 »).
// GARDE-FOUS : Scolaria au premier plan (mCurrentFocus) avant CHAQUE appui, sinon arrêt ; aucun appui si le texte de ce qui
// est sous le doigt contient un mot interdit (déconnexion, suppression, signature, envoi, enregistrement…) ; un seul
// « retour » à la fois, avec contrôle ; jamais de saisie ni d'identifiant.
// Prérequis : téléphone déverrouillé, compte réel connecté, Scolaria ouverte sur l'Accueil, Metro joint.
// Usage : node scripts/preuve-zones-tactiles-redmi.mjs
import { spawnSync } from 'node:child_process';

const DEV = process.env.ADB_DEVICE ?? 'a3a0cfea';
const DP = 2.75;
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
    return { t: g('text'), d: g('content-desc'), b, sel: g('selected') === 'true', clic: g('clickable') === 'true' };
  });
}
const trouver = (noeuds, libelle) => noeuds.find((n) => (n.d === libelle || n.t === libelle) && n.b.length === 4);
const texteSous = (noeuds, x, y) =>
  noeuds.filter((n) => n.b.length === 4 && n.b[0] <= x && x <= n.b[2] && n.b[1] <= y && y <= n.b[3]).map((n) => `${n.t} ${n.d}`).join(' ');

let ok = 0;
let ko = 0;
const resultats = [];
function noter(nom, cond, detail = '') {
  console.log(`${cond ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + detail : ''}`);
  resultats.push({ nom, cond });
  cond ? ok++ : ko++;
}

/** Un appui gardé. Renvoie false (et n'appuie pas) si une condition de sécurité n'est pas remplie. */
function appuyer(x, y, noeuds) {
  if (!premierPlan()) {
    console.log('ARRÊT : Scolaria n’est pas au premier plan.');
    process.exit(3);
  }
  const dessous = norm(texteSous(noeuds, x, y));
  if (INTERDITS.test(dessous)) {
    console.log(`REFUSÉ (mot interdit sous ${x},${y}) : ${dessous.slice(0, 80)}`);
    return false;
  }
  adb('shell', `input tap ${Math.round(x)} ${Math.round(y)}`);
  return true;
}
const dehors = 4 * DP; // ~4 dp à l'extérieur du visuel, dans la zone de 44 dp (zones de 2 à 5 dp de marge)

async function retourAccueil() {
  // Un seul retour à la fois, avec contrôle ; sinon arrêt.
  for (let i = 0; i < 3; i++) {
    const n = lire();
    if (n.some((e) => e.t === 'Bonjour' || e.t === 'Bienvenue')) return true;
    if (!premierPlan()) return false;
    const accueil = trouver(n, 'Accueil');
    if (accueil && !INTERDITS.test(norm(texteSous(n, (accueil.b[0] + accueil.b[2]) / 2, (accueil.b[1] + accueil.b[3]) / 2)))) {
      adb('shell', `input tap ${(accueil.b[0] + accueil.b[2]) >> 1} ${(accueil.b[1] + accueil.b[3]) >> 1}`);
    } else {
      adb('shell', 'input keyevent KEYCODE_BACK');
    }
    await attendre(2000);
  }
  return lire().some((e) => e.t === 'Bonjour' || e.t === 'Bienvenue');
}

if (!premierPlan()) {
  console.log('ARRÊT : Scolaria n’est pas au premier plan (relancer avec am start).');
  process.exit(3);
}
if (!(await retourAccueil())) {
  console.log('ARRÊT : impossible de se placer sur l’Accueil.');
  process.exit(3);
}

// ── Barre du haut : burger, avatar, onglets ───────────────────────────────────────────────────
{
  const n = lire();
  const b = trouver(n, 'Famille et paramètres').b;
  const [x1, y1, x2, y2] = b;
  const cy = (y1 + y2) / 2;
  for (const [cote, x, y] of [['à droite', x2 + dehors, cy], ['à gauche', x1 - dehors, cy], ['au-dessus', (x1 + x2) / 2, y1 - dehors], ['en dessous', (x1 + x2) / 2, y2 + dehors]]) {
    if (!(await retourAccueil())) break;
    const noeuds = lire();
    if (!appuyer(x, y, noeuds)) continue;
    await attendre(2000);
    noter(`Burger ${(x2 - x1) / DP | 0}×${(y2 - y1) / DP | 0} dp : appui ${cote}, ~4 dp hors du visuel → ouvre Famille & paramètres`, lire().some((e) => e.t === 'Famille & paramètres' || e.t === 'Famille &amp; paramètres'));
  }
}
{
  if (await retourAccueil()) {
    const n = lire();
    const [x1, y1, x2, y2] = trouver(n, "Changer d'enfant").b;
    const cy = (y1 + y2) / 2;
    for (const [cote, x, y] of [['à droite', x2 + dehors, cy], ['à gauche', x1 - dehors, cy], ['au-dessus', (x1 + x2) / 2, y1 - dehors], ['en dessous', (x1 + x2) / 2, y2 + dehors]]) {
      if (!(await retourAccueil())) break;
      if (!appuyer(x, y, lire())) continue;
      await attendre(2000);
      const ouvert = lire().some((e) => /Avatar d/.test(e.d) && e.clic && e.b[3] - e.b[1] > 100);
      noter(`Avatar ${(x2 - x1) / DP | 0}×${(y2 - y1) / DP | 0} dp : appui ${cote}, ~4 dp hors du visuel → ouvre le sélecteur d'enfant`, ouvert);
      if (ouvert) {
        adb('shell', 'input keyevent KEYCODE_BACK');
        await attendre(1500);
      }
    }
  }
}
for (const [nom, visee, attendu] of [['Suivi', 'Suivi', (e) => e.some((x) => /^Année /.test(x.d) || x.t.startsWith('Compétences') || x.t.startsWith('Carnet de suivi'))], ['Agenda', 'Agenda', (e) => e.some((x) => x.t === 'Emploi du temps' || /^Octobre|^Novembre|^Septembre|^Décembre/.test(x.t))], ['Messages', 'Messages', (e) => e.some((x) => x.d === 'Général')]]) {
  for (const cote of ['gauche', 'droite', 'haut', 'bas']) {
    if (!(await retourAccueil())) break;
    const n = lire();
    const noeud = trouver(n, visee);
    if (!noeud) { noter(`Onglet ${nom} introuvable`, false); break; }
    const [x1, y1, x2, y2] = noeud.b;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const [x, y] = cote === 'gauche' ? [x1 - dehors, cy] : cote === 'droite' ? [x2 + dehors, cy] : cote === 'haut' ? [cx, y1 - dehors] : [cx, y2 + dehors];
    if (!appuyer(x, y, n)) continue;
    await attendre(2200);
    noter(`Onglet ${nom} (visuel ${(x2 - x1) / DP | 0}×${(y2 - y1) / DP | 0} dp) : appui à ${cote}, ~4 dp hors du visuel → ouvre ${nom}`, attendu(lire()));
  }
}

// ── Agenda : jours de la semaine ─────────────────────────────────────────────────────────────
if (await retourAccueil()) {
  const n0 = lire();
  const ag = trouver(n0, 'Agenda');
  appuyer((ag.b[0] + ag.b[2]) / 2, (ag.b[1] + ag.b[3]) / 2, n0);
  await attendre(2500);
  const n = lire();
  const jours = n.filter((e) => /^[LMJVSD], \d+$/.test(e.d)).sort((a, b) => a.b[0] - b.b[0]);
  const cible = jours[2]; // 3e jour de la bande
  if (cible && premierPlan()) {
    const [x1, y1, x2, y2] = cible.b;
    const numero = cible.d.split(', ')[1];
    const troisDp = 3 * DP; // la marge des jours est de 4 dp : on vise 3 dp (4 dp pile serait sur la limite)
    for (const [cote, x] of [['gauche', x1 - troisDp], ['droite', x2 + troisDp]]) {
      if (!appuyer(x, (y1 + y2) / 2, lire())) continue;
      await attendre(1500);
      const titre = lire().find((e) => /^(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche) \d+/.test(e.t));
      noter(`Jour de l'Agenda (visuel ${(x2 - x1) / DP | 0} dp de large) : appui à ${cote}, ~3 dp hors du visuel → sélectionne le ${numero}`, !!titre && titre.t.split(' ')[1] === numero, titre?.t);
      // on repart d'un autre jour pour que le test suivant ne soit pas gagné d'avance
      const autre = jours[0];
      appuyer((autre.b[0] + autre.b[2]) / 2, (autre.b[1] + autre.b[3]) / 2, lire());
      await attendre(1000);
    }
  } else noter('Jours de l’Agenda introuvables', false);
}

// ── Suivi : pastilles de période P1 à P5 ─────────────────────────────────────────────────────
if (await retourAccueil()) {
  const n0 = lire();
  const su = trouver(n0, 'Suivi');
  appuyer((su.b[0] + su.b[2]) / 2, (su.b[1] + su.b[3]) / 2, n0);
  await attendre(2500);
  const n = lire();
  const p = n.find((e) => e.d === 'P3');
  if (p) {
    const [x1, y1, x2, y2] = p.b;
    for (const [cote, x, y] of [['au-dessus (~6 dp)', (x1 + x2) / 2, y1 - 6 * DP], ['en dessous (~3 dp)', (x1 + x2) / 2, y2 + 3 * DP]]) {
      // repartir de P1
      const p1 = lire().find((e) => e.d === 'P1');
      appuyer((p1.b[0] + p1.b[2]) / 2, (p1.b[1] + p1.b[3]) / 2, lire());
      await attendre(800);
      if (!appuyer(x, y, lire())) continue;
      await attendre(1200);
      const apres = lire().find((e) => e.d === 'P3');
      noter(`Pastille P3 (visuel ${(x2 - x1) / DP | 0}×${(y2 - y1) / DP | 0} dp) : appui ${cote} hors du visuel → sélectionne P3`, !!apres?.sel, `selected=${apres?.sel}`);
    }
  } else noter('Pastilles P1–P5 introuvables (vue Apprentissages primaire attendue)', false);
}

// ── STAB-2b : filtres de l'Agenda (30 → 44 dp), segments de Messages (32 → 44), bouton année de Suivi (34 → 44) ──
async function allerSur(onglet) {
  if (!(await retourAccueil())) return false;
  const n = lire();
  const o = trouver(n, onglet);
  if (!o || !appuyer((o.b[0] + o.b[2]) / 2, (o.b[1] + o.b[3]) / 2, n)) return false;
  await attendre(2500);
  return true;
}
// Agenda : on part du filtre « Tout » ; un appui à 6 dp au-dessus / en dessous du filtre « Événements » doit le sélectionner.
if (await allerSur('Agenda')) {
  for (const cote of ['au-dessus', 'en dessous']) {
    const tout = lire().find((e) => e.d === 'Filtre Tout');
    if (tout && !tout.sel) {
      appuyer((tout.b[0] + tout.b[2]) / 2, (tout.b[1] + tout.b[3]) / 2, lire());
      await attendre(800);
    }
    const f = lire().find((e) => e.d === 'Filtre Événements');
    if (!f) { noter('Filtre « Événements » introuvable', false); break; }
    const [x1, y1, x2, y2] = f.b;
    const y = cote === 'au-dessus' ? y1 - 6 * DP : y2 + 6 * DP;
    if (!appuyer((x1 + x2) / 2, y, lire())) continue;
    await attendre(1000);
    const apres = lire().find((e) => e.d === 'Filtre Événements');
    noter(`Filtre de l'Agenda (visuel ${(x2 - x1) / DP | 0}×${(y2 - y1) / DP | 0} dp) : appui ${cote}, 6 dp hors du visuel → sélectionne « Événements »`, !!apres?.sel, `selected=${apres?.sel}`);
  }
  const tout = lire().find((e) => e.d === 'Filtre Tout');
  if (tout) appuyer((tout.b[0] + tout.b[2]) / 2, (tout.b[1] + tout.b[3]) / 2, lire());
}
// Messages : segment du prénom (inactif au départ) ; appui à 5 dp au-dessus / en dessous → sélectionné.
if (await allerSur('Messages')) {
  for (const cote of ['au-dessus', 'en dessous']) {
    const general = lire().find((e) => e.d === 'Général');
    if (general && !general.sel) {
      appuyer((general.b[0] + general.b[2]) / 2, (general.b[1] + general.b[3]) / 2, lire());
      await attendre(1000);
    }
    // Le segment du prénom est le 1er élément sélectionnable (sel=false) de la page, juste à droite de « Général ».
    const seg = lire().filter((e) => e.sel === false && e.d !== 'Général' && e.d !== '' && e.clic && e.b[3] - e.b[1] > 60 && e.b[3] - e.b[1] < 130 && e.b[2] - e.b[0] > 300 && e.b[1] < 700).sort((a, b) => a.b[1] - b.b[1] || a.b[0] - b.b[0])[0];
    if (!seg) { noter('Segment du prénom introuvable (Messages)', false); break; }
    const [x1, y1, x2, y2] = seg.b;
    const y = cote === 'au-dessus' ? y1 - 5 * DP : y2 + 5 * DP;
    if (!appuyer((x1 + x2) / 2, y, lire())) continue;
    await attendre(1200);
    const apres = lire().find((e) => e.d === seg.d && e.b.length === 4 && e.b[1] < 700);
    noter(`Segment de Messages « ${seg.d} » (visuel ${(x2 - x1) / DP | 0}×${(y2 - y1) / DP | 0} dp) : appui ${cote}, 5 dp hors du visuel → sélectionne le segment`, !!apres?.sel, `selected=${apres?.sel}`);
  }
  const general = lire().find((e) => e.d === 'Général');
  if (general && !general.sel) appuyer((general.b[0] + general.b[2]) / 2, (general.b[1] + general.b[3]) / 2, lire());
}
// Suivi : bouton année ; appui à 4 dp au-dessus / en dessous → ouvre le menu des années (calque « Fermer »), un seul retour.
if (await allerSur('Suivi')) {
  for (const cote of ['au-dessus', 'en dessous']) {
    const b = lire().find((e) => /^Année /.test(e.d));
    if (!b) { noter('Bouton année introuvable', false); break; }
    const [x1, y1, x2, y2] = b.b;
    const y = cote === 'au-dessus' ? y1 - 4 * DP : y2 + 4 * DP;
    if (!appuyer((x1 + x2) / 2, y, lire())) continue;
    await attendre(1200);
    const ouvert = lire().some((e) => e.d === 'Fermer');
    noter(`Bouton année (visuel ${(x2 - x1) / DP | 0}×${(y2 - y1) / DP | 0} dp) : appui ${cote}, 4 dp hors du visuel → ouvre le menu des années`, ouvert);
    if (ouvert) {
      adb('shell', 'input keyevent KEYCODE_BACK');
      await attendre(1200);
    }
  }
}

// ── Barre du bas : Rechercher, pill Aria, bouton d'action (zone 40 → 44 dp : 2 dp de marge) ──
if (await retourAccueil()) {
  const n = lire();
  // Visuel recalculé : boutons ronds de 40 dp, haut = haut mesuré (non tronqué), bas = haut + 40 dp.
  const rech = trouver(n, 'Rechercher');
  const haut = rech.b[1];
  const bas = haut + 40 * DP;
  const marge = 1.5 * DP; // 1,5 dp hors du visuel (la zone ajoute 2 dp)
  const champs = (e) => e.filter((x) => x.clic === false && /EditText/.test('')).length; // (non utilisé)
  const rechercheOuverte = (e) => e.some((x) => x.t === 'Rechercher…' || /Rechercher/.test(x.d) && x.b[3] - x.b[1] > 60) || e.length === 0;
  for (const [cote, x, y] of [['au-dessus', (rech.b[0] + rech.b[2]) / 2, haut - marge], ['en dessous', (rech.b[0] + rech.b[2]) / 2, bas + marge]]) {
    if (!(await retourAccueil())) break;
    if (!appuyer(x, y, lire())) continue;
    await attendre(2000);
    adb('shell', 'uiautomator dump /sdcard/w.xml');
    const xml = adb('exec-out', 'cat /sdcard/w.xml');
    const ouvert = /class="android.widget.EditText"/.test(xml);
    noter(`Bouton Rechercher (40×40 dp visibles) : appui ${cote}, 1,5 dp hors du visuel → ouvre la recherche`, ouvert);
    if (ouvert) {
      adb('shell', 'input keyevent KEYCODE_BACK');
      await attendre(1500);
    }
  }
  // Pill de l'assistant (40 dp de haut + 2 + 2) : appui 1,5 dp au-dessus / en dessous → ouvre Aria (un champ de saisie apparaît).
  const pill = trouver(lire(), 'Demander à Aria');
  if (pill) {
    for (const [cote, y] of [['au-dessus', haut - marge], ['en dessous', bas + marge]]) {
      if (!(await retourAccueil())) break;
      if (!appuyer((pill.b[0] + pill.b[2]) / 2, y, lire())) continue;
      await attendre(2200);
      adb('shell', 'uiautomator dump /sdcard/w.xml');
      const ouvert = /Avant d.utiliser Aria|class="android.widget.EditText"/.test(adb('exec-out', 'cat /sdcard/w.xml'));
      noter(`Pill de l'assistant (40 dp de haut visibles) : appui ${cote}, 1,5 dp hors du visuel → ouvre Aria`, ouvert);
    }
  } else noter('Pill « Demander à Aria » introuvable', false);
  // Bouton d'action « + » (Accueil) : à droite du visuel (marge libre de 12 dp) et en dessous.
  const plus = trouver(lire(), 'Ajouter au carnet');
  if (plus) {
    for (const [cote, x, y] of [['à droite', plus.b[2] + marge, haut + 20 * DP], ['en dessous', (plus.b[0] + plus.b[2]) / 2, bas + marge]]) {
      if (!(await retourAccueil())) break;
      if (!appuyer(x, y, lire())) continue;
      await attendre(2000);
      const ouvert = lire().some((e) => /^Photographier/.test(e.d) || e.t === 'Photographier');
      noter(`Bouton « + » (40×40 dp visibles) : appui ${cote}, 1,5 dp hors du visuel → ouvre « Ajouter au carnet »`, ouvert);
      if (ouvert) {
        adb('shell', 'input keyevent KEYCODE_BACK');
        await attendre(1500);
      }
    }
  }
}

await retourAccueil();
console.log(`\n${ok} OK, ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
