/**
 * FloatingTabBar — Premium floating glass pill tab bar.
 *
 * Mode-aware: dark bg gets dark glass, light bg gets frosted white.
 * Active tab: accent pill at 15% opacity + accent label.
 * Aria icon always has violet→cyan gradient.
 * Spring animation on tab switch.
 */

import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { Pressable } from './ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Papicons } from '@getpapillon/papicons';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// ─── Icon mapping ───────────────────────────────────────

const TAB_PAPICONS: Record<string, string> = {
  Accueil: 'Home',
  Notes: 'Grades',
  Aria: 'Sparkles',
  Agenda: 'Calendar',
};

// ─── Tab bar height for padding calculations ────────────

/** Total height the floating tab bar occupies (bar 64 + bottom margin ~20 + safe area) */
export const FLOATING_TAB_BAR_HEIGHT = 100;

// ─── Component ──────────────────────────────────────────

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useChildTheme();
  const isDark = theme.isDarkBg;

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

  // Mode-aware colors
  const barBg = isDark ? 'rgba(15, 25, 35, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const barBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8';
  const blurTint = isDark ? 'dark' : 'light';

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
          !isDark && styles.barShadow,
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
            const label = options.tabBarLabel as string ?? options.title ?? route.name;
            const isFocused = state.index === index;
            const iconName = TAB_PAPICONS[route.name] || 'Home';
            const isAria = route.name === 'Aria';

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

            // Aria always has gradient icon
            const iconColor = isFocused ? theme.accent : inactiveColor;

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
                  isFocused && [
                    styles.tabActive,
                    { backgroundColor: theme.accent + '26' }, // 15% opacity
                  ],
                ]}
              >
                {isAria ? (
                  <MaskedView
                    maskElement={
                      <Papicons name={iconName} size={24} color="#000" />
                    }
                  >
                    <LinearGradient
                      colors={['#6366F1', '#22D3EE']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ width: 24, height: 24 }}
                    />
                  </MaskedView>
                ) : (
                  <Papicons
                    name={iconName}
                    size={24}
                    color={iconColor}
                  />
                )}
                {isFocused && (
                  <Text style={[styles.tabLabel, { color: theme.accent }]}>
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
    alignItems: 'center',
  },
  barOuter: {
    width: '100%',
    height: 64,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 0.5,
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
});
