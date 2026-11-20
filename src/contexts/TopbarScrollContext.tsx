/**
 * TopbarScrollContext — défilement de l'écran principal visible, partagé avec la navigation.
 *
 * `scrollY` (valeur partagée Reanimated) pilote les voiles haut et bas (ScrollVeil) :
 * au repos ils sont invisibles, ils apparaissent dès que le contenu défile.
 *
 * Chaque écran principal branche `useTopbarScrollHandler()` sur son Animated.ScrollView.
 * Au retour sur un onglet, le hook republie le dernier défilement de CET écran, pour que
 * le voile corresponde à ce qui est réellement affiché.
 */

import { createContext, useCallback, useContext } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  makeMutable,
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

interface TopbarScrollContextValue {
  scrollY: SharedValue<number>;
}

export const TopbarScrollContext = createContext<TopbarScrollContextValue>({
  scrollY: makeMutable(0),
});

export function useTopbarScrollY(): SharedValue<number> {
  return useContext(TopbarScrollContext).scrollY;
}

/** Handler à passer à `onScroll` d'un Animated.ScrollView (avec scrollEventThrottle={16}). */
export function useTopbarScrollHandler() {
  const scrollY = useTopbarScrollY();
  const lastY = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      scrollY.value = lastY.value;
    }, [scrollY, lastY]),
  );

  return useAnimatedScrollHandler({
    onScroll: (e) => {
      lastY.value = e.contentOffset.y;
      scrollY.value = e.contentOffset.y;
    },
  });
}
