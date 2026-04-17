import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  View,
  Platform,
  Pressable as RNPressable,
  FlatList,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  X,
  Info,
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
import { useAuth } from '../contexts/AuthContext';
import { useWallpaper, WALLPAPERS, type WallpaperDef } from '../contexts/WallpaperContext';
import { nativeWhiteInteractiveShadow } from '../constants/theme';

const WALLPAPER_THUMB_W = 120;
const WALLPAPER_THUMB_H = 180;

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

/** Preset wallpaper tile — image presets use the same asset as the full wallpaper; gradients use swatches. */
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
  return (
    <RNPressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.wallpaperGridTile,
        { width: tileWidth, height: tileHeight ?? 80 },
        isActive && styles.wallpaperTileActive,
        pressed && { opacity: 0.9 },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ checked: isActive }}
      accessibilityLabel={wp.label}
    >
      <Image source={wp.source} style={StyleSheet.absoluteFill} resizeMode="cover" />
    </RNPressable>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function Row({ row, isLast }: { row: RowDef; isLast?: boolean }) {
  return (
    <View>
      <RNPressable
        onPress={row.type === 'navigate' ? row.onPress : undefined}
        style={({ pressed }) => [
          styles.row,
          pressed && row.type === 'navigate' ? { opacity: 0.7 } : null,
        ]}
        accessibilityRole={row.type === 'toggle' ? 'switch' : 'button'}
        accessibilityLabel={row.label}
      >
        <View style={styles.rowInner}>
          <row.Icon
            size={20}
            color={row.danger ? '#EF4444' : '#0F172A'}
            strokeWidth={2}
          />
          <Text style={[styles.rowLabel, row.danger && { color: '#EF4444' }]}>
            {row.label}
          </Text>
          <View style={{ flex: 1 }} />
          {row.valueText ? (
            <Text style={styles.rowValue}>{row.valueText}</Text>
          ) : null}
          {row.type === 'navigate' ? (
            <ChevronRight size={18} color="#CBD5E1" strokeWidth={2} />
          ) : (
            <Switch
              value={!!row.toggleValue}
              onValueChange={row.onToggle}
              trackColor={{ false: '#E2E8F0', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          )}
        </View>
      </RNPressable>
      {!isLast ? <View style={styles.rowHairline} /> : null}
    </View>
  );
}

export default function ReglagesScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
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
    /* Bottom sheet Claude-style : s'ancre en bas, pleine largeur, coins arrondis
       uniquement en haut. Le paddingTop de l'overlay laisse voir le backdrop au-dessus. */
    <View style={[styles.overlay, { paddingTop: insets.top + 24 }]}>
      {/* Tap outside to close */}
      <RNPressable style={StyleSheet.absoluteFill} onPress={() => nav.goBack()} />
      <View style={[StyleSheet.absoluteFill, styles.backdropFallback]} pointerEvents="none" />

      {/* Bottom sheet */}
      <View style={styles.sheet}>
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
            <X size={18} color="#0F172A" strokeWidth={2.2} />
          </RNPressable>

          <Text style={styles.headerTitle}>Réglages</Text>

          <RNPressable
            onPress={() => nav.navigate('APropos')}
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel="À propos"
          >
            <Info size={18} color="#0F172A" strokeWidth={2.2} />
          </RNPressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 32,
          }}
          style={{ flex: 1 }}
        >
          {isDemo ? (
            <View style={styles.demoNotice}>
              <Text style={styles.demoNoticeText}>
                Mode démo — les données affichées sont fictives.
              </Text>
            </View>
          ) : null}

          <SectionLabel label="COMPTE" />
          <View style={styles.group}>
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
                  renderItem={({ item }) => {
                    if ('__custom' in item && item.__custom) {
                      return (
                        <View
                          style={[
                            styles.wallpaperGridTile,
                            styles.wallpaperCustomTile,
                            { width: WALLPAPER_THUMB_W, height: WALLPAPER_THUMB_H, marginRight: 12 },
                          ]}
                        >
                          <ImageIcon size={22} color="#64748B" strokeWidth={2} />
                        </View>
                      );
                    }
                    const wp = item as WallpaperDef;
                    const isActive = !customUri && wallpaper.id === wp.id;
                    return (
                      <View style={{ marginRight: 12 }}>
                        <WallpaperPresetTile
                          wp={wp}
                          tileWidth={WALLPAPER_THUMB_W}
                          tileHeight={WALLPAPER_THUMB_H}
                          isActive={isActive}
                          onSelect={() => setWallpaperId(wp.id)}
                        />
                      </View>
                    );
                  }}
                />
              </View>
            );
          })}

          <SectionLabel label="PRÉFÉRENCES" />
          <View style={styles.group}>
            {groups.preferences.map((r, idx) => (
              <Row key={r.key} row={r} isLast={idx === groups.preferences.length - 1} />
            ))}
          </View>

          <SectionLabel label="CONFIDENTIALITÉ" />
          <View style={styles.group}>
            {groups.privacy.map((r, idx) => (
              <Row key={r.key} row={r} isLast={idx === groups.privacy.length - 1} />
            ))}
          </View>

          <SectionLabel label="SYSTÈME" />
          <View style={styles.group}>
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
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  backdropFallback: {
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  /* Bottom sheet pleine largeur, ancré en bas. Coins arrondis uniquement en haut,
     comme l'écran Paramètres de Claude. */
  sheet: {
    flex: 1,
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#EEF2F7',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.16, shadowRadius: 24 },
      android: { elevation: 12 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.16, shadowRadius: 24 },
    }),
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15,23,42,0.18)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 6,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    ...nativeWhiteInteractiveShadow,
  },
  headerTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    color: '#0F172A',
  },
  sectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'rgba(15,23,42,0.45)',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 6,
  },
  group: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    overflow: 'hidden',
    marginBottom: 16,
    ...nativeWhiteInteractiveShadow,
  },
  // Papillon-style: each collection is its own row. No outer card — thumbnails
  // carry their own shadow, and avoiding a wrapper avoids Android's elevation
  // grey-frame on parent views (lesson 2026-04-02).
  wallpaperCollection: {
    marginBottom: 18,
  },
  wallpaperCollectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#0F172A',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  wallpaperListContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'center',
  },
  wallpaperGridTile: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    backgroundColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 14,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  wallpaperTileActive: {
    borderWidth: 3,
    borderColor: '#7C3AED',
  },
  wallpaperCustomTile: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 56,
    justifyContent: 'center',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  rowHairline: {
    height: 1,
    backgroundColor: '#F0F0F5',
    marginHorizontal: 16,
  },
  rowLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: '#0F172A',
  },
  rowValue: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#94A3B8',
    marginRight: 8,
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
    color: '#94A3B8',
  },
  demoNotice: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.22)',
  },
  demoNoticeText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
});
