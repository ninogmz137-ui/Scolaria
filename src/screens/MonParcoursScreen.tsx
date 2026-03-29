/**
 * MonParcoursScreen — Timeline of academic years for the selected child.
 *
 * Displays all millésimes (active, archived, imported) as cards,
 * sorted newest first. Tap a card to view archived detail (read-only).
 * Bottom button to add a past year via OCR import.
 */

import { useState, useEffect, useCallback } from 'react';
import { ScrollView, Platform, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Box, Text, Pressable, HStack, VStack } from '../components/ui';
import DecorativeBlobs from '../components/DecorativeBlobs';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import type { AcademicYearStatut } from '../services/database';
import { getAcademicYears } from '../services/database';

// ─── Helpers ─────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 8 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 20 },
}) as Record<string, any>;

// ─── Mock academic year data ─────────────────────────────

interface AcademicYearCard {
  id: string;
  annee_scolaire: string;
  niveau: string;
  etablissement: string;
  statut: AcademicYearStatut;
  bulletins: number;
}

function getMockYears(childId: string): AcademicYearCard[] {
  switch (childId) {
    case '1': // Léa — maternelle
      return [
        { id: 'y1-1', annee_scolaire: '2025-2026', niveau: 'GS', etablissement: 'Maternelle Pasteur', statut: 'active', bulletins: 1 },
        { id: 'y1-2', annee_scolaire: '2024-2025', niveau: 'MS', etablissement: 'Maternelle Pasteur', statut: 'archivée', bulletins: 3 },
      ];
    case '2': // Lucas — primaire
      return [
        { id: 'y2-1', annee_scolaire: '2025-2026', niveau: 'CM2', etablissement: 'École Voltaire', statut: 'active', bulletins: 2 },
        { id: 'y2-2', annee_scolaire: '2024-2025', niveau: 'CM1', etablissement: 'École Voltaire', statut: 'archivée', bulletins: 3 },
        { id: 'y2-3', annee_scolaire: '2023-2024', niveau: 'CE2', etablissement: 'École Voltaire', statut: 'archivée', bulletins: 3 },
        { id: 'y2-4', annee_scolaire: '2022-2023', niveau: 'CE1', etablissement: 'École Voltaire', statut: 'importée', bulletins: 2 },
      ];
    case '3': // Emma — collège
    default:
      return [
        { id: 'y3-1', annee_scolaire: '2025-2026', niveau: '3ème', etablissement: 'Collège Hugo', statut: 'active', bulletins: 2 },
        { id: 'y3-2', annee_scolaire: '2024-2025', niveau: '4ème', etablissement: 'Collège Hugo', statut: 'archivée', bulletins: 3 },
        { id: 'y3-3', annee_scolaire: '2023-2024', niveau: '5ème', etablissement: 'Collège Hugo', statut: 'archivée', bulletins: 3 },
        { id: 'y3-4', annee_scolaire: '2022-2023', niveau: '6ème', etablissement: 'Collège Hugo', statut: 'archivée', bulletins: 3 },
        { id: 'y3-5', annee_scolaire: '2021-2022', niveau: 'CM2', etablissement: 'École Voltaire', statut: 'importée', bulletins: 1 },
      ];
  }
}

// ─── Statut config ──────────────────────────────────────

const STATUT_CONFIG: Record<AcademicYearStatut, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  active: { label: 'EN COURS', color: '#10B981', bg: '#10B98118', icon: 'ellipse' },
  'archivée': { label: 'ARCHIVÉE', color: '#64748B', bg: '#64748B15', icon: 'archive' },
  'importée': { label: 'IMPORTÉE', color: '#F59E0B', bg: '#F59E0B18', icon: 'cloud-upload' },
};

// ─── Component ──────────────────────────────────────────

export default function MonParcoursScreen() {
  const { theme } = useChildTheme();
  const { selectedChild } = useActiveChild();
  const navigation = useNavigation<any>();
  const accent = theme.accent;
  const accentRgb = hexToRgb(accent);

  const [years, setYears] = useState<AcademicYearCard[]>(() => getMockYears(selectedChild.id));

  const loadYears = useCallback(async () => {
    const { data, error } = await getAcademicYears(selectedChild.id);
    if (data && data.length > 0) {
      setYears(
        data.map((row) => ({
          id: row.id,
          annee_scolaire: row.annee_scolaire,
          niveau: row.niveau,
          etablissement: row.etablissement,
          statut: row.statut,
          bulletins: 0,
        }))
      );
    }
    // If empty or error, keep the mock data already in state
  }, [selectedChild.id]);

  useEffect(() => {
    loadYears();
  }, [loadYears]);

  return (
    <View style={{ flex: 1, backgroundColor: '#E8EDF5' }}>
      {/* Dark gradient header */}
      <LinearGradient
        colors={['#0B1628', accent + 'DD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: 28,
          paddingBottom: 28,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          overflow: 'hidden',
        }}
      >
        <DecorativeBlobs accent={accent} size={90} opacity={0.15} />

        {/* Title */}
        <HStack className="items-center" style={{ gap: 10, marginBottom: 6 }}>
          <Ionicons name="map" size={22} color="#FFFFFF" />
          <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 22, color: '#FFFFFF' }}>
            Mon parcours
          </Text>
        </HStack>

        <Text style={{ fontFamily: FontFamily.sansRegular, fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
          {selectedChild.name} · {years.length} année{years.length > 1 ? 's' : ''}
        </Text>

        {/* Timeline indicator */}
        <HStack className="items-center" style={{ gap: 6 }}>
          {years.map((y, i) => (
            <Box
              key={y.id}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: y.statut === 'active' ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </HStack>
      </LinearGradient>

      {/* Content */}
      <View style={{ flex: 1, position: 'relative' }}>
        <DecorativeBlobs accent={accent} size={80} opacity={0.08} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 18, paddingTop: 20, paddingBottom: 100, gap: 12 }}
        >
          {/* Section bar */}
          <HStack className="items-center" style={{ gap: 8, marginBottom: 2 }}>
            <Box style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: accent }} />
            <Text style={{
              fontFamily: FontFamily.sansBold,
              fontSize: 13,
              color: '#0F172A',
              textTransform: 'uppercase',
              letterSpacing: 1.2,
            }}>
              Années scolaires
            </Text>
          </HStack>

          {/* Year cards */}
          {years.map((year, index) => {
            const statutCfg = STATUT_CONFIG[year.statut];
            const isActive = year.statut === 'active';

            return (
              <Pressable
                key={year.id}
                onPress={() => {
                  // TODO: navigate to year detail
                }}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderTopWidth: 3,
                  borderTopColor: isActive ? accent : '#CBD5E1',
                  ...CARD_SHADOW,
                }}
              >
                <Box style={{ padding: 16 }}>
                  <HStack className="items-start justify-between" style={{ marginBottom: 12 }}>
                    {/* Left: year info */}
                    <VStack style={{ flex: 1, gap: 4 }}>
                      <Text style={{
                        fontFamily: FontFamily.sansBold,
                        fontSize: 20,
                        color: '#0F172A',
                      }}>
                        {year.annee_scolaire}
                      </Text>
                      <HStack className="items-center" style={{ gap: 6 }}>
                        <Text style={{
                          fontFamily: FontFamily.sansSemiBold,
                          fontSize: 15,
                          color: isActive ? accent : '#64748B',
                        }}>
                          {year.niveau}
                        </Text>
                        <Box style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' }} />
                        <Text style={{
                          fontFamily: FontFamily.sansRegular,
                          fontSize: 13,
                          color: '#94A3B8',
                        }}>
                          {year.etablissement}
                        </Text>
                      </HStack>
                    </VStack>

                    {/* Right: statut badge */}
                    <HStack
                      className="items-center"
                      style={{
                        gap: 5,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 12,
                        backgroundColor: statutCfg.bg,
                      }}
                    >
                      <Ionicons name={statutCfg.icon} size={8} color={statutCfg.color} />
                      <Text style={{
                        fontFamily: FontFamily.sansBold,
                        fontSize: 10,
                        color: statutCfg.color,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                      }}>
                        {statutCfg.label}
                      </Text>
                    </HStack>
                  </HStack>

                  {/* Bulletins count */}
                  <HStack
                    className="items-center"
                    style={{
                      gap: 8,
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: '#F1F5F9',
                    }}
                  >
                    <Ionicons name="document-text-outline" size={16} color="#94A3B8" />
                    <Text style={{
                      fontFamily: FontFamily.sansSemiBold,
                      fontSize: 13,
                      color: '#64748B',
                      flex: 1,
                    }}>
                      {year.bulletins} bulletin{year.bulletins > 1 ? 's' : ''} disponible{year.bulletins > 1 ? 's' : ''}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                  </HStack>
                </Box>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Floating add button */}
        <Box
          style={{
            position: 'absolute',
            bottom: 24,
            left: 18,
            right: 18,
          }}
        >
          <Pressable
            onPress={() => navigation.navigate('AjouterAnne')}
            style={{ borderRadius: 16, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={[accent, accent + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                paddingVertical: 16,
                borderRadius: 16,
              }}
            >
              <Ionicons name="add-circle" size={22} color="#FFFFFF" />
              <Text style={{
                fontFamily: FontFamily.sansBold,
                fontSize: 15,
                color: '#FFFFFF',
              }}>
                Ajouter une année passée
              </Text>
            </LinearGradient>
          </Pressable>
        </Box>
      </View>
    </View>
  );
}
