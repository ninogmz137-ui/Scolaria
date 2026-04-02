/**
 * BurgerMenu — Light panel drawer from left (iOS settings style).
 *
 * Structure:
 * 1. Header: large child avatar + name + classe + parent info
 * 2. Divider
 * 3. 6 menu items (no tab bar duplicates)
 *
 * Background: #F2F2F7 (light, not dark)
 * Width: 80% of screen, max 340px
 */

import { useRef, useEffect, useState } from 'react';
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
  RefreshCw,
  BookOpen,
  Heart,
  ImageIcon,
  Settings,
  ChevronRight,
} from 'lucide-react-native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import { ChildSwitcherModal } from './GlobalChildSwitcher';

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
};

const MENU_ITEMS: MenuItemDef[] = [
  { key: 'profil', icon: User, label: 'Profil enfant', screen: 'ProfilEnfant' },
  { key: 'switch', icon: RefreshCw, label: "Changer d'enfant", action: 'switchChild' },
  { key: 'parcours', icon: BookOpen, label: 'Mon Parcours', screen: 'MonParcours' },
  { key: 'ressenti', icon: Heart, label: 'Mon Ressenti', screen: 'BienEtre' },
  { key: 'wallpaper', icon: ImageIcon, label: "Fond d'écran", screen: 'WallpaperPicker' },
  { key: 'reglages', icon: Settings, label: 'Réglages', screen: 'ReglagesScreen' },
];

// ─── Main component ─────────────────────────────────────

export default function BurgerMenu({
  visible,
  onClose,
  onNavigate,
  onLogout,
}: Props) {
  const { selectedChild, children: childList } = useActiveChild();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [switcherVisible, setSwitcherVisible] = useState(false);

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
    if (item.action === 'switchChild') {
      // If only one child, nothing to switch
      if (childList.length <= 1) return;
      setSwitcherVisible(true);
      return;
    }
    if (item.screen) {
      onClose();
      setTimeout(() => onNavigate(item.screen!), 150);
    }
  };

  if (!visible && !switcherVisible) return null;

  const childPhoto = selectedChild.avatarPhotoUri ?? null;
  const childInitials = getInitials(selectedChild.name);
  const parentEmail = user?.email ?? '';
  const parentName = parentEmail.split('@')[0] ?? 'Parent';

  return (
    <>
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
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Header section */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
              {/* Large avatar */}
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

              {/* Child name */}
              <Text style={styles.childName}>{selectedChild.name}</Text>

              {/* Classe info */}
              {selectedChild.classe ? (
                <Text style={styles.childClasse} numberOfLines={1}>
                  {selectedChild.classe}
                </Text>
              ) : null}

              {/* Parent info */}
              {parentEmail ? (
                <Text style={styles.parentInfo} numberOfLines={1}>
                  {parentName} · {parentEmail}
                </Text>
              ) : null}
            </View>

            {/* Separator */}
            <View style={styles.divider} />

            {/* Menu items */}
            <View style={styles.menuList}>
              {MENU_ITEMS.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Pressable
                    key={item.key}
                    style={styles.menuItem}
                    onPress={() => handleItemPress(item)}
                  >
                    <IconComponent size={20} color="#64748B" strokeWidth={2} />
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: Math.max(insets.bottom, 16) + 16 }} />
          </ScrollView>
        </Animated.View>
      </Modal>

      {/* Child switcher modal — separate from drawer */}
      <ChildSwitcherModal
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
      />
    </>
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
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    marginTop: 12,
  },
  childClasse: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  parentInfo: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  menuList: {
    paddingTop: 4,
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
});
