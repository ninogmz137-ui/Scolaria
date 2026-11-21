// Garde-fou du calendrier des vacances (lot 4c, 21 nov. 2026) : ÉCHOUE si, À LA DATE DU JOUR (heure de Paris),
// l'année scolaire en cours — ou la suivante à partir du 1er juin — n'a pas de calendrier dans src/utils/vacances.ts.
// Sans lui, les rendez-vous fixes disparaîtraient de l'Agenda (hors année couverte = vacances).
// Que faire s'il échoue : ajouter l'année au fichier d'après l'arrêté publié au Journal officiel (Légifrance),
// puis l'ajouter à ANNEES_COUVERTES. Lancement : npm run test:calendrier-vacances
import { anneeScolaire, anneesRequises, calendriersManquants } from './vacances.ts';
import { aujourdhuiParis } from './jourParis.ts';

let ok = 0;
let ko = 0;
function egal(nom: string, obtenu: unknown, attendu: unknown) {
  const o = JSON.stringify(obtenu);
  const a = JSON.stringify(attendu);
  if (o === a) ok++;
  else { ko++; console.log(`ÉCHEC ${nom} : obtenu ${o}, attendu ${a}`); }
}

// La règle elle-même (dates fixes).
egal('année de novembre', anneeScolaire('2026-11-21'), '2026-2027');
egal('année de mars', anneeScolaire('2027-03-15'), '2026-2027');
egal('année de septembre', anneeScolaire('2027-09-01'), '2027-2028');
egal('requises en novembre', anneesRequises('2026-11-21'), ['2026-2027']);
egal('requises le 31 mai', anneesRequises('2027-05-31'), ['2026-2027']);
egal('requises le 1er juin', anneesRequises('2027-06-01'), ['2026-2027', '2027-2028']);
egal('requises en août', anneesRequises('2027-08-20'), ['2026-2027', '2027-2028']);
egal('manquante dès le 1er juin 2027 (fichier actuel)', calendriersManquants('2027-06-01'), ['2027-2028']);
egal('rien ne manque en novembre 2026', calendriersManquants('2026-11-21'), []);

// Le garde-fou, à la date du jour.
const auj = aujourdhuiParis();
const manquants = calendriersManquants(auj);
if (manquants.length > 0) {
  ko++;
  console.log(`ÉCHEC calendrier des vacances manquant au ${auj} : ${manquants.join(', ')}. Ajoutez-le à src/utils/vacances.ts d'après l'arrêté publié (Légifrance).`);
} else {
  ok++;
}

console.log(`calendrier des vacances (au ${auj}) : ${ok} OK, ${ko} échec(s)`);
if (ko > 0) process.exit(1);
