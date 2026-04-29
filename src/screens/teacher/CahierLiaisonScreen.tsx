import { useState, useRef, useEffect, useCallback } from 'react';
import { FontFamily } from '../../hooks/useSolariaFonts';
import {
  ScrollView,
  TextInput,
  Animated,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { Colors, SCREEN_BACKGROUND } from '../../constants/colors';
import { TAB_BAR_SCROLL_PADDING } from '../../components/FloatingTabBar';
import {
  getTeacherMots,
  getMotSignatures,
  getUnsignedStudents,
  createMotLiaison,
  updateMotStatut,
  sendRelanceNotification,
  sendNewMotNotification,
  type MotLiaison,
  type MotLiaisonType,
  type MotLiaisonStatut,
  type SignatureLiaison,
} from '../../services/liaisonService';

const TEACHER_ORANGE = '#FF8C42';

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 8 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
});

// ─── Type config ─────────────────────────────────────────

const TYPE_CONFIG: Record<MotLiaisonType, { label: string; emoji: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  info: { label: 'Information', emoji: '📋', color: Colors.cyan, icon: 'information-circle' },
  autorisation: { label: 'Autorisation', emoji: '✅', color: Colors.green, icon: 'checkmark-circle' },
  bon_de_sortie: { label: 'Bon de sortie', emoji: '🚪', color: Colors.orange, icon: 'exit' },
};

const STATUT_CONFIG: Record<MotLiaisonStatut, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: Colors.gray },
  'envoyé': { label: 'Envoyé', color: Colors.green },
  clos: { label: 'Clos', color: Colors.gray },
};

// ─── Component ───────────────────────────────────────────

export default function CahierLiaisonScreen() {
  const [mots, setMots] = useState<MotLiaison[]>([]);
  const [selectedMot, setSelectedMot] = useState<MotLiaison | null>(null);
  const [signatures, setSignatures] = useState<SignatureLiaison[]>([]);
  const [unsignedStudents, setUnsignedStudents] = useState<{ id: string; name: string; avatar: string }[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'envoyé' | 'clos'>('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ─── Create form state ──────────────────
  const [newType, setNewType] = useState<MotLiaisonType>('info');
  const [newTitre, setNewTitre] = useState('');
  const [newContenu, setNewContenu] = useState('');
  const [newDateLimite, setNewDateLimite] = useState('');

  useEffect(() => {
    loadMots();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const loadMots = async () => {
    const { data } = await getTeacherMots('t1');
    setMots(data);
  };

  const openDetail = async (mot: MotLiaison) => {
    setSelectedMot(mot);
    if (mot.requires_signature) {
      const [sigResult, unsignedResult] = await Promise.all([
        getMotSignatures(mot.id),
        getUnsignedStudents(mot.id),
      ]);
      setSignatures(sigResult.data);
      setUnsignedStudents(unsignedResult.data);
    }
  };

  const handleCreate = async () => {
    if (!newTitre.trim() || !newContenu.trim()) {
      Alert.alert('Champs requis', 'Veuillez remplir le titre et le contenu.');
      return;
    }

    const { data } = await createMotLiaison({
      teacher_id: 't1',
      classe: 'CM2 B',
      type: newType,
      titre: newTitre.trim(),
      contenu: newContenu.trim(),
      date_limite: newDateLimite || undefined,
      statut: 'envoyé',
    });

    if (data) {
      setMots((prev) => [data, ...prev]);
      await sendNewMotNotification('CM2 B', data.titre);
      Alert.alert('Envoyé !', 'Le mot a été envoyé à tous les parents de la classe.');
    }

    setShowCreate(false);
    setNewType('info');
    setNewTitre('');
    setNewContenu('');
    setNewDateLimite('');
  };

  const handleRelance = async (mot: MotLiaison) => {
    const unsigned = await getUnsignedStudents(mot.id);
    if (unsigned.data.length === 0) {
      Alert.alert('Complet', 'Tous les parents ont signé !');
      return;
    }
    await sendRelanceNotification(mot.id, unsigned.data.map((s) => s.id));
    Alert.alert(
      'Relance envoyée',
      `${unsigned.data.length} parent${unsigned.data.length > 1 ? 's' : ''} relancé${unsigned.data.length > 1 ? 's' : ''}.`,
    );
  };

  const handleClore = async (mot: MotLiaison) => {
    Alert.alert(
      'Clore ce mot ?',
      'Les parents ne pourront plus signer. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Clore',
          style: 'destructive',
          onPress: async () => {
            await updateMotStatut(mot.id, 'clos');
            setMots((prev) => prev.map((m) => (m.id === mot.id ? { ...m, statut: 'clos' } : m)));
            setSelectedMot(null);
          },
        },
      ],
    );
  };

  const filteredMots = filter === 'all' ? mots : mots.filter((m) => m.statut === filter);
  const activeCount = mots.filter((m) => m.statut === 'envoyé').length;
  const pendingSigCount = mots
    .filter((m) => m.statut === 'envoyé' && m.requires_signature)
    .reduce((acc, m) => acc + (m.total_students - m.signatures_count), 0);

  // ─── Detail view ───────────────────────────
  if (selectedMot) {
    const tc = TYPE_CONFIG[selectedMot.type];
    const sc = STATUT_CONFIG[selectedMot.statut];
    const sigPercent = selectedMot.total_students > 0
      ? Math.round((selectedMot.signatures_count / selectedMot.total_students) * 100)
      : 0;

    return (
      <Box className="flex-1" style={{ backgroundColor: '#E8EDF5' }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: TAB_BAR_SCROLL_PADDING }}
        >
          {/* Back + header */}
          <HStack className="items-start gap-3 p-5 pb-0">
            <Pressable onPress={() => setSelectedMot(null)} className="p-1 mt-0.5">
              <Ionicons name="arrow-back" size={22} color="#0F172A" />
            </Pressable>
            <VStack className="flex-1">
              <Text className="text-lg font-extrabold mb-2" style={{ color: '#0F172A' }}>{selectedMot.titre}</Text>
              <HStack className="gap-2">
                <HStack className="items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: tc.color + '20', borderWidth: 1, borderColor: tc.color + '30' }}>
                  <Text className="text-xs">{tc.emoji}</Text>
                  <Text className="text-[11px] font-bold" style={{ color: tc.color }}>{tc.label}</Text>
                </HStack>
                <Box className="px-2 py-1 rounded-lg" style={{ backgroundColor: sc.color + '20' }}>
                  <Text className="text-[11px] font-bold" style={{ color: sc.color }}>{sc.label}</Text>
                </Box>
              </HStack>
            </VStack>
          </HStack>

          {/* Content card */}
          <Box className="m-5 p-4 rounded-2xl" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}>
            <Text className="text-xs mb-3" style={{ color: '#94A3B8' }}>
              <Ionicons name="calendar-outline" size={13} color="#94A3B8" />{' '}
              Envoyé le {formatDate(selectedMot.date_envoi)}
              {selectedMot.date_limite && ` · Limite : ${formatDate(selectedMot.date_limite)}`}
            </Text>
            <Text className="text-sm leading-[22px]" style={{ color: '#0F172A' }}>{selectedMot.contenu}</Text>
          </Box>

          {/* Signature progress */}
          {selectedMot.requires_signature && (
            <VStack className="px-5 gap-3">
              <HStack className="justify-between items-center">
                <HStack className="items-center gap-2">
                  <Box style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: TEACHER_ORANGE }} />
                  <Text className="text-base font-extrabold" style={{ color: '#0F172A' }}>Signatures</Text>
                </HStack>
                <Text className="text-lg font-black" style={{ color: sigPercent === 100 ? Colors.green : TEACHER_ORANGE }}>
                  {selectedMot.signatures_count}/{selectedMot.total_students}
                </Text>
              </HStack>

              {/* Progress bar */}
              <Box className="h-2 rounded-[4px]" style={{ backgroundColor: '#EEF0F5' }}>
                <Box
                  className="h-2 rounded-[4px]"
                  style={{
                    width: `${sigPercent}%`,
                    backgroundColor: sigPercent === 100 ? Colors.green : TEACHER_ORANGE,
                  }}
                />
              </Box>
              <Text className="text-xs" style={{ color: '#94A3B8' }}>{sigPercent}% des parents ont signé</Text>

              {/* Signed list */}
              {signatures.length > 0 && (
                <Box className="p-3.5 rounded-[14px]" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: Colors.green + '20', ...CARD_SHADOW }}>
                  <Text className="text-[13px] font-bold mb-2.5" style={{ color: Colors.green }}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.green} /> Signatures reçues
                  </Text>
                  {signatures.slice(0, 10).map((sig) => (
                    <HStack key={sig.id} className="items-center gap-2 py-[5px]">
                      <Text className="text-[13px] flex-1" style={{ color: '#0F172A' }}>{sig.student_name}</Text>
                      <Text className="text-[11px]" style={{ color: '#94A3B8' }}>{formatDateTime(sig.signed_at)}</Text>
                    </HStack>
                  ))}
                  {signatures.length > 10 && (
                    <Text className="text-xs italic mt-2" style={{ color: '#94A3B8' }}>+ {signatures.length - 10} autres signatures</Text>
                  )}
                </Box>
              )}

              {/* Unsigned students */}
              {unsignedStudents.length > 0 && (
                <Box className="p-3.5 rounded-[14px]" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: Colors.red + '30', ...CARD_SHADOW }}>
                  <Text className="text-[13px] font-bold mb-2.5" style={{ color: Colors.red }}>
                    <Ionicons name="close-circle" size={14} color={Colors.red} /> En attente ({unsignedStudents.length})
                  </Text>
                  {unsignedStudents.map((s) => (
                    <HStack key={s.id} className="items-center gap-2 py-[5px]">
                      <Text className="text-base">{s.avatar}</Text>
                      <Text className="text-[13px] flex-1" style={{ color: '#0F172A' }}>{s.name}</Text>
                    </HStack>
                  ))}
                </Box>
              )}

              {/* Action buttons */}
              {selectedMot.statut === 'envoyé' && (
                <HStack className="gap-2.5">
                  {unsignedStudents.length > 0 && (
                    <Pressable
                      onPress={() => handleRelance(selectedMot)}
                      className="flex-1 rounded-[14px] py-3"
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: TEACHER_ORANGE + '15', borderWidth: 1, borderColor: TEACHER_ORANGE + '30' }}
                    >
                      <Ionicons name="notifications" size={18} color={TEACHER_ORANGE} />
                      <Text className="text-sm font-bold" style={{ color: TEACHER_ORANGE }}>Relancer</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => handleClore(selectedMot)}
                    className="flex-1 rounded-[14px] py-3"
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.red + '10', borderWidth: 1, borderColor: Colors.red + '30' }}
                  >
                    <Ionicons name="lock-closed" size={18} color={Colors.red} />
                    <Text className="text-sm font-bold" style={{ color: Colors.red }}>Clore</Text>
                  </Pressable>
                </HStack>
              )}
            </VStack>
          )}

          <Box className="h-10" />
        </ScrollView>
      </Box>
    );
  }

  // ─── Create modal ──────────────────────────
  const createModal = (
    <Modal visible={showCreate} animationType="slide" transparent>
      <Box className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Box className="p-6 rounded-t-3xl" style={{ backgroundColor: SCREEN_BACKGROUND, maxHeight: '90%', borderWidth: 1, borderColor: '#EEF0F5' }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: TAB_BAR_SCROLL_PADDING }}
          >
            {/* Modal header */}
            <HStack className="justify-between items-center mb-5">
              <Text className="text-lg font-extrabold" style={{ color: '#0F172A' }}>Nouveau mot</Text>
              <Pressable onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={24} color={Colors.gray} />
              </Pressable>
            </HStack>

            {/* Type selector */}
            <Text className="text-[13px] font-bold mb-2 mt-4" style={{ color: '#64748B' }}>Type</Text>
            <VStack className="gap-2">
              {(Object.keys(TYPE_CONFIG) as MotLiaisonType[]).map((type) => {
                const tc = TYPE_CONFIG[type];
                const isActive = newType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setNewType(type)}
                    className="rounded-[14px] p-3.5"
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      backgroundColor: isActive ? tc.color + '20' : SCREEN_BACKGROUND,
                      borderWidth: 1,
                      borderColor: isActive ? tc.color : '#EEF0F5',
                    }}
                  >
                    <Text className="text-lg">{tc.emoji}</Text>
                    <Text className="text-sm font-semibold flex-1" style={{ color: isActive ? tc.color : '#0F172A' }}>{tc.label}</Text>
                    {type !== 'info' && (
                      <HStack className="items-center gap-[3px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: tc.color + '15' }}>
                        <Ionicons name="pencil" size={10} color={tc.color} />
                        <Text className="text-[10px] font-bold" style={{ color: tc.color }}>Signature</Text>
                      </HStack>
                    )}
                  </Pressable>
                );
              })}
            </VStack>

            {/* Titre */}
            <Text className="text-[13px] font-bold mb-2 mt-4" style={{ color: '#64748B' }}>Titre</Text>
            <TextInput
              style={{
                backgroundColor: SCREEN_BACKGROUND, borderRadius: 14, padding: 14,
                color: '#0F172A', fontSize: 14,
                borderWidth: 1, borderColor: '#EEF0F5',
              }}
              placeholder="Ex: Sortie au musée — 15 avril"
              placeholderTextColor="#94A3B8"
              value={newTitre}
              onChangeText={setNewTitre}
            />

            {/* Contenu */}
            <Text className="text-[13px] font-bold mb-2 mt-4" style={{ color: '#64748B' }}>Message</Text>
            <TextInput
              style={{
                backgroundColor: SCREEN_BACKGROUND, borderRadius: 14, padding: 14,
                color: '#0F172A', fontSize: 14, minHeight: 120, textAlignVertical: 'top',
                borderWidth: 1, borderColor: '#EEF0F5',
              }}
              placeholder="Écrivez le message pour les parents..."
              placeholderTextColor="#94A3B8"
              value={newContenu}
              onChangeText={setNewContenu}
              multiline
              textAlignVertical="top"
            />

            {/* Date limite (for signature types) */}
            {newType !== 'info' && (
              <>
                <Text className="text-[13px] font-bold mb-2 mt-4" style={{ color: '#64748B' }}>Date limite de signature (optionnel)</Text>
                <TextInput
                  style={{
                    backgroundColor: SCREEN_BACKGROUND, borderRadius: 14, padding: 14,
                    color: '#0F172A', fontSize: 14,
                    borderWidth: 1, borderColor: '#EEF0F5',
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  value={newDateLimite}
                  onChangeText={setNewDateLimite}
                />
              </>
            )}

            {/* Classe info */}
            <HStack className="items-center gap-2 mt-4 p-3 rounded-xl" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1, borderColor: '#EEF0F5' }}>
              <Ionicons name="people" size={16} color="#64748B" />
              <Text className="flex-1 text-xs" style={{ color: '#64748B' }}>
                Sera envoyé à tous les parents de <Text style={{ color: '#0F172A', fontFamily: FontFamily.sansBold }}>CM2 B</Text> (25 élèves)
              </Text>
            </HStack>

            {/* Send button */}
            <Pressable onPress={handleCreate} className="mt-5 p-4 rounded-2xl" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: TEACHER_ORANGE }}>
              <Ionicons name="send" size={18} color={Colors.white} />
              <Text className="text-[15px] font-bold" style={{ color: Colors.white }}>Envoyer aux parents</Text>
            </Pressable>
          </ScrollView>
        </Box>
      </Box>
    </Modal>
  );

  // ─── List view ─────────────────────────────
  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#E8EDF5', opacity: fadeAnim }}>
      {createModal}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SCROLL_PADDING }}
      >
        {/* Header card */}
        <HStack className="items-center gap-3.5 m-5 mb-3 p-4 rounded-2xl" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}>
          <Box className="w-11 h-11 rounded-[22px] justify-center items-center" style={{ backgroundColor: TEACHER_ORANGE + '15' }}>
            <Ionicons name="book" size={24} color={TEACHER_ORANGE} />
          </Box>
          <VStack className="flex-1">
            <Text className="text-base font-extrabold" style={{ color: '#0F172A' }}>Cahier de Liaison</Text>
            <Text className="text-xs mt-0.5" style={{ color: '#64748B' }}>CM2 B · 25 élèves</Text>
          </VStack>
        </HStack>

        {/* Stats */}
        <HStack className="gap-2.5 mx-5 mb-4">
          <VStack className="flex-1 items-center p-3 rounded-[14px]" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}>
            <Text className="text-xl font-black" style={{ color: TEACHER_ORANGE }}>{mots.length}</Text>
            <Text className="text-[10px] mt-0.5 text-center" style={{ color: '#64748B' }}>Mots envoyés</Text>
          </VStack>
          <VStack className="flex-1 items-center p-3 rounded-[14px]" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}>
            <Text className="text-xl font-black" style={{ color: Colors.green }}>{activeCount}</Text>
            <Text className="text-[10px] mt-0.5 text-center" style={{ color: '#64748B' }}>Actifs</Text>
          </VStack>
          <VStack className="flex-1 items-center p-3 rounded-[14px]" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}>
            <Text className="text-xl font-black" style={{ color: pendingSigCount > 0 ? Colors.red : Colors.green }}>
              {pendingSigCount}
            </Text>
            <Text className="text-[10px] mt-0.5 text-center" style={{ color: '#64748B' }}>Signatures{'\n'}en attente</Text>
          </VStack>
        </HStack>

        {/* Filter tabs */}
        <HStack className="gap-2 mx-5 mb-4">
          {([['all', 'Tous'], ['envoyé', 'Actifs'], ['clos', 'Clos']] as const).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              className="px-4 py-2 rounded-[20px]"
              style={{
                backgroundColor: filter === key ? TEACHER_ORANGE + '20' : SCREEN_BACKGROUND,
                borderWidth: 1,
                borderColor: filter === key ? TEACHER_ORANGE : '#EEF0F5',
              }}
            >
              <Text className="text-[13px] font-semibold" style={{ color: filter === key ? TEACHER_ORANGE : '#64748B' }}>{label}</Text>
            </Pressable>
          ))}
        </HStack>

        {/* Mots list */}
        {filteredMots.length === 0 && (
          <VStack className="items-center p-10 gap-2">
            <Text className="text-[30px]">📭</Text>
            <Text className="text-sm" style={{ color: '#64748B' }}>Aucun mot dans cette catégorie</Text>
          </VStack>
        )}
        {filteredMots.map((mot) => {
          const tc = TYPE_CONFIG[mot.type];
          const sc = STATUT_CONFIG[mot.statut];
          const sigPercent = mot.total_students > 0
            ? Math.round((mot.signatures_count / mot.total_students) * 100)
            : 0;
          const isOverdue = mot.date_limite && new Date(mot.date_limite) < new Date() && mot.statut === 'envoyé';

          return (
            <Pressable
              key={mot.id}
              onPress={() => openDetail(mot)}
              className="mx-5 mb-3 p-4 rounded-2xl"
              style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}
            >
              {/* Type + statut row */}
              <HStack className="justify-between items-center mb-2.5">
                <HStack className="items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: tc.color + '15', borderWidth: 1, borderColor: tc.color + '25' }}>
                  <Text className="text-xs">{tc.emoji}</Text>
                  <Text className="text-[11px] font-bold" style={{ color: tc.color }}>{tc.label}</Text>
                </HStack>
                <HStack className="gap-1.5">
                  {isOverdue && (
                    <HStack className="items-center gap-[3px] px-1.5 py-[3px] rounded-md" style={{ backgroundColor: Colors.red + '15' }}>
                      <Ionicons name="time" size={12} color={Colors.red} />
                      <Text className="text-[10px] font-bold" style={{ color: Colors.red }}>Expiré</Text>
                    </HStack>
                  )}
                  <Box className="px-2 py-1 rounded-lg" style={{ backgroundColor: sc.color + '15' }}>
                    <Text className="text-[11px] font-bold" style={{ color: sc.color }}>{sc.label}</Text>
                  </Box>
                </HStack>
              </HStack>

              {/* Title */}
              <Text className="text-[15px] font-bold mb-1" style={{ color: '#0F172A' }}>{mot.titre}</Text>
              <Text className="text-xs mb-2.5" style={{ color: '#94A3B8' }}>
                {formatDate(mot.date_envoi)}
                {mot.date_limite && ` · Limite : ${formatDate(mot.date_limite)}`}
              </Text>

              {/* Signature bar */}
              {mot.requires_signature && (
                <VStack className="gap-1">
                  <Box className="h-1.5 rounded-[3px]" style={{ backgroundColor: '#EEF0F5' }}>
                    <Box
                      className="h-1.5 rounded-[3px]"
                      style={{
                        width: `${sigPercent}%`,
                        backgroundColor: sigPercent === 100 ? Colors.green : TEACHER_ORANGE,
                      }}
                    />
                  </Box>
                  <Text className="text-[11px]" style={{ color: '#94A3B8' }}>
                    {mot.signatures_count}/{mot.total_students} signatures
                    {sigPercent === 100 && ' ✓'}
                  </Text>
                </VStack>
              )}
            </Pressable>
          );
        })}

        {/* New mot button */}
        <Pressable
          onPress={() => setShowCreate(true)}
          className="mx-5 p-3.5 rounded-[14px] mb-4"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: TEACHER_ORANGE + '40' }}
        >
          <Ionicons name="add-circle" size={20} color={TEACHER_ORANGE} />
          <Text className="text-sm font-semibold" style={{ color: TEACHER_ORANGE }}>Nouveau mot de liaison</Text>
        </Pressable>

        {/* RGPD notice */}
        <HStack className="items-start gap-2 mx-5 p-3 rounded-xl" style={{ backgroundColor: Colors.green + '08' }}>
          <Ionicons name="shield-checkmark" size={14} color={Colors.green} />
          <Text className="flex-1 text-[11px] leading-4" style={{ color: '#64748B' }}>
            Les mots et signatures sont conservés 3 ans conformément aux obligations scolaires. Les parents peuvent exporter leurs données via l'export RGPD.
          </Text>
        </HStack>

        <Box className="h-10" />
      </ScrollView>
    </Animated.View>
  );
}

// ─── Helpers ─────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
    ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
