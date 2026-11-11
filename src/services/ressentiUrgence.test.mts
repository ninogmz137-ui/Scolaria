/**
 * `npm run test:ressenti-urgence` — Bien-être : un message de détresse n'est jamais dans la ligne insérée,
 * une alerte est créée par le même chemin que l'assistant, les numéros restent affichés et cliquables.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectEmergency } from '../../supabase/functions/_shared/emergency.ts';
import { preparerRessenti } from './ressentiUrgence.ts';

let ok = 0;
let echecs = 0;
function verifier(nom: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${nom}${cond ? '' : ` → ${detail}`}`);
  if (cond) ok++;
  else echecs++;
}

const ENFANT = '11111111-1111-4111-8111-111111111111';
const base = { child_id: ENFANT, mode: 'lycee' as const, energy: 3, stress: 8, motivation: 2, social: 4, joy_score: 3 };

// ── Message de détresse : la ligne part SANS message ──
for (const [texte, categorie] of [
  ['J’ai envie de mourir', 'suicide'],
  ['On me harcèle tous les jours dans le bus', 'harcelement'],
  ['Mon beau-père me frappe', 'maltraitance'],
] as const) {
  const { ligne, urgence } = preparerRessenti({ ...base, message: texte }, detectEmergency);
  verifier(`R1 « ${categorie} » : catégorie renvoyée`, urgence === categorie, String(urgence));
  verifier(`R2 « ${categorie} » : aucune clé message, le texte n'est nulle part dans la ligne`, !('message' in ligne) && !JSON.stringify(ligne).includes(texte.slice(0, 12)), JSON.stringify(ligne));
  verifier(`R3 « ${categorie} » : le ressenti lui-même est gardé`, ligne.child_id === ENFANT && ligne.mode === 'lycee' && ligne.stress === 8 && ligne.joy_score === 3);
}

// ── Message ordinaire, vide, absent ──
{
  const normal = preparerRessenti({ ...base, message: '  Bonne journée, un peu fatigué  ' }, detectEmergency);
  verifier('R4 message ordinaire : gardé (sans espaces de bord), pas d’urgence', normal.urgence === null && normal.ligne.message === 'Bonne journée, un peu fatigué');
  const vide = preparerRessenti({ ...base, message: '   ' }, detectEmergency);
  const absent = preparerRessenti({ ...base }, detectEmergency);
  verifier('R5 message vide ou absent : pas de clé message, pas d’urgence', !('message' in vide.ligne) && !('message' in absent.ligne) && vide.urgence === null && absent.urgence === null);
  const piege = preparerRessenti({ ...base, message: 'Ces devoirs vont me tuer, et j’ai cours de violon' }, detectEmergency);
  verifier('R6 hyperbole et « violon » : message gardé', piege.urgence === null && !!piege.ligne.message);
  const entree = { ...base, message: 'J’ai envie de mourir' };
  preparerRessenti(entree, detectEmergency);
  verifier('R7 l’objet d’entrée n’est pas modifié', entree.message === 'J’ai envie de mourir');
}

// ── Câblage : createCheckin passe par ce module et par le chemin d'alerte de l'assistant ──
{
  const racine = join(import.meta.dirname, '..');
  const lire = (f: string) => readFileSync(join(racine, f), 'utf8');
  const db = lire('services/database.ts');
  const corps = db.slice(db.indexOf('export async function createCheckin'), db.indexOf('// AGENDA'));
  verifier('C1 createCheckin insère la ligne préparée, jamais l’objet reçu', corps.includes('preparerRessenti(checkin, detectEmergency)') && /\.insert\(ligne\)/.test(corps) && !/\.insert\(checkin\)/.test(corps));
  verifier('C2 createCheckin crée l’alerte (catégorie + enfant)', corps.includes('if (urgence) recordEmergencyAlert(urgence, checkin.child_id)'));
  const alerte = lire('services/alerteUrgence.ts');
  verifier('C3 l’alerte n’écrit que catégorie et enfant', /insert\(\{ categorie: category, child_id \}\)/.test(alerte));
  verifier('C4 même chemin pour l’assistant', lire('services/ariaApi.ts').includes("import { recordEmergencyAlert } from './alerteUrgence'") && !lire('services/ariaApi.ts').includes('function recordEmergencyAlert'));
  const appelants = ['screens/MonRessentiScreen.tsx'];
  verifier('C5 l’écran n’écrit pas lui-même dans checkins (seul createCheckin le fait)', appelants.every((f) => !/from\('checkins'\)/.test(lire(f))));
  for (const nav of ['navigation/TabNavigator.tsx', 'navigation/SandboxNavigator.tsx', 'navigation/EleveTabNavigator.tsx']) {
    verifier(`C6 ${nav} monte le même écran`, lire(nav).includes("import MonRessentiScreen from '../screens/MonRessentiScreen'"));
  }
  const ecran = lire('screens/MonRessentiScreen.tsx');
  verifier('E1 plus de « Confidentiel » à l’écran', !/[Cc]onfidentiel/.test(ecran.replace(/\/\/.*$/gm, '')));
  verifier('E2 numéros cliquables : 3018, 3114, 119, puis 112 en dernier ; aucun 3020',
    ['tel:3018', 'tel:3114', 'tel:119', 'tel:112'].every((n) => ecran.includes(`Linking.openURL('${n}')`)) &&
    ecran.indexOf('tel:112') > Math.max(ecran.indexOf('tel:3018'), ecran.indexOf('tel:3114'), ecran.indexOf('tel:119')) && !ecran.includes('3020'));
  verifier('E3 les numéros restent affichés après l’envoi', ecran.includes('(critical || aideGardee)') && ecran.includes('if (critical) setAideGardee(true)'));
}

console.log(`\n${ok} réussis, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
