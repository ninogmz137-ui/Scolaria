/**
 * useAbsences — absences de l'enfant actif (lot 4b), pour l'Agenda (carte « Absence ») et l'Accueil (« À justifier »).
 * Rechargées à chaque signalement ou justificatif (stores/absencesStore), sans geste particulier.
 * Un enfant = un carnet : changer d'enfant vide la liste AVANT le chargement. Démo : absences en mémoire.
 */
import { useEffect, useRef, useState } from 'react';
import { chargerAbsences, type AbsenceLue } from '../services/absenceService';
import { classerErreur, type TypeErreur } from '../services/erreurs';
import { useVersionAbsences } from './useVersionAbsences';

export function useAbsences(childId: string | undefined, isDemo: boolean) {
  const [absences, setAbsences] = useState<AbsenceLue[]>([]);
  const [erreur, setErreur] = useState<TypeErreur | null>(null);
  const [essai, setEssai] = useState(0);
  const version = useVersionAbsences(childId);
  const dernierEnfant = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (dernierEnfant.current !== childId) {
      dernierEnfant.current = childId;
      setAbsences([]);
      setErreur(null);
    }
    if (!childId) return;
    let annule = false;
    chargerAbsences(childId, isDemo)
      .then((liste) => {
        if (annule) return;
        setAbsences(liste);
        setErreur(null);
      })
      .catch((e) => {
        if (!annule) setErreur(classerErreur(e));
      });
    return () => {
      annule = true;
    };
  }, [childId, isDemo, version, essai]);

  return { absences, erreur, recharger: () => setEssai((v) => v + 1) };
}
