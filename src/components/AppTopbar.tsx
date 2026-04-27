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

import { View, Text, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu } from '@getpapillon/papicons';
import { ChevronLeft } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { FontFamily } from '../hooks/useSolariaFonts';
import RoundGlassIconButton from './shared/RoundGlassIconButton';

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
  // On Android, very low alpha can disappear over busy wallpapers.
  const bg = isHomeTab ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.92)';
  const iconColor = isHomeTab ? '#FFFFFF' : '#0F172A';
  const borderColor = isHomeTab ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.12)';

  return (
    <RoundGlassIconButton
      onPress={onPress}
      size={40}
      backgroundColor={bg}
      borderColor={borderColor}
      hitSlop={8}
      accessibilityLabel="Menu"
      androidIconNudgeX={-0.6}
      androidIconNudgeY={-0.4}
    >
      <Menu size={26} color={iconColor} />
    </RoundGlassIconButton>
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
  const bg = isHomeTab ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.92)';
  const iconColor = isHomeTab ? '#FFFFFF' : '#0F172A';
  const borderColor = isHomeTab ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.12)';

  return (
    <RoundGlassIconButton
      onPress={onPress}
      size={40}
      backgroundColor={bg}
      borderColor={borderColor}
      hitSlop={8}
      accessibilityLabel="Réglages"
      androidIconNudgeX={-0.5}
      androidIconNudgeY={-0.5}
    >
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11.9995 3C12.5927 3.00002 13.3086 3.20228 13.8921 3.41211C14.5527 3.64979 14.8812 4.36002 14.7143 5.04199L14.5307 5.78809C14.4327 6.18858 14.6447 6.59689 15.0014 6.80371C15.3585 7.01063 15.8146 6.98753 16.1128 6.70215L16.6684 6.1709C17.1756 5.68518 17.9554 5.61392 18.4917 6.06738C18.9651 6.46772 19.4979 6.98637 19.7944 7.5C20.091 8.01372 20.2733 8.7346 20.3833 9.34473C20.5078 10.0358 20.0565 10.6757 19.3823 10.8721L18.643 11.0869C18.2471 11.2022 18.0005 11.5876 18.0005 12C18.0005 12.4123 18.2463 12.7975 18.6421 12.9131L19.3833 13.1289C20.0571 13.3255 20.5077 13.9644 20.3833 14.6553C20.2733 15.2654 20.0909 15.9863 19.7944 16.5C19.4979 17.0136 18.965 17.5323 18.4917 17.9326C17.9555 18.386 17.1756 18.3156 16.6684 17.8301L16.1128 17.2979C15.8148 17.0124 15.3587 16.9888 15.0014 17.1953C14.6445 17.4017 14.4325 17.8105 14.5307 18.2109L14.7143 18.958C14.8813 19.6401 14.5528 20.3512 13.8921 20.5889C13.3087 20.7987 12.5926 21 11.9995 21C11.4065 20.9999 10.6911 20.7986 10.1079 20.5889C9.4471 20.3512 9.11864 19.6401 9.28562 18.958L9.46824 18.21C9.56604 17.8097 9.3543 17.4015 8.99754 17.1953C8.64021 16.989 8.18412 17.0124 7.88621 17.2979L7.33152 17.8301C6.82436 18.3157 6.04449 18.3859 5.50828 17.9326C5.03495 17.5323 4.50211 17.0136 4.20555 16.5C3.90903 15.9863 3.7257 15.2654 3.6157 14.6553C3.49135 13.9644 3.94281 13.3254 4.61668 13.1289L5.35594 12.9131C5.7518 12.7976 6.00041 12.4124 6.00047 12C6.00048 11.5876 5.75186 11.2022 5.35594 11.0869L4.61668 10.8721C3.94264 10.6756 3.49219 10.0357 3.61668 9.34473C3.72668 8.73456 3.90897 8.01373 4.20555 7.5C4.50212 6.98632 5.03487 6.46774 5.50828 6.06738C6.04452 5.61392 6.82432 5.68518 7.33152 6.1709L7.88621 6.70215C8.18437 6.98742 8.64039 7.01053 8.99754 6.80371C9.35438 6.59702 9.56625 6.18865 9.46824 5.78809L9.28562 5.04199C9.1187 4.35995 9.44713 3.64975 10.1079 3.41211C10.6912 3.20234 11.4064 3.00008 11.9995 3ZM12.0005 9C10.3436 9 9.00047 10.3431 9.00047 12C9.00047 13.6569 10.3436 15 12.0005 15C13.6571 14.9997 15.0005 13.6567 15.0005 12C15.0005 10.3433 13.6571 9.00026 12.0005 9Z"
          fill={iconColor}
        />
      </Svg>
    </RoundGlassIconButton>
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
  const bg = isHomeTab ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.92)';
  const iconColor = isHomeTab ? '#FFFFFF' : '#0F172A';
  const borderColor = isHomeTab ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.12)';

  return (
    <RoundGlassIconButton
      onPress={onPress}
      size={40}
      backgroundColor={bg}
      borderColor={borderColor}
      hitSlop={8}
      accessibilityLabel="Retour"
      androidIconNudgeX={-0.5}
      androidIconNudgeY={-0.5}
    >
      <ChevronLeft size={22} color={iconColor} strokeWidth={2} />
    </RoundGlassIconButton>
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
      <View style={styles.sideLeft}>
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
      <View style={styles.sideRight}>
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
  sideLeft: {
    width: 48,
    alignItems: 'flex-start',
  },
  sideRight: {
    width: 48,
    alignItems: 'flex-end',
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
});
