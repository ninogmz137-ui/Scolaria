/**
 * AbsencesEnseignantScreen — absences signalées par les familles, visibles du titulaire AVANT l'appel (lot 4b, M42).
 *
 * Lecture seule : aucun statut « vu / pris en compte » en V1 (décision du 17 nov. 2026), aucune écriture par
 * l'enseignant. Données réelles seulement (RLS : élèves de mes classes) ; démo : aucune absence fictive.
 * Justificatif : ouvert par URL signée d'1 h (lisible par le titulaire, M42). L'écran complet de l'appel : lot 7.
 */
import { aujourdhuiParis, demainParis, decalerJour, lundiDuJour } from '../../utils/jourParis';
import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, RefreshControl, Linking, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Box, Text, Pressable, HStack, VStack, Spinner } from '../../components/ui';
import { SCREEN_BACKGROUND } from '../../constants/colors';
import { SHADOW } from '../../constants/design';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomBarScrollPadding } from '../../components/navigation/BottomBar';
import { useAuth } from '../../contexts/AuthContext';
import { absencesDeMesClasses, lienJustificatif, type AbsenceClasse } from '../../services/absenceService';
import { couvreJour, libelleMotif, periodeAbsence } from '../../utils/absences';
import EtatErreur from '../../components/EtatErreur';
import { classerErreur, type TypeErreur } from '../../services/erreurs';

const TEACHER_ORANGE = '#FF8C42';
const CARD_SHADOW = SHADOW.card;

type FilterType = 'toutes' | 'aujourdhui' | 'semaine';

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'toutes', label: 'Toutes' },
  { key: 'aujourdhui', label: 'Aujourd’hui' },
  { key: 'semaine', label: 'Cette semaine' },
];

export default function AbsencesEnseignantScreen() {
  const insets = useSafeAreaInsets();
  const { isDemo } = useAuth();
  const [absences, setAbsences] = useState<AbsenceClasse[]>([]);
  const [filter, setFilter] = useState<FilterType>('toutes');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erreur, setErreur] = useState<TypeErreur | null>(null);

  const loadAbsences = useCallback(async () => {
    try {
      setAbsences(await absencesDeMesClasses(isDemo));
      setErreur(null);
    } catch (e) {
      setErreur(classerErreur(e));
    }
  }, [isDemo]);

  useEffect(() => {
    setLoading(true);
    loadAbsences().finally(() => setLoading(false));
  }, [loadAbsences]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAbsences();
    setRefreshing(false);
  }, [loadAbsences]);

  const ouvrirJustificatif = useCallback(async (chemin: string) => {
    const url = await lienJustificatif(chemin);
    if (!url) {
      Alert.alert('Justificatif indisponible', 'Le justificatif n’a pas pu être ouvert. Réessayez.');
      return;
    }
    Linking.openURL(url);
  }, []);

  const auj = aujourdhuiParis();
  const dem = demainParis();
  const lundi = lundiDuJour(auj);
  const dimanche = decalerJour(lundi, 6);

  // Avant l'appel : les absences d'aujourd'hui et de demain.
  const avantAppel = absences.filter((a) => couvreJour(a, auj) || couvreJour(a, dem));
  const filtrees = absences.filter((a) => {
    if (filter === 'aujourdhui') return couvreJour(a, auj);
    if (filter === 'semaine') return a.date_debut <= dimanche && (a.date_fin ?? a.date_debut) >= lundi;
    return true;
  });

  const renderAbsenceCard = (absence: AbsenceClasse) => (
    <Box key={absence.id} className="rounded-[14px] p-3.5 mb-2.5" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1, borderColor: 'rgba(15,23,42,0.07)', ...CARD_SHADOW }}>
      <HStack className="items-start">
        <Box className="w-11 h-11 rounded-[22px] justify-center items-center mr-3" style={{ backgroundColor: '#E2E8F0' }}>
          <Text className="text-[15px] font-bold" style={{ color: '#334155' }}>
            {(absence.student_name || '?').charAt(0).toUpperCase()}
          </Text>
        </Box>
        <VStack className="flex-1">
          <Text className="text-[15px] font-bold mb-[3px]" style={{ color: '#0F172A' }}>{absence.student_name || 'Élève'}</Text>
          <Text className="text-xs mb-[3px]" style={{ color: '#64748B' }}>{periodeAbsence(absence, auj, dem)}</Text>
          {/* Lot 6 (M45) : une absence annulée par le foyer reste visible, avec ce statut. */}
          {absence.statut === 'annulée' ? (
            <Text className="text-[13px] font-semibold mb-0.5" style={{ color: '#0F172A' }}>Annulée par la famille</Text>
          ) : null}
          <Text
            className="text-[13px] mb-0.5"
            style={[{ color: '#0F172A' }, absence.statut === 'annulée' ? { textDecorationLine: 'line-through', color: 'rgba(15,23,42,0.45)' } : null]}
          >
            {libelleMotif(absence.motif)}
          </Text>
          {absence.commentaire ? (
            <Text className="text-xs mt-1" style={{ color: 'rgba(15,23,42,0.55)' }}>{absence.commentaire}</Text>
          ) : null}
          {absence.justificatif_path ? (
            <Pressable
              onPress={() => ouvrirJustificatif(absence.justificatif_path!)}
              accessibilityRole="button"
              className="mt-2 self-start rounded-full px-3 py-[6px]"
              style={{ borderWidth: 1, borderColor: 'rgba(15,23,42,0.18)' }}
            >
              <Text className="text-xs font-semibold" style={{ color: '#0F172A' }}>Voir le justificatif</Text>
            </Pressable>
          ) : null}
        </VStack>
      </HStack>
    </Box>
  );

  const vide = (texte: string) => (
    <Box className="rounded-[14px] p-6 items-center" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1, borderColor: 'rgba(15,23,42,0.07)', ...CARD_SHADOW }}>
      <Text className="text-sm" style={{ color: 'rgba(15,23,42,0.55)' }}>{texte}</Text>
    </Box>
  );

  return (
    <Box className="flex-1" style={{ backgroundColor: '#F3F4FA' }}>
      <LinearGradient
        colors={['#0B1628', TEACHER_ORANGE + 'DD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
      >
        <Text className="text-[28px] font-bold" style={{ color: '#fff' }}>Absences</Text>
        <Text className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>Signalées par les familles</Text>
      </LinearGradient>

      <HStack className="px-5 mt-4 mb-3 gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => setFilter(opt.key)}
            className="px-4 py-2 rounded-[20px]"
            style={{
              backgroundColor: filter === opt.key ? '#0F172A' : SCREEN_BACKGROUND,
              borderWidth: 1,
              borderColor: filter === opt.key ? '#0F172A' : 'rgba(15,23,42,0.07)',
            }}
          >
            <Text className="text-[13px] font-semibold" style={{ color: filter === opt.key ? '#FFFFFF' : '#64748B' }}>{opt.label}</Text>
          </Pressable>
        ))}
      </HStack>

      {loading ? (
        <Box className="flex-1 justify-center items-center">
          <Spinner size="large" color="#0F172A" />
        </Box>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: getBottomBarScrollPadding(insets.bottom) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {erreur ? <EtatErreur type={erreur} onReessayer={loadAbsences} /> : null}

          {filter === 'toutes' ? (
            <VStack className="mb-6">
              <Text className="text-[13px] font-semibold mb-2" style={{ color: 'rgba(15,23,42,0.55)' }}>Aujourd’hui et demain</Text>
              {avantAppel.length > 0 ? avantAppel.map(renderAbsenceCard) : vide('Aucune absence signalée pour aujourd’hui ni demain')}
            </VStack>
          ) : null}

          <VStack className="mb-6">
            <Text className="text-[13px] font-semibold mb-2" style={{ color: 'rgba(15,23,42,0.55)' }}>
              {filter === 'toutes' ? 'Toutes les absences signalées' : filter === 'aujourdhui' ? 'Aujourd’hui' : 'Cette semaine'}
            </Text>
            {filtrees.length > 0 ? filtrees.map(renderAbsenceCard) : vide('Aucune absence signalée')}
          </VStack>
        </ScrollView>
      )}
    </Box>
  );
}
