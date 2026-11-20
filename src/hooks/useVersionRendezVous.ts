/** useVersionRendezVous — version des rendez-vous fixes de l'enfant (stores/rendezVousStore). */
import { useCallback, useSyncExternalStore } from 'react';
import { ecouterRendezVous, versionRendezVous } from '../stores/rendezVousStore';

export function useVersionRendezVous(childId: string | null | undefined): number {
  const lire = useCallback(() => versionRendezVous(childId), [childId]);
  return useSyncExternalStore(ecouterRendezVous, lire, lire);
}
