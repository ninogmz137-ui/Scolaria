/**
 * FloatingTabBar — Floating glass pill tab bar.
 *
 * Not attached to bottom. Floating with glass blur background.
 * Active tab: pill with child profile color, white icon + label.
 * Inactive: gray icon + label.
 * Uses Papicons for tab icons.
 */

import { View, Text, StyleSheet, Platform } from 'react-native';
import { Pressable } from './ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Papicons } from '@getpapillon/papicons';
import { useChildTheme } from '../contexts/ChildThemeContext';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// ─── Icon mapping ───────────────────────────────────────

const TAB_PAPICONS: Record<string, string> = {
  Accueil: 'Home',
  Notes: 'Grades',
  Aria: 'Sparkles',
  Agenda: 'Calendar',
};

// ─── Tab bar height for padding calculations ────────────

/** Total height the floating tab bar occupies (bar + bottom margin) */
export const FLOATING_TAB_BAR_HEIGHT = 80;

// ─── Component ──────────────────────────────────────────

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useChildTheme();

  return (
    <View
      style={[
        styles.container,
        { bottom: Math.max(insets.bottom, 12) },
      ]}
    >
      {/* Glass background */}
      <View style={styles.barOuter}>
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={25}
            tint="light"
            style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            experimentalBlurMethod="dimezisBlurView"
          />
        )}
        <View style={styles.barOverlay} />

        {/* Tabs */}
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel as string ?? options.title ?? route.name;
            const isFocused = state.index === index;
            const iconName = TAB_PAPICONS[route.name] || 'Home';

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
                  isFocused && [styles.tabActive, { backgroundColor: theme.accent }],
                ]}
              >
                <Papicons
                  name={iconName}
                  size={20}
                  color={isFocused ? '#FFFFFF' : '#94A3B8'}
                />
                {isFocused && (
                  <Text style={styles.tabLabel}>{label}</Text>
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
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.4)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
        backgroundColor: 'rgba(255,255,255,0.88)',
      },
    }),
  },
  barOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.7)' : undefined,
    borderRadius: 28,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  tabActive: {
    paddingHorizontal: 16,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
