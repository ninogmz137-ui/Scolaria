/**
 * Décision pure pour un compte authentifié sans profil (sans dépendance : testée sous Node,
 * `npm run test:profil`). Utilisée par profilService.assurerProfil.
 */

export type DecisionProfil = 'ok' | 'terminer' | 'bloque';

/** Que faire selon que le profil existe et le rôle déclaré à l'inscription (métadonnées). */
export function decisionProfil(profilExiste: boolean, roleMeta: unknown): DecisionProfil {
  if (profilExiste) return 'ok';
  if (roleMeta === undefined || roleMeta === null || roleMeta === '' || roleMeta === 'parent') return 'terminer';
  return 'bloque';
}
