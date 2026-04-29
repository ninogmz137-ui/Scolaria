/**
 * SubjectDetailScreen — All grades for a single school subject.
 *
 * Receives navigation params (serialized to avoid React Navigation object limits):
 *   subjectId, subjectName, subjectEmoji, subjectColor,
 *   average, classAvg, trend, grades (JSON string of Grade[])
 *
 * Design: WallpaperBackground + GlassCard glass morphism, BarlowCondensed display,
 * DM Sans body, badge/bar colors keyed to performance (green/orange/red).
 */

import { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Papicons } from '@getpapillon/papicons';
import WallpaperBackground from '../components/WallpaperBackground';
import GlassCard from '../components/GlassCard';
import { FontFamily } from '../hooks/useSolariaFonts';
import { FLOATING_TAB_BAR_HEIGHT, TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';

// ─── Types ────────────────────────────────────────────────

interface Grade {
  id: string;
  value: number;
  maxValue: number;
  date: string;
  type: string;
  comment?: string;
}

interface RouteParams {
  subjectId: string;
  subjectName: string;
  subjectEmoji: string;
  subjectColor: string;
  average: number;
  classAvg: number;
  trend: 'up' | 'down' | 'stable';
  grades: string; // JSON string of Grade[]
}

// ─── Helpers ──────────────────────────────────────────────

/** Normalize a grade value to a /20 scale. */
function toOutOf20(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0;
  return (value / maxValue) * 20;
}

/** Performance color based on a /20 score. */
function performanceColor(scoreOutOf20: number): string {
  if (scoreOutOf20 >= 14) return '#10B981'; // green
  if (scoreOutOf20 >= 10) return '#F59E0B'; // orange
  return '#EF4444';                          // red
}

/** Average color based on a raw /20 average. */
function averageColor(average: number): string {
  return performanceColor(average);
}

/** Display a date string — already formatted by NotesScreen (e.g. "12 mars"). */
function formatDate(dateString: string): string {
  if (!dateString) return '';
  // If already a French short date (no ISO pattern), return as-is
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateString)) return dateString;
  // Otherwise parse ISO and format
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateString;
  }
}

// ─── Trend indicator ──────────────────────────────────────

interface TrendBadgeProps {
  trend: 'up' | 'down' | 'stable';
}

function TrendBadge({ trend }: TrendBadgeProps) {
  if (trend === 'up') {
    return (
      <View style={styles.trendBadge}>
        <Papicons name="ArrowUp" size={14} color="#10B981" />
        <Text style={[styles.trendText, { color: '#10B981' }]}>En hausse</Text>
      </View>
    );
  }
  if (trend === 'down') {
    return (
      <View style={styles.trendBadge}>
        <Papicons name="ArrowDown" size={14} color="#EF4444" />
        <Text style={[styles.trendText, { color: '#EF4444' }]}>En baisse</Text>
      </View>
    );
  }
  return (
    <View style={styles.trendBadge}>
      <Text style={[styles.trendText, { color: '#94A3B8' }]}>=  Stable</Text>
    </View>
  );
}

// ─── Grade row ────────────────────────────────────────────

interface GradeRowProps {
  grade: Grade;
}

function GradeRow({ grade }: GradeRowProps) {
  const scoreOutOf20 = toOutOf20(grade.value, grade.maxValue);
  const color = performanceColor(scoreOutOf20);

  return (
    <GlassCard style={styles.gradeCard} noPadding>
      <View style={styles.gradeInner}>
        {/* Colored left bar */}
        <View style={[styles.gradeBar, { backgroundColor: color }]} />

        {/* Middle: type, date, optional comment */}
        <View style={styles.gradeMiddle}>
          <Text style={styles.gradeType}>{grade.type}</Text>
          <Text style={styles.gradeDate}>{formatDate(grade.date)}</Text>
          {grade.comment ? (
            <Text style={styles.gradeComment} numberOfLines={2}>
              {grade.comment}
            </Text>
          ) : null}
        </View>

        {/* Right: badge */}
        <View style={[styles.gradeBadge, { backgroundColor: color }]}>
          <Text style={styles.gradeBadgeText}>
            {grade.value}/{grade.maxValue}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

// ─── Screen ───────────────────────────────────────────────

export default function SubjectDetailScreen({ route }: any) {
  const insets = useSafeAreaInsets();
  const { subjectName, subjectEmoji, average, classAvg, trend, grades: gradesJson } = route.params;

  // Parse grades safely
  const grades = useMemo<Grade[]>(() => {
    try {
      const parsed = JSON.parse(gradesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [gradesJson]);

  const avgColor = averageColor(average);
  const progressWidth = Math.min(Math.max(average / 20, 0), 1);

  return (
    <View style={styles.root}>
      <WallpaperBackground />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 60,
            paddingBottom: FLOATING_TAB_BAR_HEIGHT + TAB_BAR_SCROLL_PADDING + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── A. Subject header ─────────────────────────── */}
        <View style={styles.subjectHeader}>
          <Text style={styles.subjectEmoji}>{subjectEmoji}</Text>
          <Text style={styles.subjectName}>{subjectName}</Text>
          <TrendBadge trend={trend} />
        </View>

        {/* ── B. Average card ───────────────────────────── */}
        <GlassCard style={styles.avgCard}>
          {/* Top row: student average + class average */}
          <View style={styles.avgRow}>
            {/* Student average */}
            <View style={styles.avgLeft}>
              <Text style={[styles.avgBig, { color: avgColor }]}>
                {average.toFixed(1)}
              </Text>
              <Text style={styles.avgSlash}>/20</Text>
            </View>

            {/* Class average */}
            <View style={styles.avgRight}>
              <Text style={styles.classAvgLabel}>Moyenne de classe</Text>
              <Text style={styles.classAvgValue}>{classAvg.toFixed(1)}/20</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressWidth * 100}%` as `${number}%`, backgroundColor: avgColor },
              ]}
            />
          </View>
        </GlassCard>

        {/* ── C. Section header ─────────────────────────── */}
        <Text style={styles.sectionHeader}>Toutes les notes</Text>

        {/* ── D. Grades list ────────────────────────────── */}
        {grades.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucune note</Text>
          </GlassCard>
        ) : (
          grades.map((grade) => (
            <GradeRow key={grade.id} grade={grade} />
          ))
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 18,
  },

  // Subject header
  subjectHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  subjectEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  subjectName: {
    fontFamily: FontFamily.displayBold,
    fontSize: 24,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
  },

  // Average card
  avgCard: {
    marginBottom: 24,
  },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  avgLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avgBig: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 48,
    lineHeight: 52,
  },
  avgSlash: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 18,
    color: '#64748B',
    marginBottom: 6,
    marginLeft: 2,
  },
  avgRight: {
    alignItems: 'flex-end',
  },
  classAvgLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  classAvgValue: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: '#0F172A',
  },

  // Progress bar
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Section header
  sectionHeader: {
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },

  // Grade card
  gradeCard: {
    marginBottom: 10,
  },
  gradeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 64,
  },
  gradeBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
    flexShrink: 0,
  },
  gradeMiddle: {
    flex: 1,
  },
  gradeType: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  gradeDate: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  gradeComment: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  gradeBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 10,
    flexShrink: 0,
  },
  gradeBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    color: '#94A3B8',
  },
});
