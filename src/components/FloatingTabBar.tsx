/**
 * FloatingTabBar — 3-element floating navigation bar.
 *
 * Layout: [Avatar 50px] [Central Pill — 4 icons] [Aria 50px]
 *
 * Avatar (left):
 *   - Glass circle, shows child emoji / photo / initials
 *   - Neutral border #E2E8F0 — no school-level color
 *   - TAP → compact popover appears above the avatar
 *
 * Central pill (flex 1):
 *   - Glass morphism, 4 tabs (Accueil, Notes, Agenda, Messagerie)
 *   - Active: light grey circular bg (#F0F0F2) + dark icon
 *   - Inactive: no bg + muted icon
 *   - Red dot badge on MessageCircle if unread messages
 *
 * Aria (right):
 *   - Glass circle, same style as avatar and pill
 *   - AriaSparkleIcon noGradient gradientSparkles
 *   - TAP → AriaScreen
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Pressable } from './ui';
import { Home, TrendingUp, Calendar, MessageCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontFamily } from '../hooks/useSolariaFonts';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useActiveChild } from '../contexts/ActiveChildContext';
import AriaSparkleIcon from './AriaSparkleIcon';

// ─── Tab bar height export ───────────────────────────────

/** Total height the floating tab bar occupies (bar 64 + bottom margin + safe area) */
export const FLOATING_TAB_BAR_HEIGHT = 100;

// ─── Constants ──────────────────────────────────────────

const MESSAGERIE_UNREAD = 3;
const ACTIVE_ICON_COLOR = '#0F172A';
const INACTIVE_ICON_COLOR = '#94A3B8';
const NEUTRAL_BORDER = '#E2E8F0';

// Glass style shared by avatar, pill, and Aria circles
const GLASS_BG = 'rgba(255,255,255,0.80)';
const GLASS_BORDER = 'rgba(255,255,255,0.70)';

const GLASS_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 0 },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
});

// ─── Helpers ────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Tab icon map (all 4 tabs) ───────────────────────────

type LucideIcon = typeof Home;

const TAB_ICONS: Record<string, LucideIcon> = {
  Accueil: Home,
  Notes: TrendingUp,
  Agenda: Calendar,
  MessagerieTab: MessageCircle,
};

// ─── Child Popover ───────────────────────────────────────

interface ChildPopoverProps {
  visible: boolean;
  onClose: () => void;
  bottomOffset: number;
}

function ChildPopover({ visible, onClose, bottomOffset }: ChildPopoverProps) {
  const { children, selectedChildId, selectChild } = useActiveChild();

  // Animation values
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);
  const scale = useSharedValue(0.96);

  // Drive animation based on visible prop
  if (visible) {
    opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
    translateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
    scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
  } else {
    opacity.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.ease) });
    translateY.value = withTiming(8, { duration: 150, easing: Easing.in(Easing.ease) });
    scale.value = withTiming(0.96, { duration: 150, easing: Easing.in(Easing.ease) });
  }

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!visible) return null;

  // Popover sits above the tab bar: tab bar bottom + tab bar height (50px circle) + 8px gap
  const popoverBottom = bottomOffset + 50 + 8;

  return (
    <>
      {/* Full-screen transparent overlay to catch outside taps */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel="Fermer"
      />

      {/* Popover card */}
      <Animated.View
        style={[
          styles.popover,
          { bottom: popoverBottom },
          animatedStyle,
        ]}
      >
        {children.map((child) => {
          const isActive = child.id === selectedChildId;
          const isEmoji = child.avatarType === 'emoji';
          const hasPhoto = child.avatarType === 'photo' && child.avatarPhotoUri;

          return (
            <TouchableOpacity
              key={child.id}
              style={[styles.popoverItem, isActive && styles.popoverItemActive]}
              onPress={() => {
                selectChild(child.id);
                onClose();
              }}
              activeOpacity={0.7}
            >
              {/* Emoji / photo / initials circle */}
              <View style={styles.popoverAvatar}>
                {hasPhoto ? (
                  <Image
                    source={{ uri: child.avatarPhotoUri! }}
                    style={styles.popoverAvatarImage}
                  />
                ) : isEmoji && child.avatarEmoji ? (
                  <Text style={{ fontSize: 16 }}>{child.avatarEmoji}</Text>
                ) : (
                  <Text style={styles.popoverAvatarInitials}>
                    {getInitials(child.name)}
                  </Text>
                )}
              </View>

              {/* Name + classe */}
              <View style={{ flex: 1 }}>
                <Text style={styles.popoverChildName} numberOfLines={1}>
                  {child.name.split(' ')[0]}
                </Text>
                <Text style={styles.popoverChildClasse} numberOfLines={1}>
                  {child.classe}
                </Text>
              </View>

              {/* Active checkmark */}
              {isActive && (
                <Text style={styles.popoverCheckmark}>✓</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </>
  );
}

// ─── Main Component ─────────────────────────────────────

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { selectedChild } = useActiveChild();
  const [popoverVisible, setPopoverVisible] = useState(false);

  // Avatar content
  const isEmoji = selectedChild.avatarType === 'emoji';
  const hasPhoto = selectedChild.avatarType === 'photo' && selectedChild.avatarPhotoUri;

  // Avatar tap → toggle popover
  const handleAvatarPress = () => {
    setPopoverVisible((prev) => !prev);
  };

  // Aria tap → navigate to AriaScreen
  const handleAriaPress = () => {
    navigation.navigate('Accueil', { screen: 'AriaScreen' } as any);
  };

  // Bottom offset: safe area + spacing
  const bottomOffset = insets.bottom > 0 ? insets.bottom + 8 : 16;

  return (
    <>
      {/* Child popover — rendered outside the tab bar container so it overlays above */}
      <ChildPopover
        visible={popoverVisible}
        onClose={() => setPopoverVisible(false)}
        bottomOffset={bottomOffset}
      />

      <View style={[styles.container, { bottom: bottomOffset }]}>

        {/* ── Avatar circle (left) ── */}
        <Pressable
          onPress={handleAvatarPress}
          style={styles.circle}
          accessibilityRole="button"
          accessibilityLabel="Changer d'enfant"
        >
          {hasPhoto ? (
            <Image
              source={{ uri: selectedChild.avatarPhotoUri! }}
              style={styles.circleImage}
            />
          ) : isEmoji && selectedChild.avatarEmoji ? (
            <Text style={{ fontSize: 22 }}>{selectedChild.avatarEmoji}</Text>
          ) : (
            <Text style={styles.circleInitials}>
              {getInitials(selectedChild.name)}
            </Text>
          )}
        </Pressable>

        {/* ── Central pill (4 tabs) ── */}
        <View style={styles.pill}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const IconComponent = TAB_ICONS[route.name] ?? Home;
            const isMessagerieTab = route.name === 'MessagerieTab';
            const hasUnread = isMessagerieTab && MESSAGERIE_UNREAD > 0;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.pillTab}
              >
                <View style={[styles.iconWrapper, isFocused && styles.iconWrapperActive]}>
                  <IconComponent
                    size={20}
                    color={isFocused ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR}
                    strokeWidth={isFocused ? 2.5 : 1.8}
                  />
                  {hasUnread && <View style={styles.badgeDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Aria circle (right) ── */}
        <Pressable
          onPress={handleAriaPress}
          style={styles.circle}
          accessibilityRole="button"
          accessibilityLabel="Aria"
        >
          <AriaSparkleIcon size={28} noGradient gradientSparkles />
        </Pressable>
      </View>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      android: { elevation: 0 },
    }),
  },

  // Shared glass circle (avatar + Aria)
  circle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: NEUTRAL_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...GLASS_SHADOW,
  },
  circleImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  circleInitials: {
    color: '#0F172A',
    fontSize: 15,
    fontFamily: FontFamily.sansBold,
  },

  // Central pill
  pill: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: NEUTRAL_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 4,
    ...GLASS_SHADOW,
  },
  pillTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },

  // Icon wrapper — active gets light grey circular bg
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: '#F0F0F2',
  },

  // Unread dot badge (8px red dot, top-right of icon)
  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: GLASS_BG,
  },

  // ── Child popover ─────────────────────────────────────
  popover: {
    position: 'absolute',
    left: 12,
    minWidth: 210,
    borderRadius: 16,
    padding: 6,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 32,
      },
      android: { elevation: 0 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 32,
      },
    }),
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  popoverItemActive: {
    backgroundColor: 'rgba(99,102,241,0.10)',
  },
  popoverAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  popoverAvatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  popoverAvatarInitials: {
    color: '#6366F1',
    fontSize: 11,
    fontFamily: FontFamily.sansBold,
  },
  popoverChildName: {
    fontSize: 13,
    fontFamily: FontFamily.sansSemiBold,
    color: '#0F172A',
  },
  popoverChildClasse: {
    fontSize: 10,
    fontFamily: FontFamily.sansRegular,
    color: '#94A3B8',
    marginTop: 1,
  },
  popoverCheckmark: {
    fontSize: 13,
    color: '#6366F1',
    fontFamily: FontFamily.sansSemiBold,
  },
});
