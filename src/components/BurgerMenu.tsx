/**
 * BurgerMenu — Light panel drawer from left (iOS settings style).
 *
 * Structure:
 * 1. Avatar section: large avatar (tappable → ChildSwitcherModal) + name + classe
 * 2. Separator
 * 3. Section principale: 4 items
 * 4. Separator
 * 5. Section basse: 2 items (RGPD, Déconnexion)
 * 6. Footer: version + copyright
 *
 * Background: #F2F2F7 (light, not dark)
 * Width: 80% of screen, max 340px
 */

import { useRef, useEffect } from 'react';
import {
  Modal,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Text,
  Image,
} from 'react-native';
import { Pressable } from './ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  BookOpen,
  Heart,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import { getSchoolModeFromBirthDate } from '../contexts/SchoolModeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.80, 340);

// ─── Props ───────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  onLogout?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Menu items definition ───────────────────────────────

type MenuItemDef = {
  key: string;
  icon: React.ElementType;
  label: string;
  screen?: string;
  action?: string;
  danger?: boolean;
};

const MAIN_ITEMS: MenuItemDef[] = [
  { key: 'profil',    icon: User,     label: 'Profil enfant',  screen: 'ProfilEnfant' },
  { key: 'parcours',  icon: BookOpen, label: 'Mon Parcours',   screen: 'MonParcours' },
  { key: 'ressenti',  icon: Heart,    label: 'Mon Ressenti',   screen: 'BienEtre' },
  { key: 'reglages',  icon: Settings, label: 'Réglages',       screen: 'ReglagesScreen' },
];

const BOTTOM_ITEMS: MenuItemDef[] = [
  { key: 'rgpd',   icon: Shield,  label: 'RGPD & Confidentialité', screen: 'RGPDScreen' },
  { key: 'logout', icon: LogOut,  label: 'Se déconnecter',          action: 'logout', danger: true },
];

// ─── Single menu row ─────────────────────────────────────

function MenuItem({
  item,
  onPress,
}: {
  item: MenuItemDef;
  onPress: (item: MenuItemDef) => void;
}) {
  const IconComponent = item.icon;
  return (
    <Pressable style={styles.menuItem} onPress={() => onPress(item)}>
      <IconComponent size={20} color="#64748B" strokeWidth={2} />
      <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
        {item.label}
      </Text>
      <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
    </Pressable>
  );
}

// ─── Main component ─────────────────────────────────────

export default function BurgerMenu({
  visible,
  onClose,
  onNavigate,
  onLogout,
}: Props) {
  const { selectedChild, selectedChildId, children, selectChild } = useActiveChild();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, overlayAnim]);

  const handleItemPress = (item: MenuItemDef) => {
    if (item.action === 'logout') {
      onClose();
      setTimeout(() => onLogout?.(), 150);
      return;
    }
    if (item.screen) {
      onClose();
      setTimeout(() => onNavigate(item.screen!), 150);
    }
  };

  if (!visible) return null;

  const childPhoto = selectedChild.avatarPhotoUri ?? null;
  const childInitials = getInitials(selectedChild.name);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
        {/* Overlay */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'rgba(0,0,0,0.5)', opacity: overlayAnim },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        </Animated.View>

        {/* Drawer panel */}
        <Animated.View
          style={[
            styles.drawer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── Avatar section ── */}
            <View style={[styles.avatarSection, { paddingTop: insets.top + 20 }]}>
              {/* Tappable avatar with swap badge */}
              <View style={styles.avatarWrapper}>
                <View style={styles.largeAvatarCircle}>
                  {childPhoto ? (
                    <Image
                      source={{ uri: childPhoto }}
                      style={styles.largeAvatarImage}
                    />
                  ) : (
                    <Text style={styles.largeAvatarInitials}>{childInitials}</Text>
                  )}
                </View>
              </View>

              {/* Child name */}
              <Text style={styles.childName}>{selectedChild.name}</Text>

              {/* Classe + école */}
              {selectedChild.classe ? (
                <Text style={styles.childClasse} numberOfLines={1}>
                  {selectedChild.classe}
                </Text>
              ) : null}

              {/* ── Inline child switcher row ── */}
              {children.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingTop: 14 }}
                >
                  {children.map((child) => {
                    const isActive = child.id === selectedChildId;
                    const modeColor = child.birthDate
                      ? (getSchoolModeFromBirthDate(child.birthDate) === 'maternelle' ? '#FF8C42'
                        : getSchoolModeFromBirthDate(child.birthDate) === 'primaire' ? '#22D3EE'
                        : '#6D28D9')
                      : '#3B82F6';
                    const initials = child.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

                    return (
                      <Pressable
                        key={child.id}
                        onPress={() => selectChild(child.id)}
                        style={{ alignItems: 'center', gap: 4 }}
                      >
                        <View style={{
                          width: isActive ? 48 : 44,
                          height: isActive ? 48 : 44,
                          borderRadius: isActive ? 24 : 22,
                          backgroundColor: modeColor + '20',
                          borderWidth: isActive ? 2.5 : 1.5,
                          borderColor: modeColor,
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: [{ scale: isActive ? 1.05 : 1 }],
                        }}>
                          <Text style={{
                            fontFamily: FontFamily.sansBold,
                            fontSize: isActive ? 16 : 14,
                            color: modeColor,
                          }}>
                            {initials}
                          </Text>
                        </View>
                        <Text style={{
                          fontFamily: isActive ? FontFamily.sansSemiBold : FontFamily.sansRegular,
                          fontSize: 11,
                          color: isActive ? '#1A1A1A' : '#94A3B8',
                        }}>
                          {child.name.split(' ')[0]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* ── Separator ── */}
            <View style={styles.divider} />

            {/* ── Section principale ── */}
            <View style={styles.menuList}>
              {MAIN_ITEMS.map((item) => (
                <MenuItem key={item.key} item={item} onPress={handleItemPress} />
              ))}
            </View>

            {/* ── Separator ── */}
            <View style={styles.divider} />

            {/* ── Section basse ── */}
            <View style={styles.menuList}>
              {BOTTOM_ITEMS.map((item) => (
                <MenuItem key={item.key} item={item} onPress={handleItemPress} />
              ))}
            </View>

            {/* ── Footer ── */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
              <Text style={styles.footerVersion}>Scolaria · Version 1.0.0</Text>
              <Text style={styles.footerCopyright}>
                © 2026 Scolaria · Passeport scolaire numérique
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#F2F2F7',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 8, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },

  // ── Avatar section ──
  avatarSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  largeAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  largeAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  largeAvatarInitials: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: FontFamily.sansBold,
  },
  childName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 20,
    color: '#1A1A1A',
  },
  childClasse: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 20,
    marginVertical: 8,
  },

  // ── Menu items ──
  menuList: {
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  menuLabel: {
    flex: 1,
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    color: '#1A1A1A',
  },
  menuLabelDanger: {
    color: '#EF4444',
  },

  // ── Footer ──
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginTop: 'auto',
  },
  footerVersion: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  footerCopyright: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 2,
  },
});
