// Tests du signal partagé des devoirs (défaut 4a du 20 nov. : coche faite dans l'Agenda, Accueil non à jour).
// Lancement : npm run test:devoirs-store
import { versionDevoirs, signalerDevoirs, ecouterDevoirs, reinitialiserDevoirsStore } from './devoirsStore.ts';

let ok = 0;
let ko = 0;
function egal(nom: string, obtenu: unknown, attendu: unknown) {
  if (obtenu === attendu) ok++;
  else { ko++; console.log(`ÉCHEC ${nom} : obtenu ${String(obtenu)}, attendu ${String(attendu)}`); }
}

// Deux « écrans » abonnés, comme l'Accueil et l'Agenda : chacun recharge quand la version de SON enfant change.
function ecran(childId: string) {
  let vue = versionDevoirs(childId);
  let rechargements = 0;
  const desabonner = ecouterDevoirs(() => {
    const v = versionDevoirs(childId);
    if (v !== vue) { vue = v; rechargements++; }
  });
  return { get rechargements() { return rechargements; }, desabonner };
}

reinitialiserDevoirsStore();
const accueil = ecran('lina');
const agenda = ecran('lina');
const agendaTom = ecran('tom');

// Coche dans l'Agenda → l'Accueil recharge (et l'Agenda aussi), jamais l'écran d'un autre enfant.
signalerDevoirs('lina');
egal('Agenda coche : Accueil rechargé', accueil.rechargements, 1);
egal('Agenda coche : Agenda rechargé', agenda.rechargements, 1);
egal('autre enfant non rechargé', agendaTom.rechargements, 0);

// Coche depuis l'Accueil → l'Agenda recharge.
signalerDevoirs('lina');
egal('Accueil coche : Agenda rechargé', agenda.rechargements, 2);
egal('version de Lina', versionDevoirs('lina'), 2);
egal('version de Tom inchangée', versionDevoirs('tom'), 0);

// Sans enfant : rien ; après désabonnement : plus de rechargement.
signalerDevoirs(undefined);
egal('sans enfant : aucune version', versionDevoirs(undefined), 0);
accueil.desabonner();
signalerDevoirs('lina');
egal('désabonné : plus rechargé', accueil.rechargements, 2);
egal('toujours abonné : rechargé', agenda.rechargements, 3);
agenda.desabonner();
agendaTom.desabonner();

console.log(`devoirsStore : ${ok} OK, ${ko} échec(s)`);
if (ko > 0) process.exit(1);
