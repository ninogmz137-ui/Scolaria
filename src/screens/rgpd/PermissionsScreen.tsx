import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Switch, Animated, Modal, Alert } from 'react-native';
import {
  Lock,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Check,
  User,
  X,
  Calendar,
  Camera,
  Heart,
  Sparkles,
  Plus,
} from 'lucide-react-native';
import { Colors, SCREEN_BACKGROUND } from '../../constants/colors';
import { TAB_BAR_SCROLL_PADDING } from '../../components/FloatingTabBar';
import { FontFamily } from '../../hooks/useSolariaFonts';
import GlassCard from '../../components/GlassCard';
import RgpdHero from '../../components/rgpd/RgpdHero';
import RgpdSectionLabel from '../../components/rgpd/RgpdSectionLabel';
import { ARIA_INDIGO } from '../../constants/theme';
import RgpdBottomSheet from '../../components/rgpd/RgpdBottomSheet';
import {
  getPermissions,
  updatePermission,
  deletePermission,
  type PersonPermission,
} from '../../services/rgpdService';

// ─── Types ────────────────────────────────────────────────

type AccessLevel = 'tuteur' | 'famille_proche' | 'accompagnant' | 'minimal';

interface AccessLevelConfig {
  key: AccessLevel;
  label: string;
  color: string;
  description: string;
  permissions: string[];
}

interface Person {
  id: string;
  name: string;
  avatar: string;
  role: string;
  email: string;
  level: AccessLevel;
  lastAccess?: string;
  modules: {
    notes: boolean;
    agenda: boolean;
    ressenti: boolean;
    profil: boolean;
    photos: boolean;
    aria: boolean;
  };
}

// ─── Access level definitions ────────────────────────────

const ACCESS_LEVELS: AccessLevelConfig[] = [
  {
    key: 'tuteur',
    label: 'Tuteur légal',
    color: ARIA_INDIGO,
    description: 'Accès complet à toutes les données et paramètres du compte',
    permissions: ['Notes', 'Agenda', 'Ressenti', 'Profil complet', 'Photos', 'Aria', 'Export', 'Suppression'],
  },
  {
    key: 'famille_proche',
    label: 'Famille proche',
    color: ARIA_INDIGO,
    description: 'Accès aux résultats scolaires et au suivi général',
    permissions: ['Notes', 'Agenda', 'Profil (résumé)', 'Photos'],
  },
  {
    key: 'accompagnant',
    label: 'Accompagnant',
    color: ARIA_INDIGO,
    description: 'Accès limité pour le suivi périscolaire',
    permissions: ['Agenda', 'Photos (lecture)', 'Profil (résumé)'],
  },
  {
    key: 'minimal',
    label: 'Accès minimal',
    color: Colors.gray,
    description: 'Consultation du profil de base uniquement',
    permissions: ['Profil (nom, classe)'],
  },
];

// ─── Mock data ────────────────────────────────────────────

const INITIAL_PEOPLE: Person[] = [
  {
    id: '1',
    name: 'Sophie Moreau',
    avatar: '',
    role: 'Mère (Tuteur légal)',
    email: 'sophie.moreau@email.fr',
    level: 'tuteur',
    lastAccess: "Aujourd'hui, 14h32",
    modules: { notes: true, agenda: true, ressenti: true, profil: true, photos: true, aria: true },
  },
  {
    id: '2',
    name: 'Marc Moreau',
    avatar: '',
    role: 'Père (Tuteur légal)',
    email: 'marc.moreau@email.fr',
    level: 'tuteur',
    lastAccess: 'Hier, 20h15',
    modules: { notes: true, agenda: true, ressenti: true, profil: true, photos: true, aria: true },
  },
  {
    id: '3',
    name: 'Marie-Claire Moreau',
    avatar: '',
    role: 'Grand-mère',
    email: 'mc.moreau@email.fr',
    level: 'famille_proche',
    lastAccess: 'Il y a 3 jours',
    modules: { notes: true, agenda: true, ressenti: false, profil: true, photos: true, aria: false },
  },
  {
    id: '4',
    name: 'Assistante maternelle',
    avatar: '',
    role: 'Périscolaire',
    email: 'nourrice@email.fr',
    level: 'accompagnant',
    lastAccess: 'Il y a 1 semaine',
    modules: { notes: false, agenda: true, ressenti: false, profil: true, photos: true, aria: false },
  },
  {
    id: '5',
    name: 'Dr. Martin',
    avatar: '',
    role: 'Médecin scolaire',
    email: 'dr.martin@sante.fr',
    level: 'minimal',
    lastAccess: 'Il y a 2 semaines',
    modules: { notes: false, agenda: false, ressenti: false, profil: true, photos: false, aria: false },
  },
];

// ─── Module toggle config ─────────────────────────────────

const MODULE_CONFIG = [
  { key: 'notes' as const, label: 'Notes & bulletins', Icon: Check, color: ARIA_INDIGO },
  { key: 'agenda' as const, label: 'Agenda', Icon: Calendar, color: ARIA_INDIGO },
  { key: 'ressenti' as const, label: 'Ressenti', Icon: Heart, color: ARIA_INDIGO },
  { key: 'profil' as const, label: 'Profil élève', Icon: User, color: ARIA_INDIGO },
  { key: 'photos' as const, label: 'Photos', Icon: Camera, color: ARIA_INDIGO },
  { key: 'aria' as const, label: 'Aria', Icon: Sparkles, color: ARIA_INDIGO },
];

// ─── Component ────────────────────────────────────────────

export default function PermissionsScreen() {
  const [people, setPeople] = useState(INITIAL_PEOPLE);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadPermissions = useCallback(async () => {
    const data = await getPermissions();
    if (data.length > 0) {
      setPeople(data.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        role: p.role,
        email: p.email ?? '',
        level: p.access_level,
        lastAccess: p.last_access ? new Date(p.last_access).toLocaleDateString('fr-FR') : undefined,
        modules: p.modules as Person['modules'],
      })));
    }
  }, []);

  useEffect(() => {
    loadPermissions();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const getLevelConfig = (level: AccessLevel) =>
    ACCESS_LEVELS.find((l) => l.key === level) || ACCESS_LEVELS[3];

  const initials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return (first + last).toUpperCase();
  };

  const handleSelectPerson = (person: Person) => {
    setSelectedPerson(person);
    setShowModal(true);
  };

  const handleToggleModule = (personId: string, moduleKey: keyof Person['modules']) => {
    const person = people.find((p) => p.id === personId);
    if (!person) return;
    const newModules = { ...person.modules, [moduleKey]: !person.modules[moduleKey] };
    setPeople((prev) =>
      prev.map((p) => (p.id === personId ? { ...p, modules: newModules } : p))
    );
    if (selectedPerson?.id === personId) {
      setSelectedPerson((prev) =>
        prev ? { ...prev, modules: newModules } : prev
      );
    }
    updatePermission(personId, { modules: newModules });
  };

  const handleChangeLevel = (personId: string, newLevel: AccessLevel) => {
    const defaults: Record<AccessLevel, Person['modules']> = {
      tuteur: { notes: true, agenda: true, ressenti: true, profil: true, photos: true, aria: true },
      famille_proche: { notes: true, agenda: true, ressenti: false, profil: true, photos: true, aria: false },
      accompagnant: { notes: false, agenda: true, ressenti: false, profil: true, photos: true, aria: false },
      minimal: { notes: false, agenda: false, ressenti: false, profil: true, photos: false, aria: false },
    };
    setPeople((prev) =>
      prev.map((p) => (p.id === personId ? { ...p, level: newLevel, modules: defaults[newLevel] } : p))
    );
    setSelectedPerson((prev) =>
      prev?.id === personId ? { ...prev, level: newLevel, modules: defaults[newLevel] } : prev
    );
    updatePermission(personId, { access_level: newLevel, modules: defaults[newLevel] });
  };

  const handleRevokeAccess = (personId: string) => {
    Alert.alert(
      'Révoquer l\'accès',
      'Cette personne n\'aura plus accès au profil de l\'enfant. Confirmer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Révoquer',
          style: 'destructive',
          onPress: () => {
            setPeople((prev) => prev.filter((p) => p.id !== personId));
            setShowModal(false);
            setSelectedPerson(null);
            deletePermission(personId);
          },
        },
      ]
    );
  };

  return (
    <RgpdBottomSheet>
      <Animated.View style={{ opacity: fadeAnim }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 56,
            paddingBottom: TAB_BAR_SCROLL_PADDING,
            paddingHorizontal: 18,
          }}
        >
          <RgpdHero
            Icon={Lock}
            title="Contrôle d’accès"
            subtitle="Définissez précisément qui peut voir quoi. Chaque modification est journalisée."
          />

          {/* Access levels legend */}
          <Pressable onPress={() => setShowLevelInfo(!showLevelInfo)}>
            <GlassCard style={[styles.cardBorder, { marginTop: 12, marginBottom: 8 }]}>
              <View style={styles.infoRow}>
                <View style={styles.miniIconWrap}>
                  <Info size={18} color={ARIA_INDIGO} />
                </View>
                <Text style={[styles.infoTitle, { flex: 1 }]}>4 niveaux d’accès</Text>
                {showLevelInfo ? (
                  <ChevronUp size={18} color={Colors.textMuted} />
                ) : (
                  <ChevronDown size={18} color={Colors.textMuted} />
                )}
              </View>
            </GlassCard>
          </Pressable>

          {showLevelInfo && (
            <GlassCard noPadding style={[styles.cardBorder, { marginBottom: 14 }]}>
              {ACCESS_LEVELS.map((level, i) => (
                <View
                  key={level.key}
                  style={[
                    styles.levelRow,
                    i < ACCESS_LEVELS.length - 1 && styles.rowBorder,
                  ]}
                >
                  <View style={[styles.levelIcon, { backgroundColor: 'rgba(67,56,202,0.08)', borderColor: 'rgba(67,56,202,0.14)' }]}>
                    <Lock size={18} color={level.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.levelLabel}>{level.label}</Text>
                    <Text style={styles.levelDesc}>{level.description}</Text>
                    <View style={styles.pillRow}>
                      {level.permissions.map((p) => (
                        <View key={p} style={[styles.pill, { backgroundColor: 'rgba(67,56,202,0.08)', borderColor: 'rgba(67,56,202,0.12)' }]}>
                          <Text style={[styles.pillText, { color: Colors.textSecondary }]}>{p}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </GlassCard>
          )}

          {/* Section label */}
          <RgpdSectionLabel style={{ marginTop: 8, marginBottom: 8 }}>Personnes autorisées</RgpdSectionLabel>

          {/* People list */}
          <GlassCard noPadding style={[styles.cardBorder, { marginBottom: 12 }]}>
            {people.map((person, i) => {
              const levelCfg = getLevelConfig(person.level);
              return (
                <Pressable
                  key={person.id}
                  style={[styles.personRow, i < people.length - 1 && styles.rowBorder]}
                  onPress={() => handleSelectPerson(person)}
                >
                  <View style={[styles.avatarCircle, { borderColor: 'rgba(67,56,202,0.18)' }]}>
                    <Text style={styles.avatarText}>{initials(person.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{person.name}</Text>
                    <Text style={styles.personRole}>{person.role}</Text>
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: 'rgba(67,56,202,0.08)', borderColor: 'rgba(67,56,202,0.14)' }]}>
                    <Text style={[styles.levelBadgeText, { color: levelCfg.color }]}>{levelCfg.label}</Text>
                  </View>
                  <ChevronRight size={18} color={Colors.textMuted} />
                </Pressable>
              );
            })}
          </GlassCard>

          {/* Add person */}
          <GlassCard style={[styles.cardBorder, { borderStyle: 'dashed', borderColor: 'rgba(67,56,202,0.28)' }]}>
            <View style={styles.addRow}>
              <Plus size={20} color={ARIA_INDIGO} />
              <Text style={[styles.levelLabel, { color: Colors.textPrimary, marginLeft: 10 }]}>Inviter une personne</Text>
            </View>
          </GlassCard>

          {/* Stats */}
          <View style={styles.statsRow}>
            <GlassCard style={[styles.cardBorder, styles.statCard]}>
              <Text style={[styles.statValue, { color: Colors.textPrimary }]}>{people.length}</Text>
              <Text style={styles.statLabel}>Personnes</Text>
            </GlassCard>
            <GlassCard style={[styles.cardBorder, styles.statCard]}>
              <Text style={[styles.statValue, { color: Colors.textPrimary }]}>
                {people.filter((p) => p.level === 'tuteur').length}
              </Text>
              <Text style={styles.statLabel}>Tuteurs</Text>
            </GlassCard>
            <GlassCard style={[styles.cardBorder, styles.statCard]}>
              <Text style={[styles.statValue, { color: Colors.textPrimary }]}>6</Text>
              <Text style={styles.statLabel}>Modules</Text>
            </GlassCard>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Detail Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {selectedPerson && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: TAB_BAR_SCROLL_PADDING }}
              >
                {/* Person header */}
                <View style={styles.personHeader}>
                  <View style={[styles.avatarCircleLg, { borderColor: 'rgba(67,56,202,0.18)' }]}>
                    <Text style={styles.avatarTextLg}>{initials(selectedPerson.name)}</Text>
                  </View>
                  <Text style={styles.modalName}>{selectedPerson.name}</Text>
                  <Text style={styles.modalRole}>{selectedPerson.role}</Text>
                  <Text style={[styles.modalEmail, { color: Colors.textSecondary }]}>{selectedPerson.email}</Text>
                  {selectedPerson.lastAccess && (
                    <Text style={styles.modalLastAccess}>Dernier accès : {selectedPerson.lastAccess}</Text>
                  )}
                </View>

                {/* Level selector */}
                <RgpdSectionLabel style={{ marginBottom: 8 }}>Niveau d’accès</RgpdSectionLabel>
                <GlassCard noPadding style={[styles.cardBorder, { marginBottom: 16 }]}>
                  {ACCESS_LEVELS.map((level, i) => {
                    const isSelected = selectedPerson.level === level.key;
                    return (
                      <Pressable
                        key={level.key}
                        style={[
                          styles.levelSelectRow,
                          i < ACCESS_LEVELS.length - 1 && styles.rowBorder,
                          isSelected && { backgroundColor: 'rgba(67,56,202,0.06)' },
                        ]}
                        onPress={() => handleChangeLevel(selectedPerson.id, level.key)}
                      >
                        <View style={[styles.miniIconWrap, { backgroundColor: 'rgba(67,56,202,0.08)', borderColor: 'rgba(67,56,202,0.14)' }]}>
                          <Lock size={16} color={level.color} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.personName}>{level.label}</Text>
                          <Text style={styles.personRole} numberOfLines={1}>{level.description}</Text>
                        </View>
                        {isSelected && <Check size={22} color={level.color} />}
                      </Pressable>
                    );
                  })}
                </GlassCard>

                {/* Module toggles */}
                <RgpdSectionLabel style={{ marginBottom: 8 }}>Modules autorisés</RgpdSectionLabel>
                <GlassCard noPadding style={[styles.cardBorder, { marginBottom: 16 }]}>
                  {MODULE_CONFIG.map((mod, i) => (
                    <View
                      key={mod.key}
                      style={[styles.moduleRow, i < MODULE_CONFIG.length - 1 && styles.rowBorder]}
                    >
                      <View style={[styles.moduleIcon, { backgroundColor: mod.color + '20' }]}>
                        <mod.Icon size={16} color={mod.color} />
                      </View>
                      <Text style={[styles.personName, { flex: 1, marginLeft: 12 }]}>{mod.label}</Text>
                      <Switch
                        value={selectedPerson.modules[mod.key]}
                        onValueChange={() => handleToggleModule(selectedPerson.id, mod.key)}
                        trackColor={{ false: '#E2E8F0', true: 'rgba(67,56,202,0.35)' }}
                        thumbColor={selectedPerson.modules[mod.key] ? ARIA_INDIGO : '#CBD5E1'}
                      />
                    </View>
                  ))}
                </GlassCard>

                {/* Actions */}
                <View style={{ gap: 10, marginBottom: 24 }}>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: Colors.red + '15', borderWidth: 1, borderColor: Colors.red + '30' }]}
                    onPress={() => handleRevokeAccess(selectedPerson.id)}
                  >
                    <X size={20} color={Colors.red} />
                    <Text style={[styles.actionText, { color: Colors.red }]}>Révoquer l'accès</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' }]}
                    onPress={() => setShowModal(false)}
                  >
                    <Text style={[styles.actionText, { color: '#1A2340' }]}>Fermer</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </RgpdBottomSheet>
  );
}

const styles = StyleSheet.create({
  cardBorder: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  miniIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(67,56,202,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(67,56,202,0.14)',
  },
  infoTitle: { fontFamily: FontFamily.sansSemiBold, fontSize: 15, color: Colors.textPrimary },
  infoSubtitle: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },
  levelRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  levelSelectRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  levelIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  levelLabel: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: Colors.textPrimary },
  levelDesc: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillText: { fontFamily: FontFamily.sansSemiBold, fontSize: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  personRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.92)' },
  avatarText: { fontFamily: FontFamily.sansBold, fontSize: 14, color: Colors.textPrimary },
  personName: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: Colors.textPrimary },
  personRole: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  levelBadgeText: { fontFamily: FontFamily.sansSemiBold, fontSize: 11 },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 20 },
  statValue: { fontFamily: FontFamily.sansBold, fontSize: 24 },
  statLabel: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  moduleRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  moduleIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: SCREEN_BACKGROUND, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 18, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  personHeader: { alignItems: 'center', marginBottom: 20 },
  avatarCircleLg: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 3, backgroundColor: '#F8FAFC', marginBottom: 10 },
  avatarTextLg: { fontFamily: FontFamily.sansBold, fontSize: 20, color: Colors.textPrimary },
  modalName: { fontFamily: FontFamily.sansBold, fontSize: 20, color: '#1A2340' },
  modalRole: { fontFamily: FontFamily.sansRegular, fontSize: 13, color: '#94A3B8', marginTop: 2 },
  modalEmail: { fontFamily: FontFamily.sansRegular, fontSize: 12, marginTop: 4 },
  modalLastAccess: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: '#CBD5E1', marginTop: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14 },
  actionText: { fontFamily: FontFamily.sansBold, fontSize: 15 },
});
