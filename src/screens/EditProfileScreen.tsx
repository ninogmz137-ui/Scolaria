import { useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Bell,
  Moon,
  Lock,
  Database,
  Settings,
  HelpCircle,
  Star,
  FileText,
  LogOut,
  Pencil,
  Plus,
  School,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useWallpaper, WALLPAPERS } from '../contexts/WallpaperContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import ScolariaSymbol from '../components/ScolariaSymbol';
import { Text } from '../components/ui';

// ─── Tokens ────────────────────────────────────────────
const NAVY = '#0F172A';
const INDIGO = '#4338CA';
const BORDER_L = 'rgba(15,23,42,0.05)';
const TEXT55 = 'rgba(15,23,42,0.55)';
const TEXT35 = 'rgba(15,23,42,0.35)';
const CARD_BG = '#FFFFFF';
const BG = '#F2F1EE';

// ─── Child avatar colors (cycling) ─────────────────────
/** Indigo neutre en attendant la couleur personnelle de l'enfant (phase A). */
const CHILD_AVATAR_BG = '#4338CA';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── SheetHandle ───────────────────────────────────────
function SheetHandle() {
  return (
    <View style={st.handleWrap}>
      <View style={st.handle} />
    </View>
  );
}

// ─── SettingsGroup ─────────────────────────────────────
function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={st.groupWrap}>
      {title.trim().length > 0 && (
        <Text style={st.groupTitle}>{title.toUpperCase()}</Text>
      )}
      <View style={st.groupCard}>{children}</View>
    </View>
  );
}

// ─── SettingsRow ───────────────────────────────────────
interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  danger?: boolean;
  toggle?: boolean;
  last?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
}
function SettingsRow({ icon, label, value, danger, toggle, last, onToggle, onPress }: SettingsRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [st.settingsRow, !last && st.settingsRowBorder, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={[st.rowIconBox, danger && st.rowIconBoxDanger]}>{icon}</View>
      <Text style={[st.rowLabel, danger && st.rowLabelDanger]} numberOfLines={1}>
        {label}
      </Text>
      {value !== undefined && (
        <Text style={st.rowValue} numberOfLines={1}>{value}</Text>
      )}
      {toggle !== undefined ? (
        <Switch
          value={toggle}
          onValueChange={onToggle}
          trackColor={{ false: 'rgba(15,23,42,0.18)', true: INDIGO }}
          thumbColor={CARD_BG}
          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
        />
      ) : !danger && (
        <Text style={st.rowChevron}>›</Text>
      )}
    </Pressable>
  );
}

// ─── WallpaperPicker ───────────────────────────────────
function WallpaperPicker() {
  const { wallpaper, setWallpaperId } = useWallpaper();

  return (
    <View style={[st.settingsRow, st.settingsRowBorder, { flexDirection: 'column', alignItems: 'stretch', gap: 0, paddingVertical: 14, paddingHorizontal: 0 }]}>
      <Text style={[st.rowLabel, { paddingHorizontal: 14, marginBottom: 10 }]}>Fond d'écran</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 10, flexDirection: 'row' }}
      >
        {WALLPAPERS.map((w) => {
          const active = wallpaper.id === w.id;
          return (
            <Pressable
              key={w.id}
              onPress={() => setWallpaperId(w.id)}
              style={{ alignItems: 'center', gap: 6 }}
            >
              <View
                style={[
                  st.wallpaperThumb,
                  active && st.wallpaperThumbActive,
                ]}
              >
                <LinearGradient
                  colors={[w.colors[0], w.colors[w.colors.length - 1]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.4, y: 1 }}
                  style={{ flex: 1, borderRadius: 10 }}
                />
                {active && (
                  <View style={st.wallpaperCheck}>
                    <Text style={{ color: CARD_BG, fontSize: 9, fontFamily: FontFamily.sansBold }}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={[st.wallpaperLabel, active && { color: NAVY }]} numberOfLines={1}>
                {w.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── AriaTuningRow ─────────────────────────────────────
const ARIA_TONES = ['Calme', 'Concis', 'Encourageant', 'Détaillé'];
function AriaTuningRow() {
  const [active, setActive] = useState('Calme');
  return (
    <View style={st.ariaTuning}>
      <View style={st.ariaTuningHeader}>
        <ScolariaSymbol size={14} color={INDIGO} />
        <Text style={st.ariaTuningTitle}>Personnalité d'Aria</Text>
      </View>
      <Text style={st.ariaTuningBody}>Choisis le ton qu'Aria utilise quand elle te parle.</Text>
      <View style={st.ariaTones}>
        {ARIA_TONES.map((tone) => (
          <Pressable
            key={tone}
            onPress={() => setActive(tone)}
            style={[st.tonePill, active === tone && st.tonePillActive]}
          >
            <Text style={[st.tonePillText, active === tone && st.tonePillTextActive]}>
              {tone}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────
export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const { children: childList, selectedChildId, selectChild } = useActiveChild();

  const [ariaEnabled, setAriaEnabled] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  const parentName = user?.user_metadata?.full_name ?? user?.user_metadata?.family_name
    ? `${user.user_metadata.full_name ?? user.user_metadata.family_name}`
    : 'Parent Scolaria';
  const parentEmail = user?.email ?? 'parent@scolaria.fr';
  const parentInitials = getInitials(parentName);
  const familyLabel = `${parentName} · Famille de ${childList.length} enfant${childList.length > 1 ? 's' : ''}`;

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: () => signOut() },
      ],
    );
  };

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F2F1EE' }]} />

      {/* White sheet */}
      <View style={st.sheet}>
        <SheetHandle />

        {/* Header */}
        <View style={st.header}>
          <View style={{ flex: 1 }}>
            <Text style={st.headerTitle}>Mon compte</Text>
            <Text style={st.headerSub} numberOfLines={1}>{familyLabel}</Text>
          </View>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [st.closeBtn, pressed && { opacity: 0.6 }]}
            accessibilityLabel="Fermer"
          >
            <X size={20} color={TEXT55} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        >
          {/* Children carousel */}
          <View style={st.carouselSection}>
            <View style={st.carouselHeader}>
              <Text style={st.carouselLabel}>MES ENFANTS</Text>
              <Pressable><Text style={st.carouselManage}>Gérer</Text></Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 14, gap: 10, flexDirection: 'row', paddingBottom: 4 }}
            >
              {childList.map((child) => {
                const selected = child.id === selectedChildId;
                const initials = getInitials(child.name);
                return (
                  <Pressable
                    key={child.id}
                    onPress={() => selectChild(child.id)}
                    style={[st.childCard, selected && st.childCardSelected]}
                  >
                    <View style={[st.childAvatar, { backgroundColor: CHILD_AVATAR_BG }]}>
                      <Text style={st.childAvatarText}>{initials}</Text>
                    </View>
                    <Text style={st.childName}>{child.name.split(' ')[0]}</Text>
                    <Text style={st.childGrade} numberOfLines={1}>{child.classe}</Text>
                    {selected && (
                      <View style={st.activeBadge}>
                        <Text style={st.activeBadgeText}>ACTIF</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
              {/* Add card */}
              <View style={st.addCard}>
                <View style={st.addIcon}>
                  <Plus size={18} color={TEXT55} strokeWidth={2.2} />
                </View>
                <Text style={st.addLabel}>Ajouter</Text>
                <Text style={st.addSub}>Nouvelle école</Text>
              </View>
            </ScrollView>
          </View>

          {/* Parent row */}
          <View style={st.parentRow}>
            <View style={[st.parentAvatar, { backgroundColor: '#4338CA' }]}>
              <Text style={st.parentInitials}>{parentInitials}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.parentName} numberOfLines={1}>{parentName}</Text>
              <Text style={st.parentEmail} numberOfLines={1}>{parentEmail}</Text>
            </View>
            <Pressable style={st.editBtn}>
              <Pencil size={13} color={TEXT55} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Apparence */}
          <SettingsGroup title="Apparence">
            <WallpaperPicker />
            <SettingsRow
              icon={<Moon size={15} color={TEXT55} strokeWidth={1.9} />}
              label="Thème"
              value="Auto"
              last
            />
          </SettingsGroup>

          {/* Préférences Aria */}
          <SettingsGroup title="Préférences Aria">
            <SettingsRow
              icon={<ScolariaSymbol size={15} color={TEXT55} />}
              label="Aria activée partout"
              toggle={ariaEnabled}
              onToggle={setAriaEnabled}
            />
            <SettingsRow
              icon={<Bell size={15} color={TEXT55} strokeWidth={1.8} />}
              label="Résumé quotidien"
              value="8h00"
            />
            <View style={{ borderTopWidth: 1, borderTopColor: BORDER_L }}>
              <AriaTuningRow />
            </View>
          </SettingsGroup>

          {/* Notifications */}
          <SettingsGroup title="Notifications">
            <SettingsRow
              icon={<Bell size={15} color={TEXT55} strokeWidth={1.8} />}
              label="Messages école"
              value="Tous"
            />
            <SettingsRow
              icon={<Bell size={15} color={TEXT55} strokeWidth={1.8} />}
              label="Notes & contrôles"
              value="Importantes"
            />
            <SettingsRow
              icon={<Bell size={15} color={TEXT55} strokeWidth={1.8} />}
              label="Rappels Agenda"
              toggle={remindersEnabled}
              onToggle={setRemindersEnabled}
            />
            <SettingsRow
              icon={<Moon size={15} color={TEXT55} strokeWidth={1.9} />}
              label="Ne pas déranger"
              value="22h – 7h"
              last
            />
          </SettingsGroup>

          {/* Sécurité */}
          <SettingsGroup title="Sécurité & vie privée">
            <SettingsRow
              icon={<Lock size={15} color={TEXT55} strokeWidth={1.9} />}
              label="Code de déverrouillage"
              value="Face ID"
            />
            <SettingsRow
              icon={<Database size={15} color={TEXT55} strokeWidth={1.8} />}
              label="Mes données"
              value="Exporter"
              last
            />
          </SettingsGroup>

          {/* Compte */}
          <SettingsGroup title="Compte">
            <SettingsRow
              icon={<Settings size={15} color={TEXT55} strokeWidth={1.8} />}
              label="Détails du compte"
              value={parentName.split(' ')[0]}
            />
            <SettingsRow
              icon={<Star size={15} color={TEXT55} strokeWidth={1.9} />}
              label="Abonnement"
              value="Gratuit"
            />
            <SettingsRow
              icon={<School size={15} color={TEXT55} strokeWidth={1.9} />}
              label="Établissements connectés"
              value={String(childList.length)}
              last
            />
          </SettingsGroup>

          {/* Aide & légal */}
          <SettingsGroup title="Aide & légal">
            <SettingsRow
              icon={<HelpCircle size={15} color={TEXT55} strokeWidth={1.9} />}
              label="Centre d'aide"
            />
            <SettingsRow
              icon={<FileText size={15} color={TEXT55} strokeWidth={1.8} />}
              label="Conditions d'utilisation"
            />
            <SettingsRow
              icon={<FileText size={15} color={TEXT55} strokeWidth={1.8} />}
              label="Politique de confidentialité"
            />
            <SettingsRow
              icon={<Star size={15} color={TEXT55} strokeWidth={1.9} />}
              label="Noter Scolaria"
              last
            />
          </SettingsGroup>

          {/* Déconnexion */}
          <SettingsGroup title=" ">
            <SettingsRow
              icon={<LogOut size={15} color="#DC2626" strokeWidth={1.9} />}
              label="Se déconnecter"
              danger
              last
              onPress={handleLogout}
            />
          </SettingsGroup>

          <Text style={st.version}>Scolaria · v1.0.0</Text>
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────
const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  sheet: {
    flex: 1,
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 48,
    overflow: 'hidden',
  },

  // Handle
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.18)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 22,
    color: NAVY,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: TEXT55,
    letterSpacing: -0.05,
    marginTop: 1,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Children carousel
  carouselSection: {
    paddingBottom: 10,
  },
  carouselHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  carouselLabel: {
    flex: 1,
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: TEXT35,
    letterSpacing: 0.8,
  },
  carouselManage: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: NAVY,
    letterSpacing: -0.05,
  },
  childCard: {
    flexShrink: 0,
    width: 148,
    padding: 12,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_L,
  },
  childCardSelected: {
    borderWidth: 2,
    borderColor: NAVY,
  },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  childAvatarText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 17,
    color: CARD_BG,
    letterSpacing: -0.3,
  },
  childName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: NAVY,
    letterSpacing: -0.25,
  },
  childGrade: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: TEXT55,
    marginTop: 1,
  },
  activeBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: NAVY,
  },
  activeBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10,
    color: CARD_BG,
    letterSpacing: 0.4,
  },
  addCard: {
    flexShrink: 0,
    width: 110,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.16)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: NAVY,
    letterSpacing: -0.1,
  },
  addSub: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 10,
    color: TEXT35,
    letterSpacing: -0.05,
    textAlign: 'center',
    marginTop: -4,
  },

  // Parent row
  parentRow: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 14,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_L,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  parentAvatar: {
    width: 46,
    height: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  parentInitials: {
    fontFamily: FontFamily.sansBold,
    fontSize: 17,
    color: CARD_BG,
    letterSpacing: -0.3,
  },
  parentName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: NAVY,
    letterSpacing: -0.25,
  },
  parentEmail: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: TEXT55,
    letterSpacing: -0.05,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Settings group
  groupWrap: {
    marginBottom: 6,
  },
  groupTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: TEXT35,
    letterSpacing: 0.8,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
  },
  groupCard: {
    marginHorizontal: 14,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_L,
    overflow: 'hidden',
  },

  // Settings row
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER_L,
  },
  rowIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowIconBoxDanger: {
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  rowLabel: {
    flex: 1,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: NAVY,
    letterSpacing: -0.15,
  },
  rowLabelDanger: {
    color: '#DC2626',
  },
  rowValue: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12.5,
    color: TEXT55,
    letterSpacing: -0.05,
    maxWidth: 140,
  },
  rowChevron: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 18,
    color: TEXT35,
    marginLeft: 4,
  },

  // Wallpaper
  wallpaperThumb: {
    width: 60,
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_L,
    overflow: 'hidden',
  },
  wallpaperThumbActive: {
    borderWidth: 2.5,
    borderColor: NAVY,
  },
  wallpaperCheck: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallpaperLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: TEXT55,
    letterSpacing: -0.05,
  },

  // Aria tuning
  ariaTuning: {
    padding: 14,
    backgroundColor: '#EEF2FF',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  ariaTuningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ariaTuningTitle: {
    flex: 1,
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: INDIGO,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  ariaTuningBody: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: NAVY,
    letterSpacing: -0.1,
    lineHeight: 18,
    marginBottom: 10,
  },
  ariaTones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tonePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_L,
  },
  tonePillActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  tonePillText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
    color: NAVY,
    letterSpacing: -0.05,
  },
  tonePillTextActive: {
    color: CARD_BG,
  },

  // Version footer
  version: {
    textAlign: 'center',
    marginTop: 18,
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: TEXT35,
    letterSpacing: -0.05,
  },
});
