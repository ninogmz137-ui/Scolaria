/**
 * FloatingTabBar — Premium floating white pill tab bar.
 *
 * 4 tabs: Accueil | Notes | Agenda | Messagerie
 * Active: filled icon #1A1A1A + semibold label.
 * Inactive: outlined icon #94A3B8 + regular label.
 * Badge on Messagerie for unread count.
 */

import { View, Text, StyleSheet, Platform } from 'react-native';
import { Pressable } from './ui';
import { Home, TrendingUp, Calendar, MessageCircle } from 'lucide-react-native';
import { FontFamily } from '../hooks/useSolariaFonts';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// ─── Tab bar height for padding calculations ────────────

/** Total height the floating tab bar occupies (bar 64 + bottom margin 20 + extra) */
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

const ACTIVE_COLOR = '#1A1A1A';
const INACTIVE_COLOR = '#94A3B8';

// ─── Component ──────────────────────────────────────────

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.pill}>
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            (options.tabBarLabel as string) ?? options.title ?? route.name;
          const isFocused = state.index === index;
          const IconComponent = TAB_ICONS[route.name] ?? Home;

          // Active = thicker stroke, inactive = thinner
          const iconColor = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;
          const iconStrokeWidth = isFocused ? 2.5 : 1.5;

          // Badge on Messagerie
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
              style={styles.tab}
            >
              {/* Icon + badge */}
              <View style={{ position: 'relative' }}>
                <IconComponent
                  size={24}
                  color={iconColor}
                  strokeWidth={iconStrokeWidth}
                />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  isFocused ? styles.labelActive : styles.labelInactive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    height: 64,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
    }),
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 3,
  },
  labelActive: {
    fontSize: 10,
    fontFamily: FontFamily.sansSemiBold,
    color: '#1A1A1A',
  },
  labelInactive: {
    fontSize: 10,
    fontFamily: FontFamily.sansRegular,
    color: '#94A3B8',
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
