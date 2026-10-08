/**
 * Photo de l'enfant PAR ANNÉE SCOLAIRE (M36, variante A) — règles pures, testées par `npm run test:photo-annee`.
 *
 *  · Une photo par enfant ET par année : academic_years.photo_path = « <id de l'enfant>/<id de l'année>.jpg ».
 *  · Année en cours sans photo : REPLI SUR L'ANNÉE N−1 SEULEMENT (celle qui la précède immédiatement) ; jamais plus loin.
 *    La photo de repli n'est lue que par les responsables (politiques de stockage) ; l'app l'affiche avec un signe discret
 *    (pastille d'année), et « Ajouter la photo de cette année » écrit toujours sur l'année EN COURS.
 *  · Transition (jusqu'à M37) : l'ancienne colonne children.photo_path (<enfant>/avatar.jpg) sert encore si aucune année n'a de photo.
 *  · Aucune lecture par l'école, jamais : rien ici ne concerne un écran enseignant.
 */

export type LigneAnnee = {
  id: string;
  annee_scolaire: string; // « 2026-2027 »
  statut?: string | null; // active | archivée | importée
  photo_path?: string | null;
  updated_at?: string | null;
};

export type ChoixPhoto = {
  /** Chemin de l'objet à afficher (bucket child-photos) ; null = initiale. */
  chemin: string | null;
  /** Date de dernière écriture de la ligne qui porte ce chemin : clé du cache des URL signées. */
  updatedAt: string | null;
  /** Année EN COURS (statut « active ») : celle où l'on écrit une nouvelle photo ; null si l'enfant n'en a pas. */
  anneeActiveId: string | null;
  /** La photo affichée est celle de l'année N−1 (repli) : libellé « 2025–2026 », sinon null. */
  anterieure: string | null;
  /** La photo affichée appartient à l'année en cours (ou à l'ancien modèle) : supprimable depuis la feuille de photo. */
  deCetteAnnee: boolean;
  /** La photo affichée vient de l'ANCIEN modèle (children.photo_path, transition jusqu'à M37) : sa suppression vise l'ancienne colonne. */
  ancienne: boolean;
};

/** « 2026-2027 » → « 2025-2026 » ; null si le format est inattendu. */
export function millesimePrecedent(millesime: string): string | null {
  const m = /^(\d{4})-(\d{4})$/.exec(millesime);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (b !== a + 1) return null;
  return `${a - 1}-${a}`;
}

/** « 2025-2026 » → « 2025–2026 » (tiret demi-cadratin, comme partout dans l'app). */
export function libelleMillesime(millesime: string): string {
  return millesime.replace('-', '–');
}

/** Chemin de la photo d'une année : <enfant>/<année>.jpg (identifiant de l'année, jamais le millésime). */
export function cheminPhotoAnnee(enfantId: string, anneeId: string): string {
  return `${enfantId}/${anneeId}.jpg`;
}

/**
 * Photo à afficher pour un enfant : celle de l'année en cours ; sinon celle de l'année N−1 SEULEMENT ; sinon l'ancienne
 * colonne (transition) ; sinon rien. `annees` = les lignes academic_years de CET enfant (jamais d'un autre).
 */
export function choisirPhoto(
  annees: LigneAnnee[],
  ancien: { chemin: string | null; updatedAt: string | null } = { chemin: null, updatedAt: null },
): ChoixPhoto {
  const actives = annees.filter((a) => a.statut === 'active').sort((a, b) => b.annee_scolaire.localeCompare(a.annee_scolaire));
  const active = actives[0] ?? null;
  const base = { anneeActiveId: active?.id ?? null };
  if (active?.photo_path) {
    return { ...base, chemin: active.photo_path, updatedAt: active.updated_at ?? null, anterieure: null, deCetteAnnee: true, ancienne: false };
  }
  if (active) {
    const precedent = millesimePrecedent(active.annee_scolaire);
    const n1 = precedent ? annees.find((a) => a.annee_scolaire === precedent && a.id !== active.id) : undefined;
    if (n1?.photo_path) {
      return { ...base, chemin: n1.photo_path, updatedAt: n1.updated_at ?? null, anterieure: libelleMillesime(n1.annee_scolaire), deCetteAnnee: false, ancienne: false };
    }
  }
  if (ancien.chemin) {
    return { ...base, chemin: ancien.chemin, updatedAt: ancien.updatedAt, anterieure: null, deCetteAnnee: true, ancienne: true };
  }
  return { ...base, chemin: null, updatedAt: null, anterieure: null, deCetteAnnee: false, ancienne: false };
}

/**
 * OÙ ÉCRIT-ON ? (documenté dans tasks/plan-photo-par-annee.md § 5 bis)
 *  · AJOUT ou REMPLACEMENT : toujours sur l'année EN COURS (<enfant>/<année>.jpg) quand la base connaît M36 ; sinon ancien modèle.
 *  · SUPPRESSION : la photo de l'année en cours ; SAUF si la photo affichée vient de l'ancien modèle (children.photo_path) : alors c'est
 *    l'ancienne colonne et l'ancien objet <enfant>/avatar.jpg (sinon la photo ne disparaîtrait jamais).
 *  · Jamais N−1 : une photo d'une année passée ne se supprime pas depuis la feuille de l'année en cours.
 */
export function cibleEcriture(
  enfantId: string,
  etat: { parAnnee?: boolean; anneeId?: string | null; ancienne?: boolean },
  action: 'ajout' | 'suppression',
): { modele: 'annee' | 'ancien'; chemin: string; anneeId: string | null } {
  if (etat.parAnnee && etat.anneeId && !(action === 'suppression' && etat.ancienne)) {
    return { modele: 'annee', chemin: cheminPhotoAnnee(enfantId, etat.anneeId), anneeId: etat.anneeId };
  }
  return { modele: 'ancien', chemin: `${enfantId}/avatar.jpg`, anneeId: null };
}
