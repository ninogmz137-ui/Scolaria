// Tests de la source de marque (nom, assistant et ses formes grammaticales, textes de permission iOS). Usage : npm run test:marque
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { formesAssistant, NOM_APP, ASSISTANT, NOM_ASSISTANT, PERMISSIONS_IOS } from './marque.ts';

let ok = 0;
let echecs = 0;
const verifier = (nom: string, obtenu: unknown, voulu: unknown) => {
  const bon = JSON.stringify(obtenu) === JSON.stringify(voulu);
  console.log(`${bon ? 'OK  ' : 'ÉCHEC'} ${nom}${bon ? '' : ` — obtenu ${JSON.stringify(obtenu)}, attendu ${JSON.stringify(voulu)}`}`);
  bon ? ok++ : echecs++;
};
const racine = join(import.meta.dirname, '..', '..', '..');

// ── Formes avec le nom propre (configuration actuelle) ─────────────────────────────────────────────────────────
const aria = formesAssistant({ nom: 'Aria', genre: 'f', generique: false });
verifier('nom propre : formes de base', [aria.nom, aria.nomMilieu, aria.a, aria.de, aria.avec, aria.par], ['Aria', 'Aria', 'à Aria', 'd’Aria', 'avec Aria', 'par Aria']);
verifier('nom propre : « qu’Aria », compléments, présentation', [aria.que, aria.complement, aria.complementAvec, aria.presentation], ['qu’Aria', 'Aria', 'Aria', 'Aria, votre assistante']);
verifier('nom propre : accords féminins', [aria.pronom, aria.Pronom, aria.le, aria.e], ['elle', 'Elle', 'la', 'e']);
verifier('les phrases d\'aujourd\'hui sont reproduites à l\'identique',
  [`${aria.nom} est désactivé${aria.e}`, `Aucun message n’est envoyé ${aria.a} tant qu’${aria.pronom} est désactivé${aria.e}.`, `Le ton ${aria.que} utilise avec vous.`,
   `Je suis ${aria.presentation}`, `${aria.Pronom} ne pose aucun diagnostic : ${aria.pronom} suggère et informe.`, `vos conversations ${aria.complementAvec}`],
  ['Aria est désactivée', 'Aucun message n’est envoyé à Aria tant qu’elle est désactivée.', 'Le ton qu’Aria utilise avec vous.',
   'Je suis Aria, votre assistante', 'Elle ne pose aucun diagnostic : elle suggère et informe.', 'vos conversations Aria']);

// ── Mode générique : « l'assistant », sans AUCUN autre changement de code ────────────────────────────────────────────
const generique = formesAssistant({ nom: 'Aria', genre: 'f', generique: true });
verifier('générique : formes de base', [generique.nom, generique.nomMilieu, generique.a, generique.de, generique.avec, generique.par],
  ['L’assistant', 'l’assistant', 'à l’assistant', 'de l’assistant', 'avec l’assistant', 'par l’assistant']);
verifier('générique : accords masculins', [generique.pronom, generique.Pronom, generique.le, generique.e], ['il', 'Il', 'le', '']);
verifier('générique : les mêmes phrases deviennent correctes',
  [`${generique.nom} est désactivé${generique.e}`, `Aucun message n’est envoyé ${generique.a} tant qu’${generique.pronom} est désactivé${generique.e}.`,
   `Le ton ${generique.que} utilise avec vous.`, `Je suis ${generique.presentation}`, `${generique.Pronom} ne pose aucun diagnostic : ${generique.pronom} suggère et informe.`,
   `vos conversations ${generique.complementAvec}`, `Conseils ${generique.complement}`, `Avant d’utiliser ${generique.nomMilieu}`],
  ['L’assistant est désactivé', 'Aucun message n’est envoyé à l’assistant tant qu’il est désactivé.', 'Le ton que l’assistant utilise avec vous.',
   'Je suis votre assistant', 'Il ne pose aucun diagnostic : il suggère et informe.', 'vos conversations avec l’assistant',
   'Conseils de l’assistant', 'Avant d’utiliser l’assistant']);
verifier('générique : le nom propre configuré reste disponible', generique.nomPropre, 'Aria');

// ── La configuration actuelle et la source partagée ───────────────────────────────────────────────────────────────
const json = JSON.parse(readFileSync(join(racine, 'supabase', 'functions', '_shared', 'marque.json'), 'utf8'));
verifier('NOM_APP vient de marque.json', NOM_APP, json.nomApp);
verifier('ASSISTANT vient de marque.json (non générique aujourd\'hui)', [ASSISTANT.nomPropre, ASSISTANT.generique, NOM_ASSISTANT], [json.assistant.nom, false, ASSISTANT.nom]);
verifier('permissions iOS : gabarits avec {app}', [PERMISSIONS_IOS.appareilPhoto.includes('{app}'), PERMISSIONS_IOS.photos.includes('{app}')], [true, true]);
verifier('permission appareil photo : cite l\'appareil photo ET la photo de l\'enfant', /appareil photo/.test(PERMISSIONS_IOS.appareilPhoto) && /photo de l'enfant/.test(PERMISSIONS_IOS.appareilPhoto), true);
verifier('permission photothèque : cite les photos ET la photo de l\'enfant', /vos photos/.test(PERMISSIONS_IOS.photos) && /photo de l'enfant/.test(PERMISSIONS_IOS.photos), true);
verifier('aucun nom en dur dans les gabarits de permission', /scolaria|aria|theka/i.test(JSON.stringify(json.permissionsIos)), false);

// ── app.config.js lit la même source (sans variante et avec variante) ────────────────────────────────────────────
const require = createRequire(import.meta.url);
const configSans = (() => {
  delete process.env.APP_VARIANT;
  delete require.cache[require.resolve(join(racine, 'app.config.js'))];
  return require(join(racine, 'app.config.js')).expo;
})();
verifier('app.config.js : name = marque.json (nom sous l\'icône)', configSans.name, json.nomApp);
verifier('app.config.js : textes iOS = gabarits de marque.json avec le nom',
  [configSans.ios.infoPlist.NSCameraUsageDescription, configSans.ios.infoPlist.NSPhotoLibraryUsageDescription],
  [json.permissionsIos.appareilPhoto.replace('{app}', json.nomApp), json.permissionsIos.photos.replace('{app}', json.nomApp)]);
process.env.APP_VARIANT = 'demo';
process.env.APP_LIBELLE_DEMO = 'Libellé d\'essai';
delete require.cache[require.resolve(join(racine, 'app.config.js'))];
const configDemo = require(join(racine, 'app.config.js')).expo;
verifier('variante démo : textes iOS au libellé de la variante, mêmes gabarits',
  configDemo.ios.infoPlist.NSCameraUsageDescription, json.permissionsIos.appareilPhoto.replace('{app}', 'Libellé d\'essai'));
delete process.env.APP_VARIANT;
delete process.env.APP_LIBELLE_DEMO;

// ── Le TEXTE JURIDIQUE validé (hébergement + assistant) est reproduit MOT POUR MOT avec le nom actuel ─────────────────────
// (le fichier src/constants/textesLegaux.ts est compilé ici avec les formes réelles de l'assistant ; la formulation validée est celle de CLAUDE.md)
{
  const ts = (await import('typescript')).default;
  const code = readFileSync(join(racine, 'src', 'constants', 'textesLegaux.ts'), 'utf8');
  const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const evaluer = (assistant: unknown): string => {
    const m: { exports: Record<string, string> } = { exports: {} };
    new Function('require', 'module', 'exports', js)(() => ({ ASSISTANT: assistant }), m, m.exports);
    return m.exports.FORMULATION_HEBERGEMENT_ARIA;
  };
  const VALIDE =
    'Les données du carnet de votre enfant sont hébergées dans l’Union européenne, à Paris. Aria s’appuie sur un modèle d’Anthropic, société américaine. ' +
    'Quand vous utilisez Aria, vos messages, l’historique de la conversation, le prénom et le niveau scolaire de l’enfant sont traités hors de l’Union européenne. ' +
    'Anthropic les efface sous 30 jours, sauf s’ils sont signalés pour non-respect de ses règles d’utilisation (conservation jusqu’à 2 ans). ' +
    'Ils ne servent jamais à entraîner le modèle. Aria ne reçoit rien d’autre du carnet. En cas de message de détresse, rien n’est envoyé à Aria.';
  verifier('texte juridique validé : identique mot pour mot avec le nom actuel', evaluer(aria), VALIDE);
  verifier('texte juridique en mode générique : seul le nom change', evaluer(generique).replace(/L’assistant|l’assistant|à l’assistant/g, 'Aria').replace('envoyé Aria', 'envoyé à Aria'), VALIDE);
}

console.log(`\n${ok} réussis, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
