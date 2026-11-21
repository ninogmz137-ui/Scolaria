/**
 * Ouvre un fichier du carnet sans copie publique (L6) : photo → Visionneuse dans l'app ; PDF → cache
 * privé + visionneuse du système ; erreur → message clair. Remplace Linking.openURL(URL signée).
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { ouvrirFichierCarnet } from '../services/ouvertureFichier';
import type { ElementCarnet } from '../services/carnetService';

export function useOuvrirFichierCarnet() {
  const navigation = useNavigation<any>();
  const { isDemo } = useAuth();
  return useCallback(
    async (e: ElementCarnet) => {
      const r = await ouvrirFichierCarnet(e, isDemo);
      if (r.type === 'image') navigation.navigate('VisionneuseImage', { url: r.url, titre: r.titre });
      else if (r.type === 'erreur') Alert.alert('Fichier', r.message);
    },
    [navigation, isDemo],
  );
}
