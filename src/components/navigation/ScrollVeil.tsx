/**
 * ScrollVeil — voile de lisibilité derrière la top bar (haut) ou la bottom bar (bas).
 *
 * Règle de design : les barres ne sont JAMAIS des bandeaux opaques.
 *  - Haut, au repos (scrollY = 0) : invisible, la barre est posée sur le contenu (header de l'Accueil).
 *    Au défilement : opacité 0 → 1 entre 0 et 16 px.
 *  - Bas : toujours visible (le contenu passe sous la bottom bar dès le repos).
 *  - Dégradé vertical #F2F1EE, opaque côté bord d'écran jusqu'au milieu de la barre (`solid`),
 *    puis fondu vers transparent (`fade`).
 *
 * Pas de BlurView : instable sur Android. Un seul composant pour le haut et le bas.
 */

import { Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

const PAGE_BG = '#F2F1EE';
const PAGE_BG_CLEAR = 'rgba(242,241,238,0)';

/** Défilement (px) sur lequel le voile passe de 0 à 1. */
export const VEIL_FADE_IN_SCROLL = 16;

interface ScrollVeilProps {
  edge: 'top' | 'bottom';
  /** Hauteur opaque, depuis le bord de l'écran (barre d'état / safe-area comprise). */
  solid: number;
  /** Hauteur du fondu vers transparent, après la partie opaque. */
  fade: number;
  scrollY: SharedValue<number>;
}

export default function ScrollVeil({ edge, solid, fade, scrollY }: ScrollVeilProps) {
  const height = solid + fade;
  const solidStop = height > 0 ? solid / height : 0;
  const isTop = edge === 'top';

  // Haut : le voile apparaît au défilement (au repos, la top bar est posée sur le header).
  // Bas : TOUJOURS visible. Une liste plus longue que l'écran passe sous la bottom bar dès
  // scrollY = 0 ; lié au défilement, le voile restait invisible au repos et le texte des cartes
  // se lisait à travers la pill Aria (translucide).
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: isTop
      ? interpolate(scrollY.value, [0, VEIL_FADE_IN_SCROLL], [0, 1], Extrapolation.CLAMP)
      : 1,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.veil,
        isTop ? { top: 0 } : [{ bottom: 0 }, styles.veilBottomAndroid],
        { height },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={isTop ? [PAGE_BG, PAGE_BG, PAGE_BG_CLEAR] : [PAGE_BG_CLEAR, PAGE_BG, PAGE_BG]}
        locations={isTop ? [0, solidStop, 1] : [0, 1 - solidStop, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  veil: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 15,
  },
  // Android ordonne les vues sœurs par élévation AVANT le zIndex : sans élévation, un contenu
  // élevé passerait au-dessus du voile. Pas d'ombre (vue sans fond). La bottom bar est à 13.
  veilBottomAndroid: Platform.OS === 'android' ? { elevation: 12 } : {},
});
