/**
 * SettingsScreen — Main settings accessed from burger menu.
 * Sections: Apparence (ThemeSelector), Notifications, RGPD, Compte
 * Design: glass/wallpaper — WallpaperBackground + GlassCard
 */

import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import { Papicons } from '@getpapillon/papicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WallpaperBackground from '../components/WallpaperBackground';
import GlassCard from '../components/GlassCard';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Colors } from '../constants/colors';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import ThemeSelector from '../components/profile/ThemeSelector';

// ─── Types ────────────────────────────────────────────────

interface SettingsRow {
  icon: string;
  label: string;
  sublabel?: string;
  color: string;
  type: 'navigate' | 'toggle' | 'value';
  value?: string;
  toggleKey?: string;
}

// ─── Section component ───────────────────────────────────

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionWrapper}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <GlassCard noPadding>
        {children}
      </GlassCard>
    </View>
  );
}

// ─── Row component ───────────────────────────────────────

function SettingsRowItem({
  icon,
  label,
  sublabel,
  color,
  type,
  value,
  toggleValue,
  onToggle,
  onPress,
  isLast,
}: SettingsRow & {
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.row,
        !isLast && styles.rowBorder,
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconBox, { backgroundColor: color + '28' }]}>
        <Papicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.rowTextStack}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      {type === 'navigate' && (
        <Papicons name="ChevronRight" size={18} color="rgba(255,255,255,0.45)" />
      )}
      {type === 'value' && (
        <Text style={styles.rowValue}>{value}</Text>
      )}
      {type === 'toggle' && (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: 'rgba(255,255,255,0.2)', true: Colors.violet }}
          thumbColor={toggleValue ? Colors.cyan : 'rgba(255,255,255,0.6)'}
        />
      )}
    </Pressable>
  );
}

// ─── Main screen ─────────────────────────────────────────

export default function SettingsScreen({ navigation }: { navigation: any }) {
  const { t } = useI18n();
  const { theme } = useChildTheme();
  const { signOut, role } = useAuth();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;

  const [notifications, setNotifications] = useState({
    grades: true,
    agenda: true,
    aria: false,
    checkin: true,
  });

  return (
    <View style={styles.root}>
      <WallpaperBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: TOPBAR_H + 12, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10 },
        ]}
      >
        {/* Title section */}
        <View style={styles.titleSection}>
          <Text style={styles.titleEmoji}>⚙️</Text>
          <Text style={styles.titleText}>Réglages</Text>
          <Text style={styles.titleSub}>Apparence, notifications et confidentialité</Text>
        </View>

        {/* Apparence */}
        <SettingsSection title="APPARENCE">
          <View style={styles.themeRow}>
            <ThemeSelector accentColor={theme.accent} />
          </View>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title={t('settings.notifications')}>
          <SettingsRowItem
            icon="Grades"
            label={t('settings.notifGrades')}
            sublabel={t('settings.notifGradesSub')}
            color={Colors.cyan}
            type="toggle"
            toggleValue={notifications.grades}
            onToggle={(v) => setNotifications((p) => ({ ...p, grades: v }))}
          />
          <SettingsRowItem
            icon="Calendar"
            label={t('settings.notifAgenda')}
            sublabel={t('settings.notifAgendaSub')}
            color={Colors.violet}
            type="toggle"
            toggleValue={notifications.agenda}
            onToggle={(v) => setNotifications((p) => ({ ...p, agenda: v }))}
          />
          <SettingsRowItem
            icon="Sparkles"
            label={t('settings.notifAria')}
            sublabel={t('settings.notifAriaSub')}
            color={Colors.pink}
            type="toggle"
            toggleValue={notifications.aria}
            onToggle={(v) => setNotifications((p) => ({ ...p, aria: v }))}
          />
          <SettingsRowItem
            icon="Heart"
            label={t('settings.notifCheckin')}
            sublabel={t('settings.notifCheckinSub')}
            color={Colors.orange}
            type="toggle"
            toggleValue={notifications.checkin}
            onToggle={(v) => setNotifications((p) => ({ ...p, checkin: v }))}
            isLast
          />
        </SettingsSection>

        {/* RGPD & Privacy */}
        <SettingsSection title="RGPD & CONFIDENTIALITÉ">
          <SettingsRowItem
            icon="User"
            label="Permissions d'accès"
            sublabel="4 niveaux : tuteur, famille, accompagnant, minimal"
            color={Colors.green}
            type="navigate"
            onPress={() => navigation.navigate('PermissionsRGPD')}
          />
          <SettingsRowItem
            icon="Paper"
            label="Journal d'accès"
            sublabel="Qui a consulté quoi et quand"
            color={Colors.cyan}
            type="navigate"
            onPress={() => navigation.navigate('JournalAcces')}
          />
          <SettingsRowItem
            icon="ArrowRight"
            label="Code de transfert"
            sublabel="SCA-TRANSFER entre établissements (90 jours)"
            color={Colors.violet}
            type="navigate"
            onPress={() => navigation.navigate('TransfertCode')}
          />
          <SettingsRowItem
            icon="ArrowDown"
            label="Export intégral"
            sublabel="Télécharger toutes vos données en JSON + PDF"
            color={Colors.orange}
            type="navigate"
            onPress={() => navigation.navigate('ExportDonnees')}
          />
          <SettingsRowItem
            icon="Trash"
            label="Droit à l'effacement"
            sublabel="Suppression définitive du profil (Art. 17)"
            color={Colors.red}
            type="navigate"
            isLast
            onPress={() => navigation.navigate('Effacement')}
          />
        </SettingsSection>

        {/* Account actions */}
        <SettingsSection title="COMPTE">
          <SettingsRowItem
            icon="ArrowRight"
            label="Changer de compte"
            sublabel={`Connecté en tant que ${role === 'parent' ? 'Parent' : role === 'eleve' ? 'Élève' : role === 'enseignant' ? 'Enseignant' : '—'}`}
            color={Colors.violet}
            type="navigate"
            onPress={() => signOut()}
          />
          <SettingsRowItem
            icon="Logout"
            label="Se déconnecter"
            sublabel="Retour à l'écran de connexion"
            color={Colors.red}
            type="navigate"
            onPress={() => signOut()}
            isLast
          />
        </SettingsSection>

        {/* App info */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Scolaria</Text>
          <Text style={styles.footerVersion}>{t('common.version')} 1.0.0</Text>
          <Text style={styles.footerCopy}>© 2026 Scolaria · Passeport scolaire numérique</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.45)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
  },

  // Title section
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 4,
  },
  titleEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  titleText: {
    fontFamily: FontFamily.loraBold,
    fontSize: 26,
    color: '#FFFFFF',
    ...TEXT_SHADOW,
  },
  titleSub: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    ...TEXT_SHADOW,
  },

  // Section
  sectionWrapper: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    ...TEXT_SHADOW,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.18)',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTextStack: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: '#FFFFFF',
    ...TEXT_SHADOW,
  },
  rowSublabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  rowValue: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: Colors.cyan,
  },

  // Theme row padding
  themeRow: {
    padding: 14,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  footerBrand: {
    fontFamily: FontFamily.loraBold,
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    ...TEXT_SHADOW,
  },
  footerVersion: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
  footerCopy: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
});
