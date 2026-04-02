/**
 * SignalerAbsenceScreen — 3-step parent flow to report a child's absence.
 *
 * Step 1: Date selection (today/tomorrow/custom + half-day option + multi-day)
 * Step 2: Motif selection (4 buttons + optional comment)
 * Step 3: Confirmation recap + submit
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Papicons } from '@getpapillon/papicons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import WallpaperBackground from '../components/WallpaperBackground';
import GlassCard from '../components/GlassCard';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';
import { FontFamily } from '../hooks/useSolariaFonts';
import {
  createAbsence,
  hasActiveAbsence,
  MOTIF_LABELS,
  MOTIF_ICONS,
  DEMI_JOURNEE_LABELS,
  formatDateFr,
  formatDateRange,
  type AbsenceMotif,
  type DemiJournee,
} from '../services/absenceService';

// ─── Helpers ─────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  const bigint = parseInt(cleaned, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

// ─── Date helpers ────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

const TODAY = toDateStr(new Date());
const TOMORROW = addDays(TODAY, 1);

// ─── Component ───────────────────────────────────────────

export default function SignalerAbsenceScreen() {
  const { theme } = useChildTheme();
  const { selectedChild, selectedChildId } = useActiveChild();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;

  const accent = theme.accent;
  const { r: ar, g: ag, b: ab } = hexToRgb(accent);

  // ── Step state ──
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Step 1: Date ──
  const [dateChoice, setDateChoice] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [dateDebut, setDateDebut] = useState(TODAY);
  const [multiDay, setMultiDay] = useState(false);
  const [dateFin, setDateFin] = useState<string | null>(null);
  const [demiJournee, setDemiJournee] = useState<DemiJournee>('journee');

  // Custom date input (simple text for web compat)
  const [customDateText, setCustomDateText] = useState('');
  const [customEndText, setCustomEndText] = useState('');

  // ── Step 2: Motif ──
  const [motif, setMotif] = useState<AbsenceMotif | null>(null);
  const [commentaire, setCommentaire] = useState('');

  // ── Step 3: Confirmation ──
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // ── Date handling ──
  const handleDateChoice = (choice: 'today' | 'tomorrow' | 'custom') => {
    setDateChoice(choice);
    if (choice === 'today') setDateDebut(TODAY);
    else if (choice === 'tomorrow') setDateDebut(TOMORROW);
    // custom: user will type
  };

  const resolvedDateDebut = dateChoice === 'custom' && customDateText.match(/^\d{4}-\d{2}-\d{2}$/)
    ? customDateText
    : dateDebut;

  const resolvedDateFin = multiDay && customEndText.match(/^\d{4}-\d{2}-\d{2}$/)
    ? customEndText
    : null;

  // ── Navigation ──
  const canGoStep2 = !!resolvedDateDebut;
  const canGoStep3 = !!motif;

  const goNext = () => {
    if (step === 1 && canGoStep2) setStep(2);
    else if (step === 2 && canGoStep3) setStep(3);
  };

  const goBack = () => {
    if (step === 1) navigation.goBack();
    else setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    if (!motif || submitting) return;

    setSubmitting(true);
    try {
      // Check for active absence
      const alreadyActive = await hasActiveAbsence(selectedChildId);
      if (alreadyActive) {
        Alert.alert(
          'Absence déjà signalée',
          `${selectedChild.name} a déjà une absence signalée pour cette période. Contactez l'enseignant via le cahier de liaison pour toute modification.`,
        );
        setSubmitting(false);
        return;
      }

      await createAbsence(
        {
          student_id: selectedChildId,
          date_debut: resolvedDateDebut,
          date_fin: resolvedDateFin,
          demi_journee: demiJournee,
          motif,
          commentaire: commentaire.trim() || null,
        },
        'Parent Moreau',
        `${selectedChild.name} Moreau`,
        selectedChild.avatar,
      );

      setSuccess(true);
    } catch (e) {
      Alert.alert('Erreur', "Impossible de signaler l'absence. Réessayez.");
    }
    setSubmitting(false);
  }, [motif, selectedChildId, resolvedDateDebut, resolvedDateFin, demiJournee, commentaire, submitting]);

  // ── Render helpers ──
  const motifList: AbsenceMotif[] = ['maladie', 'maladie_avec_certificat', 'raison_familiale', 'autre'];
  const demiList: DemiJournee[] = ['matin', 'apres_midi', 'journee'];

  // ── Accent-tinted border color ──
  const accentBorder = `rgba(${ar}, ${ag}, ${ab}, 0.25)`;
  const accentBg = `rgba(${ar}, ${ag}, ${ab}, 0.15)`;

  // ── Success screen ──
  if (success) {
    return (
      <View style={styles.root}>
        <WallpaperBackground />
        <View style={[styles.successContainer, { paddingTop: TOPBAR_H }]}>
          <GlassCard borderRadius={22} style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Papicons name="CheckCircle" size={64} color="#34D399" />
            </View>
            <Text style={styles.successTitle}>Absence signalée</Text>
            <Text style={styles.successBody}>
              {selectedChild.name} sera absent(e) {formatDateRange(resolvedDateDebut, resolvedDateFin)}
              {'\n'}Motif : {motif ? MOTIF_LABELS[motif] : ''}
            </Text>
            <Text style={styles.successMuted}>
              L'enseignant principal a été notifié.
            </Text>
          </GlassCard>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: accent }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryBtnText}>Retour à l'accueil</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <WallpaperBackground />

      {/* Mini header */}
      <View style={[styles.miniHeader, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Papicons name="ChevronLeft" size={22} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Signaler une absence</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Steps indicator */}
      <View style={styles.stepsRow}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                s <= step
                  ? { backgroundColor: accent, borderColor: accent }
                  : { backgroundColor: 'rgba(0,0,0,0.06)', borderColor: 'rgba(0,0,0,0.15)' },
              ]}
            >
              <Text style={[styles.stepNum, { color: s <= step ? '#FFF' : '#94A3B8' }]}>
                {s}
              </Text>
            </View>
            <Text style={[styles.stepLabel, { color: s === step ? '#0F172A' : '#94A3B8' }]}>
              {s === 1 ? 'Date' : s === 2 ? 'Motif' : 'Confirmer'}
            </Text>
          </View>
        ))}
        {/* Connectors */}
        <View style={[styles.connector, styles.connectorLeft, { backgroundColor: step >= 2 ? accent : 'rgba(0,0,0,0.12)' }]} />
        <View style={[styles.connector, styles.connectorRight, { backgroundColor: step >= 3 ? accent : 'rgba(0,0,0,0.12)' }]} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: FLOATING_TAB_BAR_HEIGHT + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── STEP 1: Date ── */}
        {step === 1 && (
          <>
            <Text style={styles.stepQuestion}>
              Quand {selectedChild.name} sera-t-il absent(e) ?
            </Text>

            {/* Quick date buttons */}
            <View style={styles.pillRow}>
              {(['today', 'tomorrow', 'custom'] as const).map((c) => {
                const label = c === 'today' ? "Aujourd'hui" : c === 'tomorrow' ? 'Demain' : 'Autre date';
                const active = dateChoice === c;
                return (
                  <Pressable
                    key={c}
                    style={[
                      styles.pill,
                      active
                        ? { backgroundColor: accentBg, borderColor: accent }
                        : { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.12)' },
                    ]}
                    onPress={() => handleDateChoice(c)}
                  >
                    <Text style={[styles.pillText, { color: active ? accent : '#64748B' }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Custom date input */}
            {dateChoice === 'custom' && (
              <GlassCard style={styles.inputCard} borderRadius={14}>
                <Text style={styles.inputLabel}>Date (AAAA-MM-JJ)</Text>
                <TextInput
                  style={styles.textInput}
                  value={customDateText}
                  onChangeText={setCustomDateText}
                  placeholder="2026-04-01"
                  placeholderTextColor="#94A3B8"
                  keyboardType="default"
                />
              </GlassCard>
            )}

            {/* Multi-day toggle */}
            <Pressable
              style={styles.checkRow}
              onPress={() => setMultiDay(!multiDay)}
            >
              <Papicons
                name={multiDay ? 'CheckSquare' : 'Square'}
                size={22}
                color={multiDay ? accent : '#94A3B8'}
              />
              <Text style={styles.checkLabel}>Absence sur plusieurs jours</Text>
            </Pressable>

            {/* End date if multi-day */}
            {multiDay && (
              <GlassCard style={styles.inputCard} borderRadius={14}>
                <Text style={styles.inputLabel}>Date de fin (AAAA-MM-JJ)</Text>
                <TextInput
                  style={styles.textInput}
                  value={customEndText}
                  onChangeText={setCustomEndText}
                  placeholder="2026-04-03"
                  placeholderTextColor="#94A3B8"
                  keyboardType="default"
                />
              </GlassCard>
            )}

            {/* Half-day selector (only for single day) */}
            {!multiDay && (
              <>
                <Text style={styles.subLabel}>Durée</Text>
                <View style={styles.pillRow}>
                  {demiList.map((dj) => {
                    const active = demiJournee === dj;
                    return (
                      <Pressable
                        key={dj}
                        style={[
                          styles.pill,
                          active
                            ? { backgroundColor: accentBg, borderColor: accent }
                            : { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.12)' },
                        ]}
                        onPress={() => setDemiJournee(dj)}
                      >
                        <Text style={[styles.pillText, { color: active ? accent : '#64748B' }]}>
                          {DEMI_JOURNEE_LABELS[dj]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* Next button */}
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: canGoStep2 ? accent : 'rgba(0,0,0,0.08)', marginTop: 8 }]}
              onPress={goNext}
              disabled={!canGoStep2}
            >
              <Text style={[styles.primaryBtnText, { opacity: canGoStep2 ? 1 : 0.5 }]}>Suivant</Text>
              <Papicons name="ChevronRight" size={18} color="#FFF" />
            </Pressable>
          </>
        )}

        {/* ── STEP 2: Motif ── */}
        {step === 2 && (
          <>
            <Text style={styles.stepQuestion}>
              Quel est le motif de l'absence ?
            </Text>

            <View style={styles.motifList}>
              {motifList.map((m) => {
                const active = motif === m;
                return (
                  <Pressable
                    key={m}
                    style={[
                      styles.motifRow,
                      active
                        ? { backgroundColor: accentBg, borderColor: accent }
                        : { backgroundColor: 'rgba(0,0,0,0.04)', borderColor: 'rgba(0,0,0,0.10)' },
                    ]}
                    onPress={() => setMotif(m)}
                  >
                    <Text style={styles.motifEmoji}>{MOTIF_ICONS[m]}</Text>
                    <Text style={[styles.motifLabel, { color: active ? accent : '#0F172A' }]}>
                      {MOTIF_LABELS[m]}
                    </Text>
                    {active && (
                      <View style={[styles.checkDot, { backgroundColor: accent }]}>
                        <Papicons name="Check" size={14} color="#FFF" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Comment field */}
            <Text style={styles.subLabel}>Précision (optionnel)</Text>
            <GlassCard style={styles.inputCard} borderRadius={14}>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={commentaire}
                onChangeText={(t) => setCommentaire(t.slice(0, 200))}
                placeholder="Ex: Fièvre depuis hier soir..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
              <Text style={styles.charCount}>{commentaire.length}/200</Text>
            </GlassCard>

            {/* Next button */}
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: canGoStep3 ? accent : 'rgba(0,0,0,0.08)', marginTop: 8 }]}
              onPress={goNext}
              disabled={!canGoStep3}
            >
              <Text style={[styles.primaryBtnText, { opacity: canGoStep3 ? 1 : 0.5 }]}>Suivant</Text>
              <Papicons name="ChevronRight" size={18} color="#FFF" />
            </Pressable>
          </>
        )}

        {/* ── STEP 3: Confirmation ── */}
        {step === 3 && motif && (
          <>
            <Text style={styles.stepQuestion}>Confirmer l'absence</Text>

            {/* Recap card */}
            <GlassCard style={styles.recapCard} borderRadius={18}>
              <View style={styles.recapChildRow}>
                <Text style={styles.recapAvatar}>{selectedChild.avatar}</Text>
                <Text style={styles.recapChildName}>{selectedChild.name} sera absent(e)</Text>
              </View>

              <View style={styles.recapDivider} />

              {/* Date */}
              <View style={styles.recapRow}>
                <Papicons name="Calendar" size={18} color={accent} />
                <Text style={styles.recapValue}>
                  {formatDateRange(resolvedDateDebut, resolvedDateFin)}
                  {!multiDay && ` · ${DEMI_JOURNEE_LABELS[demiJournee]}`}
                </Text>
              </View>

              {/* Motif */}
              <View style={styles.recapRow}>
                <Text style={{ fontSize: 16 }}>{MOTIF_ICONS[motif]}</Text>
                <Text style={styles.recapValue}>{MOTIF_LABELS[motif]}</Text>
              </View>

              {/* Comment */}
              {commentaire.trim() ? (
                <View style={styles.recapRow}>
                  <Papicons name="Chat" size={16} color="#94A3B8" />
                  <Text style={styles.recapMuted} numberOfLines={2}>
                    {commentaire.trim()}
                  </Text>
                </View>
              ) : null}
            </GlassCard>

            {/* Warning */}
            <View style={styles.warningBox}>
              <Papicons name="Warning" size={16} color="#FBBF24" />
              <Text style={styles.warningText}>
                L'absence ne pourra pas être modifiée après confirmation. Contactez l'enseignant via le cahier de liaison si besoin.
              </Text>
            </View>

            {/* Submit button */}
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: accent, marginTop: 8 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <Text style={styles.primaryBtnText}>Envoi en cours...</Text>
              ) : (
                <>
                  <Papicons name="Send" size={18} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Confirmer l'absence</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // ── Header ──
  miniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  headerTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    color: '#0F172A',
  },
  headerSpacer: {
    width: 22,
  },
  // ── Steps ──
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
    paddingBottom: 12,
    position: 'relative',
  },
  stepItem: {
    alignItems: 'center',
    zIndex: 2,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepNum: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 13,
  },
  stepLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
  },
  connector: {
    position: 'absolute',
    height: 2,
    top: 15,
    zIndex: 1,
  },
  connectorLeft: {
    left: '22%',
    right: '55%',
  },
  connectorRight: {
    left: '55%',
    right: '22%',
  },
  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 14,
  },
  // ── Step content ──
  stepQuestion: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 4,
  },
  subLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: -4,
  },
  // ── Pills ──
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  pillText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
  },
  // ── Input ──
  inputCard: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  textInput: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    color: '#0F172A',
    padding: 0,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  // ── Multi-day toggle ──
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  checkLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  // ── Motif list ──
  motifList: {
    gap: 10,
  },
  motifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1.5,
  },
  motifEmoji: {
    fontSize: 24,
  },
  motifLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    flex: 1,
  },
  checkDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Recap ──
  recapCard: {
    gap: 14,
  },
  recapChildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recapAvatar: {
    fontSize: 32,
  },
  recapChildName: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 15,
    color: '#0F172A',
    flex: 1,
  },
  recapDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recapValue: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    color: '#0F172A',
    flex: 1,
  },
  recapMuted: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  // ── Warning ──
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    borderRadius: 14,
    padding: 14,
  },
  warningText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: '#FBBF24',
    flex: 1,
    lineHeight: 18,
  },
  // ── Primary button ──
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryBtnText: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  // ── Success ──
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  successCard: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  successIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(52,211,153,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontFamily: FontFamily.loraBold,
    fontSize: 22,
    color: '#0F172A',
  },
  successBody: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  successMuted: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
