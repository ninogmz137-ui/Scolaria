// OUTIL D'APPUIS UNIQUE pour le Redmi (adb, USB). Tout appui et tout « retour » passent ICI, jamais par `adb shell input …` à la main
// (règle de tasks/lessons.md, 7 oct. 2026 : un appui à l'aveugle, hors premier plan, a ouvert Expo Go).
//   · AVANT CHAQUE appui ou retour : mCurrentFocus est relu ; si Scolaria (com.scolaria.app ou la variante .demo) n'est pas au premier
//     plan, l'outil REFUSE d'agir (AppuiRefuse, code de sortie 3) — il n'envoie rien ;
//   · si l'appelant fournit les textes situés sous le doigt, un mot interdit (déconnexion, suppression, signature, envoi…) refuse aussi ;
//   · jamais de saisie de texte ni d'identifiant : seuls `tap` et `retour` existent.
// Usage en ligne de commande : node scripts/appui-redmi.mjs tap <x> <y> | retour | focus
// Usage en module : const outil = creerOutilAppuis(); outil.tap(x, y, { textesSous }); outil.retour();
import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';

export const APPAREIL = process.env.ADB_DEVICE ?? 'a3a0cfea';
const FOCUS_SCOLARIA = /com\.scolaria\.app(?:\.demo)?\/[A-Za-z0-9_.$]+/;
const INTERDITS = /deconnect|deconnexion|quitter|logout|sign out|supprim|effac|retir|revoqu|reinitialis|vider|sign|envoy|publi|confirm|valider|payer|acheter|enregistr/;

export class AppuiRefuse extends Error {
  constructor(raison) {
    super(raison);
    this.name = 'AppuiRefuse';
  }
}

/** Vrai si la ligne mCurrentFocus de `dumpsys window` désigne une fenêtre de Scolaria. */
export function scolariaAuPremierPlan(sortieDumpsys) {
  const ligne = String(sortieDumpsys ?? '').split('\n').find((l) => l.includes('mCurrentFocus')) ?? '';
  return FOCUS_SCOLARIA.test(ligne);
}

/** Vrai si le texte contient un mot interdit (sans accents ni casse). */
export function motInterdit(texte) {
  return INTERDITS.test(String(texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
}

/** `adbShell(args)` : exécute `adb -s <appareil> …args` et renvoie la sortie standard (injectable pour les tests). */
function adbReel(args) {
  return spawnSync('adb', ['-s', APPAREIL, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }).stdout ?? '';
}

export function creerOutilAppuis(adbShell = adbReel) {
  const premierPlan = () => scolariaAuPremierPlan(adbShell(['shell', 'dumpsys window']));
  const exiger = (quoi) => {
    if (!premierPlan()) throw new AppuiRefuse(`REFUSÉ : Scolaria n’est pas au premier plan (${quoi}) — aucun appui envoyé.`);
  };
  return {
    premierPlan,
    /** Un appui. Les coordonnées sont des pixels entiers à l'écran. */
    tap(x, y, { textesSous } = {}) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new AppuiRefuse(`REFUSÉ : coordonnées invalides (${x}, ${y}).`);
      exiger(`appui ${Math.round(x)},${Math.round(y)}`);
      if (textesSous !== undefined && motInterdit(textesSous)) throw new AppuiRefuse(`REFUSÉ : mot interdit sous ${Math.round(x)},${Math.round(y)}.`);
      adbShell(['shell', `input tap ${Math.round(x)} ${Math.round(y)}`]);
    },
    /** Un « retour » (KEYCODE_BACK). Refusé hors Scolaria : un retour de trop ferme l'app ou agit dans une autre. */
    retour() {
      exiger('retour');
      adbShell(['shell', 'input keyevent KEYCODE_BACK']);
    },
    /** Un balayage (défilement) de (x1,y1) vers (x2,y2). Même garde que `tap` : refusé hors premier plan. */
    balayer(x1, y1, x2, y2, dureeMs = 300) {
      if (![x1, y1, x2, y2, dureeMs].every(Number.isFinite)) throw new AppuiRefuse('REFUSÉ : coordonnées de balayage invalides.');
      exiger('balayage');
      adbShell(['shell', `input swipe ${Math.round(x1)} ${Math.round(y1)} ${Math.round(x2)} ${Math.round(y2)} ${Math.round(dureeMs)}`]);
    },
    /** Relance l'app (aucun appui) — seule action permise hors premier plan. */
    relancer(paquet = 'com.scolaria.app') {
      if (!/^com\.scolaria\.app(\.demo)?$/.test(String(paquet))) throw new AppuiRefuse(`REFUSÉ : paquet non autorisé (${paquet}).`);
      adbShell(['shell', `am start -n ${paquet}/.MainActivity`]);
    },
    /** Arrête le PROCESSUS du paquet donné (jamais de désinstallation, rien d'effacé) puis, si `relancer`, le redémarre à froid. */
    redemarrer(paquet) {
      if (!/^com\.scolaria\.app(\.demo)?$/.test(String(paquet))) throw new AppuiRefuse(`REFUSÉ : paquet non autorisé (${paquet}).`);
      adbShell(['shell', `am force-stop ${paquet}`]);
    },
  };
}

// ── Ligne de commande ──────────────────────────────────────────────────────────────────────────
if (basename(process.argv[1] ?? '') === 'appui-redmi.mjs') {
  const [commande, a, b] = process.argv.slice(2);
  const outil = creerOutilAppuis();
  try {
    if (commande === 'tap') outil.tap(Number(a), Number(b));
    else if (commande === 'retour') outil.retour();
    else if (commande === 'focus') console.log(outil.premierPlan() ? 'Scolaria au premier plan' : 'Scolaria PAS au premier plan');
    else {
      console.log('Usage : node scripts/appui-redmi.mjs tap <x> <y> | retour | focus');
      process.exit(2);
    }
  } catch (e) {
    if (e instanceof AppuiRefuse) {
      console.log(e.message);
      process.exit(3);
    }
    throw e;
  }
}
