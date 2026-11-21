/** useVersionAbsences — version des absences de l'enfant (stores/absencesStore) : change à chaque signalement. */
import { useCallback, useSyncExternalStore } from 'react';
import { ecouterAbsences, versionAbsences } from '../stores/absencesStore';

export function useVersionAbsences(childId: string | null | undefined): number {
  const lire = useCallback(() => versionAbsences(childId), [childId]);
  return useSyncExternalStore(ecouterAbsences, lire, lire);
}
