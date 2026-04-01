/**
 * WallpaperBackground — Full-screen fixed background for all screens.
 *
 * Renders the active wallpaper (gradient or custom photo) behind content.
 * Position absolute, covers entire screen. Content scrolls on top.
 *
 * Usage:
 * <View style={{flex: 1}}>
 *   <WallpaperBackground />
 *   <ScrollView>{content}</ScrollView>
 * </View>
 */

import { StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWallpaper } from '../contexts/WallpaperContext';

export default function WallpaperBackground() {
  const { currentWallpaper, customPhotoUri, isCustomPhoto } = useWallpaper();

  if (isCustomPhoto && customPhotoUri) {
    return (
      <Image
        source={{ uri: customPhotoUri }}
        style={styles.background}
        resizeMode="cover"
      />
    );
  }

  if (currentWallpaper?.type === 'gradient') {
    const { colors, direction } = currentWallpaper;
    return (
      <LinearGradient
        colors={colors as [string, string, ...string[]]}
        start={direction ? { x: direction[0], y: direction[1] } : { x: 0.5, y: 0 }}
        end={direction ? { x: direction[2], y: direction[3] } : { x: 0.5, y: 1 }}
        style={styles.background}
      />
    );
  }

  // Fallback: neutral dark gradient
  return (
    <LinearGradient
      colors={['#1A2340', '#0F172A']}
      style={styles.background}
    />
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
