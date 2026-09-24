import {
  Alert,
  View,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { WALLPAPERS } from '../contexts/WallpaperContext';
import { useActiveChild, DEFAULT_CHILD_COLOR } from '../contexts/ActiveChildContext';
import AucunEnfant from '../components/AucunEnfant';
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

/**
 * Fond de l'Accueil de l'ENFANT ACTIF : sa couleur (par défaut) ou une photo nature intégrée à
 * l'app. Enregistré par enfant (children.fond, commun aux responsables ; en démo : sur l'appareil).
 */
export default function WallpaperPickerScreen() {
  const insets = useSafeAreaInsets();
  const { selectedChild, setChildFond } = useActiveChild();
  const photos = WALLPAPERS.filter((w) => w.category === 'nature');

  if (!selectedChild) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 60 }]}>
        <AucunEnfant />
      </View>
    );
  }

  const fond = selectedChild.fond ?? null;
  const choisir = async (id: string | null) => {
    try {
      await setChildFond(selectedChild.id, id);
    } catch {
      Alert.alert('Fond non enregistré', 'Vérifiez votre connexion puis réessayez.');
    }
  };

  // Deux colonnes sans `gap` (Android) : marge à droite sur la colonne de gauche.
  const cartes = [
    <Pressable
      key="couleur"
      onPress={() => choisir(null)}
      style={[styles.card, fond === null && styles.cardActive]}
      accessibilityRole="radio"
      accessibilityState={{ selected: fond === null }}
    >
      <View style={[styles.cardImage, { backgroundColor: selectedChild.color ?? DEFAULT_CHILD_COLOR }]} />
      {fond === null && (
        <View style={styles.checkBadge}>
          <Check size={14} color="#FFFFFF" strokeWidth={3} />
        </View>
      )}
      <Text style={styles.cardLabel} numberOfLines={1}>Couleur de {selectedChild.name}</Text>
    </Pressable>,
    ...photos.map((wp) => (
      <WallpaperCard key={wp.id} wp={wp} isActive={fond === wp.id} onPress={() => choisir(wp.id)} />
    )),
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top + 60 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getBottomBarScrollPadding(insets.bottom) }]}
      >
        <Text style={styles.intro}>
          Fond de l’Accueil du carnet de {selectedChild.name}. Il est le même pour tous ses responsables.
        </Text>
        <View style={styles.grid}>
          {cartes.map((c, i) => (
            <View key={i} style={[styles.cell, i % 2 === 0 && { marginRight: CARD_GAP }]}>
              {c}
            </View>
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
  },
  cell: {
    width: CARD_W,
    marginBottom: CARD_GAP,
  },
  intro: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(15,23,42,0.55)',
    marginBottom: 12,
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
