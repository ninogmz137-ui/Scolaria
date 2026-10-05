/**
 * useActionsPhoto — ajouter, remplacer ou supprimer la photo d'un enfant (compte réel seulement).
 * Tout responsable rattaché peut le faire (comme le fond d'Accueil, partagé). Jamais obligatoire ni bloquant :
 * une annulation ne dit rien, une erreur dit ce qui s'est passé en une phrase.
 * Ordre à la suppression : colonne photo_path d'abord (la photo disparaît partout), objet ensuite (s'il reste, le
 * nettoyage quotidien l'efface).
 */

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import {
  choisirEtPreparerPhoto, envoyerPhoto, retirerObjetPhoto, ErreurPhoto, type SourcePhoto,
} from '../services/photoEnfant';
import { classerErreur } from '../services/erreurs';

function messageErreur(e: unknown): string {
  if (e instanceof ErreurPhoto) return e.message;
  const type = classerErreur(e);
  if (type === 'reseau') return 'Pas de connexion : la photo n’a pas été enregistrée. Réessayez quand le réseau est revenu.';
  if (type === 'session') return 'Votre session a expiré : reconnectez-vous, puis recommencez.';
  return 'La photo n’a pas pu être enregistrée. Réessayez.';
}

export function useActionsPhoto() {
  const { setChildPhoto } = useActiveChild();
  const [occupe, setOccupe] = useState(false);

  /** true : photo enregistrée ; false : annulée ou en erreur (déjà expliquée). */
  const ajouter = useCallback(
    async (childId: string, source: SourcePhoto): Promise<boolean> => {
      setOccupe(true);
      try {
        const octets = await choisirEtPreparerPhoto(source);
        if (!octets) return false;
        const chemin = await envoyerPhoto(childId, octets);
        await setChildPhoto(childId, chemin);
        return true;
      } catch (e) {
        Alert.alert('Photo non enregistrée', messageErreur(e));
        return false;
      } finally {
        setOccupe(false);
      }
    },
    [setChildPhoto],
  );

  /** Alert natif avant (action destructive) ; true : photo supprimée. */
  const supprimer = useCallback(
    (childId: string, prenom: string): Promise<boolean> =>
      new Promise((resolve) => {
        Alert.alert('Supprimer la photo ?', `La photo ${prenom ? `de ${prenom} ` : ''}disparaîtra du carnet, pour tous les responsables.`, [
          { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              setOccupe(true);
              try {
                await setChildPhoto(childId, null);
                await retirerObjetPhoto(childId);
                resolve(true);
              } catch (e) {
                Alert.alert('Photo non supprimée', messageErreur(e));
                resolve(false);
              } finally {
                setOccupe(false);
              }
            },
          },
        ]);
      }),
    [setChildPhoto],
  );

  return { occupe, ajouter, supprimer };
}
