// « Le carnet est vide » : règle pure (carnet vide, un seul souvenir, erreur de chargement, changement d'enfant…).
// npm run test:carnet-vide
import { TABLES_CARNET, carnetEstVide, type ComptesCarnet, type EtatCarnet } from './carnetVide.ts';

let ok = 0;
let echecs = 0;
function verifier(nom: string, obtenu: unknown, attendu: unknown) {
  const bon = obtenu === attendu;
  console.log(`${bon ? 'OK ' : 'ÉCHEC'} ${nom}${bon ? '' : ` : obtenu ${obtenu}, attendu ${attendu}`}`);
  if (bon) ok++;
  else echecs++;
}

const zeros = (): ComptesCarnet => Object.fromEntries(TABLES_CARNET.map((t) => [t.table, 0]));
const etat = (childId: string, surcharge: Partial<ComptesCarnet> = {}): EtatCarnet => ({ childId, comptes: { ...zeros(), ...surcharge } });
const LUCAS = 'lucas';
const LEA = 'lea';

verifier('carnet entièrement vide, chargé, sans erreur → vide', carnetEstVide(etat(LUCAS), LUCAS, false), true);
verifier('un SEUL souvenir (carnet_items) → pas vide', carnetEstVide(etat(LUCAS, { carnet_items: 1 }), LUCAS, false), false);
for (const { table } of TABLES_CARNET) {
  verifier(`une seule ligne dans ${table} → pas vide`, carnetEstVide(etat(LUCAS, { [table]: 1 }), LUCAS, false), false);
  verifier(`lecture de ${table} en échec (null) → pas vide`, carnetEstVide(etat(LUCAS, { [table]: null }), LUCAS, false), false);
}
verifier('table absente du résultat → pas vide', carnetEstVide({ childId: LUCAS, comptes: { carnet_items: 0 } }, LUCAS, false), false);
verifier('chargement en cours (état null) → pas vide', carnetEstVide(null, LUCAS, false), false);
verifier('erreur de chargement ailleurs sur l\'écran (réseau, session) → pas vide', carnetEstVide(etat(LUCAS), LUCAS, true), false);
verifier('aucun enfant → pas vide', carnetEstVide(etat(LUCAS), undefined, false), false);
// Changement d'enfant : l'état de Lucas (vide) ne vaut jamais pour Léa ; tant que Léa n'est pas lue → pas vide.
verifier('on passe de Lucas (vide) à Léa : l\'état de Lucas ne s\'applique pas', carnetEstVide(etat(LUCAS), LEA, false), false);
verifier('Léa lue, vide → vide', carnetEstVide(etat(LEA), LEA, false), true);
verifier('retour à Lucas, dont l\'état a été remis à null → pas vide en attendant', carnetEstVide(null, LUCAS, false), false);
verifier('les 9 tables du carnet sont comptées', TABLES_CARNET.length, 9);

// Garde-fous de code : jamais en démo, texte exact, zone tactile de la pilule, constante du nom de l'assistant.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const racine = join(import.meta.dirname, '..', '..');
const src = (f: string) => readFileSync(join(racine, f), 'utf8').replace(/\r\n/g, '\n');
verifier('useCarnetVide : toujours faux en démo (!isDemo &&)', /return !isDemo && carnetEstVide\(/.test(src('src/hooks/useCarnetVide.ts')), true);
verifier('useCarnetVide : état remis à null au changement d\'enfant (setEtat(null) en tête d\'effet)', /setEtat\(null\);\s*if \(isDemo \|\| !childId\) return;/.test(src('src/hooks/useCarnetVide.ts')), true);
const carte = src('src/components/accueil/CarnetVide.tsx');
verifier('texte : titre exact', carte.includes('Le carnet ${de(prenom)} est vide pour l’instant.'), true);
verifier('texte : phrase exacte', carte.includes('Ajoutez un mot reçu, un livret, un souvenir ou une première fois : tout est rangé dans son carnet.'), true);
verifier('pilule « Ajouter au carnet », 40 dp + hitSlop 2 + 2 = 44', /height: 40/.test(carte) && /hitSlop=\{\{ top: 2, bottom: 2 \}\}/.test(carte) && carte.includes('Ajouter au carnet'), true);
verifier('la pilule ouvre la feuille existante (demanderAjoutCarnet)', carte.includes("demanderAjoutCarnet({ onglet: 'Accueil' })"), true);
const accueil = src('src/screens/AccueilScreen.tsx');
verifier('Accueil : la carte « vide » n\'est montrée que si carnetVide', /\{carnetVide \? \(\s*<CarnetVide prenom=\{prenom\} \/>/.test(accueil), true);
verifier('Accueil : carte de l\'assistant — texte exact en compte réel', accueil.includes("Elle ne lit pas le carnet ${de(prenom)} : elle reçoit seulement son prénom, son niveau et vos messages."), true);
verifier('Accueil : le nom de l\'assistant passe par NOM_ASSISTANT', accueil.includes('NOM_ASSISTANT') && !/ariaLabel\}>ARIA</.test(accueil), true);
verifier('NOM_ASSISTANT défini une seule fois (constants/marque.ts)', (src('src/constants/marque.ts').match(/export const NOM_ASSISTANT/g) ?? []).length, 1);

console.log(`\n${ok} réussis, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
