import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Box, Text, Pressable, HStack, VStack, Spinner } from '../../components/ui';
import { Colors } from '../../constants/colors';
import {
  getClassAbsences,
  markAbsencePriseEnCompte,
  MOTIF_LABELS,
  MOTIF_ICONS,
  DEMI_JOURNEE_LABELS,
  formatDateFr,
  formatDateRange,
  type Absence,
} from '../../services/absenceService';

const TEACHER_ORANGE = '#FF8C42';

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 8 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
});

type FilterType = 'toutes' | 'aujourdhui' | 'semaine';

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'toutes', label: 'Toutes' },
  { key: 'aujourdhui', label: "Aujourd'hui" },
  { key: 'semaine', label: 'Cette semaine' },
];

export default function AbsencesEnseignantScreen() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [filter, setFilter] = useState<FilterType>('toutes');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const loadAbsences = useCallback(async () => {
    try {
      const data = await getClassAbsences();
      setAbsences(data);
    } catch (error) {
      console.error('Erreur chargement absences:', error);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    loadAbsences().finally(() => setLoading(false));
  }, [loadAbsences]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAbsences();
    setRefreshing(false);
  }, [loadAbsences]);

  const handlePriseEnCompte = useCallback(async (absenceId: string) => {
    setProcessingIds((prev) => new Set(prev).add(absenceId));
    try {
      await markAbsencePriseEnCompte(absenceId);
      setAbsences((prev) =>
        prev.map((a) =>
          a.id === absenceId ? { ...a, statut: 'prise_en_compte' as const } : a
        )
      );
    } catch (error) {
      console.error('Erreur mise a jour absence:', error);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(absenceId);
        return next;
      });
    }
  }, []);

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const absencesDuJour = absences.filter(
    (a) =>
      a.statut === 'signalée' &&
      (a.date_debut?.slice(0, 10) === todayStr ||
        a.date_debut?.slice(0, 10) === tomorrowStr)
  );

  const historiqueAbsences = absences.filter(
    (a) =>
      !absencesDuJour.find((aj) => aj.id === a.id)
  );

  const todayFormatted = formatDateFr(todayStr);

  const renderStatutBadge = (statut: string) => {
    const isSignalee = statut === 'signalée';
    return (
      <Box className="px-2.5 py-1 rounded-xl" style={{ backgroundColor: isSignalee ? TEACHER_ORANGE + '25' : '#22c55e25' }}>
        <Text className="text-[11px] font-semibold" style={{ color: isSignalee ? TEACHER_ORANGE : '#22c55e' }}>
          {isSignalee ? 'Signalée' : 'Prise en compte'}
        </Text>
      </Box>
    );
  };

  const renderAbsenceCard = (absence: Absence, showAction: boolean) => {
    const motifLabel = MOTIF_LABELS[absence.motif] || absence.motif || 'Non precise';
    const motifIcon = MOTIF_ICONS[absence.motif] || '';
    const demiJourneeLabel = absence.demi_journee
      ? DEMI_JOURNEE_LABELS[absence.demi_journee] || absence.demi_journee
      : '';
    const dateDisplay =
      absence.date_debut && absence.date_fin && absence.date_debut !== absence.date_fin
        ? formatDateRange(absence.date_debut, absence.date_fin)
        : formatDateFr(absence.date_debut || '');
    const isProcessing = processingIds.has(absence.id);

    return (
      <Box key={absence.id} className="rounded-[14px] p-3.5 mb-2.5" style={{ backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}>
        <HStack className="items-start">
          <Box className="w-11 h-11 rounded-[22px] justify-center items-center mr-3" style={{ backgroundColor: TEACHER_ORANGE + '15' }}>
            <Text className="text-2xl">
              {absence.student_avatar || '👤'}
            </Text>
          </Box>

          <VStack className="flex-1 mr-2.5">
            <Text className="text-[15px] font-bold mb-[3px]" style={{ color: '#0F172A' }}>
              {absence.student_name}
            </Text>
            <Text className="text-xs mb-[3px]" style={{ color: '#64748B' }}>
              {dateDisplay}
              {demiJourneeLabel ? ` - ${demiJourneeLabel}` : ''}
            </Text>
            <Text className="text-[13px] mb-0.5" style={{ color: '#0F172A' }}>
              {motifIcon ? `${motifIcon} ` : ''}
              {motifLabel}
            </Text>
            {absence.commentaire ? (
              <Text className="text-xs italic mt-1" style={{ color: '#94A3B8' }}>{absence.commentaire}</Text>
            ) : null}
          </VStack>

          <VStack className="items-end justify-start gap-2">
            {renderStatutBadge(absence.statut)}
            {showAction && absence.statut === 'signalée' && (
              <Pressable
                onPress={() => handlePriseEnCompte(absence.id)}
                disabled={isProcessing}
                className="rounded-[10px] min-w-[100px] items-center py-[7px] px-3"
                style={{ backgroundColor: TEACHER_ORANGE, opacity: isProcessing ? 0.6 : 1 }}
              >
                {isProcessing ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <Text className="text-[11px] font-bold" style={{ color: '#fff' }}>Prise en compte</Text>
                )}
              </Pressable>
            )}
          </VStack>
        </HStack>
      </Box>
    );
  };

  return (
    <Box className="flex-1" style={{ backgroundColor: '#E8EDF5' }}>
      {/* Header */}
      <LinearGradient
        colors={['#0B1628', TEACHER_ORANGE + 'DD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
      >
        <Text className="text-[28px] font-bold" style={{ color: '#fff' }}>Absences</Text>
        <Text className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>{todayFormatted}</Text>
      </LinearGradient>

      {/* Filter bar */}
      <HStack className="px-5 mt-4 mb-3 gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => setFilter(opt.key)}
            className="px-4 py-2 rounded-[20px]"
            style={{
              backgroundColor: filter === opt.key ? TEACHER_ORANGE + '20' : '#FFFFFF',
              borderWidth: 1.5,
              borderColor: filter === opt.key ? TEACHER_ORANGE : '#EEF0F5',
              ...CARD_SHADOW,
            }}
          >
            <Text className="text-[13px] font-semibold" style={{ color: filter === opt.key ? TEACHER_ORANGE : '#64748B' }}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </HStack>

      {loading ? (
        <Box className="flex-1 justify-center items-center">
          <Spinner size="large" color={TEACHER_ORANGE} />
        </Box>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={TEACHER_ORANGE}
              colors={[TEACHER_ORANGE]}
            />
          }
        >
          {/* Absences du jour */}
          {absencesDuJour.length > 0 && (
            <VStack className="mb-6">
              <HStack className="items-center gap-2 mb-3">
                <Box style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: TEACHER_ORANGE }} />
                <Text className="text-lg font-bold" style={{ color: TEACHER_ORANGE }}>Absences du jour</Text>
              </HStack>
              {absencesDuJour.map((a) => renderAbsenceCard(a, true))}
            </VStack>
          )}

          {absencesDuJour.length === 0 && !loading && (
            <VStack className="mb-6">
              <HStack className="items-center gap-2 mb-3">
                <Box style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: TEACHER_ORANGE }} />
                <Text className="text-lg font-bold" style={{ color: TEACHER_ORANGE }}>Absences du jour</Text>
              </HStack>
              <Box className="rounded-[14px] p-6 items-center" style={{ backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}>
                <Text className="text-sm" style={{ color: '#94A3B8' }}>
                  Aucune absence signalée pour aujourd'hui
                </Text>
              </Box>
            </VStack>
          )}

          {/* Historique */}
          <VStack className="mb-6">
            <HStack className="items-center gap-2 mb-3">
              <Box style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: TEACHER_ORANGE }} />
              <Text className="text-lg font-bold" style={{ color: TEACHER_ORANGE }}>Historique de la classe</Text>
            </HStack>
            {historiqueAbsences.length > 0 ? (
              historiqueAbsences.map((a) => renderAbsenceCard(a, false))
            ) : (
              <Box className="rounded-[14px] p-6 items-center" style={{ backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}>
                <Text className="text-sm" style={{ color: '#94A3B8' }}>Aucune absence dans l'historique</Text>
              </Box>
            )}
          </VStack>
        </ScrollView>
      )}
    </Box>
  );
}
