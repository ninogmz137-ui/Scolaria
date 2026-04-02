/**
 * WallpaperBackground — Full-screen fixed background for all screens.
 *
 * Unified design: always renders #F2F2F7 (light grey).
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

export default function WallpaperBackground() {
  const { customPhotoUri, isCustomPhoto } = useWallpaper();

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

  // Unified solid background — #F2F2F7 for all modes
  return (
    <View style={styles.background} />
  );
}

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F2F2F7',
  },
});
