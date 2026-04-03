/**
 * AbsencesListScreen — List of student absences with status badges.
 *
 * Uses mock data from absenceService structure.
 * Status: signalée (orange) | prise_en_compte (green) | refusée (red).
 */

import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// ChevronLeft removed — AppTopbar handles back navigation
import { FontFamily } from '../../hooks/useSolariaFonts';
import GlassCard from '../../components/GlassCard';
import { FLOATING_TAB_BAR_HEIGHT } from '../../components/FloatingTabBar';

// ─── Types ────────────────────────────────────────────────

type AbsenceStatut = 'signalée' | 'prise_en_compte' | 'refusée';
type DemiJournee = 'matin' | 'apres_midi' | 'journee';

interface AbsenceItem {
  id: string;
  date_debut: string;
  date_fin: string | null;
  demi_journee: DemiJournee;
  motif: string;
  motif_emoji: string;
  statut: AbsenceStatut;
  commentaire: string | null;
}

// ─── Mock data ────────────────────────────────────────────

const MOCK_ABSENCES: AbsenceItem[] = [
  {
    id: 'abs-1',
    date_debut: '25/03/2026',
    date_fin: null,
    demi_journee: 'journee',
    motif: 'Maladie',
    motif_emoji: '🤒',
    statut: 'prise_en_compte',
    commentaire: 'Fièvre depuis hier soir',
  },
  {
    id: 'abs-2',
    date_debut: '10/03/2026',
    date_fin: '12/03/2026',
    demi_journee: 'journee',
    motif: 'Maladie avec certificat',
    motif_emoji: '🏥',
    statut: 'prise_en_compte',
    commentaire: 'Gastro-entérite — certificat médical transmis',
  },
  {
    id: 'abs-3',
    date_debut: '27/03/2026',
    date_fin: null,
    demi_journee: 'matin',
    motif: 'Raison familiale',
    motif_emoji: '👨‍👩‍👧',
    statut: 'signalée',
    commentaire: null,
  },
  {
    id: 'abs-4',
    date_debut: '01/04/2026',
    date_fin: null,
    demi_journee: 'apres_midi',
    motif: 'Autre',
    motif_emoji: '📝',
    statut: 'signalée',
    commentaire: 'Rendez-vous médical',
  },
];

// ─── Status config ────────────────────────────────────────

const STATUT_CONFIG: Record<AbsenceStatut, { label: string; bg: string; text: string }> = {
  signalée: {
    label: 'Signalée',
    bg: '#FEF3C7',
    text: '#92400E',
  },
  prise_en_compte: {
    label: 'Prise en compte',
    bg: '#D1FAE5',
    text: '#065F46',
  },
  refusée: {
    label: 'Refusée',
    bg: '#FEE2E2',
    text: '#991B1B',
  },
};

const DEMI_JOURNEE_LABELS: Record<DemiJournee, string> = {
  matin: 'Matin',
  apres_midi: 'Après-midi',
  journee: 'Journée entière',
};

// ─── Component ────────────────────────────────────────────

export default function AbsencesListScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10 },
        ]}
      >
        {/* ── Section header ── */}
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionAccentBar, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.sectionLabel}>Historique des absences</Text>
        </View>

        {MOCK_ABSENCES.map((absence) => {
          const statut = STATUT_CONFIG[absence.statut];
          return (
            <Pressable
              key={absence.id}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: 8 })}
              accessibilityRole="button"
            >
              <GlassCard borderRadius={14}>
                <View style={styles.absenceRow}>
                  {/* Motif icon */}
                  <View style={styles.absenceIconContainer}>
                    <Text style={styles.absenceIcon}>{absence.motif_emoji}</Text>
                  </View>

                  {/* Text */}
                  <View style={styles.absenceBody}>
                    <View style={styles.absenceTitleRow}>
                      <Text style={styles.absenceDate} numberOfLines={1}>
                        {absence.date_fin
                          ? `${absence.date_debut} — ${absence.date_fin}`
                          : absence.date_debut}
                      </Text>
                      <View style={[styles.statutBadge, { backgroundColor: statut.bg }]}>
                        <Text style={[styles.statutText, { color: statut.text }]}>
                          {statut.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.absenceMotif}>{absence.motif}</Text>

                    <Text style={styles.absencePeriode}>
                      {DEMI_JOURNEE_LABELS[absence.demi_journee]}
                      {absence.commentaire ? ` · ${absence.commentaire}` : ''}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          );
        })}

        {/* ── Empty state fallback ── */}
        {MOCK_ABSENCES.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Aucune absence signalée</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },

  scrollContent: {
    paddingHorizontal: 18,
  },

  // ── Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionAccentBar: {
    width: 30,
    height: 3,
    borderRadius: 2,
  },
  sectionLabel: {
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  // ── Absence card
  absenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  absenceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  absenceIcon: {
    fontSize: 22,
  },
  absenceBody: {
    flex: 1,
    gap: 3,
  },
  absenceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  absenceDate: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#0F172A',
    flex: 1,
  },
  absenceMotif: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    color: '#0F172A',
  },
  absencePeriode: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#64748B',
  },

  // ── Status badge
  statutBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  statutText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
  },

  // ── Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    color: '#94A3B8',
  },
});
