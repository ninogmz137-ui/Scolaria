/**
 * ArchivedYearDetailScreen — Read-only detail view for an archived academic year.
 *
 * Shows T1/T2/T3 averages, per-trimester bulletin details, and the annual
 * appreciation. Navigation header is handled by AppTopbar in stacked mode.
 */

import { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Papicons } from '@getpapillon/papicons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import WallpaperBackground from '../components/WallpaperBackground';
import GlassCard from '../components/GlassCard';
import { FontFamily } from '../hooks/useSolariaFonts';
import { FLOATING_TAB_BAR_HEIGHT, TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';
import { useDemoData, type DemoArchivedBulletin } from '../contexts/DemoContext';

// ─── Navigation types ────────────────────────────────────

type RootStackParamList = {
  ArchivedYearDetail: {
    year: string;
    niveau: string;
    etablissement: string;
    statut: 'archivée' | 'importée';
    childId: string;
  };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ArchivedYearDetail'>;
  route: RouteProp<RootStackParamList, 'ArchivedYearDetail'>;
};

// ─── Color helpers ───────────────────────────────────────

const ACCENT = '#7C3AED';

const COLOR_TEXT_PRIMARY = '#0F172A';
const COLOR_TEXT_SECONDARY = '#64748B';
const COLOR_TEXT_MUTED = '#94A3B8';

function gradeColor(avg: number): string {
  if (avg >= 14) return '#10B981';
  if (avg >= 10) return '#F59E0B';
  return '#EF4444';
}

function gradeBg(avg: number): string {
  if (avg >= 14) return '#10B98118';
  if (avg >= 10) return '#F59E0B18';
  return '#EF444418';
}

function formatAvg(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toFixed(1);
}

// ─── Statut badge config ─────────────────────────────────

const STATUT_CONFIG = {
  archivée: { label: 'ARCHIVÉE', color: '#64748B', bg: '#64748B15' },
  importée: { label: 'IMPORTÉE', color: '#F59E0B', bg: '#F59E0B18' },
} as const;

// ─── Sub-components ──────────────────────────────────────

interface SectionHeaderProps {
  label: string;
}

function SectionHeader({ label }: SectionHeaderProps) {
  return (
    <View style={styles.sectionRow}>
      <View style={[styles.sectionBar, { backgroundColor: ACCENT }]} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

interface AverageDisplayProps {
  label: string;
  value: number | null | undefined;
  showArrow?: boolean;
}

function AverageDisplay({ label, value, showArrow }: AverageDisplayProps) {
  const hasValue = value != null;
  const color = hasValue ? gradeColor(value!) : COLOR_TEXT_MUTED;

  return (
    <View style={styles.trimAvgContainer}>
      <Text style={[styles.trimAvgValue, { color }]}>
        {formatAvg(value)}
      </Text>
      <Text style={styles.trimAvgLabel}>{label}</Text>
      {showArrow && (
        <View style={styles.trimAvgArrow}>
          <Papicons name="ChevronRight" size={16} color={COLOR_TEXT_MUTED} />
        </View>
      )}
    </View>
  );
}

interface BulletinCardProps {
  bulletin: DemoArchivedBulletin;
}

function BulletinCard({ bulletin }: BulletinCardProps) {
  const [expanded, setExpanded] = useState(false);
  const trimLabel = `Bulletin Trimestre ${bulletin.trimester}`;
  const subjectCount = bulletin.subjects?.length ?? 0;

  return (
    <GlassCard noPadding style={styles.bulletinCard}>
      {/* Header row — always visible */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [
          styles.bulletinHeader,
          pressed && { opacity: 0.75 },
        ]}
      >
        <View style={styles.bulletinHeaderLeft}>
          <Papicons name="Paper" size={18} color={ACCENT} />
          <View>
            <Text style={styles.bulletinTitle}>{trimLabel}</Text>
            <Text style={styles.bulletinSubCount}>
              {subjectCount} matière{subjectCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.bulletinHeaderRight}>
          {/* Trimester average badge */}
          <View style={[styles.avgBadge, { backgroundColor: gradeBg(bulletin.average) }]}>
            <Text style={[styles.avgBadgeText, { color: gradeColor(bulletin.average) }]}>
              {formatAvg(bulletin.average)}
            </Text>
          </View>
          <Papicons
            name={expanded ? 'ChevronUp' : 'ChevronDown'}
            size={16}
            color={COLOR_TEXT_MUTED}
          />
        </View>
      </Pressable>

      {/* Expanded: subject list */}
      {expanded && (
        <View style={styles.subjectList}>
          <View style={styles.subjectListDivider} />
          {/* Table header */}
          <View style={styles.subjectTableHeader}>
            <Text style={[styles.subjectTableHeaderText, { flex: 1 }]}>Matière</Text>
            <Text style={styles.subjectTableHeaderText}>Moy.</Text>
            <Text style={[styles.subjectTableHeaderText, { marginLeft: 12 }]}>Classe</Text>
          </View>

          {bulletin.subjects.map((subject, idx) => {
            const barWidth = Math.min((subject.average / 20) * 100, 100);
            return (
              <View
                key={`${subject.name}-${idx}`}
                style={[
                  styles.subjectRow,
                  idx < bulletin.subjects.length - 1 && styles.subjectRowBorder,
                ]}
              >
                {/* Subject name + progress bar */}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${barWidth}%` as any,
                          backgroundColor: gradeColor(subject.average),
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Student average */}
                <View style={[styles.subjectAvgBadge, { backgroundColor: gradeBg(subject.average) }]}>
                  <Text style={[styles.subjectAvgText, { color: gradeColor(subject.average) }]}>
                    {formatAvg(subject.average)}
                  </Text>
                </View>

                {/* Class average */}
                <View style={styles.classAvgContainer}>
                  <Text style={styles.classAvgText}>{formatAvg(subject.classAverage)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </GlassCard>
  );
}

// ─── Main screen ─────────────────────────────────────────

export default function ArchivedYearDetailScreen({ route }: any) {
  const { year, niveau, etablissement, statut, childId } = route.params;
  const insets = useSafeAreaInsets();
  const { getArchivedGrades, getParcours } = useDemoData();

  const bulletins: DemoArchivedBulletin[] = getArchivedGrades(childId, year);
  const parcours = getParcours(childId);

  // Find annual appreciation from parcours archives
  const archiveEntry = parcours?.archives?.find(
    (a: any) => (a.year ?? a.annee_scolaire) === year
  ) as any;

  const annualAppreciation: string | null = archiveEntry?.appreciation ?? null;

  // Per-trimester averages (from bulletins if available, else from parcours)
  const avgT1 =
    bulletins.find((b) => b.trimester === 1)?.average ??
    archiveEntry?.averageT1 ??
    null;
  const avgT2 =
    bulletins.find((b) => b.trimester === 2)?.average ??
    archiveEntry?.averageT2 ??
    null;
  const avgT3 =
    bulletins.find((b) => b.trimester === 3)?.average ??
    archiveEntry?.averageT3 ??
    null;

  const hasBulletins = bulletins.length > 0;
  const statutCfg = STATUT_CONFIG[statut as keyof typeof STATUT_CONFIG] ?? STATUT_CONFIG['archivée'];

  return (
    <View style={styles.root}>
      <WallpaperBackground />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 60,
            paddingBottom: FLOATING_TAB_BAR_HEIGHT + TAB_BAR_SCROLL_PADDING,
          },
        ]}
      >
        {/* ── A. Header info ─────────────────────────── */}
        <View style={styles.headerArea}>
          <View style={styles.headerTopRow}>
            <Text style={styles.yearTitle}>{year}</Text>
            <View style={[styles.statutBadge, { backgroundColor: statutCfg.bg }]}>
              <Text style={[styles.statutLabel, { color: statutCfg.color }]}>
                {statutCfg.label}
              </Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            {niveau} · {etablissement}
          </Text>
        </View>

        {/* ── B. Moyenne annuelle ────────────────────── */}
        <SectionHeader label="MOYENNE ANNUELLE" />
        <GlassCard style={styles.avgCard}>
          <View style={styles.avgRow}>
            <AverageDisplay label="T1" value={avgT1} showArrow />
            <AverageDisplay label="T2" value={avgT2} showArrow />
            <AverageDisplay label="T3" value={avgT3} />
          </View>

          {/* Annual average computed from available trimesters */}
          {(avgT1 != null || avgT2 != null || avgT3 != null) && (() => {
            const vals = [avgT1, avgT2, avgT3].filter((v): v is number => v != null);
            const annualAvg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
            return (
              <View style={styles.annualAvgRow}>
                <LinearGradient
                  colors={['#7C3AED', '#06B6D4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.annualAvgGradient}
                >
                  <Text style={styles.annualAvgLabel}>Moyenne annuelle</Text>
                  <Text style={styles.annualAvgValue}>{formatAvg(annualAvg)}</Text>
                </LinearGradient>
              </View>
            );
          })()}
        </GlassCard>

        {/* ── C. Bulletins ──────────────────────────── */}
        <SectionHeader label="BULLETINS" />

        {hasBulletins ? (
          <View style={styles.bulletinsContainer}>
            {bulletins
              .slice()
              .sort((a, b) => a.trimester - b.trimester)
              .map((bulletin) => (
                <BulletinCard
                  key={`bulletin-${bulletin.trimester}`}
                  bulletin={bulletin}
                />
              ))}
          </View>
        ) : (
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyState}>
              <Papicons name="Archive" size={28} color={COLOR_TEXT_MUTED} />
              <Text style={styles.emptyTitle}>Aucun bulletin disponible</Text>
              <Text style={styles.emptySubtitle}>
                Les bulletins de cette année n'ont pas encore été importés.
              </Text>
            </View>
          </GlassCard>
        )}

        {/* ── D. Appreciation annuelle ───────────────── */}
        <SectionHeader label="APPRECIATION ANNUELLE" />
        <GlassCard style={styles.appreciationCard}>
          {annualAppreciation ? (
            <View style={styles.appreciationInner}>
              <View style={styles.appreciationAccent} />
              <Text style={styles.appreciationText}>{annualAppreciation}</Text>
            </View>
          ) : (
            <Text style={styles.appreciationEmpty}>
              Aucune appréciation enregistrée pour cette année.
            </Text>
          )}
        </GlassCard>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 12,
  },

  // ── Header area
  headerArea: {
    marginBottom: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  yearTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 26,
    color: COLOR_TEXT_PRIMARY,
  },
  headerSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: COLOR_TEXT_SECONDARY,
  },
  statutBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statutLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },

  // ── Section header
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 2,
  },
  sectionBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  sectionLabel: {
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    color: COLOR_TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  // ── Average card
  avgCard: {
    marginBottom: 4,
  },
  avgRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
  },
  trimAvgContainer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  trimAvgValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 32,
    lineHeight: 36,
  },
  trimAvgLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: COLOR_TEXT_MUTED,
    marginTop: 2,
  },
  trimAvgArrow: {
    position: 'absolute',
    right: 0,
    top: '50%',
  },
  annualAvgRow: {
    marginTop: 14,
    borderRadius: 12,
    overflow: 'hidden',
  },
  annualAvgGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  annualAvgLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  annualAvgValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    color: '#FFFFFF',
  },

  // ── Bulletins
  bulletinsContainer: {
    gap: 10,
    marginBottom: 4,
  },
  bulletinCard: {
    // no extra style needed — GlassCard handles borders/bg
  },
  bulletinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  bulletinHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bulletinTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: COLOR_TEXT_PRIMARY,
  },
  bulletinSubCount: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: COLOR_TEXT_MUTED,
    marginTop: 1,
  },
  bulletinHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avgBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  avgBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
  },

  // ── Subject list (expanded)
  subjectList: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  subjectListDivider: {
    height: 1,
    backgroundColor: 'rgba(203,213,225,0.5)',
    marginBottom: 10,
  },
  subjectTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectTableHeaderText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: COLOR_TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    width: 44,
    textAlign: 'center',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  subjectRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(241,245,249,0.8)',
  },
  subjectName: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: COLOR_TEXT_PRIMARY,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(203,213,225,0.4)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  subjectAvgBadge: {
    width: 44,
    paddingVertical: 3,
    borderRadius: 8,
    alignItems: 'center',
  },
  subjectAvgText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
  },
  classAvgContainer: {
    width: 44,
    alignItems: 'center',
    marginLeft: 12,
  },
  classAvgText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: COLOR_TEXT_MUTED,
  },

  // ── Empty state
  emptyCard: {
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  emptyTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: COLOR_TEXT_SECONDARY,
  },
  emptySubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: COLOR_TEXT_MUTED,
    textAlign: 'center',
  },

  // ── Appreciation
  appreciationCard: {
    marginBottom: 4,
  },
  appreciationInner: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  appreciationAccent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: ACCENT,
    alignSelf: 'stretch',
    opacity: 0.6,
    minHeight: 40,
  },
  appreciationText: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: COLOR_TEXT_SECONDARY,
    lineHeight: 21,
  },
  appreciationEmpty: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: COLOR_TEXT_MUTED,
    fontStyle: 'italic',
  },
});
