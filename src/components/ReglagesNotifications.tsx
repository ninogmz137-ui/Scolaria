/**
 * ReglagesNotifications — groupe « Notifications » de Famille et paramètres (lot 7a). Il réapparaît parce qu'il est
 * BRANCHÉ : les trois réglages sont lus et écrits en base (preferences_notifications, M46) et c'est le serveur qui les
 * applique (envoyer-notifications, M47-M48). Trois réglages, jamais de matrice (CLAUDE.md § Notifications) ; réglages
 * indépendants (décision Q4).
 * - Ce téléphone : « Activer » (demande système), ou, si le système a refusé, ouvre les réglages du téléphone.
 * - Compte réel seulement (le groupe n'existe pas en démo ni dans l'APK de démo : aucun serveur).
 */

import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { Bell, Moon, Sunset, Smartphone } from 'lucide-react-native';
import { DeepGroup, DeepRow } from './DeepList';
import {
  activerNotifications,
  enregistrerReglage,
  etatPermission,
  lireReglages,
} from '../services/appareilPush';
import { reglagesDepuisLigne, type EtatPermission, type ReglagesNotifications as Reglages } from '../utils/notificationsApp';

const TEXT55 = 'rgba(15,23,42,0.55)';

export default function ReglagesNotifications({ userId }: { userId: string }) {
  const [permission, setPermission] = useState<EtatPermission | null>(null);
  const [reglages, setReglages] = useState<Reglages>(reglagesDepuisLigne(null));
  const [charges, setCharges] = useState(false);

  const relire = useCallback(() => {
    etatPermission().then(setPermission);
    lireReglages(userId)
      .then((r) => {
        setReglages(r);
        setCharges(true);
      })
      .catch(() => setCharges(true));
  }, [userId]);
  useEffect(relire, [relire]);

  const basculer = (champ: keyof Reglages, valeur: boolean) => {
    const avant = reglages;
    setReglages({ ...reglages, [champ]: valeur });
    enregistrerReglage(userId, champ, valeur).catch(() => {
      setReglages(avant);
      Alert.alert('Non enregistré', 'Le réglage n’a pas pu être enregistré (pas de connexion ?). Réessayez.');
    });
  };

  const activer = async () => {
    if (permission === 'refusee') {
      Linking.openSettings();
      return;
    }
    const r = await activerNotifications(userId);
    setPermission(await etatPermission());
    if (r === 'erreur') Alert.alert('Notifications', 'Ce téléphone n’a pas pu être inscrit. Réessayez.');
  };

  return (
    <DeepGroup title="Notifications">
      {permission && permission !== 'accordee' ? (
        <DeepRow
          icon={<Smartphone size={20} color={TEXT55} strokeWidth={2} />}
          label="Recevoir les notifications sur ce téléphone"
          description={permission === 'refusee' ? 'Refusées par le téléphone : ouvrir ses réglages' : 'Activer'}
          onPress={activer}
        />
      ) : null}
      <DeepRow
        icon={<Bell size={20} color={TEXT55} strokeWidth={2} />}
        label="Essentielles"
        description="Mots, messages de l’enseignant, absences à justifier"
        toggle={reglages.essentielles}
        onToggle={charges ? (v) => basculer('essentielles', v) : undefined}
      />
      <DeepRow
        icon={<Sunset size={20} color={TEXT55} strokeWidth={2} />}
        label="Résumé de 18 h"
        description="Ce qui reste à traiter et les devoirs pour demain"
        toggle={reglages.resume_18h}
        onToggle={charges ? (v) => basculer('resume_18h', v) : undefined}
      />
      <DeepRow
        icon={<Moon size={20} color={TEXT55} strokeWidth={2} />}
        label="Silence de 20 h à 7 h"
        description="Ce qui arrive la nuit part à 7 h, regroupé"
        toggle={reglages.silence}
        onToggle={charges ? (v) => basculer('silence', v) : undefined}
        last
      />
    </DeepGroup>
  );
}
