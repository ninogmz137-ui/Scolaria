/**
 * Français : élision devant un prénom (« de Lucas », « d’Emma », « d’Hugo »).
 * Voyelles (accentuées comprises) et h muet → « d’ ». Apostrophe typographique ’.
 */
const ELISION = /^[aeiouyhàâäéèêëîïôöùûüœæ]/i;

export function de(prenom: string): string {
  return ELISION.test(prenom.trim()) ? `d’${prenom.trim()}` : `de ${prenom.trim()}`;
}
