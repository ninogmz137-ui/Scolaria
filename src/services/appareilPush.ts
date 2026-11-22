/**
 * appareilPush — ce téléphone et les notifications (lot 7a, plan validé le 22 nov. 2026).
 *
 * - Permission : demandée SEULEMENT après « Activer » (carte de l'Accueil, ou Famille et paramètres › Notifications) ;
 *   jamais au premier lancement (décision Q2).
 * - Jeton Expo : inscrit dans `appareils_push` (M46 : un compte, plusieurs téléphones ; un téléphone, le dernier compte
 *   connecté), réinscrit à chaque ouverture si la permission est accordée (le jeton peut changer), RETIRÉ à la
 *   déconnexion (avant `signOut`, tant que la session permet encore de supprimer sa ligne).
 * - Réglages (essentielles, résumé de 18 h, silence 20 h – 7 h) : en base (`preferences_notifications`), c'est le serveur
 *   qui décide d'envoyer.
 * - Démo (compte démo ou APK de démo) : rien de tout cela (aucun serveur, décision Q3). Les appelants vérifient avant.
 * - Canal Android « essentielles » : les messages du serveur le visent (channelId) ; contenu visible sur l'écran
 *   verrouillé, puisqu'il ne contient que le prénom, le type et l'expéditeur.
 */

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { reglagesDepuisLigne, type EtatPermission, type ReglagesNotifications } from '../utils/notificationsApp';

const CLE_JETON = '@scolaria:jeton_push';
const cleePlusTard = (userId: string) => `@scolaria:notifications_plus_tard:${userId}`;

export async function etatPermission(): Promise<EtatPermission> {
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.status === 'granted') return 'accordee';
    if (p.status === 'denied' && !p.canAskAgain) return 'refusee';
    return 'a_demander';
  } catch {
    return 'a_demander';
  }
}

async function canalAndroid(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('essentielles', {
    name: 'Mots et messages de l’école',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/** Inscrit (ou réinscrit) le jeton de ce téléphone pour ce compte. Faux si impossible (permission, réseau, build sans FCM). */
export async function inscrireAppareil(userId: string): Promise<boolean> {
  try {
    if ((await etatPermission()) !== 'accordee') return false;
    await canalAndroid();
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: jeton } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (!jeton) return false;
    const { error } = await supabase
      .from('appareils_push')
      .upsert({ user_id: userId, jeton, plateforme: Platform.OS === 'ios' ? 'ios' : 'android', actif: true }, { onConflict: 'jeton' });
    if (error) return false;
    await AsyncStorage.setItem(CLE_JETON, jeton);
    return true;
  } catch {
    return false;
  }
}

/** « Activer » : demande système, puis inscription. */
export async function activerNotifications(userId: string): Promise<'actif' | 'refuse' | 'erreur'> {
  try {
    await canalAndroid();
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return 'refuse';
    return (await inscrireAppareil(userId)) ? 'actif' : 'erreur';
  } catch {
    return 'erreur';
  }
}

/** Déconnexion : retire le jeton de CE téléphone (jamais ceux des autres téléphones du compte). Ne lève jamais. */
export async function retirerAppareil(): Promise<void> {
  try {
    const jeton = await AsyncStorage.getItem(CLE_JETON);
    if (jeton) await supabase.from('appareils_push').delete().eq('jeton', jeton);
  } catch {
    // Hors ligne : le serveur désactivera le jeton quand Expo le refusera, ou le prochain compte connecté le reprendra.
  } finally {
    await AsyncStorage.removeItem(CLE_JETON).catch(() => undefined);
  }
}

export async function plusTardChoisi(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(cleePlusTard(userId))) === '1';
  } catch {
    return false;
  }
}

export async function choisirPlusTard(userId: string): Promise<void> {
  await AsyncStorage.setItem(cleePlusTard(userId), '1').catch(() => undefined);
}

export async function lireReglages(userId: string): Promise<ReglagesNotifications> {
  const { data, error } = await supabase
    .from('preferences_notifications')
    .select('essentielles, resume_18h, silence')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return reglagesDepuisLigne(data);
}

export async function enregistrerReglage(userId: string, champ: keyof ReglagesNotifications, valeur: boolean): Promise<void> {
  const { error } = await supabase
    .from('preferences_notifications')
    .upsert({ user_id: userId, [champ]: valeur, maj_le: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}
