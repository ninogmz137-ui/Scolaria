/**
 * erreurs — classement des échecs de chargement (réseau, session, serveur) et messages en français.
 * Un chargement qui échoue ne doit JAMAIS ressembler à une liste vide : les services lèvent une
 * ErreurChargement, les écrans affichent EtatErreur (message clair + « Réessayer »).
 */

export type TypeErreur = 'reseau' | 'session' | 'serveur';

export class ErreurChargement extends Error {
  type: TypeErreur;
  constructor(type: TypeErreur) {
    super(type);
    this.name = 'ErreurChargement';
    this.type = type;
  }
}

type ErreurBrute = { message?: string; status?: number; code?: string; name?: string } | null | undefined;

/** Classe une erreur Supabase / fetch. Ne lit jamais d'autre champ que le message, le statut et le code. */
export function classerErreur(e: unknown): TypeErreur {
  if (e instanceof ErreurChargement) return e.type;
  const err = (e ?? {}) as ErreurBrute;
  const msg = String(err?.message ?? e ?? '').toLowerCase();
  const status = Number(err?.status ?? 0);
  if (
    err?.name === 'AbortError' ||
    /network request failed|failed to fetch|network error|timed? ?out|timeout|aborted|internet|offline|load failed|econn|enotfound/.test(msg)
  ) {
    return 'reseau';
  }
  if (status === 401 || err?.code === 'PGRST301' || /jwt|invalid refresh token|refresh token not found|not authenticated|session (expired|missing)|auth session missing/.test(msg)) {
    return 'session';
  }
  return 'serveur';
}

/** Lève une ErreurChargement si l'erreur Supabase est renseignée. */
export function leverSiErreur(error: unknown): void {
  if (error) throw new ErreurChargement(classerErreur(error));
}

export const MESSAGES_ERREUR: Record<TypeErreur, { titre: string; texte: string }> = {
  reseau: {
    titre: 'Pas de connexion',
    texte: 'Impossible de joindre Scolaria. Vérifiez votre connexion internet, puis réessayez. Rien n’est perdu.',
  },
  session: {
    titre: 'Session expirée',
    texte: 'Votre session a expiré. Reconnectez-vous pour retrouver votre carnet.',
  },
  serveur: {
    titre: 'Un souci de notre côté',
    texte: 'Le chargement a échoué. Réessayez dans un instant ; si cela continue, revenez un peu plus tard.',
  },
};
