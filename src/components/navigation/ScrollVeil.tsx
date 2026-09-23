/**
 * ScrollVeil — voile de lisibilité derrière la top bar (haut) ou la bottom bar (bas).
 *
 * Règle de design : les barres ne sont JAMAIS des bandeaux opaques.
 *  - Au repos (scrollY = 0) : invisible, la barre est posée sur le contenu (header de l'Accueil compris).
 *  - Au défilement : un dégradé vertical #F2F1EE apparaît, opaque côté bord d'écran jusqu'au milieu
 *    de la barre (`solid`), puis fondu vers transparent (`fade`). Opacité 0 → 1 entre 0 et 16 px de scroll.
 *
 * Pas de BlurView : instable sur Android. Un seul composant pour le haut et le bas.
 */

import { StyleSheet } from 'react-native';
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

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, VEIL_FADE_IN_SCROLL], [0, 1], Extrapolation.CLAMP),
  }));

  const isTop = edge === 'top';

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.veil, isTop ? { top: 0 } : { bottom: 0 }, { height }, animatedStyle]}
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
});
