/**
 * SignalerAbsenceScreen — 3-step parent flow to report a child's absence.
 *
 * Step 1: Date selection (today/tomorrow/custom + half-day option + multi-day)
 * Step 2: Motif selection (4 buttons + optional comment)
 * Step 3: Confirmation recap + submit
 */

import { useState, useCallback } from 'react';
import {
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Box, Text, Pressable, HStack, VStack } from '../components/ui';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
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

  const accent = theme.accent;

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

  // ── Success screen ──
  if (success) {
    return (
      <Box className="flex-1" style={{ backgroundColor: theme.bg }}>
        <VStack className="flex-1 justify-center items-center p-8" style={{ gap: 16 }}>
          <Box
            className="w-[100px] h-[100px] rounded-full justify-center items-center mb-2"
            style={{ backgroundColor: '#34D39920' }}
          >
            <Ionicons name="checkmark-circle" size={64} color="#34D399" />
          </Box>
          <Text className="text-[22px] font-black" style={{ color: theme.textPrimary }}>
            Absence signalée
          </Text>
          <Text className="text-[15px] text-center leading-[22px]" style={{ color: theme.textSecondary }}>
            {selectedChild.name} sera absent(e) {formatDateRange(resolvedDateDebut, resolvedDateFin)}
            {'\n'}Motif : {motif ? MOTIF_LABELS[motif] : ''}
          </Text>
          <Text className="text-xs text-center" style={{ color: theme.textMuted }}>
            L'enseignant principal a été notifié.
          </Text>
          <Pressable
            className="flex-row items-center justify-center py-4 rounded-2xl w-full"
            style={{ backgroundColor: accent }}
            onPress={() => navigation.goBack()}
          >
            <Text className="text-[15px] font-extrabold text-white">Retour à l'accueil</Text>
          </Pressable>
        </VStack>
      </Box>
    );
  }

  return (
    <Box className="flex-1" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <HStack
        className="items-center justify-between px-4 py-3.5"
        style={{ borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}
      >
        <Pressable onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </Pressable>
        <Text className="text-base font-extrabold" style={{ color: theme.textPrimary }}>
          Prévenir d'une absence
        </Text>
        <Box className="w-[22px]" />
      </HStack>

      {/* Steps indicator */}
      <HStack className="justify-around py-4 px-10 relative">
        {[1, 2, 3].map((s) => (
          <VStack key={s} className="items-center z-[2]">
            <Box
              className="w-8 h-8 rounded-full justify-center items-center mb-1"
              style={{
                borderWidth: 2,
                backgroundColor: s <= step ? accent : theme.card,
                borderColor: s <= step ? accent : theme.cardBorder,
              }}
            >
              <Text className="text-[13px] font-extrabold" style={{ color: s <= step ? '#FFF' : theme.textMuted }}>
                {s}
              </Text>
            </Box>
            <Text className="text-[11px] font-semibold" style={{ color: s === step ? accent : theme.textMuted }}>
              {s === 1 ? 'Date' : s === 2 ? 'Motif' : 'Confirmer'}
            </Text>
          </VStack>
        ))}
        {/* Connectors */}
        <Box
          className="absolute h-0.5 z-[1]"
          style={{ backgroundColor: step >= 2 ? accent : theme.cardBorder, top: 30, left: '22%', right: '55%' }}
        />
        <Box
          className="absolute h-0.5 z-[1]"
          style={{ backgroundColor: step >= 3 ? accent : theme.cardBorder, top: 30, left: '55%', right: '22%' }}
        />
      </HStack>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* ── STEP 1: Date ── */}
        {step === 1 && (
          <>
            <Text className="text-lg font-extrabold mb-1" style={{ color: theme.textPrimary }}>
              Quand {selectedChild.name} sera-t-il absent(e) ?
            </Text>

            {/* Quick date buttons */}
            <HStack className="flex-wrap" style={{ gap: 10 }}>
              {(['today', 'tomorrow', 'custom'] as const).map((c) => {
                const label = c === 'today' ? "Aujourd'hui" : c === 'tomorrow' ? 'Demain' : 'Autre date';
                const active = dateChoice === c;
                return (
                  <Pressable
                    key={c}
                    className="px-4 py-3 rounded-[14px] min-w-[90px] items-center"
                    style={{ backgroundColor: active ? accent + '20' : theme.card, borderWidth: 1.5, borderColor: active ? accent : theme.cardBorder }}
                    onPress={() => handleDateChoice(c)}
                  >
                    <Text className="text-[13px] font-bold" style={{ color: active ? accent : theme.textPrimary }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </HStack>

            {/* Custom date input */}
            {dateChoice === 'custom' && (
              <Box
                className="rounded-[14px] p-3.5"
                style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}
              >
                <Text className="text-xs font-semibold mb-1.5" style={{ color: theme.textSecondary }}>Date (AAAA-MM-JJ)</Text>
                <TextInput
                  style={{ fontSize: 15, fontWeight: '500', padding: 0, color: theme.textPrimary }}
                  value={customDateText}
                  onChangeText={setCustomDateText}
                  placeholder="2026-04-01"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="default"
                />
              </Box>
            )}

            {/* Multi-day toggle */}
            <Pressable
              className="flex-row items-center py-2"
              style={{ gap: 10, borderColor: theme.cardBorder }}
              onPress={() => setMultiDay(!multiDay)}
            >
              <Ionicons
                name={multiDay ? 'checkbox' : 'square-outline'}
                size={22}
                color={multiDay ? accent : theme.textMuted}
              />
              <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
                Absence sur plusieurs jours
              </Text>
            </Pressable>

            {/* End date if multi-day */}
            {multiDay && (
              <Box
                className="rounded-[14px] p-3.5"
                style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}
              >
                <Text className="text-xs font-semibold mb-1.5" style={{ color: theme.textSecondary }}>Date de fin (AAAA-MM-JJ)</Text>
                <TextInput
                  style={{ fontSize: 15, fontWeight: '500', padding: 0, color: theme.textPrimary }}
                  value={customEndText}
                  onChangeText={setCustomEndText}
                  placeholder="2026-04-03"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="default"
                />
              </Box>
            )}

            {/* Half-day selector (only for single day) */}
            {!multiDay && (
              <>
                <Text className="text-[13px] font-semibold mt-2" style={{ color: theme.textSecondary }}>
                  Durée
                </Text>
                <HStack className="flex-wrap" style={{ gap: 10 }}>
                  {demiList.map((dj) => {
                    const active = demiJournee === dj;
                    return (
                      <Pressable
                        key={dj}
                        className="px-4 py-3 rounded-[14px] min-w-[90px] items-center"
                        style={{ backgroundColor: active ? accent + '20' : theme.card, borderWidth: 1.5, borderColor: active ? accent : theme.cardBorder }}
                        onPress={() => setDemiJournee(dj)}
                      >
                        <Text className="text-[13px] font-bold" style={{ color: active ? accent : theme.textPrimary }}>
                          {DEMI_JOURNEE_LABELS[dj]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </HStack>
              </>
            )}

            {/* Next button */}
            <Pressable
              className="flex-row items-center justify-center py-4 rounded-2xl mt-2"
              style={{ backgroundColor: canGoStep2 ? accent : theme.card, gap: 8 }}
              onPress={goNext}
              disabled={!canGoStep2}
            >
              <Text className="text-[15px] font-extrabold text-white" style={{ opacity: canGoStep2 ? 1 : 0.4 }}>
                Suivant
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ opacity: canGoStep2 ? 1 : 0.4 }} />
            </Pressable>
          </>
        )}

        {/* ── STEP 2: Motif ── */}
        {step === 2 && (
          <>
            <Text className="text-lg font-extrabold mb-1" style={{ color: theme.textPrimary }}>
              Quel est le motif de l'absence ?
            </Text>

            {/* Motif buttons */}
            <VStack style={{ gap: 10 }}>
              {motifList.map((m) => {
                const active = motif === m;
                return (
                  <Pressable
                    key={m}
                    className="flex-row items-center p-4 rounded-2xl relative"
                    style={{
                      gap: 12,
                      backgroundColor: active ? accent + '15' : theme.card,
                      borderWidth: 1.5,
                      borderColor: active ? accent : theme.cardBorder,
                    }}
                    onPress={() => setMotif(m)}
                  >
                    <Text className="text-2xl">{MOTIF_ICONS[m]}</Text>
                    <Text className="text-sm font-bold flex-1" style={{ color: active ? accent : theme.textPrimary }}>
                      {MOTIF_LABELS[m]}
                    </Text>
                    {active && (
                      <Box
                        className="w-6 h-6 rounded-full justify-center items-center"
                        style={{ backgroundColor: accent }}
                      >
                        <Ionicons name="checkmark" size={14} color="#FFF" />
                      </Box>
                    )}
                  </Pressable>
                );
              })}
            </VStack>

            {/* Comment field */}
            <Text className="text-[13px] font-semibold mt-2" style={{ color: theme.textSecondary }}>
              Précision (optionnel)
            </Text>
            <Box
              className="rounded-[14px] p-3.5"
              style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}
            >
              <TextInput
                style={{ fontSize: 15, fontWeight: '500', padding: 0, minHeight: 60, textAlignVertical: 'top', color: theme.textPrimary }}
                value={commentaire}
                onChangeText={(t) => setCommentaire(t.slice(0, 200))}
                placeholder="Ex: Fièvre depuis hier soir..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
              />
              <Text className="text-[11px] text-right mt-1" style={{ color: theme.textMuted }}>
                {commentaire.length}/200
              </Text>
            </Box>

            {/* Next button */}
            <Pressable
              className="flex-row items-center justify-center py-4 rounded-2xl mt-2"
              style={{ backgroundColor: canGoStep3 ? accent : theme.card, gap: 8 }}
              onPress={goNext}
              disabled={!canGoStep3}
            >
              <Text className="text-[15px] font-extrabold text-white" style={{ opacity: canGoStep3 ? 1 : 0.4 }}>
                Suivant
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ opacity: canGoStep3 ? 1 : 0.4 }} />
            </Pressable>
          </>
        )}

        {/* ── STEP 3: Confirmation ── */}
        {step === 3 && motif && (
          <>
            <Text className="text-lg font-extrabold mb-1" style={{ color: theme.textPrimary }}>
              Confirmer l'absence
            </Text>

            {/* Recap card */}
            <Box
              className="rounded-[18px] p-[18px]"
              style={{ borderWidth: 1, backgroundColor: theme.card, borderColor: theme.cardBorder, gap: 14 }}
            >
              <HStack className="items-center" style={{ gap: 12 }}>
                <Text className="text-[32px]">{selectedChild.avatar}</Text>
                <VStack className="flex-1">
                  <Text className="text-base font-extrabold" style={{ color: theme.textPrimary }}>
                    {selectedChild.name} sera absent(e)
                  </Text>
                </VStack>
              </HStack>

              <Box className="h-px my-0.5" style={{ backgroundColor: theme.cardBorder }} />

              {/* Date */}
              <HStack className="items-center" style={{ gap: 10 }}>
                <Ionicons name="calendar-outline" size={18} color={accent} />
                <Text className="text-sm font-medium flex-1" style={{ color: theme.textSecondary }}>
                  {formatDateRange(resolvedDateDebut, resolvedDateFin)}
                  {!multiDay && ` · ${DEMI_JOURNEE_LABELS[demiJournee]}`}
                </Text>
              </HStack>

              {/* Motif */}
              <HStack className="items-center" style={{ gap: 10 }}>
                <Text style={{ fontSize: 16 }}>{MOTIF_ICONS[motif]}</Text>
                <Text className="text-sm font-medium flex-1" style={{ color: theme.textSecondary }}>
                  {MOTIF_LABELS[motif]}
                </Text>
              </HStack>

              {/* Comment */}
              {commentaire.trim() ? (
                <HStack className="items-center" style={{ gap: 10 }}>
                  <Ionicons name="chatbubble-outline" size={16} color={theme.textMuted} />
                  <Text className="text-sm font-medium flex-1" style={{ color: theme.textMuted }} numberOfLines={2}>
                    {commentaire.trim()}
                  </Text>
                </HStack>
              ) : null}
            </Box>

            {/* Warning */}
            <HStack
              className="items-start p-3.5 rounded-[14px]"
              style={{ gap: 8, backgroundColor: '#FBBF2412', borderWidth: 1, borderColor: '#FBBF2430' }}
            >
              <Ionicons name="warning-outline" size={16} color="#FBBF24" />
              <Text className="text-xs font-medium flex-1 leading-[18px]" style={{ color: '#FBBF24' }}>
                L'absence ne pourra pas être modifiée après confirmation. Contactez l'enseignant via le cahier de liaison si besoin.
              </Text>
            </HStack>

            {/* Submit button */}
            <Pressable
              className="flex-row items-center justify-center py-4 rounded-2xl mt-2"
              style={{ backgroundColor: accent, gap: 8 }}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <Text className="text-[15px] font-extrabold text-white">Envoi en cours...</Text>
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFF" />
                  <Text className="text-[15px] font-extrabold text-white">Confirmer l'absence</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </Box>
  );
}
