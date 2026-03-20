import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';

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

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ar', label: 'العربية', flag: '🇲🇦' },
];

// ─── Section component ───────────────────────────────────

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.card}>{children}</View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: Colors.blueNightCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
});

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
    <TouchableOpacity
      style={[rowStyles.container, !isLast && rowStyles.border]}
      activeOpacity={type === 'toggle' ? 1 : 0.6}
      onPress={onPress}
    >
      <View style={[rowStyles.iconCircle, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={rowStyles.content}>
        <Text style={rowStyles.label}>{label}</Text>
        {sublabel && <Text style={rowStyles.sublabel}>{sublabel}</Text>}
      </View>
      {type === 'navigate' && (
        <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
      )}
      {type === 'value' && <Text style={rowStyles.value}>{value}</Text>}
      {type === 'toggle' && (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: Colors.darkGray, true: Colors.violet }}
          thumbColor={toggleValue ? Colors.cyan : Colors.gray}
        />
      )}
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  sublabel: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  value: {
    fontSize: 14,
    color: Colors.cyan,
    fontWeight: '600',
  },
});

// ─── Main screen ─────────────────────────────────────────

export default function ReglagesScreen() {
  const [notifications, setNotifications] = useState({
    grades: true,
    agenda: true,
    aria: false,
    checkin: true,
  });
  const [selectedLang, setSelectedLang] = useState('fr');
  const [showLangPicker, setShowLangPicker] = useState(false);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Family profile header */}
      <View style={styles.profileHeader}>
        <LinearGradient
          colors={[Colors.violet, Colors.blueNight]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.profileGradient}
        >
          <View style={styles.familyAvatar}>
            <Text style={styles.familyAvatarText}>🏠</Text>
          </View>
          <Text style={styles.familyName}>{FAMILY.name}</Text>
          <Text style={styles.familyEmail}>{FAMILY.email}</Text>
          <View style={styles.planBadge}>
            <Ionicons name="diamond" size={14} color={Colors.cyan} />
            <Text style={styles.planText}>{FAMILY.plan}</Text>
            <Text style={styles.planSince}>
              depuis {FAMILY.memberSince}
            </Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.body}>
        {/* Children management */}
        <SettingsSection title="Enfants">
          {CHILDREN.map((child, i) => (
            <TouchableOpacity
              key={child.id}
              style={[
                styles.childRow,
                i < CHILDREN.length - 1 && styles.childRowBorder,
              ]}
              activeOpacity={0.6}
            >
              <View style={styles.childAvatar}>
                <Text style={styles.childAvatarText}>{child.avatar}</Text>
              </View>
              <View style={styles.childInfo}>
                <Text style={styles.childName}>{child.name}</Text>
                <Text style={styles.childClasse}>{child.classe}</Text>
                <Text style={styles.childId}>{child.scolariaId}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addChildRow} activeOpacity={0.7}>
            <Ionicons name="add-circle" size={22} color={Colors.cyan} />
            <Text style={styles.addChildText}>Ajouter un enfant</Text>
          </TouchableOpacity>
        </SettingsSection>

        {/* Permissions */}
        <SettingsSection title="Permissions d'accès">
          {PERMISSIONS.map((perm, i) => (
            <TouchableOpacity
              key={perm.id}
              style={[
                styles.permRow,
                i < PERMISSIONS.length - 1 && styles.childRowBorder,
              ]}
              activeOpacity={0.6}
            >
              <Text style={styles.permAvatar}>{perm.avatar}</Text>
              <View style={styles.permInfo}>
                <Text style={styles.permName}>{perm.name}</Text>
                <Text style={styles.permRole}>{perm.role}</Text>
              </View>
              <View style={styles.permAccessBadge}>
                <Text style={styles.permAccessText}>{perm.access}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addChildRow} activeOpacity={0.7}>
            <Ionicons name="person-add" size={20} color={Colors.cyan} />
            <Text style={styles.addChildText}>Gérer les permissions</Text>
          </TouchableOpacity>
        </SettingsSection>

        {/* Language */}
        <SettingsSection title="Langue">
          <TouchableOpacity
            style={styles.langSelected}
            onPress={() => setShowLangPicker(!showLangPicker)}
            activeOpacity={0.7}
          >
            <Text style={styles.langFlag}>
              {LANGUAGES.find((l) => l.code === selectedLang)?.flag}
            </Text>
            <Text style={styles.langLabel}>
              {LANGUAGES.find((l) => l.code === selectedLang)?.label}
            </Text>
            <Ionicons
              name={showLangPicker ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.gray}
            />
          </TouchableOpacity>
          {showLangPicker &&
            LANGUAGES.filter((l) => l.code !== selectedLang).map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={styles.langOption}
                onPress={() => {
                  setSelectedLang(lang.code);
                  setShowLangPicker(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={styles.langOptionLabel}>{lang.label}</Text>
              </TouchableOpacity>
            ))}
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications">
          <SettingsRowItem
            icon="school"
            label="Nouvelles notes"
            sublabel="Alertes à chaque note ajoutée"
            color={Colors.cyan}
            type="toggle"
            toggleValue={notifications.grades}
            onToggle={(v) =>
              setNotifications((p) => ({ ...p, grades: v }))
            }
          />
          <SettingsRowItem
            icon="calendar"
            label="Rappels agenda"
            sublabel="Événements et devoirs à venir"
            color={Colors.violet}
            type="toggle"
            toggleValue={notifications.agenda}
            onToggle={(v) =>
              setNotifications((p) => ({ ...p, agenda: v }))
            }
          />
          <SettingsRowItem
            icon="sparkles"
            label="Conseils Aria"
            sublabel="Recommandations personnalisées"
            color={Colors.pink}
            type="toggle"
            toggleValue={notifications.aria}
            onToggle={(v) =>
              setNotifications((p) => ({ ...p, aria: v }))
            }
          />
          <SettingsRowItem
            icon="heart"
            label="Rappel check-in"
            sublabel="Rappel quotidien Mon Ressenti"
            color={Colors.orange}
            type="toggle"
            toggleValue={notifications.checkin}
            onToggle={(v) =>
              setNotifications((p) => ({ ...p, checkin: v }))
            }
            isLast
          />
        </SettingsSection>

        {/* Privacy & Legal */}
        <SettingsSection title="Confidentialité et légal">
          <SettingsRowItem
            icon="shield-checkmark"
            label="Politique de confidentialité"
            sublabel="RGPD · Protection des données"
            color={Colors.green}
            type="navigate"
          />
          <SettingsRowItem
            icon="document-text"
            label="Conditions d'utilisation"
            color={Colors.cyan}
            type="navigate"
          />
          <SettingsRowItem
            icon="lock-closed"
            label="Chiffrement des données"
            sublabel="AES-256 · Vos données sont sécurisées"
            color={Colors.violet}
            type="value"
            value="Actif ✓"
          />
          <SettingsRowItem
            icon="download"
            label="Exporter mes données"
            sublabel="Télécharger toutes vos données (RGPD)"
            color={Colors.orange}
            type="navigate"
          />
          <SettingsRowItem
            icon="trash"
            label="Supprimer mon compte"
            sublabel="Action irréversible"
            color={Colors.red}
            type="navigate"
            isLast
          />
        </SettingsSection>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Scolaria</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appCopyright}>
            © 2026 Scolaria · Passeport scolaire numérique
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blueNight,
  },
  // Profile header
  profileHeader: {
    marginBottom: 8,
  },
  profileGradient: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
  },
  familyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: Colors.cyan,
  },
  familyAvatarText: {
    fontSize: 30,
  },
  familyName: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 2,
  },
  familyEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  planText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.cyan,
  },
  planSince: {
    fontSize: 12,
    color: Colors.gray,
  },
  body: {
    paddingHorizontal: 20,
  },
  // Children rows
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  childRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(109,40,217,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childAvatarText: {
    fontSize: 22,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  childClasse: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 1,
  },
  childId: {
    fontSize: 11,
    color: Colors.cyan,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  addChildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  addChildText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.cyan,
  },
  // Permissions
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  permAvatar: {
    fontSize: 28,
  },
  permInfo: {
    flex: 1,
  },
  permName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  permRole: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 1,
  },
  permAccessBadge: {
    backgroundColor: 'rgba(109,40,217,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  permAccessText: {
    fontSize: 11,
    color: Colors.violetLight,
    fontWeight: '600',
  },
  // Language
  langSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  langFlag: {
    fontSize: 22,
  },
  langLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  langOptionLabel: {
    fontSize: 15,
    color: Colors.gray,
  },
  // App info
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  appName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.violet,
  },
  appVersion: {
    fontSize: 13,
    color: Colors.gray,
  },
  appCopyright: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 4,
  },
});
