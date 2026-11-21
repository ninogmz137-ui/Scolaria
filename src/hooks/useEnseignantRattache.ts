/**
 * L'enfant sélectionné a-t-il un enseignant rattaché (école sur Scolaria) ?
 * Démo : oui. Compte réel : l'année active a un classe_id (posé par le serveur, M18) — sinon,
 * « Écrire à un enseignant » et « Signaler une absence » n'atteindraient personne : masqués
 * (audit des boutons morts, B3b ; décision du 26 sept 2026).
 */

import { useEffect, useState } from 'react';
import { useDemoData } from '../contexts/DemoContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { getAcademicYears } from '../services/database';

export function useEnseignantRattache(): boolean {
  const { isDemoMode } = useDemoData();
  const { selectedChild } = useActiveChild();
  const [rattache, setRattache] = useState(false);
  useEffect(() => {
    let annule = false;
    if (isDemoMode) {
      setRattache(true);
      return;
    }
    if (!selectedChild) {
      setRattache(false);
      return;
    }
    getAcademicYears(selectedChild.id).then(({ data }) => {
      if (!annule) setRattache(!!(data ?? []).find((a) => a.statut === 'active')?.classe_id);
    });
    return () => {
      annule = true;
    };
  }, [isDemoMode, selectedChild?.id]);
  return rattache;
}
