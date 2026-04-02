import { useState, useRef, useEffect } from 'react';
import { Animated, Modal, Alert } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useChildTheme } from '../../contexts/ChildThemeContext';
import GlassCard from '../GlassCard';
import {
  getParentMots,
  signMotLiaison,
  markMotAsRead,
  type MotLiaisonParent,
  type MotLiaisonType,
} from '../../services/liaisonService';

// ─── Type config ─────────────────────────────────────────

const TYPE_CONFIG: Record<MotLiaisonType, { label: string; emoji: string; color: string }> = {
  info: { label: 'Information', emoji: '📋', color: Colors.cyan },
  autorisation: { label: 'Autorisation', emoji: '✅', color: Colors.green },
  bon_de_sortie: { label: 'Bon de sortie', emoji: '🚪', color: Colors.orange },
};

// ─── Props ───────────────────────────────────────────────

interface Props {
  childId: string;
  childName: string;
  parentId?: string;
  parentName?: string;
  accentColor?: string;
}

// ─── Component ───────────────────────────────────────────

export default function CahierLiaisonParent({
  childId,
  childName,
  parentId = 'p1',
  parentName = 'Parent Moreau',
  accentColor,
}: Props) {
  useChildTheme(); // kept for future theme re-integration

  // Derive accent from theme if not overridden
  const accent = accentColor ?? '#3B82F6';

  // All modes are light — always use dark text
  const cardText = '#0F172A';
  const cardTextSecondary = '#64748B';
  const cardTextMuted = '#94A3B8';

  // Card surface colors for inline containers (not GlassCard)
  const inlineBg = 'rgba(255,255,255,0.75)';
  const inlineBorder = 'rgba(255,255,255,0.9)';
  const dividerColor = '#EEF0F5';

  const [mots, setMots] = useState<MotLiaisonParent[]>([]);
  const [selectedMot, setSelectedMot] = useState<MotLiaisonParent | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    loadMots();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [childId]);

  const loadMots = async () => {
    const { data } = await getParentMots(childId);
    setMots(data);
  };

  const unsignedCount = mots.filter((m) => m.requires_signature && !m.is_signed).length;
  const unreadCount = mots.filter((m) => !m.is_read).length;

  const handleOpenMot = async (mot: MotLiaisonParent) => {
    setSelectedMot(mot);
    if (!mot.is_read) {
      await markMotAsRead(mot.id, parentId);
      setMots((prev) => prev.map((m) => (m.id === mot.id ? { ...m, is_read: true } : m)));
    }
  };

  const handleSign = async () => {
    if (!selectedMot) return;

    await signMotLiaison(selectedMot.id, parentId, childId, parentName);

    setMots((prev) =>
      prev.map((m) =>
        m.id === selectedMot.id
          ? { ...m, is_signed: true, signed_at: new Date().toISOString() }
          : m,
      ),
    );
    setSelectedMot((prev) =>
      prev ? { ...prev, is_signed: true, signed_at: new Date().toISOString() } : null,
    );
    setShowSignModal(false);

    Alert.alert('Signé !', `Votre signature pour "${selectedMot.titre}" a bien été enregistrée.`);
  };

  // ─── Detail modal ──────────────────────────────────────
  // Modals always render over a dark overlay, so we use a fixed light
  // bottom sheet surface for readability regardless of school mode.
  const detailModal = selectedMot && (
    <Modal visible={!!selectedMot} animationType="slide" transparent>
      <Box className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Box
          className="rounded-t-3xl p-6"
          style={{
            backgroundColor: '#F7F8FC',
            maxHeight: '85%',
          }}
        >
          {/* Close button */}
          <Box className="items-end mb-2">
            <Pressable onPress={() => setSelectedMot(null)}>
              <Ionicons name="close" size={24} color={Colors.gray} />
            </Pressable>
          </Box>

          {/* Type badge */}
          <HStack className="items-center justify-between mb-3">
            <HStack
              className="items-center gap-1 px-2.5 py-1.5 rounded-xl"
              style={{
                backgroundColor: TYPE_CONFIG[selectedMot.type].color + '15',
              }}
            >
              <Text style={{ fontSize: 14 }}>{TYPE_CONFIG[selectedMot.type].emoji}</Text>
              <Text
                className="text-xs font-bold"
                style={{ color: TYPE_CONFIG[selectedMot.type].color }}
              >
                {TYPE_CONFIG[selectedMot.type].label}
              </Text>
            </HStack>
            <Text className="text-xs" style={{ color: '#94A3B8' }}>
              {selectedMot.teacher_name}
            </Text>
          </HStack>

          {/* Title */}
          <Text className="text-lg font-extrabold mb-2" style={{ color: '#0F172A' }}>
            {selectedMot.titre}
          </Text>

          {/* Date info */}
          <HStack className="items-center gap-1.5 mb-4">
            <Ionicons name="calendar-outline" size={14} color={'#94A3B8'} />
            <Text className="text-xs" style={{ color: '#94A3B8' }}>
              {formatDate(selectedMot.date_envoi)}
              {selectedMot.date_limite && ` · Limite : ${formatDate(selectedMot.date_limite)}`}
            </Text>
          </HStack>

          {/* Content */}
          <Box
            className="p-4 rounded-2xl mb-4"
            style={{
              backgroundColor: '#FFFFFF',
            }}
          >
            <Text className="text-sm" style={{ color: '#0F172A', lineHeight: 22 }}>
              {selectedMot.contenu}
            </Text>
          </Box>

          {/* Signature section */}
          {selectedMot.requires_signature && (
            <Box className="mb-2">
              {selectedMot.is_signed ? (
                <HStack
                  className="items-center gap-3 p-3.5 rounded-xl"
                  style={{
                    backgroundColor: Colors.green + '08',
                  }}
                >
                  <Box
                    className="justify-center items-center"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: Colors.green + '20',
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={24} color={Colors.green} />
                  </Box>
                  <Box className="flex-1">
                    <Text className="text-[15px] font-bold" style={{ color: Colors.green }}>
                      Signé
                    </Text>
                    <Text className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                      {selectedMot.signed_at && `Le ${formatDateTime(selectedMot.signed_at)}`}
                    </Text>
                  </Box>
                </HStack>
              ) : (
                <Pressable
                  className="flex-row items-center justify-center gap-2 p-4 rounded-2xl"
                  style={{ backgroundColor: accent }}
                  onPress={() => setShowSignModal(true)}
                >
                  <Ionicons name="pencil" size={20} color={Colors.white} />
                  <Text className="text-[15px] font-bold" style={{ color: Colors.white }}>
                    Signer ce document
                  </Text>
                </Pressable>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Confirmation modal */}
      <Modal visible={showSignModal} animationType="fade" transparent>
        <Box
          className="flex-1 justify-center items-center p-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <Box
            className="w-full p-6 rounded-2xl items-center"
            style={{
              backgroundColor: '#F7F8FC',
            }}
          >
            <Box
              className="justify-center items-center mb-4"
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: accent + '15',
              }}
            >
              <Ionicons name="pencil" size={28} color={accent} />
            </Box>
            <Text className="text-lg font-extrabold mb-2.5" style={{ color: '#0F172A' }}>
              Confirmer la signature
            </Text>
            <Text
              className="text-sm text-center mb-3"
              style={{ color: '#64748B', lineHeight: 20 }}
            >
              En signant, vous confirmez avoir pris connaissance de ce document et autorisez votre
              enfant {childName} à y participer.
            </Text>
            <Text
              className="text-xs italic text-center mb-5 px-3 py-2 w-full rounded-xl"
              style={{ color: '#94A3B8', backgroundColor: '#FFFFFF' }}
            >
              Signature électronique de {parentName}
            </Text>
            <HStack className="gap-3 w-full">
              <Pressable
                className="flex-1 py-3.5 rounded-xl items-center"
                style={{
                  backgroundColor: '#FFFFFF',
                }}
                onPress={() => setShowSignModal(false)}
              >
                <Text className="text-sm font-semibold" style={{ color: '#64748B' }}>
                  Annuler
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 flex-row items-center justify-center gap-1.5 py-3.5 rounded-xl"
                style={{ backgroundColor: accent }}
                onPress={handleSign}
              >
                <Ionicons name="checkmark" size={18} color={Colors.white} />
                <Text className="text-sm font-bold" style={{ color: Colors.white }}>
                  Signer
                </Text>
              </Pressable>
            </HStack>
          </Box>
        </Box>
      </Modal>
    </Modal>
  );

  // ─── Main view ─────────────────────────────────────────
  return (
    <Animated.View
      style={{ width: '100%', opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
    >
      {detailModal}

      {/* Section header */}
      <HStack className="justify-between items-center mb-3">
        <HStack className="items-center gap-2">
          <Text className="text-lg font-bold" style={{ color: cardText }}>
            Cahier de Liaison
          </Text>
          {unsignedCount > 0 && (
            <Box
              className="justify-center items-center"
              style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.red }}
            >
              <Text className="text-[11px] font-extrabold" style={{ color: Colors.white }}>
                {unsignedCount}
              </Text>
            </Box>
          )}
        </HStack>
        {unreadCount > 0 && (
          <HStack
            className="items-center gap-1 px-2 py-1 rounded-lg"
            style={{ backgroundColor: accent + '20' }}
          >
            <Ionicons name="mail-unread" size={12} color={accent} />
            <Text className="text-[11px] font-bold" style={{ color: accent }}>
              {unreadCount} nouveau{unreadCount > 1 ? 'x' : ''}
            </Text>
          </HStack>
        )}
      </HStack>

      {/* Mots list */}
      {mots.length === 0 ? (
        <GlassCard style={{ marginTop: 8 }}>
          <Box className="items-center py-6">
            <Box
              className="justify-center items-center mb-4"
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: accent + '15',
              }}
            >
              <Ionicons name="mail-open-outline" size={30} color={accent} />
            </Box>
            <Text
              className="text-base font-bold mb-1"
              style={{ color: cardText }}
            >
              Tout est à jour
            </Text>
            <Text
              className="text-sm text-center"
              style={{ color: cardTextSecondary, maxWidth: 220 }}
            >
              Aucun mot de liaison pour le moment. Les nouveaux messages apparaîtront ici.
            </Text>
          </Box>
        </GlassCard>
      ) : (
        mots.map((mot) => {
          const tc = TYPE_CONFIG[mot.type];
          const needsSig = mot.requires_signature && !mot.is_signed;

          return (
            <Pressable
              key={mot.id}
              className="p-3.5 rounded-2xl mb-2.5"
              style={{
                backgroundColor: inlineBg,
              }}
              onPress={() => handleOpenMot(mot)}
            >
              <HStack className="items-center gap-3">
                {/* Icon */}
                <Box
                  className="justify-center items-center"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: tc.color + '20',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{tc.emoji}</Text>
                </Box>

                {/* Content */}
                <Box className="flex-1">
                  <HStack className="items-center gap-1.5">
                    <Text
                      className="text-sm font-semibold flex-1"
                      style={{ color: !mot.is_read ? cardText : cardTextSecondary }}
                      numberOfLines={1}
                    >
                      {mot.titre}
                    </Text>
                    {!mot.is_read && (
                      <Box
                        className="rounded-full"
                        style={{ width: 8, height: 8, backgroundColor: accent }}
                      />
                    )}
                  </HStack>
                  <Text className="text-[11px] mt-0.5" style={{ color: cardTextMuted }}>
                    {mot.teacher_name} · {formatDateShort(mot.date_envoi)}
                  </Text>
                </Box>

                {/* Signature status */}
                {mot.requires_signature && (
                  <Box>
                    {mot.is_signed ? (
                      <Box
                        className="justify-center items-center"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: Colors.green + '20',
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
                      </Box>
                    ) : (
                      <Box
                        className="justify-center items-center"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: Colors.orange + '20',
                        }}
                      >
                        <Ionicons name="pencil" size={14} color={Colors.orange} />
                      </Box>
                    )}
                  </Box>
                )}
              </HStack>

              {/* Deadline warning */}
              {needsSig && mot.date_limite && (
                <HStack
                  className="items-center gap-1 mt-2 pt-2"
                  style={{ borderTopWidth: 1, borderTopColor: dividerColor }}
                >
                  <Ionicons name="time" size={12} color={Colors.orange} />
                  <Text className="text-[11px] font-semibold" style={{ color: Colors.orange }}>
                    À signer avant le {formatDateShort(mot.date_limite)}
                  </Text>
                </HStack>
              )}
            </Pressable>
          );
        })
      )}
    </Animated.View>
  );
}

// ─── Helpers ─────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) +
    ' à ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  );
}
