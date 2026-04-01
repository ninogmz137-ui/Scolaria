/**
 * BurgerMenu — Dark panel drawer from left.
 *
 * Structure:
 * 1. Small Scolaria logo at top
 * 2. Child selector (all children, colored dot on active)
 * 3. Sections: Mon enfant, Famille, Notifications, Infos
 * 4. Bottom: Change account, Logout
 *
 * Dark #1A2340 background, right border-radius 28px.
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
} from 'react-native';
import { Pressable } from './ui';
import { Papicons } from '@getpapillon/papicons';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import ChildAvatar from './ChildAvatar';
import LogoScolaria from './LogoScolaria';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 340);
const DARK_BG = '#1A2340';
const DARK_BORDER = 'rgba(255,255,255,0.08)';

// ─── Props ───────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  onChangeRole?: () => void;
  onLogout?: () => void;
}

// ─── Menu item ──────────────────────────────────────────

interface MenuItem {
  key: string;
  icon: string;
  label: string;
  badge?: number;
}

function MenuSection({
  title,
  items,
  onNav,
}: {
  title: string;
  items: MenuItem[];
  onNav: (key: string) => void;
}) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      {items.map((item) => (
        <Pressable
          key={item.key}
          style={sectionStyles.item}
          onPress={() => onNav(item.key)}
        >
          <View style={sectionStyles.iconWrap}>
            <Papicons name={item.icon} size={18} color="rgba(255,255,255,0.6)" />
          </View>
          <Text style={sectionStyles.label}>{item.label}</Text>
          {item.badge != null && item.badge > 0 && (
            <View style={sectionStyles.badge}>
              <Text style={sectionStyles.badgeText}>{item.badge}</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 8 },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  iconWrap: { width: 24, alignItems: 'center' },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

// ─── Main component ─────────────────────────────────────

export default function BurgerMenu({
  visible,
  onClose,
  onNavigate,
  onChangeRole,
  onLogout,
}: Props) {
  const { theme } = useChildTheme();
  const { selectedChild, children: childList, selectChild } = useActiveChild();
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
    setTimeout(() => onNavigate(screen), 150);
  };

  const handleChildSelect = (childId: string) => {
    selectChild(childId);
    // Don't close — let user see the switch
  };

  // ─── Menu items ──────────────────────────────────────

  const monEnfantItems: MenuItem[] = [
    { key: 'NotesResults', icon: 'Grades', label: 'Notes & Résultats' },
    { key: 'CahierLiaison', icon: 'Paper', label: 'Cahier de liaison', badge: 1 },
    { key: 'Absences', icon: 'Calendar', label: 'Absences' },
    { key: 'BienEtre', icon: 'Heart', label: 'Bien-être' },
    { key: 'ProfilBadges', icon: 'Star', label: 'Profil & Badges' },
    { key: 'MonParcours', icon: 'GraduationHat', label: 'Mon parcours' },
  ];

  const familleItems: MenuItem[] = [
    { key: 'Permissions', icon: 'Lock', label: 'Permissions d\'accès' },
    { key: 'Reglages', icon: 'Gears', label: 'Réglages' },
  ];

  const notifItems: MenuItem[] = [
    { key: 'Notifications', icon: 'Bell', label: 'Voir toutes les notifications' },
  ];

  const infosItems: MenuItem[] = [
    { key: 'RGPD', icon: 'Pillar', label: 'RGPD & Confidentialité' },
    { key: 'APropos', icon: 'Info', label: 'À propos · Charte Éthique' },
  ];

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Dark overlay */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)', opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Logo */}
          <View style={styles.logoWrap}>
            <LogoScolaria size={18} variant="dark" />
          </View>

          {/* Child selector */}
          <View style={styles.childSection}>
            <Text style={styles.childSectionTitle}>ENFANTS</Text>
            {childList.map((child) => {
              const isActive = child.id === selectedChild.id;
              return (
                <Pressable
                  key={child.id}
                  style={[
                    styles.childRow,
                    isActive && { backgroundColor: 'rgba(255,255,255,0.06)' },
                  ]}
                  onPress={() => handleChildSelect(child.id)}
                >
                  <ChildAvatar
                    name={child.name}
                    emoji={child.avatar}
                    accentColor={theme.accent}
                    size={34}
                  />
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>{child.name}</Text>
                    <Text style={styles.childClasse} numberOfLines={1}>{child.classe}</Text>
                  </View>
                  {isActive && (
                    <View style={[styles.activeDot, { backgroundColor: theme.accent }]} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Sections */}
          <MenuSection title="MON ENFANT" items={monEnfantItems} onNav={handleNav} />
          <MenuSection title="FAMILLE" items={familleItems} onNav={handleNav} />
          <MenuSection title="NOTIFICATIONS" items={notifItems} onNav={handleNav} />
          <MenuSection title="INFOS" items={infosItems} onNav={handleNav} />

          {/* Bottom actions */}
          <View style={[styles.divider, { marginTop: 8 }]} />
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <Pressable style={sectionStyles.item} onPress={onChangeRole}>
              <View style={sectionStyles.iconWrap}>
                <Papicons name="Login" size={18} color="rgba(255,255,255,0.6)" />
              </View>
              <Text style={sectionStyles.label}>Changer de compte</Text>
            </Pressable>
            <Pressable style={sectionStyles.item} onPress={onLogout}>
              <View style={sectionStyles.iconWrap}>
                <Papicons name="Logout" size={18} color="#F87171" />
              </View>
              <Text style={[sectionStyles.label, { color: '#F87171' }]}>Se déconnecter</Text>
            </Pressable>
          </View>

          <View style={{ height: 40 }} />
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
    backgroundColor: DARK_BG,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 8, height: 0 }, shadowOpacity: 0.4, shadowRadius: 24 },
      android: { elevation: 20 },
    }),
  },
  logoWrap: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  childSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  childSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 12,
    marginBottom: 2,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  childClasse: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  divider: {
    height: 1,
    backgroundColor: DARK_BORDER,
    marginHorizontal: 20,
    marginVertical: 4,
  },
});
