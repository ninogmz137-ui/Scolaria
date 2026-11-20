// Tests des règles de la vue « Devoirs » (lot 4a). Lancement : npm run test:devoirs
import { grouperDevoirs, titreEcheance, libelleCoche, resteAFaire, jourEnClair, type Devoir } from './devoirs.ts';

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
egal('base sans M41 (heure inconnue)', libelleCoche({ fait: true, faitJour: null, faitHeure: null }, null, AUJ, HIER), null);

console.log(`devoirs : ${ok} OK, ${ko} échec(s)`);
if (ko > 0) process.exit(1);
