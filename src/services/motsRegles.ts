/**
 * Règles pures des mots (testées sous Node : motsRegles.test.mts) — aucune dépendance à Supabase ni à React Native.
 *
 * Signature (signature_mode) :
 * - « none » : rien à signer ;
 * - « one »  : UNE signature suffit — dès qu'un responsable a signé (ou répondu, la réponse valant signature),
 *              le mot est traité pour TOUT le foyer, avec « Signé par [prénom] » ;
 * - « both » : chaque responsable signe en son nom (le serveur compte min(2, nombre de responsables)).
 */

import type { MotCarnet, Reponse, TraitementMot } from './motsService';

/** Le mot attend encore une action de MOI (signature, réponse). */
export function aTraiter(m: MotCarnet): boolean {
  // Mode « one » : traité pour tout le foyer dès qu'un responsable a signé.
  if (m.signatureMode === 'one' && m.traitePar) return false;
  const signature = m.signatureMode !== 'none' && !m.maSignature && !m.signeParAncien;
  const reponse = (m.type === 'autorisation' || m.type === 'participation') && m.maReponse === null;
  return signature || reponse;
}

export type LigneSignature = { mot_id: string; parent_id: string | null; signed_at: string };
export type ResponsableLu = { user_id: string; prenom: string; nom: string };

/**
 * Mode « one » : le premier signataire (par date) traite le mot pour tout le foyer.
 * `reponseDe` : réponses lisibles par `${mot}|${responsable}` ; `reponseAncienne` : réponse conservée d'un compte supprimé.
 */
export function premierSignataire(
  motId: string,
  signatures: LigneSignature[],
  responsables: ResponsableLu[],
  moi: string,
  reponseDe: Map<string, Reponse>,
  reponseAncienne: Reponse | null,
): TraitementMot | null {
  const premiere = signatures
    .filter((s) => s.mot_id === motId)
    .sort((a, b) => a.signed_at.localeCompare(b.signed_at))[0];
  if (!premiere) return null;
  if (!premiere.parent_id) {
    return { prenom: 'un responsable (compte supprimé)', estMoi: false, ancien: true, le: premiere.signed_at, reponse: reponseAncienne };
  }
  const r = responsables.find((x) => x.user_id === premiere.parent_id);
  return {
    prenom: r ? r.prenom || r.nom || 'Responsable' : 'un autre responsable',
    estMoi: premiere.parent_id === moi,
    ancien: false,
    le: premiere.signed_at,
    reponse: reponseDe.get(`${motId}|${premiere.parent_id}`) ?? null,
  };
}
