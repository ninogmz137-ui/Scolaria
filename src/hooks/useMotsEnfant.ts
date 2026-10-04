/**
 * useMotsEnfant — les mots du carnet de l'enfant sélectionné (motsService), rechargés au changement
 * d'enfant, au retour sur l'écran et après toute signature / réponse / lecture, où qu'elle ait lieu.
 * Accueil (« À faire ») et Messages (« À traiter ») lisent ainsi la MÊME donnée.
 * `erreur` : le chargement a échoué (réseau, session, serveur) — les mots déjà chargés sont conservés ;
 * `recharger()` relance (bouton « Réessayer »).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { chargerMots, surChangementMots, type MotCarnet } from '../services/motsService';
import { classerErreur, type TypeErreur } from '../services/erreurs';

export function useMotsEnfant(childId: string | undefined) {
  const { isDemo } = useAuth();
  const [mots, setMots] = useState<MotCarnet[]>([]);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState<TypeErreur | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => surChangementMots(() => setVersion((v) => v + 1)), []);
  useFocusEffect(
    useCallback(() => {
      setVersion((v) => v + 1);
    }, []),
  );

  // Un enfant = un carnet : changer d'enfant vide les mots AVANT le chargement (un échec ne montre jamais les mots
  // d'un autre enfant) ; un nouvel essai pour le même enfant garde ce qui est déjà affiché.
  const dernierEnfant = useRef<string | undefined>(undefined);
  useEffect(() => {
    let annule = false;
    if (dernierEnfant.current !== childId) {
      dernierEnfant.current = childId;
      setMots([]);
      setErreur(null);
    }
    if (!childId) {
      setMots([]);
      setErreur(null);
      setCharge(true);
      return;
    }
    chargerMots(childId, isDemo)
      .then((liste) => {
        if (annule) return;
        setMots(liste);
        setErreur(null);
        setCharge(true);
      })
      .catch((e) => {
        if (annule) return;
        setErreur(classerErreur(e));
        setCharge(true);
      });
    return () => {
      annule = true;
    };
  }, [childId, isDemo, version]);

  const recharger = useCallback(() => setVersion((v) => v + 1), []);
  return { mots, charge, isDemo, erreur, recharger };
}
