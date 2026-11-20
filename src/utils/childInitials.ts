/**
 * Initiales d'avatar enfant — UNE lettre du prénom (« Léa » → « L »).
 *
 * Si un autre enfant du foyer a un prénom qui commence par la même lettre (accents ignorés),
 * on prend les deux premières lettres du prénom pour lever l'ambiguïté : Léa → « Lé », Lucas → « Lu ».
 * Le nom de famille n'est jamais utilisé : dans une fratrie il est commun à tous.
 */

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

function initialKey(name: string): string {
  return firstName(name).charAt(0).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

export function getChildInitials(name: string, siblingNames: readonly string[] = []): string {
  const prenom = firstName(name);
  if (!prenom) return '?';
  const key = initialKey(prenom);
  const ambiguous = siblingNames.some((other) => other !== name && initialKey(other) === key);
  const first = prenom.charAt(0).toUpperCase();
  return ambiguous ? first + prenom.charAt(1).toLowerCase() : first;
}
