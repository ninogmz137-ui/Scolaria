/**
 * SettingsScreen — Clean white/black design.
 * No WallpaperBackground, no GlassCard, no Papicons.
 * Sections: Mes Enfants, Apparence, Confidentialité, À propos
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import {
  Image as ImageIcon,
  Moon,
  Type,
  Key,
  FileText,
  Package,
  Trash2,
  FileCheck,
  Mail,
  ChevronRight,
  UserPlus,
} from 'lucide-react-native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';
import { useWallpaper } from '../contexts/WallpaperContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import { TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';
import { SCREEN_BACKGROUND } from '../constants/colors';
import ScolariaAppIcon from '../components/ScolariaAppIcon';

// ─── Helpers ──────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Section title ────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  return (
    <Text style={styles.sectionTitle}>{label}</Text>
  );
}

// ─── Separator ────────────────────────────────────────────

function Separator() {
  return <View style={styles.separator} />;
}

// ─── Row item ─────────────────────────────────────────────

interface RowProps {
  emoji?: string;
  /** Si défini, remplace icône Lucide (ex. app icon) */
  leading?: React.ReactNode;
  icon?: React.ElementType;
  label: string;
  sublabel?: string;
  labelColor?: string;
  type: 'navigate' | 'toggle' | 'value';
  value?: string;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  showSeparator?: boolean;
}

function Row({
  emoji,
  leading,
  icon: IconComponent,
  label,
  sublabel,
  labelColor,
  type,
  value,
  toggleValue,
  onToggle,
  onPress,
  showSeparator = true,
}: RowProps) {
  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed && type !== 'toggle' && { opacity: 0.6 },
        ]}
        onPress={type !== 'toggle' ? onPress : undefined}
      >
        <View style={styles.rowInner}>
          {leading ? (
            <View style={styles.rowLeadingSlot}>{leading}</View>
          ) : IconComponent ? (
            <IconComponent size={28} color="#64748B" strokeWidth={1.5} style={{ marginRight: 16 }} />
          ) : emoji ? (
            <Text style={styles.rowEmoji}>{emoji}</Text>
          ) : null}
          <View style={styles.rowTextStack}>
            <Text style={[styles.rowLabel, labelColor ? { color: labelColor } : null]}>
              {label}
            </Text>
            {sublabel ? (
              <Text style={styles.rowSublabel}>{sublabel}</Text>
            ) : null}
          </View>
          {type === 'navigate' && (
            <ChevronRight size={18} color="#D1D5DB" strokeWidth={1.5} />
          )}
          {type === 'value' && (
            <Text style={styles.rowValueText}>{value}</Text>
          )}
          {type === 'toggle' && (
            <Switch
              value={toggleValue}
              onValueChange={onToggle}
              trackColor={{ false: '#E2E8F0', true: '#1A2340' }}
              thumbColor="#FFFFFF"
            />
          )}
        </View>
      </Pressable>
      {showSeparator && <Separator />}
    </>
  );
}

// ─── Main screen ──────────────────────────────────────────

export default function SettingsScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { children } = useActiveChild();
  const { user } = useAuth();
  const { wallpaper } = useWallpaper();

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('darkModeEnabled').then((v) => {
      if (v === 'true') setDarkMode(true);
    });
  }, []);

  const handleDarkModeToggle = (v: boolean) => {
    setDarkMode(v);
    AsyncStorage.setItem('darkModeEnabled', v ? 'true' : 'false');
  };

  // Parent name and email from auth context
  const parentName =
    user?.user_metadata?.family_name
      ? `Famille ${user.user_metadata.family_name}`
      : 'Parent Scolaria';
  const parentEmail = user?.email ?? 'parent@scolaria.fr';
  const parentInitials = getInitials(parentName);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60, paddingBottom: TAB_BAR_SCROLL_PADDING },
        ]}
      >
        {/* ── Parent profile mini-card ── */}
        <Pressable style={styles.profileCard} onPress={() => nav.navigate('EditProfile')}>
          {Platform.OS === 'web' ? (
            <View
              style={[
                styles.profileAvatar,
                // @ts-ignore — web-only CSS property
                { backgroundImage: 'linear-gradient(135deg, #7C3AED, #06B6D4)' },
              ]}
            >
              <Text style={styles.profileInitials}>{parentInitials}</Text>
            </View>
          ) : (
            <LinearGradient
              colors={['#7C3AED', '#06B6D4']}
              style={styles.profileAvatar}
            >
              <Text style={styles.profileInitials}>{parentInitials}</Text>
            </LinearGradient>
          )}
          <View style={styles.profileTextCol}>
            <Text style={styles.profileName}>{parentName}</Text>
            <Text style={styles.profileEmail}>{parentEmail}</Text>
          </View>
          <Text style={styles.profileChevron}>›</Text>
        </Pressable>
        <View style={styles.profileSeparator} />

        {/* ══ SECTION 1: MES ENFANTS ══ */}
        <SectionTitle label="MES ENFANTS" />

        {children.map((child, index) => (
          <Row
            key={child.id}
            emoji={child.avatarEmoji ?? child.avatar ?? '👤'}
            label={child.name}
            sublabel={child.classe}
            type="navigate"
            onPress={() => nav.navigate('ProfilEnfant', { childId: child.id })}
            showSeparator={index < children.length - 1 || true}
          />
        ))}
        <Row
          icon={UserPlus}
          label="Ajouter un enfant"
          labelColor="#7C3AED"
          type="navigate"
          onPress={() => nav.navigate('AjouterEnfant')}
          showSeparator={false}
        />

        {/* ══ SECTION 2: APPARENCE ══ */}
        <SectionTitle label="APPARENCE" />

        <Row
          icon={ImageIcon}
          label="Fond d'écran"
          sublabel={wallpaper.label}
          type="navigate"
          onPress={() => nav.navigate('WallpaperPicker')}
        />
        <Row
          icon={Moon}
          label="Mode sombre"
          type="toggle"
          toggleValue={darkMode}
          onToggle={handleDarkModeToggle}
        />
        <Row
          icon={Type}
          label="Taille du texte"
          sublabel="Normal"
          type="navigate"
          onPress={() => nav.navigate('TextSize')}
          showSeparator={false}
        />

        {/* ══ SECTION 3: CONFIDENTIALITÉ ══ */}
        <SectionTitle label="CONFIDENTIALITÉ" />

        <Row
          icon={Key}
          label="Permissions données"
          type="navigate"
          onPress={() => nav.navigate('PermissionsRGPD')}
        />
        <Row
          icon={FileText}
          label="Journal d'accès"
          sublabel="Dernière connexion il y a 2h"
          type="navigate"
          onPress={() => nav.navigate('JournalAcces')}
        />
        <Row
          icon={Package}
          label="Exporter mes données"
          type="navigate"
          onPress={() => nav.navigate('ExportDonnees')}
        />
        <Row
          icon={Trash2}
          label="Supprimer mon compte"
          labelColor="#EF4444"
          type="navigate"
          onPress={() => nav.navigate('Effacement')}
          showSeparator={false}
        />

        {/* ══ SECTION 4: À PROPOS ══ */}
        <SectionTitle label="À PROPOS" />

        <Row
          leading={<ScolariaAppIcon size={40} withBackground />}
          label="Version"
          sublabel="Scolaria 1.0.0"
          type="value"
          value="1.0.0"
        />
        <Row
          icon={FileCheck}
          label="Mentions légales"
          type="navigate"
          onPress={() => nav.navigate('APropos')}
        />
        <Row
          icon={Mail}
          label="Nous contacter"
          type="navigate"
          onPress={() => nav.navigate('APropos')}
          showSeparator={false}
        />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Header
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  backText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: '#94A3B8',
  },
  pageTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 28,
    color: '#1A2340',
    marginTop: 8,
    marginBottom: 20,
  },

  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileInitials: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  profileTextCol: {
    flex: 1,
  },
  profileName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: '#1A2340',
  },
  profileEmail: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  profileChevron: {
    fontSize: 18,
    color: '#D1D5DB',
  },
  profileSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 4,
  },

  // Section title
  sectionTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 28,
    marginBottom: 12,
  },

  // Row
  row: {
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  rowLeadingSlot: {
    marginRight: 12,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  rowEmoji: {
    width: 28,
    textAlign: 'center',
    fontSize: 16,
    marginRight: 16,
  },
  rowTextStack: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    color: '#1A2340',
  },
  rowSublabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  // chevron now uses lucide ChevronRight component
  rowValueText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
  },

  // Separator
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F8FAFC',
  },
});
