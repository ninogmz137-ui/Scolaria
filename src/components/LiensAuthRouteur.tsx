/**
 * LiensAuthRouteur (L3) — traite les liens d'authentification reçus par email, à froid comme à chaud :
 * - code (flux PKCE) → échange contre une session : inscription confirmée / email changé → l'app s'ouvre
 *   sur le compte ; réinitialisation (type=recovery) → écran « Nouveau mot de passe » ;
 * - lien expiré ou déjà utilisé → message clair, jamais d'écran d'erreur.
 * Chaque lien n'est traité qu'une fois (même principe que NotificationsRouteur : abonnement unique).
 */

import { useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { navigationRef } from '../navigation/navigationRef';
import { supabase } from '../services/supabase';
import { analyserLienAuth } from '../services/lienAuth';

const traites = new Set<string>();

/** Attend la navigation principale (après l'échange de session), puis ouvre l'écran. */
function ouvrirQuandConnecte(ecran: string, essais = 30) {
  const racine = navigationRef.isReady() ? navigationRef.getRootState()?.routes?.[0]?.name : undefined;
  if (racine === 'MainPager') {
    navigationRef.navigate(ecran);
    return;
  }
  if (essais > 0) setTimeout(() => ouvrirQuandConnecte(ecran, essais - 1), 300);
}

export default function LiensAuthRouteur() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const traiter = async (url: string | null) => {
      const lien = analyserLienAuth(url);
      if (!lien || !url || traites.has(url)) return;
      traites.add(url);
      if (lien.type === 'erreur') {
        Alert.alert('Lien', lien.message);
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(lien.code);
      if (error) {
        Alert.alert(
          'Lien',
          /verifier|pkce|code/i.test(error.message)
            ? 'Ouvrez ce lien sur le téléphone où vous l’avez demandé, ou demandez-en un nouveau.'
            : 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau depuis l’app.',
        );
        return;
      }
      if (lien.recuperation) ouvrirQuandConnecte('NouveauMotDePasse');
    };
    Linking.getInitialURL().then(traiter).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => traiter(url));
    return () => sub.remove();
  }, []);
  return null;
}
