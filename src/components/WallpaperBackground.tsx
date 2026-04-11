/**
 * WallpaperBackground — Standard app page background for screens except Accueil.
 *
 * Wallpaper gradient is ONLY shown on AccueilScreen.
 * All other screens use this plain background.
 *
 * Usage:
 * <View style={{flex: 1}}>
 *   <WallpaperBackground />
 *   <ScrollView>{content}</ScrollView>
 * </View>
 */

import { View, StyleSheet } from 'react-native';

export default function WallpaperBackground() {
  return <View style={styles.background} />;
}

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 249, 252, 1)',
  },
});
