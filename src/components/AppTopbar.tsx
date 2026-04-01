/**
 * AppTopbar — Universal floating topbar (zIndex 10).
 *
 * Mode 1 (Home): Avatar → "Bonjour, {prénom} 👋" → ✦ Aria
 * Mode 2 (Main tabs): Avatar → tab title → ✦ Aria
 * Mode 3 (Stacked screens): ← back → title → ✦ Aria
 *
 * Transparent bg: rgba(255,255,255,0.7) light / rgba(15,20,35,0.7) dark.
 * Aria button: 40px circle, violet→cyan gradient ✦ icon, always visible.
 */

import { View, Text, StyleSheet, Platform } from 'react-native';
import { Pressable } from './ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Papicons } from '@getpapillon/papicons';
import ChildAvatar from './ChildAvatar';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { FontFamily } from '../hooks/useSolariaFonts';

// ─── Props ───────────────────────────────────────────────

export type TopbarMode = 'home' | 'main' | 'stacked';

interface Props {
  mode: TopbarMode;
  /** Burger press (modes: home, main) */
  onBurgerPress?: () => void;
  /** Back press (mode: stacked) */
  onBackPress?: () => void;
  /** Page title (mode: stacked or main) */
  title?: string;
  /** Child's first name for greeting (mode: home) */
  parentName?: string;
  /** Child avatar props */
  childName?: string;
  childEmoji?: string;
  childPhotoUri?: string;
  accentColor?: string;
  /** ✦ Aria button press */
  onAriaPress?: () => void;
}

// ─── Aria gradient button ───────────────────────────────

function AriaButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <View style={styles.ariaButton}>
        <LinearGradient
          colors={['#6366F1', '#22D3EE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <MaskedView
          maskElement={
            <Papicons name="Sparkles" size={20} color="#000" />
          }
        >
          <LinearGradient
            colors={['#FFFFFF', '#FFFFFF']}
            style={{ width: 20, height: 20 }}
          />
        </MaskedView>
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
  parentName,
  childName,
  childEmoji,
  childPhotoUri,
  accentColor = '#6366F1',
  onAriaPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useChildTheme();
  const isDark = theme.isDarkBg;

  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const textShadow = isDark
    ? { textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }
    : { textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0 };
  const backBg = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';
  const backIconColor = isDark ? '#FFFFFF' : '#0F172A';

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 6, paddingBottom: 8 },
      ]}
    >
      {/* Left section */}
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
          <Pressable
            onPress={onBurgerPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChildAvatar
              name={childName || '?'}
              emoji={childEmoji}
              photoUri={childPhotoUri}
              accentColor={accentColor}
              size={38}
              showBurgerBadge
            />
          </Pressable>
        )}
      </View>

      {/* Center section */}
      <View style={styles.center}>
        {mode === 'home' && parentName ? (
          <Text style={[styles.greeting, { color: textColor, ...textShadow }]} numberOfLines={1}>
            Bonjour, {parentName} 👋
          </Text>
        ) : mode === 'stacked' && title ? (
          <Text style={[styles.title, { color: textColor, ...textShadow }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>

      {/* Right section — always Aria button */}
      <View style={styles.right}>
        <AriaButton onPress={onAriaPress} />
      </View>
    </View>
  );
}

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
    alignItems: 'center',
  },
  right: {
    width: 50,
    alignItems: 'flex-end',
  },
  greeting: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
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
  ariaButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});
