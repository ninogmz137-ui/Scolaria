/**
 * useCarnetVide — « tout le carnet de l'enfant actif est vide » (compte RÉEL seulement ; démo : toujours faux).
 * Compte les lignes de chaque table du carnet (src/utils/carnetVide.ts) : seule une lecture réussie à 0 pour TOUTES compte.
 * Un enfant = un carnet : changer d'enfant remet l'état à null AVANT le nouveau chargement (jamais l'état de l'autre).
 * `version` : à incrémenter quand le carnet change (ajout) pour relire.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { TABLES_CARNET, carnetEstVide, type ComptesCarnet, type EtatCarnet } from '../utils/carnetVide';

export function useCarnetVide(childId: string | undefined, isDemo: boolean, erreurAilleurs: boolean, version = 0): boolean {
  const [etat, setEtat] = useState<EtatCarnet | null>(null);

  useEffect(() => {
    let annule = false;
    setEtat(null);
    if (isDemo || !childId) return;
    (async () => {
      const lectures = await Promise.all(
        TABLES_CARNET.map(async ({ table, colonne }) => {
          try {
            const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq(colonne, childId);
            return [table, error || count === null ? null : count] as const;
          } catch {
            return [table, null] as const;
          }
        }),
      );
      if (annule) return;
      const comptes: ComptesCarnet = Object.fromEntries(lectures);
      setEtat({ childId, comptes });
    })();
    return () => {
      annule = true;
    };
  }, [childId, isDemo, version]);

  return !isDemo && carnetEstVide(etat, childId, erreurAilleurs);
}
