// Tests des rendez-vous fixes (lot 4c). Lancement : npm run test:rendez-vous
import {
  recurrence, libelleRendezVous, ajoutePar, occurrencesSemaine, listeAPrevoir, etatAPrevoir, type RendezVous,
} from './rendezVous.ts';
import { decalerJour, jourParisIso, heureParisIso } from './jourParis.ts';
import { enVacances } from './vacances.ts';
import { libelleCoche } from './devoirs.ts';

let ok = 0;
let ko = 0;
function egal(nom: string, obtenu: unknown, attendu: unknown) {
  const o = JSON.stringify(obtenu);
  const a = JSON.stringify(attendu);
  if (o === a) ok++;
  else { ko++; console.log(`ÉCHEC ${nom} :\n  obtenu  ${o}\n  attendu ${a}`); }
}

const piscine: RendezVous = { id: 'p', child_id: 'lina', titre: 'Piscine', jour_semaine: 4, a_prevoir: ['Maillot', 'Bonnet', 'Serviette'], cree_par: 'marc' };
const biblio: RendezVous = { id: 'b', child_id: 'lina', titre: 'Bibliothèque', jour_semaine: 2, a_prevoir: ['Livre à rendre'], cree_par: 'moi' };

egal('récurrence', recurrence(4), 'Tous les jeudis');
egal('libellé', libelleRendezVous(piscine), 'Piscine · tous les jeudis');
egal('ajouté par un autre', ajoutePar('marc', { marc: 'Marc', moi: 'vous' }), 'Ajouté par Marc');
egal('ajouté par moi', ajoutePar('moi', { marc: 'Marc', moi: 'vous' }), 'Ajouté par vous');
egal('auteur inconnu', ajoutePar(null, {}), null);

// Occurrences : semaine de classe, puis semaine de vacances (Toussaint, zone B), puis la semaine du pont.
const zoneB = (j: string) => enVacances(j, 'B');
egal('semaine du 23 nov. 2026', occurrencesSemaine([piscine, biblio], '2026-11-23', zoneB, decalerJour).map((o) => `${o.rdv.titre} ${o.jour}`),
  ['Bibliothèque 2026-11-24', 'Piscine 2026-11-26']);
egal('Toussaint (semaine du 19 oct.) : rien', occurrencesSemaine([piscine, biblio], '2026-10-19', zoneB, decalerJour), []);
egal('hiver zone B (semaine du 22 févr. 2027) : rien', occurrencesSemaine([piscine], '2027-02-22', zoneB, decalerJour), []);
egal('même semaine en zone C : la piscine a lieu', occurrencesSemaine([piscine], '2027-02-22', (j) => enVacances(j, 'C'), decalerJour).length, 1);
const vendredi: RendezVous = { ...biblio, id: 'v', jour_semaine: 5 };
egal('pont du vendredi 7 mai 2027 : rien', occurrencesSemaine([vendredi], '2027-05-03', zoneB, decalerJour), []);

// Liste « À prévoir » saisie.
egal('liste saisie', listeAPrevoir('maillot, bonnet ; serviette\n maillot , '), ['Maillot', 'Bonnet', 'Serviette']);
egal('liste vide', listeAPrevoir(' , ; '), []);

// État des coches d'une semaine (règle des parents séparés : auteur masqué par la base → « Fait »).
const nom = (id: string | null) => (id === 'moi' ? 'vous' : id === 'marc' ? 'Marc' : null);
const ligne = (d: { fait: boolean; faitJour: string | null; faitHeure: string | null }, a: string | null) => libelleCoche(d, a, '2026-11-26', '2026-11-25');
const etat = etatAPrevoir(
  piscine, '2026-11-23',
  [{ rdv_id: 'p', semaine: '2026-11-23', item: 'Maillot' }, { rdv_id: 'p', semaine: '2026-11-23', item: 'Bonnet' }, { rdv_id: 'p', semaine: '2026-11-16', item: 'Serviette' }],
  [{ rdv_id: 'p', semaine: '2026-11-23', item: 'Maillot', fait_par: 'moi', fait_le: '2026-11-26T07:05:00.123456+00:00' }],
  nom, jourParisIso, heureParisIso, ligne,
);
egal('maillot coché par moi', etat[0], { item: 'Maillot', coche: true, source: 'Coché par vous · 8h05' });
egal('bonnet coché hors foyer : « Fait »', etat[1], { item: 'Bonnet', coche: true, source: 'Fait' });
egal('serviette cochée la semaine d’avant : pas cette semaine', etat[2], { item: 'Serviette', coche: false, source: null });

console.log(`rendezVous : ${ok} OK, ${ko} échec(s)`);
if (ko > 0) process.exit(1);
