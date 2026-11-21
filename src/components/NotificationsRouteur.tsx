/**
 * NotificationsRouteur — un appui sur une notification ouvre EXACTEMENT l'élément concerné, dans le
 * carnet du bon enfant (B4a ; règles dans services/notifications.ts). Aussi au démarrage à froid.
 *
 * - « mot » : sélectionne l'enfant, ouvre Messages › le mot (MotDetail). Mot retiré : l'écran affiche
 *   « [Expéditeur] a retiré ce mot », jamais d'erreur.
 * - « agenda » : sélectionne l'enfant, ouvre son Agenda.
 * Un enfant absent du compte (plus rattaché) n'est jamais ouvert : l'app reste sur l'écran courant.
 *
 * Développement : « scolaria://dev/notif-mot?childId=…&motId=…&expediteur=…&titre=…&prenom=… »
 * programme une notification locale immédiate (test sur le téléphone).
 */

import { useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { navigationRef } from '../navigation/navigationRef';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { notifierMot, type CibleNotification } from '../services/notifications';

/** Attend que la navigation principale soit montée (connexion, chargement), puis agit. */
function quandPret(action: () => void, essais = 20) {
  const racine = navigationRef.isReady() ? navigationRef.getRootState()?.routes?.[0]?.name : undefined;
  if (racine === 'MainPager') {
    action();
    return;
  }
  if (essais > 0) setTimeout(() => quandPret(action, essais - 1), 300);
}

/** Réponses de notification déjà traitées (identifiant de la notification) : jamais rejouées. */
const traitees = new Set<string>();

export default function NotificationsRouteur() {
  const { children, selectChild } = useActiveChild();
  const enfantsRef = useRef(children);
  enfantsRef.current = children;
  // selectChild change d'identité à CHAQUE changement d'enfant : lu par référence, jamais en dépendance
  // de l'effet (sinon l'effet se relance, relit la dernière notification et réimpose son enfant —
  // bug du 27 sept 2026 : impossible de quitter Emma depuis le sélecteur).
  const selectChildRef = useRef(selectChild);
  selectChildRef.current = selectChild;

  useEffect(() => {
    const traiter = (r: Notifications.NotificationResponse | null) => {
      if (!r) return;
      const id = r.notification.request.identifier;
      if (traitees.has(id)) return;
      traitees.add(id);
      // La « dernière réponse » est consommée : un redémarrage ne la rejoue pas non plus.
      Notifications.clearLastNotificationResponse();
      ouvrir(r.notification.request.content.data);
    };
    const ouvrir = (data: unknown) => {
      const cible = data as CibleNotification | undefined;
      if (!cible?.childId) return;
      quandPret(() => {
        if (!enfantsRef.current.some((c) => c.id === cible.childId)) return;
        selectChildRef.current(cible.childId);
        if (cible.type === 'mot') {
          navigationRef.navigate('MainPager', {
            screen: 'MessagerieTab',
            params: {
              screen: 'MotDetailScreen',
              params: { motId: cible.motId, childId: cible.childId, expediteur: cible.expediteur },
              initial: false,
            },
          });
        } else if (cible.type === 'agenda') {
          navigationRef.navigate('MainPager', { screen: 'Agenda' });
        }
      });
    };

    // Démarrage à froid : la notification qui a ouvert l'app (une seule fois).
    Notifications.getLastNotificationResponseAsync().then(traiter).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(traiter);

    let lien: { remove: () => void } | undefined;
    if (__DEV__ && Platform.OS !== 'web') {
      lien = Linking.addEventListener('url', ({ url }) => {
        if (!url.includes('dev/notif-mot')) return;
        const q = new URL(url.replace('scolaria://', 'https://x/')).searchParams;
        notifierMot({
          prenom: q.get('prenom') ?? '',
          childId: q.get('childId') ?? '',
          motId: q.get('motId') ?? '',
          expediteur: q.get('expediteur') ?? '',
          titre: q.get('titre') ?? '',
          aSigner: q.get('aSigner') === '1',
        });
      });
    }
    return () => {
      sub.remove();
      lien?.remove();
    };
  }, []);

  return null;
}
