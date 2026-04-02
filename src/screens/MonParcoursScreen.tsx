/**
 * MonParcoursScreen — Timeline of academic years for the selected child.
 *
 * Displays all millésimes (active, archived, imported) as cards,
 * sorted newest first. Tap a card to view archived detail (read-only).
 * Bottom button to add a past year via OCR import.
 */

import { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Papicons } from '@getpapillon/papicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import WallpaperBackground from '../components/WallpaperBackground';
import GlassCard from '../components/GlassCard';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';
import type { AcademicYearStatut } from '../services/database';
import { getAcademicYears } from '../services/database';

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

const STATUT_CONFIG: Record<AcademicYearStatut, { label: string; color: string; bg: string; icon: string }> = {
  active:    { label: 'EN COURS',  color: '#10B981', bg: '#10B98118', icon: 'Check' },
  'archivée': { label: 'ARCHIVÉE', color: '#64748B', bg: '#64748B15', icon: 'Archive' },
  'importée': { label: 'IMPORTÉE', color: '#F59E0B', bg: '#F59E0B18', icon: 'Upload' },
};

// ─── Component ──────────────────────────────────────────

export default function MonParcoursScreen() {
  useChildTheme(); // kept for future theme re-integration
  const { selectedChild } = useActiveChild();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;
  const accent = '#3B82F6';

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
    <View style={{ flex: 1 }}>
      <WallpaperBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: TOPBAR_H + 12,
          paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10,
          paddingHorizontal: 18,
          gap: 12,
        }}
      >
        {/* Page title */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Mon parcours</Text>
          <Text style={styles.subtitle}>
            {selectedChild.name} · {years.length} année{years.length > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Timeline indicator */}
        <View style={styles.timelineRow}>
          {years.map((y) => (
            <View
              key={y.id}
              style={[
                styles.timelineDot,
                { backgroundColor: y.statut === 'active' ? '#FFFFFF' : 'rgba(255,255,255,0.25)' },
              ]}
            />
          ))}
        </View>

        {/* Section label */}
        <View style={styles.sectionRow}>
          <View style={[styles.sectionBar, { backgroundColor: accent }]} />
          <Text style={styles.sectionLabel}>Années scolaires</Text>
        </View>

        {/* Year cards */}
        {years.map((year) => {
          const statutCfg = STATUT_CONFIG[year.statut];
          const isActive = year.statut === 'active';

          return (
            <Pressable
              key={year.id}
              onPress={() => {
                // TODO: navigate to year detail
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <GlassCard
                noPadding
                style={{
                  borderTopWidth: 3,
                  borderTopColor: isActive ? accent : 'rgba(203,213,225,0.6)',
                }}
              >
                <View style={styles.cardInner}>
                  {/* Top row: year info + statut badge */}
                  <View style={styles.cardTopRow}>
                    {/* Left: year info */}
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.yearText}>{year.annee_scolaire}</Text>
                      <View style={styles.niveauRow}>
                        <Text style={[styles.niveauText, { color: isActive ? accent : '#64748B' }]}>
                          {year.niveau}
                        </Text>
                        <View style={styles.dot} />
                        <Text style={styles.etablissementText}>{year.etablissement}</Text>
                      </View>
                    </View>

                    {/* Right: statut badge */}
                    <View style={[styles.statutBadge, { backgroundColor: statutCfg.bg }]}>
                      <Papicons name={statutCfg.icon} size={8} color={statutCfg.color} />
                      <Text style={[styles.statutLabel, { color: statutCfg.color }]}>
                        {statutCfg.label}
                      </Text>
                    </View>
                  </View>

                  {/* Bottom row: bulletins count */}
                  <View style={styles.bulletinRow}>
                    <Papicons name="Paper" size={16} color="#94A3B8" />
                    <Text style={styles.bulletinText}>
                      {year.bulletins} bulletin{year.bulletins > 1 ? 's' : ''} disponible{year.bulletins > 1 ? 's' : ''}
                    </Text>
                    <Papicons name="ChevronRight" size={16} color="#CBD5E1" />
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          );
        })}

        {/* Add past year button */}
        <Pressable
          onPress={() => navigation.navigate('AjouterAnne')}
          style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.85 : 1, backgroundColor: accent }]}
        >
          <Papicons name="Plus" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Ajouter une année passée</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamily.sansBold,
    fontSize: 26,
    color: '#0F172A',
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  timelineDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sectionBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  sectionLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  cardInner: {
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  yearText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 20,
    color: '#0F172A',
  },
  niveauRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  niveauText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  etablissementText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#94A3B8',
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statutLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bulletinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(241,245,249,0.5)',
  },
  bulletinText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  addButtonText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
