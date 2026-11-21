// Tests des règles de l'absence signalée (lot 4b). Lancement : npm run test:absences
import {
  MOTIFS, libelleMotif, valeursDuree, periodeAbsence, couvreJour, texteCarteAbsence, aJustifier, peutJustifier, fusionnerAbsences,
  CONFIRMATION_ABSENCE, peutAnnuler, heureDebutAbsence,
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

const abs = (id: string, foyer: boolean, debut: string, justif: string | null = null, fin: string | null = null, par = 'sophie'): AbsenceLue =>
  ({ id, student_id: 'lina', date_debut: debut, date_fin: fin, demi_journee: 'journee', motif: 'maladie', commentaire: null, signalee_par: par, justificatif_path: justif, meme_foyer: foyer });
const liste = [
  abs('a', true, DEM),
  abs('b', true, AUJ, 'lina/an/x.pdf'),
  abs('c', false, AUJ, null, null, 'julien'),
  abs('d', true, '2026-10-01'),
  abs('e', true, '2026-10-15', null, '2026-10-25'),
  abs('f', true, AUJ, null, null, 'marc'),
];
egal('à justifier : mon foyer (moi ou un autre responsable), sans justificatif, récentes', aJustifier(liste, '2026-10-21').map((a) => a.id), ['e', 'f', 'a']);
egal('hors foyer : jamais à justifier', aJustifier([abs('c', false, AUJ)], '2026-10-21'), []);
egal('peut justifier : foyer sans justificatif', peutJustifier(abs('x', true, AUJ)), true);
egal('peut justifier : déjà justifiée', peutJustifier(abs('x', true, AUJ, 'p')), false);
egal('peut justifier : autre foyer', peutJustifier(abs('x', false, AUJ)), false);
// Fusion : justificatifs visibles et foyer.
const lignes = [
  { id: 'a1', student_id: 'lina', date_debut: AUJ, date_fin: null, demi_journee: 'journee' as const, motif: 'maladie' as const, commentaire: null, signalee_par: 'sophie' },
  { id: 'a2', student_id: 'lina', date_debut: DEM, date_fin: null, demi_journee: 'matin' as const, motif: 'autre' as const, commentaire: null, signalee_par: 'julien' },
];
const resp = [
  { user_id: 'sophie', foyer_id: 'F1' }, { user_id: 'marc', foyer_id: 'F1' }, { user_id: 'julien', foyer_id: 'F2' },
];
const pourMarc = fusionnerAbsences(lignes, [{ absence_id: 'a1', chemin: 'lina/an/j.pdf' }], resp, 'marc');
egal('Marc : absence de Sophie = même foyer, justificatif visible', [pourMarc[0].meme_foyer, pourMarc[0].justificatif_path], [true, 'lina/an/j.pdf']);
egal('Marc : absence de Julien = autre foyer', [pourMarc[1].meme_foyer, pourMarc[1].justificatif_path], [false, null]);
const pourJulien = fusionnerAbsences(lignes, [], resp, 'julien');
egal('Julien : absence de Sophie = autre foyer, sans justificatif (masqué par la base)', [pourJulien[0].meme_foyer, pourJulien[0].justificatif_path, peutJustifier(pourJulien[0])], [false, null, false]);
egal('Julien : sa propre absence = même foyer', pourJulien[1].meme_foyer, true);
egal('sans compte : jamais même foyer', fusionnerAbsences(lignes, [], resp, null)[0].meme_foyer, false);

// Annulation (lot 6, M45) : foyer de l'auteur, avant 8 h (13 h pour l'après-midi) le premier jour, heure de Paris.
const aAnnuler = { meme_foyer: true, statut: 'signalée', date_debut: '2026-11-23', demi_journee: 'journee' as const };
egal('annuler : la veille, à 22 h → oui', peutAnnuler(aAnnuler, '2026-11-22', '22:00'), true);
egal('annuler : le jour même à 7 h 59 → oui', peutAnnuler(aAnnuler, '2026-11-23', '07:59'), true);
egal('annuler : le jour même à 8 h → non (commencée)', peutAnnuler(aAnnuler, '2026-11-23', '08:00'), false);
egal('annuler : après-midi, à 12 h 30 → oui', peutAnnuler({ ...aAnnuler, demi_journee: 'apres_midi' }, '2026-11-23', '12:30'), true);
egal('annuler : après-midi, à 13 h → non', peutAnnuler({ ...aAnnuler, demi_journee: 'apres_midi' }, '2026-11-23', '13:00'), false);
egal('annuler : le lendemain → non', peutAnnuler(aAnnuler, '2026-11-24', '07:00'), false);
egal('annuler : autre foyer → non', peutAnnuler({ ...aAnnuler, meme_foyer: false }, '2026-11-22', '10:00'), false);
egal('annuler : déjà annulée → non', peutAnnuler({ ...aAnnuler, statut: 'annulée' }, '2026-11-22', '10:00'), false);
egal('heure de début : matin 8 h, après-midi 13 h', [heureDebutAbsence({ demi_journee: 'matin' }), heureDebutAbsence({ demi_journee: 'apres_midi' })], ['08:00', '13:00']);

egal('confirmation', CONFIRMATION_ABSENCE, 'Absence signalée à l’école');
egal('jamais « notifié »', /notifi/i.test(CONFIRMATION_ABSENCE), false);

console.log(`absences : ${ok} OK, ${ko} échec(s)`);
if (ko > 0) process.exit(1);
