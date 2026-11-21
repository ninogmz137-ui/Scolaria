// Tests de jourParis (heure de Paris partout, lot 4 A4). Lancement : npm run test:jour-paris
import {
  decalageParis, jourParis, heureParis, decalerJour, aujourdhuiParis, demainParis,
  jourSemaine, lundiDuJour, joursEntre, dateDuJour, jourDeDate, dateAujourdhuiParis, minuitParis, bornesParis,
  instantIso, jourParisIso, heureParisIso,
} from './jourParis.ts';

let ok = 0;
let ko = 0;
function egal(nom: string, obtenu: unknown, attendu: unknown) {
  if (obtenu === attendu) ok++;
  else { ko++; console.log(`ÉCHEC ${nom} : obtenu ${String(obtenu)}, attendu ${String(attendu)}`); }
}
const utc = (s: string) => new Date(s);

// Décalage : hiver +1, été +2, bascules exactes (2026 : 29 mars et 25 oct. ; 2027 : 28 mars et 31 oct.).
egal('hiver', decalageParis(utc('2026-01-15T12:00:00Z')), 1);
egal('été', decalageParis(utc('2026-07-15T12:00:00Z')), 2);
egal('veille bascule mars', decalageParis(utc('2026-03-29T00:59:59Z')), 1);
egal('bascule mars', decalageParis(utc('2026-03-29T01:00:00Z')), 2);
egal('veille bascule oct.', decalageParis(utc('2026-10-25T00:59:59Z')), 2);
egal('bascule oct.', decalageParis(utc('2026-10-25T01:00:00Z')), 1);
egal('bascule mars 2027', decalageParis(utc('2027-03-28T01:00:00Z')), 2);
egal('bascule oct. 2027', decalageParis(utc('2027-10-31T01:00:00Z')), 1);

// Le cas qui justifie le module : 23 h 30 UTC = 0 h 30 à Paris l'hiver, déjà le lendemain.
egal('minuit et demie à Paris (hiver)', jourParis(utc('2026-11-19T23:30:00Z')), '2026-11-20');
egal('ISO UTC encore la veille', utc('2026-11-19T23:30:00Z').toISOString().slice(0, 10), '2026-11-19');
egal('0 h 30 à Paris (été)', jourParis(utc('2026-06-14T22:30:00Z')), '2026-06-15');
egal('23 h 59 à Paris (hiver)', jourParis(utc('2026-11-20T22:59:00Z')), '2026-11-20');
egal('heure Paris hiver', heureParis(utc('2026-11-19T17:05:00Z')), '18:05');
egal('heure Paris été', heureParis(utc('2026-06-14T06:07:00Z')), '08:07');
egal('aujourd’hui', aujourdhuiParis(utc('2026-11-19T23:30:00Z')), '2026-11-20');
egal('demain', demainParis(utc('2026-11-19T23:30:00Z')), '2026-11-21');
egal('demain fin d’année', demainParis(utc('2026-12-31T12:00:00Z')), '2027-01-01');

// Arithmétique des jours.
egal('décaler +1 fin de mois', decalerJour('2027-02-28', 1), '2027-03-01');
egal('décaler -1 début d’année', decalerJour('2027-01-01', -1), '2026-12-31');
egal('décaler bissextile', decalerJour('2028-02-28', 1), '2028-02-29');
egal('jour semaine lundi', jourSemaine('2026-11-16'), 1);
egal('jour semaine dimanche', jourSemaine('2026-11-22'), 7);
egal('lundi du jour', lundiDuJour('2026-11-22'), '2026-11-16');
egal('lundi d’un lundi', lundiDuJour('2026-11-16'), '2026-11-16');
egal('jours entre', joursEntre('2026-11-20', '2026-11-27'), 7);
egal('jours entre changement d’heure', joursEntre('2026-10-24', '2026-10-26'), 2);
egal('aller-retour Date locale', jourDeDate(dateDuJour('2026-03-29')), '2026-03-29');

// Minuit de Paris et bornes d'un jour (filtres sur horodatages en base).
egal('minuit Paris hiver', minuitParis('2026-11-20').toISOString(), '2026-11-19T23:00:00.000Z');
egal('minuit Paris été', minuitParis('2026-06-15').toISOString(), '2026-06-14T22:00:00.000Z');
egal('minuit Paris jour bascule mars', minuitParis('2026-03-29').toISOString(), '2026-03-28T23:00:00.000Z');
egal('minuit Paris jour bascule oct.', minuitParis('2026-10-25').toISOString(), '2026-10-24T22:00:00.000Z');
egal('bornes début', bornesParis('2026-11-20').debut, '2026-11-19T23:00:00.000Z');
egal('bornes fin', bornesParis('2026-11-20').fin, '2026-11-20T22:59:59.999Z');
egal('bornes semaine', bornesParis('2026-11-16', '2026-11-22').fin, '2026-11-22T22:59:59.999Z');
egal('dateAujourdhuiParis', jourDeDate(dateAujourdhuiParis(utc('2026-11-19T23:30:00Z'))), '2026-11-20');

// Horodatages de la base (microsecondes) : lus à la milliseconde.
egal('instant ISO microsecondes', instantIso('2026-11-20T14:53:59.31156+00:00').toISOString(), '2026-11-20T14:53:59.311Z');
egal('instant ISO sans décimales', instantIso('2026-11-20T14:53:59+00:00').toISOString(), '2026-11-20T14:53:59.000Z');
egal('jour Paris ISO', jourParisIso('2026-11-20T23:10:00.123456+00:00'), '2026-11-21');
egal('heure Paris ISO', heureParisIso('2026-11-20T14:53:59.31156+00:00'), '15:53');

console.log(`jourParis : ${ok} OK, ${ko} échec(s)`);
if (ko > 0) process.exit(1);
