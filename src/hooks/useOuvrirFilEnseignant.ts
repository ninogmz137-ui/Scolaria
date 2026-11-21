/**
 * Ouvre le fil avec l'enseignant de l'enfant (lot 3c) : « Écrire à l'enseignant » (feuille de Messages,
 * feuille du « + ») et « Répondre à l'enseignant » (fils de classe et d'école, annonce seule).
 * Compte réel : fil FOYER avec le titulaire, créé s'il n'existe pas. Démo : le premier fil « foyer ».
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDemoData } from '../contexts/DemoContext';
import { filEnseignantDemo, filEnseignantReel } from '../services/filsService';

export function useOuvrirFilEnseignant() {
  const navigation = useNavigation<any>();
  const { isDemoMode } = useDemoData();
  /** `dansMessages` : on est déjà dans la pile de Messages (empiler le fil au lieu de changer d'onglet). */
  return useCallback(
    async (childId: string, dansMessages = false) => {
      try {
        const conversationId = isDemoMode ? filEnseignantDemo(childId) : await filEnseignantReel(childId);
        if (!conversationId) throw new Error('Aucun enseignant pour cet enfant.');
        if (dansMessages) navigation.push('ConversationDetailScreen', { conversationId });
        else
          navigation.navigate('MainPager', {
            screen: 'MessagerieTab',
            params: { screen: 'ConversationDetailScreen', params: { conversationId }, initial: false },
          });
      } catch (e) {
        Alert.alert('Écrire à l’enseignant', e instanceof Error ? e.message : 'Action impossible. Réessayez.');
      }
    },
    [isDemoMode, navigation],
  );
}
