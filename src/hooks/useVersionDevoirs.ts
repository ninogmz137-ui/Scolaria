/**
 * useVersionDevoirs — version des devoirs de l'enfant (stores/devoirsStore) : change à chaque coche faite
 * n'importe où dans l'app. À mettre dans les dépendances du chargement des devoirs (Accueil, Agenda).
 */
import { useCallback, useSyncExternalStore } from 'react';
import { ecouterDevoirs, versionDevoirs } from '../stores/devoirsStore';

export function useVersionDevoirs(childId: string | null | undefined): number {
  const lire = useCallback(() => versionDevoirs(childId), [childId]);
  return useSyncExternalStore(ecouterDevoirs, lire, lire);
}
