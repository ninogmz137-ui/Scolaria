import { useState, useRef, useEffect } from 'react';
import { ScrollView, Switch, Animated, Modal, Alert } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useChildTheme } from '../../contexts/ChildThemeContext';

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

// ─── Module toggle labels ─────────────────────────────────

const MODULE_CONFIG = [
  { key: 'notes' as const, label: 'Notes & bulletins', icon: 'school' as const, color: Colors.cyan },
  { key: 'agenda' as const, label: 'Agenda', icon: 'calendar' as const, color: Colors.violet },
  { key: 'ressenti' as const, label: 'Ressenti', icon: 'heart' as const, color: Colors.pink },
  { key: 'profil' as const, label: 'Profil enfant', icon: 'person' as const, color: Colors.green },
  { key: 'photos' as const, label: 'Photos', icon: 'camera' as const, color: Colors.orange },
  { key: 'aria' as const, label: 'Aria IA', icon: 'sparkles' as const, color: Colors.violetLight },
];

// ─── Component ────────────────────────────────────────────

export default function PermissionsScreen() {
  const { theme } = useChildTheme();
  const [people, setPeople] = useState(INITIAL_PEOPLE);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const getLevelConfig = (level: AccessLevel) =>
    ACCESS_LEVELS.find((l) => l.key === level) || ACCESS_LEVELS[3];

  const handleSelectPerson = (person: Person) => {
    setSelectedPerson(person);
    setShowModal(true);
  };

  const handleToggleModule = (personId: string, moduleKey: keyof Person['modules']) => {
    setPeople((prev) =>
      prev.map((p) =>
        p.id === personId
          ? { ...p, modules: { ...p.modules, [moduleKey]: !p.modules[moduleKey] } }
          : p
      )
    );
    if (selectedPerson?.id === personId) {
      setSelectedPerson((prev) =>
        prev ? { ...prev, modules: { ...prev.modules, [moduleKey]: !prev.modules[moduleKey] } } : prev
      );
    }
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
          },
        },
      ]
    );
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} showsVerticalScrollIndicator={false}>
        {/* Header info */}
        <HStack
          className="items-center gap-3.5 m-5 mb-4 p-4 rounded-2xl border"
          style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
        >
          <Box
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: Colors.green + '15' }}
          >
            <Ionicons name="shield-checkmark" size={24} color={Colors.green} />
          </Box>
          <Box className="flex-1">
            <Text className="text-base font-extrabold" style={{ color: theme.textPrimary }}>RGPD — Contrôle d'accès</Text>
            <Text className="text-xs mt-0.5 leading-[17px]" style={{ color: theme.textMuted }}>
              Définissez précisément qui peut voir quoi. Chaque modification est journalisée.
            </Text>
          </Box>
        </HStack>

        {/* Access levels legend */}
        <Pressable
          className="flex-row items-center gap-2.5 mx-5 mb-3 p-3.5 rounded-[14px] border"
          style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
          onPress={() => setShowLevelInfo(!showLevelInfo)}
        >
          <Ionicons name="information-circle" size={20} color={Colors.cyan} />
          <Text className="flex-1 text-[15px] font-semibold" style={{ color: theme.textPrimary }}>
            4 niveaux d'accès
          </Text>
          <Ionicons name={showLevelInfo ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gray} />
        </Pressable>

        {showLevelInfo && (
          <Box
            className="mx-5 mb-4 rounded-2xl border overflow-hidden"
            style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
          >
            {ACCESS_LEVELS.map((level, i) => (
              <HStack
                key={level.key}
                className="items-start p-3.5 gap-3"
                style={i < ACCESS_LEVELS.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.cardBorder } : undefined}
              >
                <Box
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: level.color + '20' }}
                >
                  <Text className="text-xl">{level.emoji}</Text>
                </Box>
                <Box className="flex-1">
                  <Text className="text-[15px] font-bold" style={{ color: theme.textPrimary }}>{level.label}</Text>
                  <Text className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{level.description}</Text>
                  <HStack className="flex-wrap gap-1 mt-1.5">
                    {level.permissions.map((p) => (
                      <Box key={p} className="px-2 py-0.5 rounded-lg" style={{ backgroundColor: level.color + '15' }}>
                        <Text className="text-[10px] font-semibold" style={{ color: level.color }}>{p}</Text>
                      </Box>
                    ))}
                  </HStack>
                </Box>
              </HStack>
            ))}
          </Box>
        )}

        {/* People list */}
        <Text className="text-[13px] font-bold uppercase tracking-wider mb-2.5 mt-2 px-6" style={{ color: theme.textMuted }}>PERSONNES AUTORISÉES</Text>
        <Box
          className="mx-5 rounded-2xl border overflow-hidden"
          style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
        >
          {people.map((person, i) => {
            const levelCfg = getLevelConfig(person.level);
            return (
              <Pressable
                key={person.id}
                className="flex-row items-center p-3.5 gap-3"
                style={i < people.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.cardBorder } : undefined}
                onPress={() => handleSelectPerson(person)}
              >
                <Box
                  className="w-11 h-11 rounded-full items-center justify-center border-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: levelCfg.color }}
                >
                  <Text className="text-[22px]">{person.avatar}</Text>
                </Box>
                <Box className="flex-1">
                  <Text className="text-[15px] font-bold" style={{ color: theme.textPrimary }}>{person.name}</Text>
                  <Text className="text-xs mt-px" style={{ color: theme.textMuted }}>{person.role}</Text>
                </Box>
                <Box className="px-2.5 py-1 rounded-[10px]" style={{ backgroundColor: levelCfg.color + '20' }}>
                  <Text className="text-[11px] font-semibold" style={{ color: levelCfg.color }}>{levelCfg.label}</Text>
                </Box>
                <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
              </Pressable>
            );
          })}
        </Box>

        {/* Add person */}
        <Pressable
          className="flex-row items-center justify-center gap-2.5 mx-5 mt-3 p-3.5 rounded-[14px] border"
          style={{ borderStyle: 'dashed', borderColor: Colors.cyan + '40' }}
        >
          <Ionicons name="person-add" size={20} color={Colors.cyan} />
          <Text className="text-sm font-semibold" style={{ color: Colors.cyan }}>Inviter une personne</Text>
        </Pressable>

        {/* Stats */}
        <HStack className="gap-2.5 mx-5 mt-5">
          <VStack
            className="flex-1 items-center p-4 rounded-[14px] border"
            style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
          >
            <Text className="text-2xl font-black" style={{ color: Colors.cyan }}>{people.length}</Text>
            <Text className="text-[11px] mt-1" style={{ color: theme.textMuted }}>Personnes</Text>
          </VStack>
          <VStack
            className="flex-1 items-center p-4 rounded-[14px] border"
            style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
          >
            <Text className="text-2xl font-black" style={{ color: Colors.violet }}>
              {people.filter((p) => p.level === 'tuteur').length}
            </Text>
            <Text className="text-[11px] mt-1" style={{ color: theme.textMuted }}>Tuteurs</Text>
          </VStack>
          <VStack
            className="flex-1 items-center p-4 rounded-[14px] border"
            style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
          >
            <Text className="text-2xl font-black" style={{ color: Colors.green }}>6</Text>
            <Text className="text-[11px] mt-1" style={{ color: theme.textMuted }}>Modules</Text>
          </VStack>
        </HStack>

        <Box className="h-10" />
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <Box className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <Box
            className="rounded-t-3xl pt-3 px-5"
            style={{ backgroundColor: theme.bg, maxHeight: '90%' }}
          >
            <Box className="w-10 h-1 rounded-sm self-center mb-4" style={{ backgroundColor: Colors.gray }} />

            {selectedPerson && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Person header */}
                <VStack className="items-center mb-5">
                  <Box
                    className="w-16 h-16 rounded-full items-center justify-center border-[3px] mb-2.5"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: getLevelConfig(selectedPerson.level).color }}
                  >
                    <Text className="text-[32px]">{selectedPerson.avatar}</Text>
                  </Box>
                  <Text className="text-xl font-extrabold" style={{ color: theme.textPrimary }}>{selectedPerson.name}</Text>
                  <Text className="text-[13px] mt-0.5" style={{ color: theme.textMuted }}>{selectedPerson.role}</Text>
                  <Text className="text-xs mt-1" style={{ color: Colors.cyan }}>{selectedPerson.email}</Text>
                  {selectedPerson.lastAccess && (
                    <Text className="text-[11px] mt-1.5" style={{ color: theme.textMuted }}>
                      Dernier accès : {selectedPerson.lastAccess}
                    </Text>
                  )}
                </VStack>

                {/* Level selector */}
                <Text className="text-xs font-bold uppercase tracking-wider mb-2.5 mt-1" style={{ color: theme.textMuted }}>NIVEAU D'ACCÈS</Text>
                <Box
                  className="rounded-2xl border overflow-hidden"
                  style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
                >
                  {ACCESS_LEVELS.map((level, i) => {
                    const isSelected = selectedPerson.level === level.key;
                    return (
                      <Pressable
                        key={level.key}
                        className="flex-row items-center p-3.5 gap-3"
                        style={[
                          i < ACCESS_LEVELS.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.cardBorder } : undefined,
                          isSelected && { backgroundColor: level.color + '10' },
                        ]}
                        onPress={() => handleChangeLevel(selectedPerson.id, level.key)}
                      >
                        <Text className="text-[22px]">{level.emoji}</Text>
                        <Box className="flex-1">
                          <Text className="text-sm font-bold" style={{ color: theme.textPrimary }}>{level.label}</Text>
                          <Text className="text-[11px] mt-px" style={{ color: theme.textMuted }} numberOfLines={1}>{level.description}</Text>
                        </Box>
                        {isSelected && <Ionicons name="checkmark-circle" size={22} color={level.color} />}
                      </Pressable>
                    );
                  })}
                </Box>

                {/* Module toggles */}
                <Text className="text-xs font-bold uppercase tracking-wider mb-2.5 mt-4" style={{ color: theme.textMuted }}>MODULES AUTORISÉS</Text>
                <Box
                  className="rounded-2xl border overflow-hidden"
                  style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
                >
                  {MODULE_CONFIG.map((mod, i) => (
                    <HStack
                      key={mod.key}
                      className="items-center p-3.5 gap-3"
                      style={i < MODULE_CONFIG.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.cardBorder } : undefined}
                    >
                      <Box
                        className="w-8 h-8 rounded-lg items-center justify-center"
                        style={{ backgroundColor: mod.color + '20' }}
                      >
                        <Ionicons name={mod.icon} size={16} color={mod.color} />
                      </Box>
                      <Text className="flex-1 text-sm font-semibold" style={{ color: theme.textPrimary }}>{mod.label}</Text>
                      <Switch
                        value={selectedPerson.modules[mod.key]}
                        onValueChange={() => handleToggleModule(selectedPerson.id, mod.key)}
                        trackColor={{ false: Colors.darkGray, true: mod.color + '60' }}
                        thumbColor={selectedPerson.modules[mod.key] ? mod.color : Colors.gray}
                      />
                    </HStack>
                  ))}
                </Box>

                {/* Actions */}
                <VStack className="mt-5 gap-2.5">
                  <Pressable
                    className="flex-row items-center justify-center gap-2 p-4 rounded-[14px]"
                    style={{ backgroundColor: Colors.red + '15' }}
                    onPress={() => handleRevokeAccess(selectedPerson.id)}
                  >
                    <Ionicons name="close-circle" size={20} color={Colors.red} />
                    <Text className="text-[15px] font-bold" style={{ color: Colors.red }}>Révoquer l'accès</Text>
                  </Pressable>

                  <Pressable
                    className="flex-row items-center justify-center gap-2 p-4 rounded-[14px] border"
                    style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
                    onPress={() => setShowModal(false)}
                  >
                    <Text className="text-[15px] font-bold" style={{ color: theme.textPrimary }}>Fermer</Text>
                  </Pressable>
                </VStack>

                <Box className="h-10" />
              </ScrollView>
            )}
          </Box>
        </Box>
      </Modal>
    </Animated.View>
  );
}
