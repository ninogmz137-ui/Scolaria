/**
 * FloatingTabBar — 3-element floating navigation bar.
 *
 * Layout: [Avatar 50px] [Central Pill — 4 icons] [Aria 50px]
 *
 * Avatar (left):
 *   - Glass circle, shows child emoji / photo / initials
 *   - Neutral border #E2E8F0 — no school-level color
 *   - TAP → always opens child switcher bottom sheet
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
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
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

  // Avatar content
  const isEmoji = selectedChild.avatarType === 'emoji';
  const hasPhoto = selectedChild.avatarType === 'photo' && selectedChild.avatarPhotoUri;

  // Avatar tap → always open child switcher
  const handleAvatarPress = () => {
    setChildSwitcherVisible(true);
  };

  // Aria tap → navigate to AriaScreen
  const handleAriaPress = () => {
    navigation.navigate('Accueil', { screen: 'AriaScreen' } as any);
  };

  // Bottom offset: safe area + spacing
  const bottomOffset = insets.bottom > 0 ? insets.bottom + 8 : 16;

  return (
    <>
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
