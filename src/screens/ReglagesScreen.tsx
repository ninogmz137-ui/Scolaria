import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  View,
  Platform,
  Pressable as RNPressable,
  Image,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
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
import { Box, Text, Pressable } from '../components/ui';
import { FontFamily } from '../hooks/useSolariaFonts';
import { useAuth } from '../contexts/AuthContext';
import { useWallpaper, WALLPAPERS, type WallpaperDef } from '../contexts/WallpaperContext';
import { LinearGradient } from 'expo-linear-gradient';
import { FLOATING_TAB_BAR_HEIGHT, TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';

const SCREEN_W = Dimensions.get('window').width;
const WALLPAPER_NUM_COLUMNS = 3;
const WALLPAPER_TILE_W = (SCREEN_W - 64) / WALLPAPER_NUM_COLUMNS;

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

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function Row({ row, isLast }: { row: RowDef; isLast?: boolean }) {
  return (
    <Pressable
      onPress={row.type === 'navigate' ? row.onPress : undefined}
      style={({ pressed }) => [
        styles.row,
        pressed && row.type === 'navigate' ? { opacity: 0.7 } : null,
        !isLast && styles.rowSeparator,
      ]}
      accessibilityRole={row.type === 'toggle' ? 'switch' : 'button'}
      accessibilityLabel={row.label}
    >
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
    </Pressable>
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

  const wallpaperFlatData = useMemo((): WallpaperGridRow[] => {
    return [...wallpaperGridSource, { id: '__custom__', __custom: true }];
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
    <View style={[styles.overlay, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
      {/* Tap outside to close */}
      <RNPressable style={StyleSheet.absoluteFill} onPress={() => nav.goBack()} />
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFill, styles.backdropFallback]} pointerEvents="none" />
      ) : (
        <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      )}

      {/* Card sheet */}
      <View style={styles.sheet}>
        {/* Header like Claude */}
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
            paddingBottom: FLOATING_TAB_BAR_HEIGHT + insets.bottom + TAB_BAR_SCROLL_PADDING,
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
          <View style={styles.wallpaperGroup}>
            <View style={styles.wallpaperGrid}>
              {wallpaperFlatData.map((item) => {
                if ('__custom' in item && item.__custom) {
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.wallpaperGridTile,
                        styles.wallpaperCustomTile,
                        { width: WALLPAPER_TILE_W },
                      ]}
                    >
                      <ImageIcon size={18} color="#64748B" strokeWidth={2} />
                    </View>
                  );
                }
                const wp = item as WallpaperDef;
                const hasRemote = !!wp.imageUrl;
                const isActive = !customUri && wallpaper.id === wp.id;
                const grad = (
                  wp.colors.length >= 2
                    ? [wp.colors[0], wp.colors[wp.colors.length - 1]]
                    : ['#6366F1', '#22D3EE']
                ) as [string, string, ...string[]];
                return (
                  <RNPressable
                    key={wp.id}
                    onPress={() => setWallpaperId(wp.id)}
                    style={({ pressed }) => [
                      styles.wallpaperGridTile,
                      { width: WALLPAPER_TILE_W },
                      isActive && styles.wallpaperTileActive,
                      pressed && { opacity: 0.9 },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isActive }}
                    accessibilityLabel={wp.label}
                  >
                    <LinearGradient
                      colors={grad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    {hasRemote ? (
                      <Image
                        source={{ uri: wp.imageUrl! }}
                        style={styles.wallpaperTileImageOverlay}
                        resizeMode="cover"
                        onError={() => {}}
                      />
                    ) : null}
                  </RNPressable>
                );
              })}
            </View>
          </View>

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
    backgroundColor: 'rgba(15,23,42,0.22)',
  },
  sheet: {
    marginHorizontal: 12,
    marginBottom: 10,
    height: '88%',
    borderRadius: 28,
    backgroundColor: '#EEF2F7',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.18, shadowRadius: 34 },
      android: { elevation: 0 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.18, shadowRadius: 34 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 0 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12 },
    }),
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
    paddingHorizontal: 4,
    marginTop: 6,
    marginBottom: 8,
  },
  group: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 16 },
      android: { elevation: 0 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 16 },
    }),
  },
  wallpaperGroup: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  wallpaperGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  wallpaperGridTile: {
    height: 80,
    borderRadius: 10,
    margin: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(148,163,184,0.12)',
  },
  wallpaperTileActive: {
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  wallpaperTileImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: Platform.OS === 'web' ? 1 : 0.92,
  },
  wallpaperCustomTile: {
    borderStyle: 'dashed',
    borderColor: 'rgba(100,116,139,0.35)',
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  rowSeparator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
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
