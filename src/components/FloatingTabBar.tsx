/**
 * FloatingTabBar — 3-element floating navigation bar.
 *
 * Layout: [Avatar 48px] [Central Pill — Notes | Agenda | Messagerie] [Aria 48px]
 *
 * Avatar (left):
 *   - Glass circle, shows child emoji / photo / initials
 *   - School-level border color (maternelle / primaire / college)
 *   - TAP: if on Accueil tab → open child switcher; else → navigate to Accueil
 *
 * Central pill (flex 1):
 *   - Glass morphism, 3 tabs (routes index 1-3, Accueil skipped)
 *   - Active: dark icon + semibold label; Inactive: muted + regular
 *   - Badge on Messagerie for unread count
 *
 * Aria (right):
 *   - Glass circle with 32px LinearGradient inner circle + sparkle icon
 *   - TAP → AriaScreen
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Pressable } from './ui';
import { TrendingUp, Calendar, MessageCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontFamily } from '../hooks/useSolariaFonts';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { getSchoolModeFromBirthDate } from '../contexts/SchoolModeContext';
import AriaSparkleIcon from './AriaSparkleIcon';

// ─── Tab bar height export ───────────────────────────────

/** Total height the floating tab bar occupies (bar 64 + bottom margin + safe area) */
export const FLOATING_TAB_BAR_HEIGHT = 100;

// ─── Constants ──────────────────────────────────────────

const MESSAGERIE_UNREAD = 3;
const ACTIVE_COLOR = '#1A1A1A';
const INACTIVE_COLOR = '#94A3B8';

// School-level border colors for the avatar circle
const SCHOOL_LEVEL_BORDER: Record<string, string> = {
  maternelle: '#FF8C42',
  primaire: '#22D3EE',
  lycee: '#7C3AED',
};

// Glass style shared by avatar, pill, and Aria circles
const GLASS_BG = 'rgba(255,255,255,0.75)';
const GLASS_BORDER = 'rgba(255,255,255,0.5)';

// ─── Helpers ────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Tab icon map (only for the 3 visible tabs) ─────────

type LucideIcon = typeof TrendingUp;

const TAB_ICONS: Record<string, LucideIcon> = {
  Notes: TrendingUp,
  Agenda: Calendar,
  MessagerieTab: MessageCircle,
};

const TAB_LABELS: Record<string, string> = {
  Notes: 'Notes',
  Agenda: 'Agenda',
  MessagerieTab: 'Messages',
};

// ─── Child Switcher Sheet ────────────────────────────────

interface ChildSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

function ChildSwitcherSheet({ visible, onClose }: ChildSwitcherProps) {
  const { children, selectedChildId, selectChild } = useActiveChild();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.sheetOverlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.sheetCard, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Changer d'enfant</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {children.map((child) => {
            const isSelected = child.id === selectedChildId;
            const isEmoji = child.avatarType === 'emoji';
            const hasPhoto = child.avatarType === 'photo' && child.avatarPhotoUri;

            return (
              <TouchableOpacity
                key={child.id}
                style={[
                  styles.sheetChildRow,
                  isSelected && styles.sheetChildRowActive,
                ]}
                onPress={() => {
                  selectChild(child.id);
                  onClose();
                }}
              >
                {/* Avatar */}
                <View style={[styles.sheetAvatar, isSelected && styles.sheetAvatarActive]}>
                  {hasPhoto ? (
                    <Image
                      source={{ uri: child.avatarPhotoUri! }}
                      style={styles.sheetAvatarImage}
                    />
                  ) : isEmoji && child.avatarEmoji ? (
                    <Text style={{ fontSize: 22 }}>{child.avatarEmoji}</Text>
                  ) : (
                    <Text style={styles.sheetAvatarInitials}>
                      {getInitials(child.name)}
                    </Text>
                  )}
                </View>

                {/* Name + classe */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetChildName}>{child.name.split(' ')[0]}</Text>
                  <Text style={styles.sheetChildClasse} numberOfLines={1}>
                    {child.classe}
                  </Text>
                </View>

                {/* Selected indicator */}
                {isSelected && (
                  <View style={styles.sheetSelectedDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Component ─────────────────────────────────────

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { selectedChild } = useActiveChild();
  const [childSwitcherVisible, setChildSwitcherVisible] = useState(false);

  // Determine school-level border color for avatar
  const schoolMode = selectedChild.birthDate
    ? getSchoolModeFromBirthDate(selectedChild.birthDate)
    : 'primaire';
  const levelBorderColor = SCHOOL_LEVEL_BORDER[schoolMode] ?? GLASS_BORDER;

  // Avatar content
  const isEmoji = selectedChild.avatarType === 'emoji';
  const hasPhoto = selectedChild.avatarType === 'photo' && selectedChild.avatarPhotoUri;
  const firstName = selectedChild.name.split(' ')[0] || selectedChild.name;

  // Avatar tap: if already on Accueil (index 0) → open child switcher; else → navigate to Accueil
  const handleAvatarPress = () => {
    if (state.index === 0) {
      setChildSwitcherVisible(true);
    } else {
      navigation.navigate('Accueil');
    }
  };

  // Aria tap → navigate to AriaScreen (via ariaNavRef in TabNavigator)
  // We emit a tab-level navigate to Accueil/AriaScreen
  const handleAriaPress = () => {
    navigation.navigate('Accueil', { screen: 'AriaScreen' } as any);
  };

  // Bottom offset: safe area + spacing
  const bottomOffset = insets.bottom > 0 ? insets.bottom + 8 : 16;

  return (
    <>
      <View
        style={[
          styles.container,
          { bottom: bottomOffset },
        ]}
      >
        {/* ── Avatar circle (left) ── */}
        <Pressable onPress={handleAvatarPress} style={[styles.circle, { borderColor: levelBorderColor }]}>
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

        {/* ── Central pill (3 tabs: Notes, Agenda, Messagerie) ── */}
        <View style={styles.pill}>
          {state.routes.map((route, index) => {
            // Skip Accueil (index 0) — navigated via avatar
            if (index === 0) return null;

            const isFocused = state.index === index;
            const IconComponent = TAB_ICONS[route.name] ?? TrendingUp;
            const label = TAB_LABELS[route.name] ?? route.name;

            const iconColor = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;
            const iconStrokeWidth = isFocused ? 2.5 : 1.5;

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
                accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.pillTab}
              >
                {/* Icon + badge */}
                <View style={{ position: 'relative' }}>
                  <IconComponent
                    size={22}
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
                  style={isFocused ? styles.labelActive : styles.labelInactive}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Aria circle (right) ── */}
        <Pressable onPress={handleAriaPress} style={styles.circle}>
          <AriaSparkleIcon size={28} noGradient gradientSparkles />
        </Pressable>
      </View>

      {/* Child switcher bottom sheet */}
      <ChildSwitcherSheet
        visible={childSwitcherVisible}
        onClose={() => setChildSwitcherVisible(false)}
      />
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
    // No elevation on Android (design spec)
    ...Platform.select({
      android: { elevation: 0 },
    }),
  },

  // Shared glass circle (avatar + Aria)
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 0 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
    }),
  },
  circleImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  circleInitials: {
    color: '#0F172A',
    fontSize: 15,
    fontFamily: FontFamily.sansBold,
  },

  // Central pill
  pill: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 0 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
    }),
  },
  pillTab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },

  // Labels
  labelActive: {
    fontSize: 9,
    fontFamily: FontFamily.sansSemiBold,
    color: ACTIVE_COLOR,
  },
  labelInactive: {
    fontSize: 9,
    fontFamily: FontFamily.sansRegular,
    color: INACTIVE_COLOR,
  },

  // Unread badge
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: FontFamily.sansBold,
  },

  // ── Child switcher sheet ──────────────────────────────
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '65%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 16,
  },
  sheetChildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
  },
  sheetChildRowActive: {
    backgroundColor: '#F0F4FF',
  },
  sheetAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheetAvatarActive: {
    backgroundColor: '#DBEAFE',
  },
  sheetAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  sheetAvatarInitials: {
    color: '#64748B',
    fontSize: 14,
    fontFamily: FontFamily.sansBold,
  },
  sheetChildName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  sheetChildClasse: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  sheetSelectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
});
