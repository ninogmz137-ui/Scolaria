import { useState } from 'react';
import {
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Box, Text, Pressable, HStack, VStack } from '../components/ui';
import { Colors } from '../constants/colors';
import { useI18n } from '../contexts/I18nContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────

interface SettingsRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  color: string;
  type: 'navigate' | 'toggle' | 'value';
  value?: string;
  toggleKey?: string;
}

interface ChildProfile {
  id: string;
  name: string;
  avatar: string;
  classe: string;
  scolariaId: string;
}

// ─── Mock data ────────────────────────────────────────────

const FAMILY = {
  name: 'Famille Moreau',
  email: 'moreau.famille@email.fr',
  plan: 'Premium',
  memberSince: 'Septembre 2025',
};

const CHILDREN: ChildProfile[] = [
  { id: '1', name: 'Lucas', avatar: '👦', classe: 'CM2 — École Voltaire', scolariaId: 'SCA-2026-FR-048721' },
  { id: '2', name: 'Emma', avatar: '👧', classe: '6ème — Collège Hugo', scolariaId: 'SCA-2026-FR-048722' },
];

const PERMISSIONS = [
  { id: 'p1', name: 'M. Dupont', role: 'Enseignant principal', avatar: '👨‍🏫', access: 'Notes & Agenda' },
  { id: 'p2', name: 'Dr. Martin', role: 'Médecin scolaire', avatar: '👩‍⚕️', access: 'Ressenti (anonymisé)' },
  { id: 'p3', name: 'Mme Moreau', role: 'Grand-mère', avatar: '👵', access: 'Lecture seule' },
];

// ─── Section component ───────────────────────────────────

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { theme } = useChildTheme();
  return (
    <Box className="mb-6">
      <Text
        className="text-[13px] font-bold uppercase tracking-widest mb-2.5 px-1"
        style={{ color: theme.textMuted }}
      >
        {title}
      </Text>
      <Box
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}
      >
        {children}
      </Box>
    </Box>
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
  const { theme } = useChildTheme();
  return (
    <Pressable
      className="flex-row items-center p-3.5"
      style={[
        { gap: 12 },
        !isLast ? { borderBottomWidth: 1, borderBottomColor: theme.cardBorder } : undefined,
      ]}
      onPress={onPress}
    >
      <Box
        className="w-9 h-9 rounded-[10px] justify-center items-center"
        style={{ backgroundColor: color + '20' }}
      >
        <Ionicons name={icon} size={18} color={color} />
      </Box>
      <VStack className="flex-1">
        <Text className="text-[15px] font-semibold" style={{ color: theme.textPrimary }}>{label}</Text>
        {sublabel && <Text className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{sublabel}</Text>}
      </VStack>
      {type === 'navigate' && (
        <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
      )}
      {type === 'value' && <Text className="text-sm font-semibold" style={{ color: Colors.cyan }}>{value}</Text>}
      {type === 'toggle' && (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: Colors.darkGray, true: Colors.violet }}
          thumbColor={toggleValue ? Colors.cyan : Colors.gray}
        />
      )}
    </Pressable>
  );
}

// ─── Main screen ─────────────────────────────────────────

export default function ReglagesScreen({ navigation }: { navigation: any }) {
  const { t, locale, setLocale, languages } = useI18n();
  const { theme } = useChildTheme();
  const { signOut, setRole, role } = useAuth();
  const [notifications, setNotifications] = useState({
    grades: true,
    agenda: true,
    aria: false,
    checkin: true,
  });
  const [showLangPicker, setShowLangPicker] = useState(false);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} showsVerticalScrollIndicator={false}>
      {/* Family profile header */}
      <Box className="mb-2">
        <LinearGradient
          colors={theme.headerGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 24 }}
        >
          <Box
            className="w-16 h-16 rounded-full justify-center items-center mb-2.5"
            style={{ borderWidth: 2, borderColor: theme.accent, backgroundColor: theme.mode === 'primaire' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }}
          >
            <Text className="text-[30px]">🏠</Text>
          </Box>
          <Text className="text-[22px] font-black mb-0.5" style={{ color: theme.textPrimary }}>{FAMILY.name}</Text>
          <Text className="text-[13px] mb-3" style={{ color: theme.textSecondary }}>{FAMILY.email}</Text>
          <HStack
            className="items-center rounded-[20px] px-3.5 py-1.5"
            style={{ gap: 6, backgroundColor: theme.mode === 'primaire' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)' }}
          >
            <Ionicons name="diamond" size={14} color={theme.accent} />
            <Text className="text-[13px] font-bold" style={{ color: theme.accent }}>{FAMILY.plan}</Text>
            <Text className="text-xs" style={{ color: theme.textSecondary }}>
              {t('settings.since')} {FAMILY.memberSince}
            </Text>
          </HStack>
        </LinearGradient>
      </Box>

      <Box className="px-5">
        {/* Children management */}
        <SettingsSection title={t('settings.children')}>
          {CHILDREN.map((child, i) => (
            <Pressable
              key={child.id}
              className="flex-row items-center p-3.5"
              style={[
                { gap: 12 },
                i < CHILDREN.length - 1 ? { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' } : undefined,
              ]}
            >
              <Box
                className="w-11 h-11 rounded-full justify-center items-center"
                style={{ backgroundColor: 'rgba(109,40,217,0.2)' }}
              >
                <Text className="text-[22px]">{child.avatar}</Text>
              </Box>
              <VStack className="flex-1">
                <Text className="text-[15px] font-bold" style={{ color: theme.textPrimary }}>{child.name}</Text>
                <Text className="text-xs mt-px" style={{ color: Colors.gray }}>{child.classe}</Text>
                <Text className="text-[11px] mt-0.5 font-mono" style={{ color: Colors.cyan }}>{child.scolariaId}</Text>
              </VStack>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
            </Pressable>
          ))}
          <Pressable
            className="flex-row items-center p-3.5"
            style={{ gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' }}
          >
            <Ionicons name="add-circle" size={22} color={Colors.cyan} />
            <Text className="text-sm font-semibold" style={{ color: Colors.cyan }}>{t('settings.addChild')}</Text>
          </Pressable>
        </SettingsSection>

        {/* Permissions */}
        <SettingsSection title={t('settings.permissions')}>
          {PERMISSIONS.map((perm, i) => (
            <Pressable
              key={perm.id}
              className="flex-row items-center p-3.5"
              style={[
                { gap: 10 },
                i < PERMISSIONS.length - 1 ? { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' } : undefined,
              ]}
            >
              <Text className="text-[28px]">{perm.avatar}</Text>
              <VStack className="flex-1">
                <Text className="text-[15px] font-semibold" style={{ color: theme.textPrimary }}>{perm.name}</Text>
                <Text className="text-xs mt-px" style={{ color: Colors.gray }}>{perm.role}</Text>
              </VStack>
              <Box className="rounded-[10px] px-2.5 py-1" style={{ backgroundColor: 'rgba(109,40,217,0.15)' }}>
                <Text className="text-[11px] font-semibold" style={{ color: Colors.violetLight }}>{perm.access}</Text>
              </Box>
            </Pressable>
          ))}
          <Pressable
            className="flex-row items-center p-3.5"
            style={{ gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' }}
          >
            <Ionicons name="person-add" size={20} color={Colors.cyan} />
            <Text className="text-sm font-semibold" style={{ color: Colors.cyan }}>{t('settings.managePermissions')}</Text>
          </Pressable>
        </SettingsSection>

        {/* Language */}
        <SettingsSection title={t('settings.language')}>
          <Pressable
            className="flex-row items-center p-3.5"
            style={{ gap: 10 }}
            onPress={() => setShowLangPicker(!showLangPicker)}
          >
            <Text className="text-[22px]">
              {languages.find((l) => l.code === locale)?.flag}
            </Text>
            <Text className="flex-1 text-[15px] font-semibold" style={{ color: theme.textPrimary }}>
              {languages.find((l) => l.code === locale)?.label}
            </Text>
            <Ionicons
              name={showLangPicker ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.gray}
            />
          </Pressable>
          {showLangPicker &&
            languages.filter((l) => l.code !== locale).map((lang) => (
              <Pressable
                key={lang.code}
                className="flex-row items-center p-3.5"
                style={{ gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' }}
                onPress={() => {
                  setLocale(lang.code);
                  setShowLangPicker(false);
                }}
              >
                <Text className="text-[22px]">{lang.flag}</Text>
                <Text className="text-[15px]" style={{ color: Colors.gray }}>{lang.label}</Text>
              </Pressable>
            ))}
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title={t('settings.notifications')}>
          <SettingsRowItem
            icon="school"
            label={t('settings.notifGrades')}
            sublabel={t('settings.notifGradesSub')}
            color={Colors.cyan}
            type="toggle"
            toggleValue={notifications.grades}
            onToggle={(v) =>
              setNotifications((p) => ({ ...p, grades: v }))
            }
          />
          <SettingsRowItem
            icon="calendar"
            label={t('settings.notifAgenda')}
            sublabel={t('settings.notifAgendaSub')}
            color={Colors.violet}
            type="toggle"
            toggleValue={notifications.agenda}
            onToggle={(v) =>
              setNotifications((p) => ({ ...p, agenda: v }))
            }
          />
          <SettingsRowItem
            icon="sparkles"
            label={t('settings.notifAria')}
            sublabel={t('settings.notifAriaSub')}
            color={Colors.pink}
            type="toggle"
            toggleValue={notifications.aria}
            onToggle={(v) =>
              setNotifications((p) => ({ ...p, aria: v }))
            }
          />
          <SettingsRowItem
            icon="heart"
            label={t('settings.notifCheckin')}
            sublabel={t('settings.notifCheckinSub')}
            color={Colors.orange}
            type="toggle"
            toggleValue={notifications.checkin}
            onToggle={(v) =>
              setNotifications((p) => ({ ...p, checkin: v }))
            }
            isLast
          />
        </SettingsSection>

        {/* RGPD & Privacy */}
        <SettingsSection title="RGPD & CONFIDENTIALITÉ">
          <SettingsRowItem
            icon="people"
            label="Permissions d'accès"
            sublabel="4 niveaux : tuteur, famille, accompagnant, minimal"
            color={Colors.green}
            type="navigate"
            onPress={() => navigation.navigate('PermissionsRGPD')}
          />
          <SettingsRowItem
            icon="list"
            label="Journal d'accès"
            sublabel="Qui a consulté quoi et quand"
            color={Colors.cyan}
            type="navigate"
            onPress={() => navigation.navigate('JournalAcces')}
          />
          <SettingsRowItem
            icon="swap-horizontal"
            label="Code de transfert"
            sublabel="SCA-TRANSFER entre établissements (90 jours)"
            color={Colors.violet}
            type="navigate"
            onPress={() => navigation.navigate('TransfertCode')}
          />
          <SettingsRowItem
            icon="download"
            label="Export intégral"
            sublabel="Télécharger toutes vos données en JSON + PDF"
            color={Colors.orange}
            type="navigate"
            onPress={() => navigation.navigate('ExportDonnees')}
          />
          <SettingsRowItem
            icon="trash"
            label="Droit à l'effacement"
            sublabel="Suppression définitive du profil (Art. 17)"
            color={Colors.red}
            type="navigate"
            onPress={() => navigation.navigate('Effacement')}
          />
          <SettingsRowItem
            icon="lock-closed"
            label={t('settings.encryption')}
            sublabel={t('settings.encryptionSub')}
            color={Colors.violet}
            type="value"
            value={t('settings.encryptionActive')}
          />
          <SettingsRowItem
            icon="shield-checkmark"
            label={t('settings.privacyPolicy')}
            sublabel={t('settings.privacyPolicySub')}
            color={Colors.green}
            type="navigate"
          />
          <SettingsRowItem
            icon="document-text"
            label={t('settings.terms')}
            color={Colors.cyan}
            type="navigate"
            isLast
          />
        </SettingsSection>

        {/* Account actions */}
        <SettingsSection title="COMPTE">
          <SettingsRowItem
            icon="swap-horizontal"
            label="Changer de rôle"
            sublabel={`Rôle actuel : ${role === 'parent' ? 'Parent' : role === 'eleve' ? 'Élève' : role === 'enseignant' ? 'Enseignant' : '—'}`}
            color={Colors.violet}
            type="navigate"
            onPress={() => setRole(null as any)}
          />
          <SettingsRowItem
            icon="log-out"
            label="Se déconnecter"
            sublabel="Retour à l'écran de connexion"
            color={Colors.red}
            type="navigate"
            onPress={() => signOut()}
            isLast
          />
        </SettingsSection>

        {/* About & Info */}
        <SettingsSection title="INFORMATIONS">
          <SettingsRowItem
            icon="information-circle"
            label="À propos de Scolaria"
            sublabel="Mission, Charte Éthique, Technologies"
            color={Colors.violet}
            type="navigate"
            onPress={() => navigation.navigate('APropos')}
          />
          <SettingsRowItem
            icon="document-text"
            label="Charte Éthique"
            sublabel="8 engagements fondateurs"
            color={Colors.green}
            type="navigate"
            onPress={() => navigation.navigate('APropos')}
            isLast
          />
        </SettingsSection>

        {/* App info */}
        <VStack className="items-center py-6" style={{ gap: 4 }}>
          <Text className="text-base font-extrabold" style={{ color: Colors.violet }}>Scolaria</Text>
          <Text className="text-[13px]" style={{ color: Colors.gray }}>{t('common.version')} 1.0.0</Text>
          <Text className="text-[11px] mt-1" style={{ color: Colors.gray }}>
            © 2026 Scolaria · Passeport scolaire numérique
          </Text>
        </VStack>

        <Box className="h-10" />
      </Box>
    </ScrollView>
  );
}
