/**
 * useMotsEnfant — les mots du carnet de l'enfant sélectionné (motsService), rechargés au changement
 * d'enfant, au retour sur l'écran et après toute signature / réponse / lecture, où qu'elle ait lieu.
 * Accueil (« À faire ») et Messages (« À traiter ») lisent ainsi la MÊME donnée.
 */

import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { chargerMots, surChangementMots, type MotCarnet } from '../services/motsService';

export function useMotsEnfant(childId: string | undefined) {
  const { isDemo } = useAuth();
  const [mots, setMots] = useState<MotCarnet[]>([]);
  const [charge, setCharge] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => surChangementMots(() => setVersion((v) => v + 1)), []);
  useFocusEffect(
    useCallback(() => {
      setVersion((v) => v + 1);
    }, []),
  );

  useEffect(() => {
    let annule = false;
    if (!childId) {
      setMots([]);
      setCharge(true);
      return;
    }
    chargerMots(childId, isDemo).then((liste) => {
      if (annule) return;
      setMots(liste);
      setCharge(true);
    });
    return () => {
      annule = true;
    };
  }, [childId, isDemo, version]);

  return { mots, charge, isDemo };
}
