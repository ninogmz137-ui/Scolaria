/**
 * SimpleFloatingTabBar — generic floating pill tab bar for Teacher / Élève.
 *
 * Layout: [pill — N icons with labels on active tab]
 *
 * - Glass morphism pill floating above bottom safe area
 * - Active tab: dark icon + label + subtle bg
 * - Inactive tab: muted icon, no label
 * - Uses Papicons (@getpapillon/papicons) for all icons
 * - Background: SCREEN_BACKGROUND (#F2F1EE) — COMPONENTS.md
 */

import React, { type JSX } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { Pressable } from './ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontFamily } from '../hooks/useSolariaFonts';
import { SCREEN_BACKGROUND } from '../constants/colors';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// ─── Constants ──────────────────────────────────────────

const ACTIVE_ICON_COLOR = '#0F172A';
const INACTIVE_ICON_COLOR = '#94A3B8';
const GLASS_BG = SCREEN_BACKGROUND;
const GLASS_BORDER = 'rgba(15,23,42,0.07)';

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

// ─── Type for icon factory ─────────────────────────────

export type SimpleTabIconMap = Record<string, (props: { size: number; color: string }) => JSX.Element>;

interface SimpleFloatingTabBarProps extends BottomTabBarProps {
  icons: SimpleTabIconMap;
}

export default function SimpleFloatingTabBar({
  state,
  descriptors,
  navigation,
  icons,
}: SimpleFloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = insets.bottom > 0 ? insets.bottom + 8 : 16;

  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const IconComponent = icons[route.name];
          if (!IconComponent) return null;

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

          const label =
            descriptors[route.key].options.tabBarLabel ??
            descriptors[route.key].options.title ??
            route.name;
          const labelStr = typeof label === 'string' ? label : route.name;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.pillTab}
            >
              <View style={[styles.iconWrapper, isFocused && styles.iconWrapperActive]}>
                <IconComponent
                  size={24}
                  color={isFocused ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR}
                />
              </View>
              {isFocused && (
                <Text style={styles.label} numberOfLines={1}>
                  {labelStr}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 50,
    alignItems: 'center',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    height: 50,
    borderRadius: 25,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    ...GLASS_SHADOW,
  },
  pillTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    gap: 0,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  label: {
    fontSize: 9,
    fontFamily: FontFamily.sansSemiBold,
    color: ACTIVE_ICON_COLOR,
    marginTop: 1,
  },
});
