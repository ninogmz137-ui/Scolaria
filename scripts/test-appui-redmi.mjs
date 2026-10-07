// Test de l'outil d'appuis unique (scripts/appui-redmi.mjs) avec un FAUX téléphone : aucune commande adb réelle n'est envoyée.
// Preuve principale : quand Scolaria n'est pas au premier plan, l'outil REFUSE d'agir et n'émet AUCUN « input ».
// Plus : aucun autre script du dépôt ne contient d'« input tap / keyevent » brut ; lessons.md interdit l'adb shell input manuel.
// Usage : node scripts/test-appui-redmi.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerOutilAppuis, AppuiRefuse, scolariaAuPremierPlan, motInterdit } from './appui-redmi.mjs';

let ok = 0;
let ko = 0;
const verifier = (nom, cond, detail = '') => {
  console.log(`${cond ? 'OK  ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + detail : ''}`);
  cond ? ok++ : ko++;
};

/** Faux adb : `focus` = ligne mCurrentFocus renvoyée (ou fonction), `envoyees` = commandes « shell » reçues (hors dumpsys). */
function fauxTelephone(focus) {
  const envoyees = [];
  const adb = (args) => {
    const cmd = args.join(' ');
    if (cmd === 'shell dumpsys window') {
      const f = typeof focus === 'function' ? focus() : focus;
      return f === null ? '' : `  mSomething=x\n  mCurrentFocus=Window{abc u0 ${f}}\n  mFocusedApp=...`;
    }
    envoyees.push(cmd);
    return '';
  };
  return { adb, envoyees };
}
const refuse = (fn) => {
  try {
    fn();
    return false;
  } catch (e) {
    return e instanceof AppuiRefuse;
  }
};
const entrees = (envoyees) => envoyees.filter((c) => /input /.test(c));

// ── Le refus hors premier plan (cœur du test) ──────────────────────────────────────────────────
for (const [nom, focus] of [
  ['écran d’accueil du téléphone (launcher)', 'com.miui.home/com.miui.home.launcher.Launcher'],
  ['Expo Go (accident du 7 oct.)', 'host.exp.exponent/host.exp.exponent.experience.HomeActivity'],
  ['un nom voisin (com.scolaria.appfoo)', 'com.scolaria.appfoo/com.scolaria.appfoo.MainActivity'],
  ['aucune fenêtre au premier plan (dumpsys vide)', null],
]) {
  const t = fauxTelephone(focus);
  const outil = creerOutilAppuis(t.adb);
  verifier(`tap refusé : ${nom}`, refuse(() => outil.tap(100, 200)));
  verifier(`retour refusé : ${nom}`, refuse(() => outil.retour()));
  verifier(`aucun « input » envoyé : ${nom}`, entrees(t.envoyees).length === 0, `${t.envoyees.length} commande(s)`);
}

// ── Au premier plan : l'action est envoyée ─────────────────────────────────────────────────────
for (const [nom, focus] of [['Scolaria', 'com.scolaria.app/com.scolaria.app.MainActivity'], ['variante démo', 'com.scolaria.app.demo/com.scolaria.app.MainActivity']]) {
  const t = fauxTelephone(focus);
  const outil = creerOutilAppuis(t.adb);
  outil.tap(100.4, 200.6);
  outil.retour();
  verifier(`${nom} au premier plan : appui et retour envoyés`, JSON.stringify(t.envoyees) === JSON.stringify(['shell input tap 100 201', 'shell input keyevent KEYCODE_BACK']), t.envoyees.join(' ; '));
}

// ── Le premier plan est relu AVANT CHAQUE action (il change entre deux appuis) ─────────────────────
{
  let appel = 0;
  const t = fauxTelephone(() => (++appel === 1 ? 'com.scolaria.app/com.scolaria.app.MainActivity' : 'com.miui.home/x'));
  const outil = creerOutilAppuis(t.adb);
  outil.tap(1, 2);
  verifier('premier appui accepté (Scolaria au premier plan)', entrees(t.envoyees).length === 1);
  verifier('deuxième appui refusé (l’app est passée en arrière-plan entre les deux)', refuse(() => outil.tap(3, 4)));
  verifier('toujours un seul « input » envoyé', entrees(t.envoyees).length === 1);
}

// ── Autres refus et garde-fous ───────────────────────────────────────────────────────────────────
{
  const t = fauxTelephone('com.scolaria.app/com.scolaria.app.MainActivity');
  const outil = creerOutilAppuis(t.adb);
  verifier('mot interdit sous le doigt (« Se déconnecter ») : refusé même au premier plan', refuse(() => outil.tap(1, 2, { textesSous: 'Se déconnecter' })));
  verifier('mot interdit (« Signer ») : refusé', refuse(() => outil.tap(1, 2, { textesSous: 'Signer' })));
  verifier('coordonnées invalides (NaN) : refusé', refuse(() => outil.tap(Number.NaN, 2)));
  verifier('rien n’a été envoyé par ces trois refus', entrees(t.envoyees).length === 0);
  outil.tap(1, 2, { textesSous: 'Pilule d’année Ouvrir les années' });
  verifier('texte sans mot interdit : accepté', entrees(t.envoyees).length === 1);
}
{
  const t = fauxTelephone('com.miui.home/x');
  const outil = creerOutilAppuis(t.adb);
  outil.relancer();
  verifier('relancer l’app est permis hors premier plan (am start, aucun appui)', t.envoyees.length === 1 && /am start/.test(t.envoyees[0]) && entrees(t.envoyees).length === 0);
}
verifier('scolariaAuPremierPlan : ligne absente → faux', scolariaAuPremierPlan('rien') === false);
verifier('motInterdit : « Supprimer le compte »', motInterdit('Supprimer le compte') === true && motInterdit('Accueil') === false);

// ── Gardes de dépôt : un seul outil, aucune saisie manuelle ───────────────────────────────────────
const ici = dirname(fileURLToPath(import.meta.url));
const racine = join(ici, '..');
const brut = /input\s+(tap|keyevent|text|swipe)/;
const fautifs = readdirSync(ici)
  .filter((f) => /\.(mjs|mts|ts|js|sh)$/.test(f) && f !== 'appui-redmi.mjs' && f !== 'test-appui-redmi.mjs')
  .filter((f) =>
    readFileSync(join(ici, f), 'utf8')
      .split('\n')
      .filter((l) => !/^\s*(#|\/\/|\*|\/\*)/.test(l)) // les commentaires qui citent l'interdit ne comptent pas
      .some((l) => brut.test(l)));
verifier('aucun autre script ne contient « input tap / keyevent / text / swipe » brut', fautifs.length === 0, fautifs.join(', '));
verifier('les scripts d’appuis importent l’outil unique', ['preuve-zones-tactiles-redmi.mjs', 'test-un-enfant-un-carnet-redmi.mjs'].every((f) => /from '\.\/appui-redmi\.mjs'/.test(readFileSync(join(ici, f), 'utf8'))));
const adbui = readFileSync(join(ici, 'adbui.sh'), 'utf8');
verifier('adbui.sh : tap_texte et tap_xy passent par l’outil unique', (adbui.match(/appui-redmi\.mjs"? tap/g) ?? []).length === 2);
const lecons = readFileSync(join(racine, 'tasks', 'lessons.md'), 'utf8');
verifier('lessons.md interdit tout « adb shell input » manuel', /INTERDIT[^\n]*adb shell input/i.test(lecons));

console.log(`\n${ok} réussis, ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
