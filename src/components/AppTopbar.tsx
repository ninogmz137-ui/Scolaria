/**
 * AppTopbar — Universal topbar with three rendering modes.
 *
 * Mode 1 (Home): Avatar → "Bonjour, {prénom} 👋" → 🎨 + ⚙️ glass buttons
 * Mode 2 (Main tabs): Avatar → empty → contextual icon
 * Mode 3 (Stacked screens): ← back → title → empty
 *
 * No logo, no notification bell, no child pill.
 */

import { View, Text, StyleSheet, Platform } from 'react-native';
import { Pressable } from './ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Papicons } from '@getpapillon/papicons';
import ChildAvatar from './ChildAvatar';

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
  /** Parent's first name for greeting (mode: home) */
  parentName?: string;
  /** Child avatar props */
  childName?: string;
  childEmoji?: string;
  childPhotoUri?: string;
  accentColor?: string;
  /** 🎨 customize button press (mode: home) */
  onCustomizePress?: () => void;
  /** ⚙️ settings button press (mode: home) */
  onSettingsPress?: () => void;
  /** Right contextual icon (mode: main) */
  contextualIcon?: string;
  onContextualPress?: () => void;
}

// ─── Glass round button ─────────────────────────────────

function GlassButton({
  icon,
  onPress,
}: {
  icon: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <View style={styles.glassButton}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={15} tint="light" style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.glassButtonOverlay} />
        <Text style={styles.glassButtonIcon}>{icon}</Text>
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
  onCustomizePress,
  onSettingsPress,
  contextualIcon,
  onContextualPress,
}: Props) {
  const insets = useSafeAreaInsets();

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
            style={styles.backButton}
          >
            <Papicons name="ChevronLeft" size={22} color="#FFFFFF" />
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
          <Text style={styles.greeting} numberOfLines={1}>
            Bonjour, {parentName} 👋
          </Text>
        ) : mode === 'stacked' && title ? (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>

      {/* Right section */}
      <View style={styles.right}>
        {mode === 'home' ? (
          <View style={styles.rightButtons}>
            <GlassButton icon="🎨" onPress={onCustomizePress} />
            <GlassButton icon="⚙️" onPress={onSettingsPress} />
          </View>
        ) : mode === 'main' && contextualIcon ? (
          <GlassButton icon={contextualIcon} onPress={onContextualPress} />
        ) : null}
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
    width: 90,
    alignItems: 'flex-end',
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  glassButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    ...Platform.select({
      android: { backgroundColor: 'rgba(255,255,255,0.2)' },
    }),
  },
  glassButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  glassButtonIcon: {
    fontSize: 18,
  },
});
