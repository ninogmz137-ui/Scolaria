/**
 * Cache en mémoire des URL signées de photos d'enfants (une session) — module pur, testé hors Metro
 * (`npm run test:photo-enfant`). Règles de NON-FUITE :
 *  - la clé contient le chemin de l'objet (donc l'enfant) ET la date de mise à jour : l'URL d'un enfant ne peut jamais
 *    être servie pour un autre, ni après un remplacement de la photo ;
 *  - un échec (réseau coupé, session expirée) renvoie null et n'est PAS mémorisé : on affiche l'initiale, jamais la
 *    photo d'un autre enfant ni une ancienne URL ;
 *  - une URL mémorisée n'est réutilisée que 50 min (elle en vaut 60) ;
 *  - `vider()` à la déconnexion : aucune URL ne survit à la session.
 */

/** Clé du cache : chemin + date de mise à jour (une nouvelle photo change la clé ; le chemin contient l'enfant). */
export function clePhoto(photoPath: string, updatedAt?: string | null): string {
  return `${photoPath}|${updatedAt ?? ''}`;
}

/** Les URL signées valent 1 h ; on les réutilise 50 min au plus (marge avant l'expiration). */
export const DUREE_CACHE_MS = 50 * 60 * 1000;
export const DUREE_URL_SIGNEE_MS = 60 * 60 * 1000;

export function urlEncoreValable(creeeLe: number, maintenant: number): boolean {
  return maintenant - creeeLe < DUREE_CACHE_MS;
}

export class CacheUrls {
  private memo = new Map<string, { url: string; creeeLe: number }>();
  private enCours = new Map<string, Promise<string | null>>();

  private fournir: (chemin: string) => Promise<string | null>;
  private maintenant: () => number;

  constructor(fournir: (chemin: string) => Promise<string | null>, maintenant: () => number = Date.now) {
    this.fournir = fournir;
    this.maintenant = maintenant;
  }

  async obtenir(chemin: string, updatedAt?: string | null): Promise<string | null> {
    const cle = clePhoto(chemin, updatedAt);
    const m = this.memo.get(cle);
    if (m && urlEncoreValable(m.creeeLe, this.maintenant())) return m.url;
    const attente = this.enCours.get(cle);
    if (attente) return attente;
    const p = (async () => {
      try {
        const url = await this.fournir(chemin);
        if (url) this.memo.set(cle, { url, creeeLe: this.maintenant() });
        return url ?? null;
      } catch {
        return null;
      } finally {
        this.enCours.delete(cle);
      }
    })();
    this.enCours.set(cle, p);
    return p;
  }

  /** Oublie toutes les clés d'un chemin (photo remplacée ou supprimée). */
  oublier(chemin: string) {
    for (const k of [...this.memo.keys()]) if (k.startsWith(`${chemin}|`)) this.memo.delete(k);
    for (const k of [...this.enCours.keys()]) if (k.startsWith(`${chemin}|`)) this.enCours.delete(k);
  }

  vider() {
    this.memo.clear();
    this.enCours.clear();
  }

  get taille() {
    return this.memo.size;
  }
}

/**
 * Ce que l'écran peut afficher : l'URL de l'état seulement si elle correspond EXACTEMENT à l'enfant et à la photo
 * affichés (changer d'enfant remet donc l'affichage à l'initiale AVANT l'arrivée de la nouvelle URL).
 */
export function urlAffichable(etat: { cle: string; url: string } | null, cleCourante: string | null): string | null {
  return etat && cleCourante !== null && etat.cle === cleCourante ? etat.url : null;
}
