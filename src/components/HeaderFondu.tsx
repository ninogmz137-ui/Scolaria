/**
 * HeaderFondu — fond du header de l'Accueil (COMPONENTS §6).
 *
 * Pleine largeur, posé DERRIÈRE la barre d'état, la top bar et les premières cartes (couche
 * absolue en haut du contenu défilant : il part avec le contenu). Aucun arrondi, aucune coupure :
 *  - couleur de l'enfant : rgba(c, 1) → rgba(c, 0). Même RGB à chaque arrêt, seule l'opacité
 *    varie (jamais un mélange couleur → #F2F1EE, jamais 'transparent' = noir transparent) ;
 *  - photo choisie : photo + voile sombre, puis même courbe de disparition. La page étant unie
 *    (#F2F1EE), un voile #F2F1EE d'opacité (1 − a) posé sur la photo donne exactement le rendu
 *    d'une photo d'opacité a : pas de MaskedView (module natif) nécessaire.
 * Courbe ease-out à 10 arrêts : plein jusqu'au texte, puis décroissance douce (pas de bande).
 */

import { View, Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { withAlpha } from '../utils/couleur';
import { ARRETS_FONDU, opaciteFondu, tonSurFondu } from '../utils/fondu';

const PAGE_BG = '#F2F1EE';

const POSITIONS = ARRETS_FONDU.map(([p]) => p) as [number, number, ...number[]];

// Courbe et ton du texte : src/utils/fondu.ts (module pur, testé), ré-exportés pour les appelants existants.
export { opaciteFondu, tonSurFondu };

interface Props {
  couleur: string;
  photo?: ImageSourcePropType;
  /** Hauteur totale du fondu (barre d'état comprise). */
  hauteur: number;
}

export default function HeaderFondu({ couleur, photo, hauteur }: Props) {
  if (photo) {
    return (
      <View pointerEvents="none" style={[st.couche, { height: hauteur }]}>
        <Image source={photo} style={[StyleSheet.absoluteFill, { height: hauteur }]} resizeMode="cover" />
        {/* Voile sombre : texte blanc lisible sur toutes les photos */}
        <View style={[StyleSheet.absoluteFill, st.voilePhoto]} />
        <LinearGradient
          colors={ARRETS_FONDU.map(([, a]) => withAlpha(PAGE_BG, 1 - a)) as [string, string, ...string[]]}
          locations={POSITIONS}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }
  return (
    <LinearGradient
      pointerEvents="none"
      colors={ARRETS_FONDU.map(([, a]) => withAlpha(couleur, a)) as [string, string, ...string[]]}
      locations={POSITIONS}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[st.couche, { height: hauteur }]}
    />
  );
}

const st = StyleSheet.create({
  couche: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  voilePhoto: {
    backgroundColor: 'rgba(15,23,42,0.28)',
  },
});
