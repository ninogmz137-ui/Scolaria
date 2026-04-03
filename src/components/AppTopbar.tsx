/**
 * AppTopbar — Universal floating topbar (zIndex 10).
 *
 * All tab screens:
 *   [Avatar ☰]   Bonjour, Prénom 👋       [✦ Aria]
 *
 * Stacked screens:
 *   [← Back]    Title of screen            [✦ Aria]
 *
 * - On Accueil (isHomeTab): white text (over wallpaper)
 * - On other tabs: dark text (#1A1A1A, over grey bg)
 * - Aria button: always visible, blue circle with 3-sparkle icon
 */

import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { Pressable } from './ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Papicons } from '@getpapillon/papicons';
import { Menu } from 'lucide-react-native';
import { FontFamily } from '../hooks/useSolariaFonts';
import AriaSparkleIcon from './AriaSparkleIcon';

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

export type TopbarMode = 'home' | 'main' | 'stacked';

interface Props {
  mode: TopbarMode;
  /** Burger press (modes: home, main) */
  onBurgerPress?: () => void;
  /** Back press (mode: stacked) */
  onBackPress?: () => void;
  /** Page title (mode: stacked) */
  title?: string;
  /** Child's display name — shown in greeting and used for initials */
  childName: string;
  /** Child's photo URL — if set, shows photo instead of initials */
  childPhotoUrl: string | null;
  /** Whether this is the home tab — controls text color (white vs dark) */
  isHomeTab: boolean;
  /** Aria button press */
  onAriaPress?: () => void;
}

// ─── Aria gradient button ───────────────────────────────

function AriaButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <AriaSparkleIcon size={40} />
    </Pressable>
  );
}

// ─── Child avatar with burger badge ─────────────────────

function ChildAvatarButton({
  childName,
  childPhotoUrl,
  onPress,
}: {
  childName: string;
  childPhotoUrl: string | null;
  onPress?: () => void;
}) {
  const isEmoji = childPhotoUrl?.startsWith('emoji:') ?? false;
  const emojiChar = isEmoji ? childPhotoUrl!.replace('emoji:', '') : null;
  const photoUri = !isEmoji ? childPhotoUrl : null;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ position: 'relative' }}
    >
      <View style={styles.avatarCircle}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.avatarImage}
          />
        ) : emojiChar ? (
          <Text style={{ fontSize: 22 }}>{emojiChar}</Text>
        ) : (
          <Text style={styles.avatarInitials}>
            {getInitials(childName)}
          </Text>
        )}
      </View>

      {/* Burger badge — bottom-right */}
      <View style={styles.burgerBadge}>
        <Menu size={10} color="#64748B" strokeWidth={2} />
      </View>
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
  onAriaPress,
}: Props) {
  const insets = useSafeAreaInsets();

  // Text color: white on home (over wallpaper), dark on other tabs
  const textColor = isHomeTab ? '#FFFFFF' : '#1A1A1A';
  const backBg = isHomeTab ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)';
  const backIconColor = isHomeTab ? '#FFFFFF' : '#0F172A';

  // Extract first name for greeting
  const firstName = childName.split(' ')[0] || childName;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 6, paddingBottom: 8 },
      ]}
    >
      {/* Left: back button (stacked) or avatar (tab screens) */}
      <View style={styles.left}>
        {mode === 'stacked' ? (
          <Pressable
            onPress={onBackPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.backButton, { backgroundColor: backBg }]}
          >
            <Papicons name="ChevronLeft" size={22} color={backIconColor} />
          </Pressable>
        ) : (
          <ChildAvatarButton
            childName={childName}
            childPhotoUrl={childPhotoUrl}
            onPress={onBurgerPress}
          />
        )}
      </View>

      {/* Center: greeting (all tab screens) or stacked title */}
      <View style={styles.center}>
        {mode === 'stacked' && title ? (
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
        ) : mode !== 'stacked' ? (
          <Text style={[styles.greeting, { color: textColor }]} numberOfLines={1}>
            Bonjour, {firstName} {'\u{1F44B}'}
          </Text>
        ) : null}
      </View>

      {/* Right: always Aria button */}
      <View style={styles.right}>
        <AriaButton onPress={onAriaPress} />
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
  left: {
    width: 50,
    alignItems: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  right: {
    width: 50,
    alignItems: 'flex-end',
  },
  greeting: {
    fontFamily: FontFamily.sansBold,
    fontSize: 18,
  },
  title: {
    fontFamily: FontFamily.sansBold,
    fontSize: 17,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarInitials: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: FontFamily.sansBold,
  },
  burgerBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 0,
  },
});
