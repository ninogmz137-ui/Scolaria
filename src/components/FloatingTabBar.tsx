/**
 * FloatingTabBar — Premium floating glass pill tab bar (zIndex 10).
 *
 * 4 tabs: Accueil | Notes | Agenda | Messagerie
 * Active tab: accent pill at 15% opacity + accent label.
 * Badge support on Messagerie tab for unread message count.
 */

import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { Pressable } from './ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Home, TrendingUp, Calendar, MessageCircle } from 'lucide-react-native';
import { FontFamily } from '../hooks/useSolariaFonts';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// ─── Tab bar height for padding calculations ────────────

/** Total height the floating tab bar occupies (bar 64 + bottom margin ~20 + safe area) */
export const FLOATING_TAB_BAR_HEIGHT = 100;

// ─── Tab icon map ───────────────────────────────────────

type LucideIcon = typeof Home;

const TAB_ICONS: Record<string, LucideIcon> = {
  Accueil: Home,
  Notes: TrendingUp,
  Agenda: Calendar,
  MessagerieTab: MessageCircle,
};

// Hardcoded unread count — will be dynamic later
const MESSAGERIE_UNREAD = 3;

// ─── Component ──────────────────────────────────────────

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Spring animation for active indicator
  const animatedIndex = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(animatedIndex, {
      toValue: state.index,
      damping: 15,
      stiffness: 300,
      mass: 1,
      useNativeDriver: false,
    }).start();
  }, [state.index, animatedIndex]);

  // Unified colors — always light
  const ACCENT = '#374151';
  const barBg = 'rgba(255, 255, 255, 0.55)';
  const barBorder = 'rgba(0,0,0,0.05)';
  const inactiveColor = '#94A3B8';
  const blurTint = 'light';

  return (
    <View
      style={[
        styles.container,
        { bottom: Math.max(insets.bottom, 12) },
      ]}
    >
      <View
        style={[
          styles.barOuter,
          {
            borderColor: barBorder,
            backgroundColor: Platform.OS === 'android' ? barBg : undefined,
          },
          styles.barShadow,
        ]}
      >
        {/* Blur background (iOS only) */}
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={25}
            tint={blurTint}
            style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            experimentalBlurMethod="dimezisBlurView"
          />
        )}
        {/* Color overlay */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: barBg, borderRadius: 28 }]} />

        {/* Tabs */}
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              (options.tabBarLabel as string) ?? options.title ?? route.name;
            const isFocused = state.index === index;
            const IconComponent = TAB_ICONS[route.name] ?? Home;
            const iconColor = isFocused ? ACCENT : inactiveColor;

            // Badge: show on Messagerie tab (index 3) when there are unread messages
            const isMessagerieTab = route.name === 'MessagerieTab';
            const unreadCount = isMessagerieTab ? MESSAGERIE_UNREAD : 0;

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
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                onLongPress={onLongPress}
                style={[
                  styles.tab,
                  isFocused && styles.tabActive,
                ]}
              >
                {/* Icon + badge wrapper */}
                <View style={{ position: 'relative' }}>
                  <IconComponent
                    size={24}
                    color={iconColor}
                    strokeWidth={2}
                  />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>

                {isFocused && (
                  <Text style={[styles.tabLabel, { color: ACCENT }]}>
                    {label}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 10,
    alignItems: 'center',
  },
  barOuter: {
    width: '100%',
    height: 64,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 0,
  },
  barShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }) as any,
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  tabActive: {
    paddingHorizontal: 18,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: FontFamily.sansSemiBold,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: FontFamily.sansBold,
  },
});
