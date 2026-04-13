import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { useWallpaper } from '../contexts/WallpaperContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import { TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';
import type { WallpaperDef } from '../contexts/WallpaperContext';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_W = (SCREEN_W - 32 - CARD_GAP) / 2;

type Category = 'all' | 'nature' | 'abstract';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'nature', label: 'Nature' },
  { key: 'abstract', label: 'Gradients' },
];

// ─── Single wallpaper card ────────────────────────────────

function WallpaperCard({
  wp,
  isActive,
  onPress,
}: {
  wp: WallpaperDef;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isActive && styles.cardActive,
        pressed && { opacity: 0.8 },
      ]}
    >
      {wp.imageUrl ? (
        <Image source={{ uri: wp.imageUrl }} style={styles.cardImage} />
      ) : (
        Platform.OS === 'web' ? (
          // @ts-ignore — web-only CSS property
          <View
            style={[
              styles.cardImage,
              {
                backgroundImage: `linear-gradient(135deg, ${wp.colors[0]}, ${wp.colors[wp.colors.length - 1]})`,
              } as any,
            ]}
          />
        ) : (
          <LinearGradient
            colors={wp.colors as [string, string, ...string[]]}
            style={styles.cardImage}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )
      )}
      {isActive && (
        <View style={styles.checkBadge}>
          <Check size={14} color="#FFFFFF" strokeWidth={3} />
        </View>
      )}
      <Text style={styles.cardLabel} numberOfLines={1}>{wp.label}</Text>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────

export default function WallpaperPickerScreen() {
  const { wallpaper, setWallpaperId, wallpapers } = useWallpaper();
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  const filtered = activeCategory === 'all'
    ? wallpapers
    : wallpapers.filter((w) => w.category === activeCategory);

  return (
    <View style={styles.root}>
      {/* ── Horizontal category pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.key}
            onPress={() => setActiveCategory(cat.key)}
            style={[
              styles.pill,
              activeCategory === cat.key && styles.pillActive,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                activeCategory === cat.key && styles.pillTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Grid ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.grid}>
          {filtered.map((wp) => (
            <WallpaperCard
              key={wp.id}
              wp={wp}
              isActive={wallpaper.id === wp.id}
              onPress={() => setWallpaperId(wp.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ── Category pills
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  pillActive: {
    backgroundColor: '#7C3AED',
  },
  pillText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },

  // ── Grid
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: TAB_BAR_SCROLL_PADDING,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },

  // ── Card
  card: {
    width: CARD_W,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardActive: {
    borderColor: '#7C3AED',
  },
  cardImage: {
    width: '100%',
    height: 200,
    borderRadius: 13,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
});
