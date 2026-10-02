// Tests des règles de signature des mots (« one » : un signataire suffit pour tout le foyer). npm run test:mots
import { aTraiter, premierSignataire } from './motsRegles.ts';

let ok = 0;
let echecs = 0;
function verifier(nom: string, obtenu: unknown, attendu: unknown) {
  const bon = JSON.stringify(obtenu) === JSON.stringify(attendu);
  console.log(`${bon ? 'OK ' : 'ÉCHEC'} ${nom}${bon ? '' : ` : obtenu ${JSON.stringify(obtenu)}, attendu ${JSON.stringify(attendu)}`}`);
  if (bon) ok++;
  else echecs++;
}

const base: any = {
  id: 'm1', childId: 'c1', titre: 'Sortie', contenu: '', expediteur: 'Mme X', date: '2026-10-01', echeance: null,
  type: 'signature', signatureMode: 'one', aPrevoir: [], responsables: [], maSignature: false, traitePar: null,
  signaturesAnciens: [], reponsesAnciennes: [], signeParAncien: false, maReponse: null, lu: true,
};
const marc = { prenom: 'Marc', estMoi: false, ancien: false, le: '2026-10-02T10:00:00Z', reponse: null };

// « one » : personne n'a signé → à traiter ; Marc a signé → traité pour MOI aussi
verifier('one, personne n’a signé : à traiter', aTraiter({ ...base }), true);
verifier('one, Marc a signé : plus rien à faire pour moi', aTraiter({ ...base, traitePar: marc }), false);
verifier('one, j’ai signé : traité', aTraiter({ ...base, maSignature: true, traitePar: { ...marc, prenom: 'Claire', estMoi: true } }), false);
verifier('one, signé par un compte supprimé : traité', aTraiter({ ...base, traitePar: { ...marc, prenom: 'un responsable (compte supprimé)', ancien: true } }), false);
// autorisation / participation : la réponse vaut signature
verifier('one + autorisation, Marc a répondu : traité', aTraiter({ ...base, type: 'autorisation', traitePar: { ...marc, reponse: true } }), false);
verifier('one + participation, personne : à traiter', aTraiter({ ...base, type: 'participation' }), true);
// « both » : chacun signe, même si l'autre a signé
verifier('both, Marc a signé, pas moi : à traiter', aTraiter({ ...base, signatureMode: 'both', responsables: [{ id: 'a', prenom: 'Marc', estMoi: false, aSigne: true }, { id: 'b', prenom: 'Claire', estMoi: true, aSigne: false }] }), true);
verifier('both, j’ai signé : traité', aTraiter({ ...base, signatureMode: 'both', maSignature: true }), false);
verifier('both, signé par des comptes supprimés (règle serveur remplie) : traité', aTraiter({ ...base, signatureMode: 'both', signeParAncien: true }), false);
// « none »
verifier('none, information : rien à faire', aTraiter({ ...base, signatureMode: 'none', type: 'information' }), false);
verifier('none + autorisation sans réponse : à traiter (réponse de chacun)', aTraiter({ ...base, signatureMode: 'none', type: 'autorisation' }), true);
verifier('none + autorisation, j’ai répondu : traité', aTraiter({ ...base, signatureMode: 'none', type: 'autorisation', maReponse: false }), false);

// premierSignataire
const resp = [{ user_id: 'u-marc', prenom: 'Marc', nom: 'Moreau' }, { user_id: 'u-claire', prenom: 'Claire', nom: 'Moreau' }];
const sigs = [
  { mot_id: 'm1', parent_id: 'u-claire', signed_at: '2026-10-03T09:00:00Z' },
  { mot_id: 'm1', parent_id: 'u-marc', signed_at: '2026-10-02T10:00:00Z' },
  { mot_id: 'm2', parent_id: 'u-claire', signed_at: '2026-10-04T09:00:00Z' },
];
const rep = new Map<string, any>([['m1|u-marc', true]]);
const p = premierSignataire('m1', sigs, resp, 'u-claire', rep, null);
verifier('le premier signataire (par date) traite le mot : Marc', [p?.prenom, p?.estMoi, p?.le, p?.reponse], ['Marc', false, '2026-10-02T10:00:00Z', true]);
verifier('si c’est moi : estMoi', premierSignataire('m2', sigs, resp, 'u-claire', rep, null)?.estMoi, true);
verifier('personne n’a signé : null', premierSignataire('m3', sigs, resp, 'u-claire', rep, null), null);
verifier('signature d’un compte supprimé : conservée, sans nom', premierSignataire('m4', [{ mot_id: 'm4', parent_id: null, signed_at: '2026-10-01T08:00:00Z' }], resp, 'u-claire', rep, false), { prenom: 'un responsable (compte supprimé)', estMoi: false, ancien: true, le: '2026-10-01T08:00:00Z', reponse: false });
verifier('signataire inconnu (a quitté le carnet) : « un autre responsable »', premierSignataire('m5', [{ mot_id: 'm5', parent_id: 'u-x', signed_at: '2026-10-01T08:00:00Z' }], resp, 'u-claire', rep, null)?.prenom, 'un autre responsable');

console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) ──`);
process.exitCode = echecs === 0 ? 0 : 1;
