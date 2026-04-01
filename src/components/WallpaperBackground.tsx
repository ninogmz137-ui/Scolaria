/**
 * WallpaperBackground — Full-screen fixed background for all screens.
 *
 * Phase 1 update: uses mode-aware background color by default.
 * Custom photo wallpapers still override when set.
 *
 * Usage:
 * <View style={{flex: 1}}>
 *   <WallpaperBackground />
 *   <ScrollView>{content}</ScrollView>
 * </View>
 */

import { View, StyleSheet, Image } from 'react-native';
import { useWallpaper } from '../contexts/WallpaperContext';
import { useChildTheme } from '../contexts/ChildThemeContext';

export default function WallpaperBackground() {
  const { customPhotoUri, isCustomPhoto } = useWallpaper();
  const { theme } = useChildTheme();

  // Custom photo still takes priority
  if (isCustomPhoto && customPhotoUri) {
    return (
      <Image
        source={{ uri: customPhotoUri }}
        style={styles.background}
        resizeMode="cover"
      />
    );
  }

  // Mode-aware solid background color
  return (
    <View style={[styles.background, { backgroundColor: theme.backgroundColor }]} />
  );
}

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
