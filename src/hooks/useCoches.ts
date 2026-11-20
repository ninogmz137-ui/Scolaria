/**
 * useCoches — cases « À prévoir » cochées sur l'Accueil (pique-nique, casquette…), mémorisées SUR L'APPAREIL, par enfant.
 * Aucune donnée n'est envoyée au serveur : c'est un pense-bête personnel (comme la coche d'un devoir, mais sans
 * table derrière). Le serveur ne sait rien de ces cases ; aucun autre responsable ne les voit.
 * Un enfant = un carnet : la clé contient l'enfant ; changer d'enfant recharge ses cases.
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const cle = (childId: string) => `accueil.coches.${childId}`;

export function useCoches(childId: string | undefined) {
  const [coches, setCoches] = useState<string[]>([]);

  useEffect(() => {
    let annule = false;
    setCoches([]);
    if (!childId) return;
    AsyncStorage.getItem(cle(childId))
      .then((v) => {
        if (annule || !v) return;
        const lu = JSON.parse(v);
        if (Array.isArray(lu)) setCoches(lu.filter((x): x is string => typeof x === 'string'));
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, [childId]);

  const basculer = useCallback(
    (id: string) => {
      if (!childId) return;
      setCoches((cur) => {
        const suivant = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
        AsyncStorage.setItem(cle(childId), JSON.stringify(suivant)).catch(() => {});
        return suivant;
      });
    },
    [childId],
  );

  return { coches, basculer };
}
