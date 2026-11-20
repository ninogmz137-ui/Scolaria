// Tests des règles de l'absence signalée (lot 4b). Lancement : npm run test:absences
import {
  MOTIFS, libelleMotif, valeursDuree, periodeAbsence, couvreJour, texteCarteAbsence, aJustifier, CONFIRMATION_ABSENCE,
  type AbsenceLue,
} from './absences.ts';

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

egal('motifs proposés', MOTIFS.map((m) => m.libelle), ['Maladie', 'Rendez-vous', 'Raison familiale', 'Autre']);
egal('ancien motif', libelleMotif('maladie_avec_certificat'), 'Maladie');
egal('motif inconnu', libelleMotif('xyz'), 'Autre');

egal('durée matin', valeursDuree('matin', AUJ, null), { date_fin: null, demi_journee: 'matin' });
egal('durée journée (date de fin ignorée)', valeursDuree('journee', AUJ, '2026-11-25'), { date_fin: null, demi_journee: 'journee' });
egal('plusieurs jours', valeursDuree('plusieurs_jours', AUJ, '2026-11-24'), { date_fin: '2026-11-24', demi_journee: 'journee' });
egal('plusieurs jours sans fin', valeursDuree('plusieurs_jours', AUJ, null), { erreur: 'Choisissez le dernier jour d’absence.' });
egal('plusieurs jours fin avant début', valeursDuree('plusieurs_jours', AUJ, AUJ), { erreur: 'Le dernier jour doit venir après le premier.' });

egal('période demain matin', periodeAbsence({ date_debut: DEM, date_fin: null, demi_journee: 'matin' }, AUJ, DEM), 'Demain · matin');
egal('période aujourd’hui', periodeAbsence({ date_debut: AUJ, date_fin: null, demi_journee: 'journee' }, AUJ, DEM), 'Aujourd’hui · journée');
egal('période plusieurs jours', periodeAbsence({ date_debut: '2026-11-23', date_fin: '2026-11-25', demi_journee: 'journee' }, AUJ, DEM), 'Du lun. 23 nov. au mer. 25 nov.');
egal('période autre date', periodeAbsence({ date_debut: '2026-12-01', date_fin: null, demi_journee: 'apres_midi' }, AUJ, DEM), 'mar. 1er déc. · après-midi');

egal('couvre premier jour', couvreJour({ date_debut: '2026-11-23', date_fin: '2026-11-25' }, '2026-11-23'), true);
egal('couvre dernier jour', couvreJour({ date_debut: '2026-11-23', date_fin: '2026-11-25' }, '2026-11-25'), true);
egal('ne couvre pas après', couvreJour({ date_debut: '2026-11-23', date_fin: '2026-11-25' }, '2026-11-26'), false);
egal('un seul jour', couvreJour({ date_debut: AUJ, date_fin: null }, AUJ), true);

egal('carte matin', texteCarteAbsence({ date_debut: DEM, date_fin: null, demi_journee: 'matin', motif: 'rendez_vous' }), 'Matin · Rendez-vous');
egal('carte plusieurs jours', texteCarteAbsence({ date_debut: '2026-11-23', date_fin: '2026-11-25', demi_journee: 'journee', motif: 'maladie' }), 'Journée · Maladie');

const abs = (id: string, par: string, debut: string, justif: string | null = null, fin: string | null = null): AbsenceLue =>
  ({ id, student_id: 'lina', date_debut: debut, date_fin: fin, demi_journee: 'journee', motif: 'maladie', commentaire: null, signalee_par: par, justificatif_path: justif });
const liste = [
  abs('a', 'moi', DEM),
  abs('b', 'moi', AUJ, 'lina/an/x.pdf'),
  abs('c', 'autre', AUJ),
  abs('d', 'moi', '2026-10-01'),
  abs('e', 'moi', '2026-10-15', null, '2026-10-25'),
];
egal('à justifier : les miennes, sans justificatif, récentes', aJustifier(liste, 'moi', '2026-10-21').map((a) => a.id), ['e', 'a']);
egal('à justifier sans compte', aJustifier(liste, null, '2026-10-21'), []);
egal('confirmation', CONFIRMATION_ABSENCE, 'Absence signalée à l’école');
egal('jamais « notifié »', /notifi/i.test(CONFIRMATION_ABSENCE), false);

console.log(`absences : ${ok} OK, ${ko} échec(s)`);
if (ko > 0) process.exit(1);
