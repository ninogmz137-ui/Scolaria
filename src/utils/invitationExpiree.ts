/**
 * Textes de l'invitation EXPIRÉE (M34), côté invité et côté invitant. Fonctions pures (testées).
 * Le prénom de l'invitant vient de mes_invitations() ; « Un responsable » est son repli quand il n'a pas de prénom.
 */

const REPLI = 'Un responsable';

/** « Invitation expirée. Demandez à Claire de vous réinviter. » */
export function messageInvitationExpiree(prenomInvitant: string): string {
  const qui = !prenomInvitant || prenomInvitant === REPLI ? 'un responsable du carnet' : prenomInvitant;
  return `Invitation expirée. Demandez à ${qui} de vous réinviter.`;
}

/** Côté invitant : libellé de la ligne d'une invitation non traitée. */
export function libelleInvitationInvitant(expiresAt: string, maintenant = new Date()): { expiree: boolean; texte: string } {
  const fin = new Date(expiresAt);
  if (fin.getTime() <= maintenant.getTime()) return { expiree: true, texte: 'Invitation expirée' };
  return { expiree: false, texte: 'Invitation en attente' };
}
