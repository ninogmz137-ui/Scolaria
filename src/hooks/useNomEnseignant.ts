/**
 * useNomEnseignant — nom de l'enseignant de l'enfant pour la ligne « classe · enseignant · école » de l'Accueil (lot 6).
 * Démo : l'interlocuteur enseignant des fils de démo de CET enfant. Compte réel : filsService.nomEnseignantReel (fil
 * existant avec le titulaire). Inconnu ou échec : null, et l'en-tête omet l'enseignant (jamais un nom inventé).
 * La civilité (« Mme Martin ») arrive au lot 7 avec le profil enseignant.
 */

import { useEffect, useState } from 'react';
import { getConversations } from '../stores/messagerieStore';
import { nomEnseignantReel } from '../services/filsService';

export function useNomEnseignant(childId: string | undefined, isDemo: boolean): string | null {
  const [nom, setNom] = useState<string | null>(null);
  useEffect(() => {
    let annule = false;
    setNom(null);
    if (!childId) return;
    if (isDemo) {
      const fil = getConversations(childId).find((c) => c.avatarType === 'initials');
      setNom(fil?.name ?? null);
      return;
    }
    nomEnseignantReel(childId)
      .then((n) => {
        if (!annule) setNom(n);
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, [childId, isDemo]);
  return nom;
}
