/**
 * usePhotoUrl — URL signée (1 h) de la photo d'un enfant, ou null (pas de photo, échec, démo) : l'appelant affiche
 * alors l'initiale sur la couleur de l'enfant. Mémorisée pour la session (services/photoEnfant : clé = chemin + date).
 * Un enfant = un carnet : changer d'enfant remet l'URL à null AVANT de recharger (jamais la photo d'un autre).
 */

import { useEffect, useState } from 'react';
import { urlPhoto } from '../services/photoEnfant';
import type { Child } from '../contexts/ActiveChildContext';

export function usePhotoUrl(child: Pick<Child, 'id' | 'photoPath' | 'photoUpdatedAt'> | null | undefined): string | null {
  const [etat, setEtat] = useState<{ cle: string; url: string } | null>(null);
  const chemin = child?.photoPath ?? null;
  const cle = child && chemin ? `${child.id}|${chemin}|${child.photoUpdatedAt ?? ''}` : null;

  useEffect(() => {
    let annule = false;
    if (!child || !chemin || !cle) {
      setEtat(null);
      return;
    }
    urlPhoto(chemin, child.photoUpdatedAt).then((u) => {
      if (!annule) setEtat(u ? { cle, url: u } : null);
    });
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  // Jamais une URL qui ne correspond pas à l'enfant / à la photo affichés.
  return etat && etat.cle === cle ? etat.url : null;
}
