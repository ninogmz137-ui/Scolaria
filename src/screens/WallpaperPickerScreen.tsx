import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { useWallpaper } from '../contexts/WallpaperContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomBarScrollPadding } from '../components/navigation/BottomBar';
import type { WallpaperDef } from '../contexts/WallpaperContext';
import { SCREEN_BACKGROUND } from '../constants/colors';
import { Text, Pressable } from '../components/ui';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_W = (SCREEN_W - 32 - CARD_GAP) / 2;

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
      {wp.type === 'gradient' ? (
        <LinearGradient
          colors={wp.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardImage}
        />
      ) : (
        <Image source={(wp as any).source} style={styles.cardImage} resizeMode="cover" />
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
  const insets = useSafeAreaInsets();
  const { wallpaper, setWallpaperId, wallpapers } = useWallpaper();
  const filtered = wallpapers.filter((w) => w.category === 'nature');

  return (
    <View style={[styles.root, { paddingTop: insets.top + 60 }]}>
      {/* ── Grid ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getBottomBarScrollPadding(insets.bottom) }]}
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
    backgroundColor: SCREEN_BACKGROUND,
  },

  // ── Grid
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
    borderColor: '#4338CA',
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
    backgroundColor: '#4338CA',
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
