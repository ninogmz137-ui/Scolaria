import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  View,
  Platform,
  Pressable as RNPressable,
  TouchableOpacity,
  FlatList,
  Image,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  X,
  User,
  SlidersHorizontal,
  Plug,
  Shield,
  Bell,
  Link2,
  Image as ImageIcon,
  Smartphone,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { Box, Text } from '../components/ui';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Colors, SCREEN_BACKGROUND } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { useWallpaper, WALLPAPERS, type WallpaperDef } from '../contexts/WallpaperContext';
import ScolariaAppIcon from '../components/ScolariaAppIcon';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';

/**
 * Feuille réglages = même palette que l’app (fond clair). Interaction type Claude : ligne
 * **sans** carte permanente, fond qui se fonce au tap sur toute la ligne.
 */
const SHEET_BG = SCREEN_BACKGROUND;
const SHEET_TEXT = Colors.textPrimary;
const SHEET_MUTED = Colors.textSecondary;
const SHEET_SECTION = 'rgba(100, 116, 139, 0.9)';
/** Surlignage appuyé (équivalent « carte » Claude, fond légèrement assombri). */
const ROW_PRESS_BG = 'rgba(15, 23, 42, 0.11)';
const ROW_DIVIDER = 'rgba(15, 23, 42, 0.1)';
const HEADER_BTN_BG = 'rgba(15, 23, 42, 0.06)';

/**
 * Même retrait vertical que l’écran Accueil au-dessus de la feuille de contenu
 * (topbar + marge) — le sheet de réglages remplace visuellement la « carte » accueil.
 */
const ACCUEIL_TOPBAR_RESERVE = 56;
const ACCUEIL_TOP_SPACER = 40;

/** Vignettes compactes, format paysage, scroll horizontal (moins de hauteur dans Réglages). */
const WALLPAPER_THUMB_W = 88;
const WALLPAPER_THUMB_H = 50;
const WALLPAPER_THUMB_GAP = 8;

/** Papillon-style collections — grouped by source/theme, each shown as a horizontal scroll row. */
const WALLPAPER_COLLECTIONS: { id: 'nature' | 'abstract'; label: string }[] = [
  { id: 'nature', label: 'Nature' },
  { id: 'abstract', label: 'Abstrait' },
];

type RowType = 'navigate' | 'toggle';

type RowDef = {
  key: string;
  label: string;
  Icon: React.ElementType;
  type: RowType;
  valueText?: string;
  onPress?: () => void;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  danger?: boolean;
};

type WallpaperGridRow = WallpaperDef | { id: '__custom__'; __custom: true };

type WallpaperGroup = { id: 'nature' | 'abstract'; label: string; items: WallpaperDef[] };

/** Preset — taille explicite sur le root (FlatList horizontale Android : pas de marge de gap sur l’item). */
function WallpaperPresetTile({
  wp,
  tileWidth,
  tileHeight,
  isActive,
  onSelect,
}: {
  wp: WallpaperDef;
  tileWidth: number;
  tileHeight?: number;
  isActive: boolean;
  onSelect: () => void;
}) {
  const h = tileHeight ?? WALLPAPER_THUMB_H;
  return (
    <RNPressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.wallpaperGridTile,
        { width: tileWidth, height: h },
        isActive && styles.wallpaperTileActive,
        pressed && { opacity: 0.88 },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ checked: isActive }}
      accessibilityLabel={wp.label}
    >
      <Image
        source={wp.source}
        style={{
          width: tileWidth,
          height: h,
          borderRadius: 9,
        }}
        resizeMode="cover"
      />
    </RNPressable>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

const CHEVRON_MUTED = 'rgba(100, 116, 139, 0.85)';

function Row({ row, isLast }: { row: RowDef; isLast?: boolean }) {
  const [menuPressed, setMenuPressed] = useState(false);
  const iconColor = row.danger ? '#F87171' : SHEET_TEXT;

  if (row.type === 'toggle') {
    return (
      <View>
        <View style={styles.rowToggleRow}>
          <TouchableOpacity
            activeOpacity={1}
            onPressIn={() => setMenuPressed(true)}
            onPressOut={() => setMenuPressed(false)}
            onPress={() => row.onToggle?.(!row.toggleValue)}
            style={[styles.rowToggleHit, menuPressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel={row.label}
          >
            <View style={styles.rowInner}>
              <row.Icon size={22} color={iconColor} strokeWidth={2} />
              <Text
                style={[styles.rowLabel, row.danger && { color: '#F87171' }]}
                numberOfLines={2}
              >
                {row.label}
              </Text>
              <View style={{ flex: 1 }} />
            </View>
          </TouchableOpacity>
          <Switch
            style={styles.rowSwitch}
            value={!!row.toggleValue}
            onValueChange={row.onToggle}
            trackColor={{ false: '#E2E8F0', true: '#6366F1' }}
            thumbColor="#FFFFFF"
          />
        </View>
        {!isLast ? <View style={styles.rowDivider} /> : null}
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => setMenuPressed(true)}
        onPressOut={() => setMenuPressed(false)}
        onPress={row.onPress}
        style={[styles.row, menuPressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={row.label}
      >
        <View style={styles.rowInner}>
          <row.Icon size={22} color={iconColor} strokeWidth={2} />
          <Text
            style={[styles.rowLabel, row.danger && { color: '#F87171' }]}
            numberOfLines={2}
          >
            {row.label}
          </Text>
          {row.valueText ? (
            <Text style={styles.rowValue} numberOfLines={1}>
              {row.valueText}
            </Text>
          ) : null}
          <ChevronRight size={20} color={CHEVRON_MUTED} strokeWidth={2.2} />
        </View>
      </TouchableOpacity>
      {!isLast ? <View style={styles.rowDivider} /> : null}
    </View>
  );
}

export default function ReglagesScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const windowDims = useWindowDimensions();
  const topReserve = insets.top + ACCUEIL_TOPBAR_RESERVE + ACCUEIL_TOP_SPACER;
  /** Android: window vs screen diffèrent souvent en modal ; on prend le max pour caler la feuille comme sur le web. */
  const fullViewportHeight = useMemo(() => {
    if (Platform.OS === 'android') {
      const w = Dimensions.get('window');
      const s = Dimensions.get('screen');
      return Math.max(windowDims.height, w.height, s.height);
    }
    return windowDims.height;
  }, [windowDims.height]);
  const sheetMaxHeight = Math.max(120, fullViewportHeight - topReserve);
  const { signOut, isDemo } = useAuth();
  const { wallpaper, wallpapers, setWallpaperId, customUri } = useWallpaper();

  const wallpaperGridSource = useMemo((): WallpaperDef[] => {
    const list = wallpapers?.length ? wallpapers : WALLPAPERS;
    return list.slice(0, 12);
  }, [wallpapers]);

  /** Papillon-style grouping: one horizontal row per collection (Nature, Abstrait).
      The custom-upload tile is appended to the last non-empty collection. */
  const wallpaperGroups = useMemo((): WallpaperGroup[] => {
    return WALLPAPER_COLLECTIONS.map((col) => ({
      ...col,
      items: wallpaperGridSource.filter((w) => w.category === col.id),
    })).filter((g) => g.items.length > 0);
  }, [wallpaperGridSource]);

  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('@scolaria:haptics').then((v) => {
      if (v === '0') setHapticsEnabled(false);
    });
  }, []);

  const setHaptics = async (v: boolean) => {
    setHapticsEnabled(v);
    await AsyncStorage.setItem('@scolaria:haptics', v ? '1' : '0');
  };

  const groups = useMemo(() => {
    const account: RowDef[] = [
      { key: 'profil', label: 'Profil', Icon: User, type: 'navigate', onPress: () => nav.navigate('EditProfile') },
    ];

    const preferences: RowDef[] = [
      { key: 'capacites', label: 'Capacités', Icon: SlidersHorizontal, type: 'navigate', onPress: () => nav.navigate('TextSize') },
      { key: 'connecteurs', label: 'Connecteurs', Icon: Plug, type: 'navigate', onPress: () => nav.navigate('ExportDonnees') },
      { key: 'autorisations', label: 'Autorisations', Icon: Shield, type: 'navigate', onPress: () => nav.navigate('PermissionsRGPD') },
      { key: 'notifications', label: 'Notifications', Icon: Bell, type: 'navigate', onPress: () => nav.navigate('NotificationsSettings') },
      { key: 'lang', label: 'Langue de la saisie vocale', Icon: Smartphone, type: 'navigate', valueText: 'FR', onPress: () => {} },
    ];

    const privacy: RowDef[] = [
      { key: 'conf', label: 'Confidentialité', Icon: Shield, type: 'navigate', onPress: () => nav.navigate('RGPDScreen') },
      { key: 'links', label: 'Liens partagés', Icon: Link2, type: 'navigate', onPress: () => nav.navigate('TransfertCode') },
    ];

    const system: RowDef[] = [
      { key: 'haptics', label: 'Retour haptique', Icon: Smartphone, type: 'toggle', toggleValue: hapticsEnabled, onToggle: setHaptics },
      { key: 'logout', label: isDemo ? 'Quitter la démo' : 'Se déconnecter', Icon: LogOut, type: 'navigate', onPress: () => signOut(), danger: true },
    ];

    return { account, preferences, privacy, system };
  }, [hapticsEnabled, isDemo, nav, signOut]);

  return (
    <View
      style={[
        styles.overlayRoot,
        { minHeight: fullViewportHeight },
        Platform.OS === 'android' && { height: fullViewportHeight },
      ]}
    >
      <StatusBar style="dark" />
      <RNPressable style={StyleSheet.absoluteFill} onPress={() => nav.goBack()} />
      <View style={[StyleSheet.absoluteFill, styles.backdropFallback]} pointerEvents="none" />

      <View
        style={[
          styles.sheet,
          {
            maxHeight: sheetMaxHeight,
            height: sheetMaxHeight,
            paddingTop: 6,
          },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.handleWrap} pointerEvents="none">
          <View style={styles.handle} />
        </View>

        {/* Header Claude : X à gauche, titre centré, Info à droite */}
        <View style={styles.header}>
          <RNPressable
            onPress={() => nav.goBack()}
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <X size={20} color={SHEET_TEXT} strokeWidth={2.2} />
          </RNPressable>

          <Text style={styles.headerTitle}>Réglages</Text>

          <RNPressable
            onPress={() => nav.navigate('APropos')}
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel="À propos"
          >
            <ScolariaAppIcon
              size={28}
              withBackground={false}
              color="rgba(248, 250, 252, 0.9)"
            />
          </RNPressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 32 + FLOATING_TAB_BAR_HEIGHT,
          }}
          style={{ flex: 1, backgroundColor: SHEET_BG }}
        >
          {isDemo ? (
            <View style={styles.demoNotice}>
              <Text style={styles.demoNoticeText}>
                Mode démo — les données affichées sont fictives.
              </Text>
            </View>
          ) : null}

          <SectionLabel label="COMPTE" />
          <View style={styles.menuGroup}>
            {groups.account.map((r, idx) => (
              <Row key={r.key} row={r} isLast={idx === groups.account.length - 1} />
            ))}
          </View>

          <SectionLabel label="FONDS D'ÉCRAN" />
          {wallpaperGroups.map((group, groupIdx) => {
            const isLastGroup = groupIdx === wallpaperGroups.length - 1;
            const data: WallpaperGridRow[] = isLastGroup
              ? [...group.items, { id: '__custom__', __custom: true }]
              : group.items;
            return (
              <View key={group.id} style={styles.wallpaperCollection}>
                <Text style={styles.wallpaperCollectionLabel}>{group.label}</Text>
                <FlatList
                  horizontal
                  data={data}
                  keyExtractor={(item) =>
                    '__custom' in item && item.__custom ? item.id : (item as WallpaperDef).id
                  }
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.wallpaperListContent}
                  removeClippedSubviews={false}
                  style={styles.wallpaperRowList}
                  /** Android: marginRight sur les cellules est souvent ignoré — espacement via séparateur dédié. */
                  ItemSeparatorComponent={() => <View style={styles.wallpaperItemSeparator} />}
                  renderItem={({ item }) => {
                    if ('__custom' in item && item.__custom) {
                      return (
                        <View
                          style={[
                            styles.wallpaperGridTile,
                            styles.wallpaperCustomTile,
                            { width: WALLPAPER_THUMB_W, height: WALLPAPER_THUMB_H },
                          ]}
                        >
                          <ImageIcon size={18} color={SHEET_MUTED} strokeWidth={2} />
                        </View>
                      );
                    }
                    const wp = item as WallpaperDef;
                    const isActive = !customUri && wallpaper.id === wp.id;
                    return (
                      <WallpaperPresetTile
                        wp={wp}
                        tileWidth={WALLPAPER_THUMB_W}
                        tileHeight={WALLPAPER_THUMB_H}
                        isActive={isActive}
                        onSelect={() => setWallpaperId(wp.id)}
                      />
                    );
                  }}
                />
              </View>
            );
          })}

          <SectionLabel label="PRÉFÉRENCES" />
          <View style={styles.menuGroup}>
            {groups.preferences.map((r, idx) => (
              <Row key={r.key} row={r} isLast={idx === groups.preferences.length - 1} />
            ))}
          </View>

          <SectionLabel label="CONFIDENTIALITÉ" />
          <View style={styles.menuGroup}>
            {groups.privacy.map((r, idx) => (
              <Row key={r.key} row={r} isLast={idx === groups.privacy.length - 1} />
            ))}
          </View>

          <SectionLabel label="SYSTÈME" />
          <View style={styles.menuGroup}>
            {groups.system.map((r, idx) => (
              <Row key={r.key} row={r} isLast={idx === groups.system.length - 1} />
            ))}
          </View>

          <Box className="items-center pt-4">
            <Text style={styles.footerBrand}>Scolaria</Text>
            <Text style={styles.footerMeta}>Version 1.0.0</Text>
          </Box>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Plein écran — requis sur Android pour que la feuille `absolute` + hauteur soit correcte. */
  overlayRoot: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  backdropFallback: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: SHEET_BG,
    overflow: 'hidden',
    alignSelf: 'stretch',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.3, shadowRadius: 24 },
      android: { elevation: 12 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.3, shadowRadius: 24 },
    }),
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 0,
  },
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: HEADER_BTN_BG,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 17,
    color: SHEET_TEXT,
  },
  sectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: SHEET_SECTION,
    textTransform: 'uppercase',
    paddingHorizontal: 0,
    paddingLeft: 4,
    marginTop: 20,
    marginBottom: 8,
  },
  /** Groupe = espacement, pas de carte blanche (style Claude : fond au tap seulement). */
  menuGroup: {
    marginBottom: 8,
  },
  // Papillon-style: each collection is its own row. No outer card — thumbnails
  // carry their own shadow, and avoiding a wrapper avoids Android's elevation
  // grey-frame on parent views (lesson 2026-04-02).
  wallpaperCollection: {
    marginBottom: 12,
  },
  wallpaperCollectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: Colors.textMuted,
    paddingHorizontal: 0,
    paddingLeft: 4,
    marginBottom: 6,
  },
  /** Liste horizontale : pas de double padding (déjà le ScrollView). */
  wallpaperListContent: {
    paddingVertical: 2,
    paddingRight: 0,
    alignItems: 'stretch',
    flexGrow: 0,
  },
  /** Hauteur de ligne = vignette seule, sans bande inutile. */
  wallpaperRowList: {
    minHeight: WALLPAPER_THUMB_H + 4,
    marginBottom: 4,
  },
  /** Espace explicite entre cellules (fiable sur Android, voir ItemSeparatorComponent). */
  wallpaperItemSeparator: {
    width: WALLPAPER_THUMB_GAP,
    height: WALLPAPER_THUMB_H,
    alignSelf: 'center' as const,
  },
  wallpaperGridTile: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.1)',
    backgroundColor: 'rgba(255,255,255,0.7)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 5,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  wallpaperTileActive: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  wallpaperCustomTile: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: 'rgba(15, 23, 42, 0.15)',
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    marginHorizontal: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 64,
    justifyContent: 'center',
    borderRadius: 12,
  },
  rowToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 0,
    minHeight: 64,
    paddingRight: 8,
  },
  rowToggleHit: {
    flex: 1,
    paddingVertical: 16,
    paddingLeft: 16,
    borderRadius: 12,
  },
  rowPressed: {
    backgroundColor: ROW_PRESS_BG,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 44,
    gap: 14,
  },
  rowSwitch: Platform.select({
    ios: { transform: [{ scaleX: 1.05 }, { scaleY: 1.05 }] } as any,
    default: {},
  }),
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: ROW_DIVIDER,
    marginLeft: 58,
    marginRight: 12,
  },
  rowLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    lineHeight: 22,
    color: SHEET_TEXT,
    flex: 1,
    minWidth: 0,
  },
  rowValue: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    color: SHEET_MUTED,
    marginLeft: 8,
    marginRight: 4,
    flexShrink: 0,
  },
  footerBrand: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    color: '#6366F1',
  },
  footerMeta: {
    marginTop: 4,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  demoNotice: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  demoNoticeText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
});
