/**
 * BurgerMenu — Left drawer overlay menu.
 *
 * Opens over content with dark overlay, ~75% width.
 * Sections: Mon Enfant, Famille, Paramètres.
 *
 * Migrated to Gluestack UI v3 + NativeWind.
 */

import { useRef, useEffect } from 'react';
import {
  Modal,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from './ui';
import { Ionicons } from '@expo/vector-icons';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 340);

// ─── Menu item type ──────────────────────────────────────

interface MenuItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: number;
  color?: string;
}

// ─── Props ───────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  unsignedMotsCount?: number;
  familyName?: string;
  isPremium?: boolean;
  onChangeRole?: () => void;
  onLogout?: () => void;
}

// ─── Section renderer ────────────────────────────────────

function MenuSection({
  title,
  items,
  theme,
  onNav,
}: {
  title: string;
  items: MenuItem[];
  theme: any;
  onNav: (screen: string) => void;
}) {
  return (
    <VStack className="px-3 py-2">
      <Text
        className="text-[11px] font-bold tracking-widest uppercase px-2 py-2"
        style={{ color: theme.textSecondary }}
      >
        {title}
      </Text>
      {items.map((item) => (
        <Pressable
          key={item.key}
          className="flex-row items-center gap-3.5 px-3 py-[13px] rounded-xl"
          onPress={() => onNav(item.key)}
        >
          <Ionicons name={item.icon} size={20} color={theme.textSecondary} />
          <Text
            className="text-sm font-semibold flex-1"
            style={{ color: theme.textPrimary }}
          >
            {item.label}
          </Text>
          {item.badge != null && item.badge > 0 && (
            <Box className="min-w-[20px] h-5 rounded-full bg-red-400 justify-center items-center px-[5px]">
              <Text className="text-[10px] font-extrabold text-white">
                {item.badge}
              </Text>
            </Box>
          )}
        </Pressable>
      ))}
    </VStack>
  );
}

// ─── Component ───────────────────────────────────────────

export default function BurgerMenu({
  visible,
  onClose,
  onNavigate,
  unsignedMotsCount = 1,
  familyName = 'Famille Moreau',
  isPremium = true,
  onChangeRole,
  onLogout,
}: Props) {
  const { theme } = useChildTheme();
  const { selectedChild } = useActiveChild();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleNav = (screen: string) => {
    onClose();
    // Small delay so the drawer closes before navigating
    setTimeout(() => onNavigate(screen), 150);
  };

  const monEnfantItems: MenuItem[] = [
    { key: 'NotesResults', icon: 'bar-chart', label: 'Notes & Résultats' },
    { key: 'CahierLiaison', icon: 'book', label: 'Cahier de liaison', badge: unsignedMotsCount > 0 ? unsignedMotsCount : undefined },
    { key: 'Absences', icon: 'medical', label: 'Absences' },
    { key: 'BienEtre', icon: 'heart', label: 'Bien-être' },
    { key: 'ProfilBadges', icon: 'trophy', label: 'Profil & Badges' },
    { key: 'Archives', icon: 'folder', label: 'Archives' },
  ];

  const familleItems: MenuItem[] = [
    { key: 'ChangerEnfant', icon: 'people', label: 'Changer d\'enfant' },
    { key: 'Permissions', icon: 'lock-closed', label: 'Permissions d\'accès' },
  ];

  const parametresItems: MenuItem[] = [
    { key: 'Notifications', icon: 'notifications', label: 'Notifications' },
    { key: 'RGPD', icon: 'shield-checkmark', label: 'RGPD & Confidentialité' },
    { key: 'APropos', icon: 'information-circle', label: 'À propos · Charte Éthique' },
  ];

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Dark overlay */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: overlayAnim }]}>
        <Pressable className="absolute inset-0" onPress={onClose} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: DRAWER_WIDTH,
            backgroundColor: theme.bg,
            borderRightWidth: 1,
            borderRightColor: theme.cardBorder,
            paddingTop: Platform.OS === 'ios' ? 60 : 40,
            transform: [{ translateX: slideAnim }],
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.2, shadowRadius: 16 },
              android: { elevation: 16 },
              default: { shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.2, shadowRadius: 16 },
            }),
          },
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Header */}
          <VStack
            className="px-5 pb-4 mb-2"
            style={{ borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}
          >
            <Text
              className="text-xl font-extrabold"
              style={{ color: theme.textPrimary }}
            >
              {familyName}
            </Text>
            {isPremium && (
              <HStack
                className="items-center gap-1 px-2 py-1 rounded-lg self-start mt-2"
                style={{ backgroundColor: theme.accent + '20' }}
              >
                <Ionicons name="diamond" size={12} color={theme.accent} />
                <Text
                  className="text-[11px] font-bold"
                  style={{ color: theme.accent }}
                >
                  Premium
                </Text>
              </HStack>
            )}
          </VStack>

          {/* Section: Mon Enfant */}
          <MenuSection title="MON ENFANT" items={monEnfantItems} theme={theme} onNav={handleNav} />

          {/* Section: Famille */}
          <MenuSection title="FAMILLE" items={familleItems} theme={theme} onNav={handleNav} />

          {/* Section: Paramètres */}
          <MenuSection title="PARAMÈTRES" items={parametresItems} theme={theme} onNav={handleNav} />

          {/* Bottom actions */}
          <VStack
            className="px-3 pt-2 mt-2"
            style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder }}
          >
            <Pressable
              className="flex-row items-center gap-3.5 px-3 py-[13px] rounded-xl"
              onPress={onChangeRole}
            >
              <Ionicons name="swap-horizontal" size={20} color={theme.textSecondary} />
              <Text
                className="text-sm font-semibold flex-1"
                style={{ color: theme.textPrimary }}
              >
                Changer de rôle
              </Text>
            </Pressable>
            <Pressable
              className="flex-row items-center gap-3.5 px-3 py-[13px] rounded-xl"
              onPress={onLogout}
            >
              <Ionicons name="log-out" size={20} color="#F87171" />
              <Text className="text-sm font-semibold flex-1 text-red-400">
                Se déconnecter
              </Text>
            </Pressable>
          </VStack>

          <Box className="h-10" />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
