/**
 * ScreenHeader — Large gradient header for main screens (30-35% of screen).
 *
 * Sits BEHIND the content (zIndex 0). Content scrolls OVER it.
 * paddingTop on the ScrollView equals HEADER_HEIGHT so the header
 * is visible when at the top, then disappears under the cards as
 * the user scrolls down — same pattern as Papillon.
 *
 * Usage:
 *   <View style={{flex:1}}>
 *     <WallpaperBackground />
 *     <ScreenHeader />        ← behind (zIndex 0)
 *     <ScrollView>...</ScrollView>  ← in front (default zIndex)
 *   </View>
 */

import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChildTheme } from '../contexts/ChildThemeContext';
import type { ReactNode } from 'react';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_RATIO = 0.18; // 18% of screen height — compact header

interface ScreenHeaderProps {
  /** Optional content rendered inside the header (below topbar area) */
  children?: ReactNode;
  /** Override header height ratio (0-1), default 0.33 */
  heightRatio?: number;
}

export default function ScreenHeader({ children, heightRatio = HEADER_RATIO }: ScreenHeaderProps) {
  const { theme } = useChildTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = SCREEN_HEIGHT * heightRatio;

  return (
    <View
      style={[styles.container, { height: headerHeight }]}
      pointerEvents="box-none"
    >
      <LinearGradient
        colors={theme.headerGradientFull as [string, string, ...string[]]}
        locations={theme.headerGradientLocations as [number, number, ...number[]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.gradient, { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }]}
      />
      {/* Header content (rendered below the safe area + topbar) */}
      {children && (
        <View
          style={[styles.content, { paddingTop: insets.top + 60 }]}
          pointerEvents="box-none"
        >
          {children}
        </View>
      )}
    </View>
  );
}

export const HEADER_HEIGHT = SCREEN_HEIGHT * HEADER_RATIO;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
  },
});
