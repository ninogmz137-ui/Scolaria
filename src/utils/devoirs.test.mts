// Tests des règles de la vue « Devoirs » (lot 4a). Lancement : npm run test:devoirs
import {
  grouperDevoirs, titreEcheance, libelleCoche, resteAFaire, jourEnClair, construireDevoirs, auteursDepuisResponsables, auteurCoche,
  type Devoir,
} from './devoirs.ts';

let ok = 0;
let ko = 0;
function egal(nom: string, obtenu: unknown, attendu: unknown) {
  const o = JSON.stringify(obtenu);
  const a = JSON.stringify(attendu);
  if (o === a) ok++;
  else { ko++; console.log(`ÉCHEC ${nom} :\n  obtenu  ${o}\n  attendu ${a}`); }
}

const AUJ = '2026-11-20';
const DEM = '2026-11-21';
const HIER = '2026-11-19';
const dv = (id: string, jour: string, fait = false, titre = id): Devoir => ({ id, titre, jour, fait });

const groupes = grouperDevoirs(
  [dv('passe', '2026-11-18'), dv('lundi', '2026-11-23'), dv('auj', AUJ, true), dv('demainB', DEM, false, 'B'), dv('demainA', DEM, true, 'A'), dv('mardi', '2026-11-24')],
  AUJ, DEM,
);
egal('ordre des jours (demain, suivants, aujourd’hui)', groupes.map((g) => g.jour), [DEM, '2026-11-23', '2026-11-24', AUJ]);
egal('titres', groupes.map((g) => g.titre), ['Pour demain', 'Pour lundi 23 nov.', 'Pour mardi 24 nov.', 'Pour aujourd’hui']);
egal('passé exclu', groupes.flatMap((g) => g.devoirs.map((d) => d.id)).includes('passe'), false);
egal('non faits d’abord dans un jour', groupes[0].devoirs.map((d) => d.id), ['demainB', 'demainA']);
egal('reste à faire', resteAFaire(groupes), 3);
egal('vide', grouperDevoirs([], AUJ, DEM), []);
egal('demain un lundi (vendredi soir)', grouperDevoirs([dv('x', '2026-11-23')], AUJ, DEM)[0].titre, 'Pour lundi 23 nov.');
egal('1er du mois', jourEnClair('2026-12-01'), 'mardi 1er déc.');
egal('titre demain', titreEcheance(DEM, AUJ, DEM), 'Pour demain');

// Ligne source « Coché par ».
egal('par vous aujourd’hui', libelleCoche({ fait: true, faitJour: AUJ, faitHeure: '18:05' }, 'vous', AUJ, HIER), 'Coché par vous · 18h05');
egal('par Bruno hier', libelleCoche({ fait: true, faitJour: HIER, faitHeure: '21:00' }, 'Bruno', AUJ, HIER), 'Coché par Bruno · hier, 21h');
egal('plus ancien', libelleCoche({ fait: true, faitJour: '2026-11-01', faitHeure: '08:30' }, 'Bruno', AUJ, HIER), 'Coché par Bruno · 1er nov., 8h30');
egal('auteur inconnu', libelleCoche({ fait: true, faitJour: AUJ, faitHeure: '07:45' }, null, AUJ, HIER), 'Coché · 7h45');
egal('non coché', libelleCoche({ fait: false, faitJour: AUJ, faitHeure: '07:45' }, 'vous', AUJ, HIER), null);
egal('hors foyer de l’auteur : « Fait »', libelleCoche({ fait: true, faitJour: null, faitHeure: null }, null, AUJ, HIER), 'Fait');

// Construction depuis la base (même code que l'Agenda, l'Accueil et le test local).
const jourDe = (iso: string) => iso.slice(0, 10);
const heureDe = (iso: string) => iso.slice(11, 16);
const construits = construireDevoirs(
  [
    { id: 'a', title: 'Poésie', subject: 'Français', start_time: '2026-11-21T07:00:00+00:00', is_done: true },
    { id: 'b', title: 'Tables', subject: null, start_time: '2026-11-21T07:00:00+00:00', is_done: false },
    { id: 'c', title: 'Lecture', start_time: '2026-11-23T07:00:00+00:00', is_done: true },
  ],
  [
    { event_id: 'a', fait_par: 'moi', fait_le: '2026-11-20T15:53:59.31156+00:00' },
    { event_id: 'b', fait_par: 'moi', fait_le: '2026-11-20T15:00:00+00:00' }, // coche obsolète : devoir décoché
    { event_id: 'c', fait_par: null, fait_le: null }, // autre foyer : masqué par la base
  ],
  jourDe, heureDe,
);
egal('construits : coche avec auteur', [construits[0].fait, construits[0].faitPar, construits[0].faitJour, construits[0].faitHeure], [true, 'moi', '2026-11-20', '15:53']);
egal('construits : décoché sans auteur', [construits[1].fait, construits[1].faitPar, construits[1].matiere], [false, null, undefined]);
egal('construits : masqué', [construits[2].fait, construits[2].faitPar, construits[2].faitJour], [true, null, null]);
const auteurs = auteursDepuisResponsables([{ user_id: 'moi', prenom: 'Sophie', est_moi: true }, { user_id: 'marc', prenom: 'Marc', est_moi: false }]);
egal('auteurs', auteurs, { moi: 'vous', marc: 'Marc' });
egal('ligne pour l’auteur', libelleCoche(construits[0], auteurCoche(construits[0].faitPar, auteurs), '2026-11-20', '2026-11-19'), 'Coché par vous · 15h53');
egal('ligne hors foyer', libelleCoche(construits[2], auteurCoche(construits[2].faitPar, auteurs), '2026-11-20', '2026-11-19'), 'Fait');
egal('auteur inconnu (ancien responsable)', auteurCoche('parti', auteurs), null);

console.log(`devoirs : ${ok} OK, ${ko} échec(s)`);
if (ko > 0) process.exit(1);
