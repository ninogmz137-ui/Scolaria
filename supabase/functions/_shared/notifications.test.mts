// npm run test:notifications — textes des notifications VERROUILLÉS (lot 7a, règle R4). Toute évolution d'un texte
// modifie ce test : prénom en tête, type, expéditeur ; jamais de contenu (message, motif, justificatif).
import {
  composerNotification,
  composerResume,
  expediteurNotification,
  heureDeParis,
  prenomNotification,
  texteElement,
  versExpo,
} from './notifications.ts';

let ok = 0;
let ko = 0;
function verifier(nom: string, cond: boolean, detail?: unknown) {
  if (cond) ok++;
  else ko++;
  console.log(`${cond ? 'OK   ' : 'ÉCHEC'} ${nom}${cond ? '' : ` → ${JSON.stringify(detail)}`}`);
}
const egal = (nom: string, obtenu: unknown, attendu: unknown) => verifier(nom, JSON.stringify(obtenu) === JSON.stringify(attendu), { obtenu, attendu });

// 1. Textes exacts d'un élément seul.
egal('mot', composerNotification('Laia', 'c1', [{ type: 'mot', expediteur: 'Mme Martin', ref_id: 'm1' }]).corps, 'Laia · Nouveau mot de Mme Martin');
egal('message', composerNotification('Laia', 'c1', [{ type: 'message', expediteur: 'Mme Martin', ref_id: 'f1' }]).corps, 'Laia · Message de Mme Martin');
egal('absence à justifier (sans expéditeur, sans motif)', composerNotification('Evan', 'c2', [{ type: 'absence_a_justifier', expediteur: 'Mme Martin', ref_id: 'a1' }]).corps, 'Evan · Absence à justifier');
egal('relance', composerNotification('Laia', 'c1', [{ type: 'relance', expediteur: 'Mme Martin', ref_id: 'm1' }]).corps, 'Laia · Rappel : mot de Mme Martin');

// 2. Où mène l'appui.
egal('mot → le mot, dans le carnet de l’enfant', composerNotification('Laia', 'c1', [{ type: 'mot', expediteur: 'X', ref_id: 'm1' }]).donnees, { cible: 'mot', childId: 'c1', motId: 'm1' });
egal('message → le fil', composerNotification('Laia', 'c1', [{ type: 'message', expediteur: 'X', ref_id: 'f1' }]).donnees, { cible: 'fil', childId: 'c1', conversationId: 'f1' });
egal('absence → l’agenda (aucun identifiant d’absence)', composerNotification('Laia', 'c1', [{ type: 'absence_a_justifier', expediteur: 'X', ref_id: 'a1' }]).donnees, { cible: 'agenda', childId: 'c1' });

// 3. Regroupement (nuit, envois rapprochés) : une seule notification par enfant.
const groupe = composerNotification('Lucas', 'c3', [
  { type: 'message', expediteur: 'M. Petit', ref_id: 'f' },
  { type: 'mot', expediteur: 'Mme Dupont', ref_id: 'm1' },
  { type: 'mot', expediteur: 'Mme Dupont', ref_id: 'm2' },
  { type: 'absence_a_justifier', expediteur: 'Mme Dupont', ref_id: 'a' },
]);
egal('regroupé : « Lucas · 4 nouveautés : 2 mots, 1 message, 1 absence à justifier »', groupe.corps, 'Lucas · 4 nouveautés : 2 mots, 1 message, 1 absence à justifier');
egal('regroupé : ouvre l’Accueil de l’enfant', groupe.donnees, { cible: 'accueil', childId: 'c3' });
verifier('regroupé : aucun nom d’expéditeur multiple', !/Petit|Dupont/.test(groupe.corps));

// 4. Résumé de 18 h.
egal('résumé : « Lucas · 1 mot à traiter · 2 devoirs pour demain »', composerResume('Lucas', 'c3', { mots: 1, absences: 0, devoirs: 2 })?.corps, 'Lucas · 1 mot à traiter · 2 devoirs pour demain');
egal('résumé : pluriels et absences', composerResume('Emma', 'c4', { mots: 2, absences: 1, devoirs: 1 })?.corps, 'Emma · 2 mots à traiter · 1 absence à justifier · 1 devoir pour demain');
egal('résumé : tout à jour → rien', composerResume('Léa', 'c5', { mots: 0, absences: 0, devoirs: 0 }), null);

// 5. Nettoyage : prénom (premier mot), expéditeur (40 car.), aucun saut de ligne, valeurs manquantes.
egal('prénom : premier mot seulement', prenomNotification('Laia Moreau'), 'Laia');
egal('prénom manquant', prenomNotification(''), 'Votre enfant');
egal('expéditeur manquant', expediteurNotification(null), 'l’enseignant');
verifier('expéditeur long tronqué à 40', expediteurNotification('M'.repeat(80)).length === 40);
verifier('aucun saut de ligne ni caractère de contrôle', !/[\n\r\t]/.test(texteElement({ type: 'mot', expediteur: 'Mme\nMartin\t\u0007', ref_id: null })));

// 6. Message Expo : seulement les champs prévus ; pas de titre ; données sans contenu.
const m = versExpo('ExponentPushToken[x]', composerNotification('Laia', 'c1', [{ type: 'message', expediteur: 'Mme Martin', ref_id: 'f1' }]));
egal('Expo : champs exacts', Object.keys(m).sort(), ['body', 'channelId', 'data', 'priority', 'sound', 'to']);
egal('Expo : données exactes', Object.keys(m.data).sort(), ['childId', 'cible', 'conversationId']);
verifier('Expo : forme « Prénom · type »', /^[^·]+ · (Nouveau mot de|Message de|Absence à justifier|Rappel : mot de|\d+ nouveautés : )/.test(m.body), m.body);

// 7. Garde-fou de contenu : le module n'a AUCUNE entrée de contenu ; un texte glissé par erreur dans l'expéditeur reste
//    un nom tronqué à 40 caractères (jamais un message entier).
const fuite = composerNotification('Laia', 'c1', [{ type: 'message', expediteur: 'Bonjour, Laia a été malade toute la matinée et je pense que', ref_id: 'f' }]);
verifier('garde-fou : 40 caractères au plus pour l’expéditeur', fuite.corps.length <= 'Laia · Message de '.length + 40, fuite.corps);

// 8. Heure de Paris (résumé de 18 h, hiver et été).
egal('hiver : 17 h UTC = 18 h à Paris', heureDeParis(new Date('2026-11-23T17:00:00Z')), 18);
egal('été : 16 h UTC = 18 h à Paris', heureDeParis(new Date('2027-06-10T16:00:00Z')), 18);
egal('hiver : 16 h UTC = 17 h à Paris (pas de résumé)', heureDeParis(new Date('2026-11-23T16:00:00Z')), 17);

console.log(`\n${ok} OK, ${ko} échec(s)`);
if (ko) process.exit(1);
