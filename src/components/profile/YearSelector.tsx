import { useRef, useEffect } from 'react';
import { ScrollView, Animated } from 'react-native';
import { Box, Text, Pressable, HStack } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import type { AcademicYearStatut } from '../../services/database';

// ─── Types ────────────────────────────────────────────────

export interface YearPill {
  id: string;
  annee_scolaire: string;
  niveau: string;
  statut: AcademicYearStatut;
}

interface Props {
  years: YearPill[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddYear: () => void;
  accentColor?: string;
}

// ─── Component ────────────────────────────────────────────

export default function YearSelector({
  years,
  selectedId,
  onSelect,
  onAddYear,
  accentColor = Colors.violet,
}: Props) {
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ marginBottom: 16, opacity: fadeIn }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {years.map((year) => {
          const isSelected = year.id === selectedId;
          const isActive = year.statut === 'active';
          const isArchived = year.statut === 'archivée' || year.statut === 'importée';

          return (
            <Pressable
              key={year.id}
              className="flex-row items-center gap-2 px-3.5 py-2.5 rounded-2xl"
              style={{
                borderWidth: 1.5,
                borderColor: isSelected
                  ? accentColor
                  : !isSelected && isActive
                    ? accentColor + '50'
                    : isArchived
                      ? '#EEF0F5'
                      : '#E2E8F0',
                backgroundColor: isSelected
                  ? accentColor
                  : isArchived
                    ? '#F1F5F9'
                    : '#FFFFFF',
              }}
              onPress={() => onSelect(year.id)}
            >
              {/* Status dot */}
              <Box
                className="rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: isSelected
                    ? Colors.white
                    : isActive
                      ? Colors.green
                      : Colors.gray,
                }}
              />

              <Box style={{ gap: 1 }}>
                <Text
                  className="text-[13px] font-bold"
                  style={{
                    color: isSelected
                      ? Colors.white
                      : isArchived
                        ? '#94A3B8'
                        : '#0F172A',
                  }}
                >
                  {year.annee_scolaire}
                </Text>
                <Text
                  className="text-[11px] font-medium"
                  style={{
                    color: isSelected
                      ? 'rgba(255,255,255,0.85)'
                      : isArchived
                        ? '#94A3B8'
                        : '#64748B',
                  }}
                >
                  {year.niveau}
                </Text>
              </Box>

              {isSelected && isActive && (
                <Box className="px-1.5 py-0.5 rounded-md ml-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
                  <Text className="text-[9px] font-bold uppercase tracking-wide" style={{ color: Colors.white }}>
                    En cours
                  </Text>
                </Box>
              )}
            </Pressable>
          );
        })}

        {/* Add year button */}
        <Pressable
          className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-2xl"
          style={{ borderWidth: 1.5, borderColor: '#EEF0F5', borderStyle: 'dashed' }}
          onPress={onAddYear}
        >
          <Ionicons name="add" size={18} color={'#94A3B8'} />
          <Text className="text-xs font-semibold" style={{ color: '#94A3B8' }}>
            Ajouter une année
          </Text>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}
