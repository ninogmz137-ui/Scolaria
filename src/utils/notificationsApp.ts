/**
 * Notifications côté app (lot 7a) — règles pures, testées par node (`npm run test:notifications-app`), aucun import.
 *
 * - Carte de l'Accueil « Recevoir les mots de l'école sur ce téléphone » (décision Q2 du 22 nov. 2026) : proposée
 *   seulement à un compte réel (jamais en démo ni dans l'APK de démo), qui a au moins un enfant (donc jamais au premier
 *   lancement : après l'ajout du premier enfant), tant que le téléphone n'a ni accordé ni refusé la permission et que
 *   « Plus tard » n'a pas été choisi. La demande système n'apparaît qu'après « Activer ».
 * - Données d'une notification → écran à ouvrir : forme du serveur (`cible`, lot 7a) et forme locale de développement
 *   (`type`, B4a), un seul enfant à la fois.
 */

export type EtatPermission = 'accordee' | 'refusee' | 'a_demander';

export function doitProposerCarte(p: {
  demo: boolean;
  nbEnfants: number;
  permission: EtatPermission | null;
  plusTard: boolean;
}): boolean {
  return !p.demo && p.nbEnfants > 0 && p.permission === 'a_demander' && !p.plusTard;
}

export type CibleOuverture =
  | { type: 'mot'; childId: string; motId: string; expediteur?: string }
  | { type: 'fil'; childId: string; conversationId?: string }
  | { type: 'agenda'; childId: string }
  | { type: 'accueil'; childId: string };

/** Données reçues (serveur ou développement) → cible ; null si inexploitable (rien n'est ouvert). */
export function cibleDepuisDonnees(data: unknown): CibleOuverture | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const childId = typeof d.childId === 'string' && d.childId ? d.childId : null;
  if (!childId) return null;
  const genre = (typeof d.cible === 'string' ? d.cible : typeof d.type === 'string' ? d.type : '') as string;
  const texte = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  switch (genre) {
    case 'mot': {
      const motId = texte(d.motId);
      return motId ? { type: 'mot', childId, motId, expediteur: texte(d.expediteur) } : { type: 'accueil', childId };
    }
    case 'fil':
      return { type: 'fil', childId, conversationId: texte(d.conversationId) };
    case 'agenda':
      return { type: 'agenda', childId };
    case 'accueil':
      return { type: 'accueil', childId };
    default:
      return null;
  }
}

/** Réglages de notification (table preferences_notifications) : absent = tout activé. */
export interface ReglagesNotifications {
  essentielles: boolean;
  resume_18h: boolean;
  silence: boolean;
}

export function reglagesDepuisLigne(ligne: Partial<ReglagesNotifications> | null | undefined): ReglagesNotifications {
  return {
    essentielles: ligne?.essentielles ?? true,
    resume_18h: ligne?.resume_18h ?? true,
    silence: ligne?.silence ?? true,
  };
}
