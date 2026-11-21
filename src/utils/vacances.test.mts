// Tests du calendrier des vacances 2026-2027 (lot 4c). Lancement : npm run test:vacances
import { zoneDepuisEcole, enVacances } from './vacances.ts';

let ok = 0;
let ko = 0;
function egal(nom: string, obtenu: unknown, attendu: unknown) {
  if (obtenu === attendu) ok++;
  else { ko++; console.log(`ÉCHEC ${nom} : obtenu ${String(obtenu)}, attendu ${String(attendu)}`); }
}

// Zone de l'école.
egal('UAI Marseille (013…)', zoneDepuisEcole({ code_uai: '0131234A', ville: '' }), 'B');
egal('UAI Paris (075…)', zoneDepuisEcole({ code_uai: '0751234A' }), 'C');
egal('UAI Lyon (069…)', zoneDepuisEcole({ code_uai: '0691234A' }), 'A');
egal('UAI Corse (620…) : défaut B', zoneDepuisEcole({ code_uai: '6200001A' }), 'B');
egal('UAI outre-mer (971…) : défaut B', zoneDepuisEcole({ code_uai: '9710001A' }), 'B');
egal('ville Marseille sans UAI', zoneDepuisEcole({ ville: 'Marseille' }), 'B');
egal('ville Besançon (accent)', zoneDepuisEcole({ ville: 'Besançon' }), 'A');
egal('ville Clermont Ferrand (espace)', zoneDepuisEcole({ ville: 'Clermont Ferrand' }), 'A');
egal('ville Paris', zoneDepuisEcole({ ville: 'Paris' }), 'C');
egal('inconnue : défaut B', zoneDepuisEcole({ ville: 'Saint-Machin' }), 'B');
egal('aucune école : défaut B', zoneDepuisEcole(null), 'B');

// Toussaint (toutes zones) : départ samedi 17 oct. après la classe, reprise lundi 2 nov. au matin.
egal('samedi du départ : jour de classe', enVacances('2026-10-17', 'B'), false);
egal('dimanche 18 oct. : vacances', enVacances('2026-10-18', 'B'), true);
egal('jeudi 22 oct. : vacances', enVacances('2026-10-22', 'A'), true);
egal('dimanche 1er nov. : vacances', enVacances('2026-11-01', 'C'), true);
egal('lundi de reprise : classe', enVacances('2026-11-02', 'B'), false);
// Noël.
egal('mardi 22 déc. : vacances', enVacances('2026-12-22', 'B'), true);
egal('lundi 4 janv. : classe', enVacances('2027-01-04', 'B'), false);
// Hiver : zones décalées.
egal('hiver B : jeudi 25 févr. vacances', enVacances('2027-02-25', 'B'), true);
egal('hiver A : jeudi 25 févr. vacances', enVacances('2027-02-25', 'A'), true);
egal('hiver C : jeudi 25 févr. classe', enVacances('2027-02-25', 'C'), false);
egal('hiver C : jeudi 11 févr. vacances', enVacances('2027-02-11', 'C'), true);
egal('hiver B : jeudi 4 mars vacances', enVacances('2027-03-04', 'B'), true);
egal('hiver A : jeudi 4 mars classe', enVacances('2027-03-04', 'A'), false);
// Printemps.
egal('printemps B : jeudi 29 avr. vacances', enVacances('2027-04-29', 'B'), true);
egal('printemps A : jeudi 29 avr. classe', enVacances('2027-04-29', 'A'), false);
egal('printemps C : jeudi 8 avr. vacances', enVacances('2027-04-08', 'C'), true);
// Pont de l'Ascension, été, hors année.
egal('pont vendredi 7 mai', enVacances('2027-05-07', 'A'), true);
egal('jeudi 26 nov. 2026 : classe', enVacances('2026-11-26', 'B'), false);
egal('dimanche 4 juil. 2027 : été', enVacances('2027-07-04', 'B'), true);
egal('avant la rentrée 2026', enVacances('2026-08-27', 'B'), true);

console.log(`vacances : ${ok} OK, ${ko} échec(s)`);
if (ko > 0) process.exit(1);
