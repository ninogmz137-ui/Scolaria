/**
 * useCarnetReel — éléments du carnet (carnet_items) d'un enfant d'un COMPTE RÉEL, avec état d'erreur.
 * Démo : toujours vide (les écrans lisent carnetDemo). Rechargé au changement d'enfant et à chaque
 * ajout / modification (surChangementCarnet). `erreur` : chargement en échec — les éléments déjà
 * chargés sont conservés ; `recharger()` = bouton « Réessayer ».
 */

import { useCallback, useEffect, useState } from 'react';
import { getCarnetItems, surChangementCarnet, type ElementCarnet } from '../services/carnetService';
import { classerErreur, type TypeErreur } from '../services/erreurs';

export function useCarnetReel(childId: string | undefined, isDemo: boolean, versionExterne = 0) {
  const [items, setItems] = useState<ElementCarnet[]>([]);
  const [erreur, setErreur] = useState<TypeErreur | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => surChangementCarnet(() => setVersion((v) => v + 1)), []);

  useEffect(() => {
    let annule = false;
    if (isDemo || !childId) {
      setItems([]);
      setErreur(null);
      return;
    }
    getCarnetItems(childId)
      .then((liste) => {
        if (annule) return;
        setItems(liste);
        setErreur(null);
      })
      .catch((e) => {
        if (!annule) setErreur(classerErreur(e));
      });
    return () => {
      annule = true;
    };
  }, [isDemo, childId, version, versionExterne]);

  const recharger = useCallback(() => setVersion((v) => v + 1), []);
  return { items, erreur, recharger };
}
