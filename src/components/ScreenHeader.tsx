/**
 * ScreenHeader — Transparent spacer that reserves space for the topbar area.
 *
 * No gradient, no background — just a correctly-sized absolute View so that
 * content ScrollViews can use paddingTop: HEADER_HEIGHT to scroll under the topbar.
 *
 * Usage:
 *   <View style={{flex:1}}>
 *     <ScreenHeader />
 *     <ScrollView contentContainerStyle={{paddingTop: HEADER_HEIGHT}}>...</ScrollView>
 *   </View>
 */

import { View, StyleSheet, Dimensions } from 'react-native';
import type { ReactNode } from 'react';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_PX = 110; // fixed pixel height — minimal header

interface ScreenHeaderProps {
  /** Optional content rendered inside the spacer */
  children?: ReactNode;
  /** Override header height as a ratio (0-1). If omitted, defaults to HEADER_PX. */
  heightRatio?: number;
}

export default function ScreenHeader({ children, heightRatio }: ScreenHeaderProps) {
  const headerHeight = heightRatio ? SCREEN_HEIGHT * heightRatio : HEADER_PX;

  return (
    <View
      style={[styles.container, { height: headerHeight }]}
      pointerEvents="box-none"
    >
      {children}
    </View>
  );
}

export const HEADER_HEIGHT = HEADER_PX;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    backgroundColor: 'transparent',
  },
});
