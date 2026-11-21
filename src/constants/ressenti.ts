/**
 * Interrupteur de « Mon Ressenti » (Score de Joie) — décision du 21 nov. 2026.
 *
 * false en V1 : AUCUN accès (recherche rapide, route de l'Accueil, onglets élève et bac à sable, suggestion de
 * l'assistant). Masqué, jamais grisé. Le code de l'écran et de `createCheckin` est gardé.
 * Phase 2 : une entrée sur l'Accueil, activable seulement par le parent dans Famille et paramètres (pas avant).
 */
export const RESSENTI_ACTIF = false;
