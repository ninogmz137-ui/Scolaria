/**
 * InscriptionAppareil — à chaque ouverture d'un COMPTE RÉEL, si ce téléphone a déjà accordé la permission, réinscrit son
 * jeton (il peut changer ; `vu_le` dit au serveur que le téléphone est vivant). Ne demande JAMAIS la permission : c'est
 * le rôle de la carte de l'Accueil (« Activer ») ou de Famille et paramètres › Notifications. Démo, APK de démo : rien.
 */

import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { ENV } from '../services/getEnv';
import { inscrireAppareil } from '../services/appareilPush';

export default function InscriptionAppareil() {
  const { user, isDemo } = useAuth();
  const userId = user?.id;
  useEffect(() => {
    if (!userId || isDemo || ENV.VARIANTE_DEMO) return;
    inscrireAppareil(userId);
    const s = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') inscrireAppareil(userId);
    });
    return () => s.remove();
  }, [userId, isDemo]);
  return null;
}
