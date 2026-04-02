/**
 * WallpaperPickerScreen — Grid of gradient wallpaper previews.
 *
 * 2-column FlatList. Tap to select and persist via WallpaperContext.
 * Selected wallpaper shows a blue border + checkmark overlay.
 * Navigation header title: "Fond d'écran"
 */

import { View, FlatList, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WALLPAPERS, useWallpaper } from '../contexts/WallpaperContext';
import { FontFamily } from '../hooks/useSolariaFonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = 12;
const PADDING = 16;
const ITEM_WIDTH = (SCREEN_WIDTH - PADDING * 2 - COLUMN_GAP) / 2;

export default function WallpaperPickerScreen() {
  const { wallpaper, setWallpaperId } = useWallpaper();

  return (
    <View style={styles.root}>
      <FlatList
        data={WALLPAPERS}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelected = item.id === wallpaper.id;
          return (
            <Pressable
              style={styles.itemWrap}
              onPress={() => setWallpaperId(item.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={item.label}
            >
              <View style={[styles.cardOuter, isSelected && styles.cardSelected]}>
                <LinearGradient
                  colors={item.colors as [string, string, ...string[]]}
                  style={styles.gradient}
                >
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </LinearGradient>
              </View>
              <Text
                style={[styles.label, isSelected && styles.labelSelected]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  list: {
    padding: PADDING,
    gap: COLUMN_GAP,
  },
  row: {
    gap: COLUMN_GAP,
  },
  itemWrap: {
    width: ITEM_WIDTH,
    marginBottom: 4,
  },
  cardOuter: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 160,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#3B82F6',
  },
  gradient: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 10,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.sansBold,
  },
  label: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  labelSelected: {
    color: '#3B82F6',
    fontFamily: FontFamily.sansBold,
  },
});
