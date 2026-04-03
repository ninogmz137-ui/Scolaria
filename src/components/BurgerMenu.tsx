/**
 * BurgerMenu — Slide & scale effect (dark panel, rendered behind main content).
 *
 * Exports `BurgerMenuContent` — a plain content component with no animation logic
 * and no Modal wrapper. Animation is driven by TabNavigator using reanimated.
 *
 * Background: dark (#0F172A), provided by parent container.
 * Width: full left portion revealed when main content scales and translates right.
 *
 * Avatar customization modal is kept as a standalone Modal (independent overlay).
 */

import { useState } from 'react';
import {
  Modal,
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
  Settings,
  Shield,
  LogOut,
  ChevronRight,
  Camera,
  ImagePlus,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import { getSchoolModeFromBirthDate } from '../contexts/SchoolModeContext';

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
  { key: 'profil',    icon: User,     label: 'Profil enfant',  screen: 'ProfilEnfant' },
  { key: 'parcours',  icon: BookOpen, label: 'Mon Parcours',   screen: 'MonParcours' },
  { key: 'ressenti',  icon: Heart,    label: 'Mon Ressenti',   screen: 'BienEtre' },
  { key: 'reglages',  icon: Settings, label: 'Réglages',       screen: 'ReglagesScreen' },
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
  const { selectedChild, selectedChildId, children, selectChild, updateChildAvatar } = useActiveChild();
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const { user, isDemo } = useAuth();
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
        {/* ── Avatar section ── */}
        <View style={[styles.avatarSection, { paddingTop: insets.top + 20 }]}>
          {/* Tappable avatar with camera badge */}
          <View style={styles.avatarWrapper}>
            <Pressable onPress={() => setAvatarModalVisible(true)}>
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
              {/* Camera badge on large avatar */}
              <View style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: '#3B82F6',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: '#0F172A',
              }}>
                <Camera size={11} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </Pressable>
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
                const childAvatarEmoji = child.avatarType === 'emoji' ? (child.avatarEmoji ?? null) : null;
                const childAvatarPhoto = child.avatarType === 'photo' ? (child.avatarPhotoUri ?? null) : null;

                return (
                  <Pressable
                    key={child.id}
                    onPress={() => selectChild(child.id)}
                    style={{ alignItems: 'center', gap: 4 }}
                  >
                    <View style={{ position: 'relative' }}>
                      <View style={{
                        width: isActive ? 48 : 44,
                        height: isActive ? 48 : 44,
                        borderRadius: isActive ? 24 : 22,
                        backgroundColor: modeColor + '30',
                        borderWidth: isActive ? 2.5 : 1.5,
                        borderColor: modeColor,
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: [{ scale: isActive ? 1.05 : 1 }],
                        overflow: 'hidden',
                      }}>
                        {childAvatarPhoto ? (
                          <Image
                            source={{ uri: childAvatarPhoto }}
                            style={{ width: isActive ? 48 : 44, height: isActive ? 48 : 44, borderRadius: isActive ? 24 : 22 }}
                          />
                        ) : childAvatarEmoji ? (
                          <Text style={{ fontSize: isActive ? 26 : 22 }}>{childAvatarEmoji}</Text>
                        ) : (
                          <Text style={{
                            fontFamily: FontFamily.sansBold,
                            fontSize: isActive ? 16 : 14,
                            color: modeColor,
                          }}>
                            {initials}
                          </Text>
                        )}
                      </View>
                      {isActive && (
                        <Pressable
                          onPress={() => setAvatarModalVisible(true)}
                          style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 20, height: 20, borderRadius: 10,
                            backgroundColor: '#3B82F6',
                            alignItems: 'center', justifyContent: 'center',
                            borderWidth: 2, borderColor: '#0F172A',
                          }}
                        >
                          <Camera size={10} color="#FFFFFF" strokeWidth={2.5} />
                        </Pressable>
                      )}
                    </View>
                    <Text style={{
                      fontFamily: isActive ? FontFamily.sansSemiBold : FontFamily.sansRegular,
                      fontSize: 11,
                      color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
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

      {/* ── Avatar customization modal (independent overlay) ── */}
      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAvatarModalVisible(false)}
        statusBarTranslucent
      >
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}
          onPress={() => setAvatarModalVisible(false)}
        >
          <Pressable
            style={{ backgroundColor: '#F2F2F7', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 16, paddingTop: 16, paddingHorizontal: 20 }}
            onPress={(e: any) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#94A3B8', opacity: 0.4, alignSelf: 'center', marginBottom: 16 }} />

            <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 18, color: '#1A1A1A', marginBottom: 16 }}>
              Photo de {selectedChild.name.split(' ')[0]}
            </Text>

            {/* Take photo */}
            <Pressable
              onPress={async () => {
                const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
                if (!result.canceled && result.assets[0]) {
                  updateChildAvatar(selectedChild.id, 'photo', undefined, result.assets[0].uri);
                  setAvatarModalVisible(false);
                }
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={20} color="#3B82F6" strokeWidth={2} />
              </View>
              <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 15, color: '#1A1A1A' }}>Prendre une photo</Text>
            </Pressable>

            {/* Choose from gallery */}
            <Pressable
              onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
                if (!result.canceled && result.assets[0]) {
                  updateChildAvatar(selectedChild.id, 'photo', undefined, result.assets[0].uri);
                  setAvatarModalVisible(false);
                }
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center' }}>
                <ImagePlus size={20} color="#10B981" strokeWidth={2} />
              </View>
              <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 15, color: '#1A1A1A' }}>Choisir depuis la galerie</Text>
            </Pressable>

            {/* Predefined emoji avatars */}
            <Text style={{ fontFamily: FontFamily.sansSemiBold, fontSize: 13, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 16, marginBottom: 10 }}>
              Avatars
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {['👦', '👧', '🧒', '👶', '🦸‍♂️', '🦸‍♀️', '🐱', '🦊', '🐻', '🦁'].map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    updateChildAvatar(selectedChild.id, 'emoji', emoji, undefined);
                    setAvatarModalVisible(false);
                  }}
                  style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E5EA' }}
                >
                  <Text style={{ fontSize: 28 }}>{emoji}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Remove photo (only if custom avatar is set) */}
            {selectedChild.avatarPhotoUri && (
              <Pressable
                onPress={() => {
                  updateChildAvatar(selectedChild.id, 'initials', undefined, undefined);
                  setAvatarModalVisible(false);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 12 }}
              >
                <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 14, color: '#EF4444' }}>Supprimer la photo</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
