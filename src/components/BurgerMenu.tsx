/**
 * BurgerMenu — Slide & scale effect (dark panel, rendered behind main content).
 *
 * Exports `BurgerMenuContent` — a plain content component with no animation logic
 * and no Modal wrapper. Animation is driven by TabNavigator using reanimated.
 *
 * Background: dark (#0F172A), provided by parent container.
 * Width: full left portion revealed when main content scales and translates right.
 */

import {
  Dimensions,
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
  Shield,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';
import { FontFamily } from '../hooks/useSolariaFonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Props ───────────────────────────────────────────────

interface Props {
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
  { key: 'profil',    icon: User,     label: 'Profil élève',  screen: 'ProfilEnfant' },
  { key: 'parcours',  icon: BookOpen, label: 'Mon Parcours',  screen: 'MonParcours' },
  { key: 'ressenti',  icon: Heart,    label: 'Mon Ressenti',  screen: 'BienEtre' },
];

const BOTTOM_ITEMS: MenuItemDef[] = [
  { key: 'rgpd',   icon: Shield,  label: 'RGPD & Confidentialité', screen: 'RGPDScreen' },
  { key: 'logout', icon: LogOut,  label: 'Se déconnecter',          action: 'logout', danger: true },
];

const BOTTOM_ITEMS_DEMO: MenuItemDef[] = [
  { key: 'logout', icon: LogOut,  label: 'Quitter la démo',         action: 'logout', danger: true },
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
      <IconComponent size={20} color="rgba(255,255,255,0.7)" strokeWidth={2} />
      <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
        {item.label}
      </Text>
      <ChevronRight size={18} color="rgba(255,255,255,0.3)" strokeWidth={2} />
    </Pressable>
  );
}

// ─── Main exported component ─────────────────────────────

export function BurgerMenuContent({ onClose, onNavigate, onLogout }: Props) {
  const { selectedChild } = useActiveChild();
  const { isDemo } = useAuth();
  const insets = useSafeAreaInsets();

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

  const childInitials = getInitials(selectedChild.name);
  const childEmoji = selectedChild.avatarType === 'emoji' ? (selectedChild.avatarEmoji ?? null) : null;
  const childPhoto = selectedChild.avatarType === 'photo' ? (selectedChild.avatarPhotoUri ?? null) : null;

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        style={styles.container}
      >
        {/* ── Avatar section (read-only display) ── */}
        <View style={[styles.avatarSection, { paddingTop: insets.top + 20 }]}>
          <View style={styles.avatarWrapper}>
            <View style={styles.largeAvatarCircle}>
              {childPhoto ? (
                <Image
                  source={{ uri: childPhoto }}
                  style={styles.largeAvatarImage}
                />
              ) : childEmoji ? (
                <Text style={{ fontSize: 30 }}>{childEmoji}</Text>
              ) : (
                <Text style={styles.largeAvatarInitials}>{childInitials}</Text>
              )}
            </View>
          </View>

          {/* Child name */}
          <Text style={styles.childName}>{selectedChild.name}</Text>

          {/* Classe */}
          {selectedChild.classe ? (
            <Text style={styles.childClasse} numberOfLines={1}>
              {selectedChild.classe}
            </Text>
          ) : null}
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
          {(isDemo ? BOTTOM_ITEMS_DEMO : BOTTOM_ITEMS).map((item) => (
            <MenuItem key={item.key} item={item} onPress={handleItemPress} />
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>Scolaria · Version 1.0.0</Text>
          <Text style={styles.footerCopyright}>
            © 2026 Scolaria · Passeport scolaire numérique
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

// ─── Default export kept for backward compat (not used) ──
export default BurgerMenuContent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH * 0.72,
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
    backgroundColor: 'rgba(226,232,240,0.15)',
    borderWidth: 2,
    borderColor: '#E2E8F0',
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
    color: '#FFFFFF',
  },
  childClasse: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    color: '#FFFFFF',
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
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  footerCopyright: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: 2,
  },
});
