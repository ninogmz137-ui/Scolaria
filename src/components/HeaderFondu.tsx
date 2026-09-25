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

const PAGE_BG = '#F2F1EE';

/** [position 0 → 1, opacité de la couleur]. Plein sur ~40 %, puis décroissance ease-out. */
const ARRETS: [number, number][] = [
  [0, 1],
  [0.4, 1],
  [0.5, 0.94],
  [0.58, 0.84],
  [0.66, 0.68],
  [0.74, 0.5],
  [0.82, 0.32],
  [0.89, 0.17],
  [0.95, 0.06],
  [1, 0],
];
const POSITIONS = ARRETS.map(([p]) => p) as [number, number, ...number[]];

/** Opacité de la couleur du fondu à l'ordonnée `y` (0 au-delà du fondu). */
export function opaciteFondu(y: number, hauteur: number): number {
  const p = hauteur > 0 ? y / hauteur : 1;
  if (p <= 0) return 1;
  if (p >= 1) return 0;
  for (let i = 1; i < ARRETS.length; i++) {
    const [p1, a1] = ARRETS[i];
    const [p0, a0] = ARRETS[i - 1];
    if (p <= p1) return a0 + ((p - p0) / (p1 - p0)) * (a1 - a0);
  }
  return 0;
}

/**
 * Ton d'un texte posé sur le fondu (contrastes calculés sur les 6 couleurs d'enfant) :
 *  - 'clair' (blanc) tant que la couleur est encore dense (≥ 0,6) ;
 *  - 'fonce' (#0F172A à 55 %) dans la zone intermédiaire : contraste ≥ 2,75, soit mieux que le
 *    libellé standard sur fond uni (2,37) ;
 *  - null au-delà : style normal.
 */
export function tonSurFondu(y: number, hauteur: number): 'clair' | 'fonce' | null {
  const a = opaciteFondu(y, hauteur);
  if (a >= 0.6) return 'clair';
  if (a > 0.05) return 'fonce';
  return null;
}

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
          colors={ARRETS.map(([, a]) => withAlpha(PAGE_BG, 1 - a)) as [string, string, ...string[]]}
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
      colors={ARRETS.map(([, a]) => withAlpha(couleur, a)) as [string, string, ...string[]]}
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
