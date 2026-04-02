/**
 * WallpaperPickerScreen — Wallpaper selection is now integrated in Réglages.
 * This screen redirects immediately to ReglagesScreen.
 */

import { useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function WallpaperPickerScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.navigate('ReglagesScreen' as never);
  }, [navigation]);

  return <View style={{ flex: 1, backgroundColor: '#F2F2F7' }} />;
}
