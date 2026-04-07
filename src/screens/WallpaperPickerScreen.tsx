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
import type { WallpaperDef } from '../contexts/WallpaperContext';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 10;
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

  const natureWallpapers = wallpapers.filter((w) => w.category === 'nature');
  const abstractWallpapers = wallpapers.filter((w) => w.category === 'abstract');

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionTitle}>NATURE</Text>
        <View style={styles.grid}>
          {natureWallpapers.map((wp) => (
            <WallpaperCard
              key={wp.id}
              wp={wp}
              isActive={wallpaper.id === wp.id}
              onPress={() => setWallpaperId(wp.id)}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>GRADIENTS</Text>
        <View style={styles.grid}>
          {abstractWallpapers.map((wp) => (
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_W,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardActive: {
    borderColor: '#7C3AED',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 10,
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
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
});
