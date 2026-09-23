import React, { useState, useCallback } from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, Calendar, Paperclip } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import ScolariaSymbol from './ScolariaSymbol';
import { C } from '../constants/design';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text } from './ui';

// ─── Types ────────────────────────────────────────────────

type Motif = 'maladie' | 'rdv_medical' | 'raison_familiale' | 'autre';

const MOTIF_LABELS: Record<Motif, string> = {
  maladie: 'Maladie',
  rdv_medical: 'Rendez-vous médical',
  raison_familiale: 'Raison familiale',
  autre: 'Autre',
};

const ARIA_TEXTS: Record<Motif, string> = {
  maladie:
    "Bonjour, Emma a été absente lundi matin en raison d'un état grippal. Elle a vu le médecin l'après-midi et reprendra les cours mardi. Cordialement, Sophie Martin",
  rdv_medical:
    "Bonjour, Emma était absente lundi matin pour un rendez-vous médical programmé. Elle reprendra les cours dès l'après-midi. Cordialement, Sophie Martin",
  raison_familiale:
    "Bonjour, Emma était absente lundi matin pour une raison familiale. Nous vous en remercions pour votre compréhension. Cordialement, Sophie Martin",
  autre:
    "Bonjour, Emma était absente lundi matin. Nous vous prions d'excuser cette absence et restons disponibles pour tout renseignement. Cordialement, Sophie Martin",
};

// ─── Props ────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────

export default function JustifierAbsenceSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();

  const [motif, setMotif] = useState<Motif>('maladie');
  const [attachedFile, setAttachedFile] = useState<string | null>(null);

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: false,
      });
      if (!result.canceled && result.assets.length > 0) {
        setAttachedFile(result.assets[0].name);
      }
    } catch {
      Alert.alert('Erreur', "Impossible d'ouvrir le sélecteur de fichier.");
    }
  }, []);

  const handleSave = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSend = useCallback(() => {
    onClose();
  }, [onClose]);

  const MOTIFS: Motif[] = ['maladie', 'rdv_medical', 'raison_familiale', 'autre'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      {/* Backdrop */}
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Sheet */}
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>

          {/* Handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Justifier une absence</Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Card info absence */}
            <View style={styles.absenceCard}>
              <View style={styles.absenceCardTop}>
                <Clock size={16} color={C.amber} strokeWidth={2} />
                <Text style={styles.absenceCardTitle}>Le collège signale une absence</Text>
              </View>
              <Text style={styles.absenceCardMeta}>Lundi 22 avril · 8h–10h · Maths puis SVT</Text>
            </View>

            {/* Section QUAND */}
            <Text style={styles.sectionLabel}>QUAND</Text>
            <View style={styles.sectionCard}>
              <View style={styles.infoRow}>
                <Calendar size={16} color={C.text55} strokeWidth={2} />
                <Text style={styles.infoRowLabel}>Date</Text>
                <Text style={styles.infoRowValue}>Lun. 22 avril ›</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.infoRow}>
                <Clock size={16} color={C.text55} strokeWidth={2} />
                <Text style={styles.infoRowLabel}>Plage horaire</Text>
                <Text style={styles.infoRowValue}>8h–10h ›</Text>
              </View>
            </View>

            {/* Section POURQUOI */}
            <Text style={styles.sectionLabel}>POURQUOI</Text>
            <Text style={styles.motifSectionLabel}>Motif</Text>
            <View style={styles.pillsRow}>
              {MOTIFS.map((m) => {
                const active = motif === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMotif(m)}
                    style={[styles.motifPill, active && styles.motifPillActive]}
                  >
                    <Text style={[styles.motifPillText, active && styles.motifPillTextActive]}>
                      {MOTIF_LABELS[m]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Section MESSAGE */}
            <Text style={styles.sectionLabel}>MESSAGE À LA VIE SCOLAIRE</Text>
            <View style={styles.ariaCardWrap}>
              <LinearGradient
                colors={['#EEF2FF', '#F0FDFA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
              />
              <View style={styles.ariaCardHeader}>
                <View style={styles.ariaLabel}>
                  <ScolariaSymbol size={14} color={C.indigo} />
                  <Text style={styles.ariaLabelText}>Aria a pré-rédigé pour toi</Text>
                </View>
                <Pressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.ariaGhostBtn}>Modifier</Text>
                </Pressable>
              </View>
              <Text style={styles.ariaText}>{ARIA_TEXTS[motif]}</Text>
            </View>

            {/* Joindre un certificat */}
            <Pressable style={styles.attachRow} onPress={handlePickFile}>
              <Paperclip size={16} color={C.text55} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.attachLabel}>Joindre un certificat</Text>
                <Text style={styles.attachMeta}>
                  {attachedFile ?? 'Photo ou PDF · uniquement vu par la vie scolaire'}
                </Text>
              </View>
            </Pressable>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable style={styles.btnSecondary} onPress={handleSave}>
              <Text style={styles.btnSecondaryText}>Enregistrer</Text>
            </Pressable>
            <Pressable style={styles.btnPrimary} onPress={handleSend}>
              <Text style={styles.btnPrimaryText}>Envoyer la justification</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.16)',
    justifyContent: 'flex-end',
  },

  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.10,
        shadowRadius: 32,
      },
      android: { elevation: 20 },
    }),
  },

  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  handle: {
    width: 34,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.14)',
  },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  headerTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: C.text,
    letterSpacing: -0.1,
  },

  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },

  // ── Absence card ─────────────────────────────────────
  absenceCard: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.20)',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  absenceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  absenceCardTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: C.text,
    letterSpacing: -0.1,
  },
  absenceCardMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: C.text55,
    marginLeft: 23,
  },

  // ── Section label ────────────────────────────────────
  sectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 7.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: C.text,
    opacity: 0.28,
    paddingTop: 4,
    paddingBottom: 6,
  },

  // ── Info rows (QUAND) ────────────────────────────────
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(15,23,42,0.05)',
    marginHorizontal: 14,
  },
  infoRowLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: C.text,
    flex: 1,
  },
  infoRowValue: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: C.text55,
  },

  // ── Motif pills ──────────────────────────────────────
  motifSectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: C.text,
    letterSpacing: -0.1,
    marginBottom: 8,
    marginTop: -4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -4,
  },
  motifPill: {
    height: 32,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  motifPillActive: {
    backgroundColor: '#0F172A',
  },
  motifPillText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: 'rgba(15,23,42,0.55)',
  },
  motifPillTextActive: {
    color: '#FFFFFF',
    fontFamily: FontFamily.sansSemiBold,
  },

  // ── Aria card ────────────────────────────────────────
  ariaCardWrap: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    borderRadius: 14,
    padding: 12,
    overflow: 'hidden',
    gap: 6,
  },
  ariaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ariaLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ariaLabelText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: C.indigo,
    letterSpacing: -0.05,
  },
  ariaGhostBtn: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: C.text55,
  },
  ariaText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: C.text,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // ── Attach row ───────────────────────────────────────
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    backgroundColor: 'rgba(15,23,42,0.02)',
  },
  attachLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: C.text,
  },
  attachMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: C.text55,
    marginTop: 1,
  },

  // ── Footer ───────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,23,42,0.05)',
  },
  btnSecondary: {
    height: 40,
    maxWidth: 160,
    flex: 1,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: C.text,
  },
  btnPrimary: {
    height: 40,
    maxWidth: 160,
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
});
