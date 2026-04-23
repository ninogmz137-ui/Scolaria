/**
 * AppTopbar — Floating topbar, shown only on Accueil and stacked screens.
 *
 * Accueil (home mode):
 *   [Burger ☰]   Bonjour, Prénom 👋   [Settings ⚙]
 *
 * Stacked screens:
 *   [← Back]     Title of screen      (empty right)
 *
 * Notes / Agenda / Messagerie tabs: NO topbar (hidden by TabNavigator).
 *
 * - White text on Accueil (over gradient wallpaper)
 * - Dark text on stacked screens (over light bg)
 */

import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { Pressable } from './ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu } from '@getpapillon/papicons';
import { SlidersHorizontal, ChevronLeft } from 'lucide-react-native';
import { FontFamily } from '../hooks/useSolariaFonts';

// ─── Helpers ────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Props ───────────────────────────────────────────────

/** 'home' = Accueil tab root; 'stacked' = any screen pushed onto a stack */
export type TopbarMode = 'home' | 'stacked';

interface Props {
  mode: TopbarMode;
  /** Burger button press (home mode) */
  onBurgerPress?: () => void;
  /** Back arrow press (stacked mode) */
  onBackPress?: () => void;
  /** Screen title shown in stacked mode */
  title?: string;
  /** Child's display name — used in greeting + initials fallback */
  childName: string;
  /** Child's photo URL — 'emoji:🦁' or a real photo URI */
  childPhotoUrl: string | null;
  /** Whether this is the home tab — controls text color (white vs dark) */
  isHomeTab: boolean;
  /** Settings button press (home mode) */
  onSettingsPress?: () => void;
}

// ─── Burger button ───────────────────────────────────────

function BurgerButton({
  onPress,
  isHomeTab,
}: {
  onPress?: () => void;
  isHomeTab: boolean;
}) {
  const bg = isHomeTab ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.07)';
  const iconColor = isHomeTab ? '#FFFFFF' : '#0F172A';

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.iconButton, { backgroundColor: bg }]}
    >
      <Menu size={24} color="#FFFFFF" />
    </Pressable>
  );
}

// ─── Settings button ─────────────────────────────────────

function SettingsButton({
  onPress,
  isHomeTab,
}: {
  onPress?: () => void;
  isHomeTab: boolean;
}) {
  const bg = isHomeTab ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.07)';
  const iconColor = isHomeTab ? '#FFFFFF' : '#0F172A';

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.iconButton, { backgroundColor: bg }]}
    >
      <SlidersHorizontal size={20} color={iconColor} strokeWidth={2} />
    </Pressable>
  );
}

// ─── Back button ─────────────────────────────────────────

function BackButton({
  onPress,
  isHomeTab,
}: {
  onPress?: () => void;
  isHomeTab: boolean;
}) {
  const bg = isHomeTab ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.07)';
  const iconColor = isHomeTab ? '#FFFFFF' : '#0F172A';

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.iconButton, { backgroundColor: bg }]}
    >
      <ChevronLeft size={22} color={iconColor} strokeWidth={2} />
    </Pressable>
  );
}

// ─── Component ───────────────────────────────────────────

export default function AppTopbar({
  mode,
  onBurgerPress,
  onBackPress,
  title,
  childName,
  childPhotoUrl,
  isHomeTab,
  onSettingsPress,
}: Props) {
  const insets = useSafeAreaInsets();

  const textColor = isHomeTab ? '#FFFFFF' : '#0F172A';
  const firstName = childName.split(' ')[0] || childName;

  // Resolve avatar display type
  const isEmoji = childPhotoUrl?.startsWith('emoji:') ?? false;
  const emojiChar = isEmoji ? childPhotoUrl!.replace('emoji:', '') : null;
  const photoUri = !isEmoji ? childPhotoUrl : null;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 6, paddingBottom: 8 },
      ]}
    >
      {/* Left: burger (home) or back arrow (stacked) */}
      <View style={styles.side}>
        {mode === 'stacked' ? (
          <BackButton onPress={onBackPress} isHomeTab={isHomeTab} />
        ) : (
          <BurgerButton onPress={onBurgerPress} isHomeTab={isHomeTab} />
        )}
      </View>

      {/* Center: greeting (home) or screen title (stacked) */}
      <View style={styles.center}>
        {mode === 'stacked' && title ? (
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
        ) : mode === 'home' ? (
          <Text style={[styles.greeting, { color: textColor }]} numberOfLines={1}>
            Bonjour, {firstName} {'\u{1F44B}'}
          </Text>
        ) : null}
      </View>

      {/* Right: settings (home) or empty (stacked) */}
      <View style={styles.side}>
        {mode === 'home' && (
          <SettingsButton onPress={onSettingsPress} isHomeTab={isHomeTab} />
        )}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  greeting: {
    fontFamily: FontFamily.sansBold,
    fontSize: 18,
  },
  title: {
    fontFamily: FontFamily.sansBold,
    fontSize: 17,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
});
