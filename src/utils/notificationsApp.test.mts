// npm run test:notifications-app — carte de l'Accueil, ouverture d'une notification, réglages (lot 7a).
import { cibleDepuisDonnees, doitProposerCarte, reglagesDepuisLigne } from './notificationsApp.ts';

let ok = 0;
let ko = 0;
function verifier(nom: string, cond: boolean, detail?: unknown) {
  if (cond) ok++;
  else ko++;
  console.log(`${cond ? 'OK   ' : 'ÉCHEC'} ${nom}${cond ? '' : ` → ${JSON.stringify(detail)}`}`);
}
const egal = (nom: string, obtenu: unknown, attendu: unknown) => verifier(nom, JSON.stringify(obtenu) === JSON.stringify(attendu), { obtenu, attendu });

// Carte « Recevoir les mots de l'école sur ce téléphone ».
const base = { demo: false, nbEnfants: 1, permission: 'a_demander' as const, plusTard: false };
verifier('compte réel, un enfant, permission à demander → carte', doitProposerCarte(base));
verifier('premier lancement (aucun enfant) → jamais', !doitProposerCarte({ ...base, nbEnfants: 0 }));
verifier('démo → jamais', !doitProposerCarte({ ...base, demo: true }));
verifier('« Plus tard » → disparue', !doitProposerCarte({ ...base, plusTard: true }));
verifier('déjà accordée → disparue', !doitProposerCarte({ ...base, permission: 'accordee' }));
verifier('refusée par le système → disparue (réglages du téléphone)', !doitProposerCarte({ ...base, permission: 'refusee' }));
verifier('état pas encore lu → rien (pas de clignotement)', !doitProposerCarte({ ...base, permission: null }));

// Données d'une notification → écran.
egal('serveur : mot', cibleDepuisDonnees({ cible: 'mot', childId: 'c1', motId: 'm1' }), { type: 'mot', childId: 'c1', motId: 'm1' });
egal('serveur : fil', cibleDepuisDonnees({ cible: 'fil', childId: 'c1', conversationId: 'f1' }), { type: 'fil', childId: 'c1', conversationId: 'f1' });
egal('serveur : agenda', cibleDepuisDonnees({ cible: 'agenda', childId: 'c1' }), { type: 'agenda', childId: 'c1' });
egal('serveur : accueil (regroupé, résumé)', cibleDepuisDonnees({ cible: 'accueil', childId: 'c1' }), { type: 'accueil', childId: 'c1' });
egal('développement : forme « type »', cibleDepuisDonnees({ type: 'mot', childId: 'c1', motId: 'm1', expediteur: 'Mme X' }), { type: 'mot', childId: 'c1', motId: 'm1', expediteur: 'Mme X' });
egal('mot sans identifiant → l’Accueil de l’enfant', cibleDepuisDonnees({ cible: 'mot', childId: 'c1' }), { type: 'accueil', childId: 'c1' });
egal('sans enfant → rien', cibleDepuisDonnees({ cible: 'mot', motId: 'm1' }), null);
egal('genre inconnu → rien', cibleDepuisDonnees({ cible: 'conseil_matin', childId: 'c1' }), null);
egal('données absentes → rien', cibleDepuisDonnees(undefined), null);

// Réglages : absent = tout activé ; indépendants.
egal('aucune ligne → tout activé', reglagesDepuisLigne(null), { essentielles: true, resume_18h: true, silence: true });
egal('essentielles coupé, le reste gardé', reglagesDepuisLigne({ essentielles: false }), { essentielles: false, resume_18h: true, silence: true });

console.log(`\n${ok} OK, ${ko} échec(s)`);
if (ko) process.exit(1);
