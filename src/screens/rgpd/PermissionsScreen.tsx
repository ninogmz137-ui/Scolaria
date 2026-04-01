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
  Cross,
  Calendar,
  Camera,
  Heart,
  Sparkles,
  Plus,
} from '@getpapillon/papicons';
import { Colors } from '../../constants/colors';
import { useChildTheme } from '../../contexts/ChildThemeContext';
import WallpaperBackground from '../../components/WallpaperBackground';
import GlassCard from '../../components/GlassCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../../components/FloatingTabBar';
import { FontFamily } from '../../hooks/useSolariaFonts';
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
  emoji: string;
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
    emoji: '👑',
    color: Colors.violet,
    description: 'Accès complet à toutes les données et paramètres du compte',
    permissions: ['Notes', 'Agenda', 'Ressenti', 'Profil complet', 'Photos', 'Aria', 'Export', 'Suppression'],
  },
  {
    key: 'famille_proche',
    label: 'Famille proche',
    emoji: '👨‍👩‍👧',
    color: Colors.cyan,
    description: 'Accès aux résultats scolaires et au suivi général',
    permissions: ['Notes', 'Agenda', 'Profil (résumé)', 'Photos'],
  },
  {
    key: 'accompagnant',
    label: 'Accompagnant',
    emoji: '🤝',
    color: Colors.orange,
    description: 'Accès limité pour le suivi périscolaire',
    permissions: ['Agenda', 'Photos (lecture)', 'Profil (résumé)'],
  },
  {
    key: 'minimal',
    label: 'Accès minimal',
    emoji: '👁️',
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
    avatar: '👩',
    role: 'Mère (Tuteur légal)',
    email: 'sophie.moreau@email.fr',
    level: 'tuteur',
    lastAccess: "Aujourd'hui, 14h32",
    modules: { notes: true, agenda: true, ressenti: true, profil: true, photos: true, aria: true },
  },
  {
    id: '2',
    name: 'Marc Moreau',
    avatar: '👨',
    role: 'Père (Tuteur légal)',
    email: 'marc.moreau@email.fr',
    level: 'tuteur',
    lastAccess: 'Hier, 20h15',
    modules: { notes: true, agenda: true, ressenti: true, profil: true, photos: true, aria: true },
  },
  {
    id: '3',
    name: 'Marie-Claire Moreau',
    avatar: '👵',
    role: 'Grand-mère',
    email: 'mc.moreau@email.fr',
    level: 'famille_proche',
    lastAccess: 'Il y a 3 jours',
    modules: { notes: true, agenda: true, ressenti: false, profil: true, photos: true, aria: false },
  },
  {
    id: '4',
    name: 'Assistante maternelle',
    avatar: '👩‍🏫',
    role: 'Périscolaire',
    email: 'nourrice@email.fr',
    level: 'accompagnant',
    lastAccess: 'Il y a 1 semaine',
    modules: { notes: false, agenda: true, ressenti: false, profil: true, photos: true, aria: false },
  },
  {
    id: '5',
    name: 'Dr. Martin',
    avatar: '👩‍⚕️',
    role: 'Médecin scolaire',
    email: 'dr.martin@sante.fr',
    level: 'minimal',
    lastAccess: 'Il y a 2 semaines',
    modules: { notes: false, agenda: false, ressenti: false, profil: true, photos: false, aria: false },
  },
];

// ─── Module toggle config ─────────────────────────────────

const MODULE_CONFIG = [
  { key: 'notes' as const, label: 'Notes & bulletins', Icon: Check, color: Colors.cyan },
  { key: 'agenda' as const, label: 'Agenda', Icon: Calendar, color: Colors.violet },
  { key: 'ressenti' as const, label: 'Ressenti', Icon: Heart, color: Colors.pink },
  { key: 'profil' as const, label: 'Profil enfant', Icon: User, color: Colors.green },
  { key: 'photos' as const, label: 'Photos', Icon: Camera, color: Colors.orange },
  { key: 'aria' as const, label: 'Aria IA', Icon: Sparkles, color: Colors.violetLight },
];

// ─── Component ────────────────────────────────────────────

export default function PermissionsScreen() {
  const { theme } = useChildTheme();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;
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
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <View style={{ flex: 1 }}>
        <WallpaperBackground />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: TOPBAR_H + 12,
            paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10,
            paddingHorizontal: 18,
          }}
        >
          {/* Header info */}
          <GlassCard style={[styles.card, { borderColor: Colors.green + '60', marginBottom: 14 }]}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: Colors.green + '20' }]}>
                <Lock size={24} color={Colors.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>RGPD — Contrôle d'accès</Text>
                <Text style={styles.infoSubtitle}>
                  Définissez précisément qui peut voir quoi. Chaque modification est journalisée.
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Access levels legend */}
          <Pressable onPress={() => setShowLevelInfo(!showLevelInfo)}>
            <GlassCard style={[styles.card, { marginBottom: 8 }]}>
              <View style={styles.infoRow}>
                <Info size={20} color={Colors.cyan} />
                <Text style={[styles.infoTitle, { flex: 1, marginLeft: 10 }]}>4 niveaux d'accès</Text>
                {showLevelInfo
                  ? <ChevronUp size={18} color="rgba(255,255,255,0.5)" />
                  : <ChevronDown size={18} color="rgba(255,255,255,0.5)" />
                }
              </View>
            </GlassCard>
          </Pressable>

          {showLevelInfo && (
            <GlassCard style={[styles.card, { marginBottom: 14 }]} noPadding>
              {ACCESS_LEVELS.map((level, i) => (
                <View
                  key={level.key}
                  style={[
                    styles.levelRow,
                    i < ACCESS_LEVELS.length - 1 && styles.rowBorder,
                  ]}
                >
                  <View style={[styles.levelIcon, { backgroundColor: level.color + '20' }]}>
                    <Text style={styles.levelEmoji}>{level.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.levelLabel}>{level.label}</Text>
                    <Text style={styles.levelDesc}>{level.description}</Text>
                    <View style={styles.pillRow}>
                      {level.permissions.map((p) => (
                        <View key={p} style={[styles.pill, { backgroundColor: level.color + '20' }]}>
                          <Text style={[styles.pillText, { color: level.color }]}>{p}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </GlassCard>
          )}

          {/* Section label */}
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionBar, { backgroundColor: Colors.cyan }]} />
            <Text style={styles.sectionLabel}>PERSONNES AUTORISÉES</Text>
          </View>

          {/* People list */}
          <GlassCard style={[styles.card, { marginBottom: 12 }]} noPadding>
            {people.map((person, i) => {
              const levelCfg = getLevelConfig(person.level);
              return (
                <Pressable
                  key={person.id}
                  style={[styles.personRow, i < people.length - 1 && styles.rowBorder]}
                  onPress={() => handleSelectPerson(person)}
                >
                  <View style={[styles.avatarCircle, { borderColor: levelCfg.color }]}>
                    <Text style={styles.avatarText}>{person.avatar}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{person.name}</Text>
                    <Text style={styles.personRole}>{person.role}</Text>
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: levelCfg.color + '25' }]}>
                    <Text style={[styles.levelBadgeText, { color: levelCfg.color }]}>{levelCfg.label}</Text>
                  </View>
                  <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
                </Pressable>
              );
            })}
          </GlassCard>

          {/* Add person */}
          <GlassCard style={[styles.card, { borderStyle: 'dashed', borderColor: Colors.cyan + '40' }]}>
            <View style={styles.addRow}>
              <Plus size={20} color={Colors.cyan} />
              <Text style={[styles.levelLabel, { color: Colors.cyan, marginLeft: 10 }]}>Inviter une personne</Text>
            </View>
          </GlassCard>

          {/* Stats */}
          <View style={styles.statsRow}>
            <GlassCard style={styles.statCard}>
              <Text style={[styles.statValue, { color: Colors.cyan }]}>{people.length}</Text>
              <Text style={styles.statLabel}>Personnes</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={[styles.statValue, { color: Colors.violet }]}>
                {people.filter((p) => p.level === 'tuteur').length}
              </Text>
              <Text style={styles.statLabel}>Tuteurs</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={[styles.statValue, { color: Colors.green }]}>6</Text>
              <Text style={styles.statLabel}>Modules</Text>
            </GlassCard>
          </View>
        </ScrollView>

        {/* Detail Modal */}
        <Modal visible={showModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              {selectedPerson && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Person header */}
                  <View style={styles.personHeader}>
                    <View style={[styles.avatarCircleLg, { borderColor: getLevelConfig(selectedPerson.level).color }]}>
                      <Text style={styles.avatarTextLg}>{selectedPerson.avatar}</Text>
                    </View>
                    <Text style={styles.modalName}>{selectedPerson.name}</Text>
                    <Text style={styles.modalRole}>{selectedPerson.role}</Text>
                    <Text style={[styles.modalEmail, { color: Colors.cyan }]}>{selectedPerson.email}</Text>
                    {selectedPerson.lastAccess && (
                      <Text style={styles.modalLastAccess}>Dernier accès : {selectedPerson.lastAccess}</Text>
                    )}
                  </View>

                  {/* Level selector */}
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionBar, { backgroundColor: Colors.violet }]} />
                    <Text style={styles.sectionLabel}>NIVEAU D'ACCÈS</Text>
                  </View>
                  <GlassCard style={{ marginBottom: 16 }} noPadding>
                    {ACCESS_LEVELS.map((level, i) => {
                      const isSelected = selectedPerson.level === level.key;
                      return (
                        <Pressable
                          key={level.key}
                          style={[
                            styles.levelSelectRow,
                            i < ACCESS_LEVELS.length - 1 && styles.rowBorder,
                            isSelected && { backgroundColor: level.color + '15' },
                          ]}
                          onPress={() => handleChangeLevel(selectedPerson.id, level.key)}
                        >
                          <Text style={styles.levelEmoji}>{level.emoji}</Text>
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
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionBar, { backgroundColor: Colors.cyan }]} />
                    <Text style={styles.sectionLabel}>MODULES AUTORISÉS</Text>
                  </View>
                  <GlassCard style={{ marginBottom: 16 }} noPadding>
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
                          trackColor={{ false: Colors.darkGray, true: mod.color + '60' }}
                          thumbColor={selectedPerson.modules[mod.key] ? mod.color : Colors.gray}
                        />
                      </View>
                    ))}
                  </GlassCard>

                  {/* Actions */}
                  <View style={{ gap: 10, marginBottom: 24 }}>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: Colors.red + '20' }]}
                      onPress={() => handleRevokeAccess(selectedPerson.id)}
                    >
                      <Cross size={20} color={Colors.red} />
                      <Text style={[styles.actionText, { color: Colors.red }]}>Révoquer l'accès</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}
                      onPress={() => setShowModal(false)}
                    >
                      <Text style={[styles.actionText, { color: '#fff' }]}>Fermer</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </Animated.View>
  );
}

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.4)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
};

const styles = StyleSheet.create({
  card: { marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  infoTitle: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#fff', ...TEXT_SHADOW },
  infoSubtitle: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2, lineHeight: 17 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 6 },
  sectionBar: { width: 4, height: 16, borderRadius: 2 },
  sectionLabel: { fontFamily: FontFamily.sansBold, fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, ...TEXT_SHADOW },
  levelRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  levelSelectRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  levelIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  levelEmoji: { fontSize: 22 },
  levelLabel: { fontFamily: FontFamily.sansBold, fontSize: 14, color: '#fff', ...TEXT_SHADOW },
  levelDesc: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  pillText: { fontFamily: FontFamily.sansSemiBold, fontSize: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)' },
  personRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  avatarText: { fontSize: 22 },
  personName: { fontFamily: FontFamily.sansBold, fontSize: 14, color: '#fff', ...TEXT_SHADOW },
  personRole: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  levelBadgeText: { fontFamily: FontFamily.sansSemiBold, fontSize: 11 },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue: { fontFamily: FontFamily.sansBold, fontSize: 24, ...TEXT_SHADOW },
  statLabel: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, ...TEXT_SHADOW },
  moduleRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  moduleIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { backgroundColor: '#1A2340', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 18, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginBottom: 16 },
  personHeader: { alignItems: 'center', marginBottom: 20 },
  avatarCircleLg: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 3, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 10 },
  avatarTextLg: { fontSize: 32 },
  modalName: { fontFamily: FontFamily.sansBold, fontSize: 20, color: '#fff', ...TEXT_SHADOW },
  modalRole: { fontFamily: FontFamily.sansRegular, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  modalEmail: { fontFamily: FontFamily.sansRegular, fontSize: 12, marginTop: 4 },
  modalLastAccess: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14 },
  actionText: { fontFamily: FontFamily.sansBold, fontSize: 15 },
});
