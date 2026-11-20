// Tests du magasin des absences (lot 4b) : signal partagé et absences de démo EN MÉMOIRE (jamais en base).
// Lancement : npm run test:absences-store
import {
  versionAbsences, signalerAbsences, ecouterAbsences, absencesDemo, ajouterAbsenceDemo, remplacerAbsenceDemo,
  reinitialiserAbsencesStore,
} from './absencesStore.ts';

let ok = 0;
let ko = 0;
function egal(nom: string, obtenu: unknown, attendu: unknown) {
  const o = JSON.stringify(obtenu);
  const a = JSON.stringify(attendu);
  if (o === a) ok++;
  else { ko++; console.log(`ÉCHEC ${nom} : obtenu ${o}, attendu ${a}`); }
}

reinitialiserAbsencesStore();
let rechargementsAgenda = 0;
const desabonner = ecouterAbsences(() => { rechargementsAgenda++; });

signalerAbsences('lina');
egal('signal : écran prévenu', rechargementsAgenda, 1);
egal('version de Lina', versionAbsences('lina'), 1);
egal('version de Tom', versionAbsences('tom'), 0);

ajouterAbsenceDemo('lucas', { id: 'd1', motif: 'maladie' });
egal('démo : absence gardée en mémoire', absencesDemo<{ id: string }>('lucas').map((a) => a.id), ['d1']);
egal('démo : ajout prévient les écrans', rechargementsAgenda, 2);
egal('démo : autre enfant vide', absencesDemo('emma'), []);
ajouterAbsenceDemo('lucas', { id: 'd2', motif: 'autre' });
egal('démo : la plus récente d’abord', absencesDemo<{ id: string }>('lucas').map((a) => a.id), ['d2', 'd1']);
remplacerAbsenceDemo('lucas', { id: 'd1', motif: 'maladie', justificatif_path: 'demo:x' });
egal('démo : justificatif ajouté', absencesDemo<{ id: string; justificatif_path?: string }>('lucas').find((a) => a.id === 'd1')?.justificatif_path, 'demo:x');
egal('démo : version de Lucas', versionAbsences('lucas'), 3);

desabonner();
signalerAbsences('lina');
egal('désabonné : plus prévenu (4 signaux avant le désabonnement)', rechargementsAgenda, 4);

console.log(`absencesStore : ${ok} OK, ${ko} échec(s)`);
if (ko > 0) process.exit(1);
