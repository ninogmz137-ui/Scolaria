import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

// ─── Types ────────────────────────────────────────────────

interface Subject {
  id: string;
  name: string;
  emoji: string;
  grades: Grade[];
  average: number;
  classAvg: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

interface Grade {
  id: string;
  value: number;
  maxValue: number;
  date: string;
  type: string; // 'Contrôle', 'Devoir', 'Oral', etc.
  comment?: string;
}

type FilterTab = 'all' | 'trimestre1' | 'trimestre2' | 'trimestre3';

// ─── Mock data ────────────────────────────────────────────

const SUBJECTS: Subject[] = [
  {
    id: '1',
    name: 'Mathématiques',
    emoji: '📐',
    color: Colors.cyan,
    average: 15.5,
    classAvg: 12.3,
    trend: 'up',
    grades: [
      { id: 'g1', value: 17, maxValue: 20, date: '15 mars', type: 'Contrôle', comment: 'Très bien, géométrie maîtrisée' },
      { id: 'g2', value: 14, maxValue: 20, date: '8 mars', type: 'Devoir maison' },
      { id: 'g3', value: 16, maxValue: 20, date: '1 mars', type: 'Contrôle' },
      { id: 'g4', value: 15, maxValue: 20, date: '15 fév', type: 'Oral' },
    ],
  },
  {
    id: '2',
    name: 'Français',
    emoji: '📖',
    color: Colors.violet,
    average: 14.0,
    classAvg: 13.1,
    trend: 'stable',
    grades: [
      { id: 'g5', value: 15, maxValue: 20, date: '14 mars', type: 'Rédaction', comment: 'Belle progression en expression' },
      { id: 'g6', value: 13, maxValue: 20, date: '7 mars', type: 'Dictée' },
      { id: 'g7', value: 14, maxValue: 20, date: '28 fév', type: 'Contrôle' },
    ],
  },
  {
    id: '3',
    name: 'Histoire-Géo',
    emoji: '🏛️',
    color: Colors.orange,
    average: 16.0,
    classAvg: 11.8,
    trend: 'up',
    grades: [
      { id: 'g8', value: 18, maxValue: 20, date: '12 mars', type: 'Exposé', comment: 'Excellent travail de recherche' },
      { id: 'g9', value: 15, maxValue: 20, date: '5 mars', type: 'Contrôle' },
      { id: 'g10', value: 15, maxValue: 20, date: '20 fév', type: 'Devoir' },
    ],
  },
  {
    id: '4',
    name: 'Anglais',
    emoji: '🇬🇧',
    color: Colors.green,
    average: 17.0,
    classAvg: 13.7,
    trend: 'up',
    grades: [
      { id: 'g11', value: 18, maxValue: 20, date: '13 mars', type: 'Oral' },
      { id: 'g12', value: 16, maxValue: 20, date: '6 mars', type: 'Contrôle' },
      { id: 'g13', value: 17, maxValue: 20, date: '22 fév', type: 'Devoir' },
    ],
  },
  {
    id: '5',
    name: 'Sciences',
    emoji: '🔬',
    color: Colors.pink,
    average: 13.0,
    classAvg: 12.5,
    trend: 'down',
    grades: [
      { id: 'g14', value: 12, maxValue: 20, date: '11 mars', type: 'TP' },
      { id: 'g15', value: 14, maxValue: 20, date: '4 mars', type: 'Contrôle' },
      { id: 'g16', value: 13, maxValue: 20, date: '18 fév', type: 'Devoir' },
    ],
  },
  {
    id: '6',
    name: 'EPS',
    emoji: '⚽',
    color: Colors.warmOrange,
    average: 15.0,
    classAvg: 14.2,
    trend: 'stable',
    grades: [
      { id: 'g17', value: 16, maxValue: 20, date: '10 mars', type: 'Course' },
      { id: 'g18', value: 14, maxValue: 20, date: '24 fév', type: 'Gymnastique' },
    ],
  },
];

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'trimestre1', label: 'T1' },
  { key: 'trimestre2', label: 'T2' },
  { key: 'trimestre3', label: 'T3' },
];

// ─── Helper ───────────────────────────────────────────────

const overallAvg =
  SUBJECTS.reduce((sum, s) => sum + s.average, 0) / SUBJECTS.length;

const bestSubject = SUBJECTS.reduce((best, s) =>
  s.average > best.average ? s : best,
);

const trendIcon = (t: Subject['trend']): keyof typeof Ionicons.glyphMap =>
  t === 'up' ? 'trending-up' : t === 'down' ? 'trending-down' : 'remove';
const trendColor = (t: Subject['trend']) =>
  t === 'up' ? Colors.green : t === 'down' ? Colors.red : Colors.gray;

// ─── Grade mini bar ──────────────────────────────────────

function GradeBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = (value / max) * 100;
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});

// ─── Main screen ─────────────────────────────────────────

export default function NotesScreen() {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const toggleSubject = (id: string) => {
    setExpandedSubject((prev) => (prev === id ? null : id));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Overview header */}
      <LinearGradient
        colors={[Colors.violet, Colors.blueNight]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>Notes & Résultats</Text>
        <Text style={styles.headerChild}>👦 Lucas — CM2</Text>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{overallAvg.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>Moyenne générale</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: Colors.green }]}>
              {bestSubject.emoji} {bestSubject.average}
            </Text>
            <Text style={styles.summaryLabel}>Meilleure matière</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: Colors.cyan }]}>
              {SUBJECTS.reduce((s, sub) => s + sub.grades.length, 0)}
            </Text>
            <Text style={styles.summaryLabel}>Notes total</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
              onPress={() => setFilter(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterLabel,
                  filter === tab.key && styles.filterLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Scanner shortcut */}
          <TouchableOpacity style={styles.scanButton} activeOpacity={0.7}>
            <Ionicons name="scan" size={18} color={Colors.cyan} />
          </TouchableOpacity>
        </View>

        {/* Subject list */}
        {SUBJECTS.map((subject) => {
          const isExpanded = expandedSubject === subject.id;
          const diff = subject.average - subject.classAvg;

          return (
            <View key={subject.id} style={styles.subjectCard}>
              {/* Subject header row */}
              <TouchableOpacity
                style={styles.subjectHeader}
                onPress={() => toggleSubject(subject.id)}
                activeOpacity={0.7}
              >
                <View style={styles.subjectLeft}>
                  <Text style={styles.subjectEmoji}>{subject.emoji}</Text>
                  <View style={styles.subjectInfo}>
                    <Text style={styles.subjectName}>{subject.name}</Text>
                    <View style={styles.subjectMeta}>
                      <Text style={styles.subjectClassAvg}>
                        Classe : {subject.classAvg}
                      </Text>
                      <View
                        style={[
                          styles.diffBadge,
                          {
                            backgroundColor:
                              diff >= 0
                                ? 'rgba(52,211,153,0.12)'
                                : 'rgba(248,113,113,0.12)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.diffText,
                            { color: diff >= 0 ? Colors.green : Colors.red },
                          ]}
                        >
                          {diff >= 0 ? '+' : ''}
                          {diff.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.subjectRight}>
                  <Text style={[styles.subjectAvg, { color: subject.color }]}>
                    {subject.average.toFixed(1)}
                  </Text>
                  <View style={styles.trendRow}>
                    <Ionicons
                      name={trendIcon(subject.trend)}
                      size={14}
                      color={trendColor(subject.trend)}
                    />
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={Colors.gray}
                  />
                </View>
              </TouchableOpacity>

              {/* Average bar */}
              <View style={styles.avgBarRow}>
                <GradeBar value={subject.average} max={20} color={subject.color} />
                <Text style={styles.avgBarLabel}>/20</Text>
              </View>

              {/* Expanded grade list */}
              {isExpanded && (
                <View style={styles.gradeList}>
                  {subject.grades.map((grade, i) => {
                    const ratio = grade.value / grade.maxValue;
                    const gradeColor =
                      ratio >= 0.75
                        ? Colors.green
                        : ratio >= 0.5
                        ? Colors.orange
                        : Colors.red;

                    return (
                      <View
                        key={grade.id}
                        style={[
                          styles.gradeRow,
                          i < subject.grades.length - 1 && styles.gradeRowBorder,
                        ]}
                      >
                        <View style={styles.gradeLeft}>
                          <View style={styles.gradeDateCol}>
                            <Text style={styles.gradeDate}>{grade.date}</Text>
                            <Text style={styles.gradeType}>{grade.type}</Text>
                          </View>
                        </View>
                        <View style={styles.gradeRight}>
                          <Text style={[styles.gradeValue, { color: gradeColor }]}>
                            {grade.value}
                          </Text>
                          <Text style={styles.gradeMax}>/{grade.maxValue}</Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Average summary within expanded */}
                  <View style={styles.expandedSummary}>
                    <Text style={styles.expandedSummaryLabel}>
                      Moyenne : {subject.average.toFixed(1)}/20
                    </Text>
                    <Text style={styles.expandedSummaryDetail}>
                      {subject.grades.length} évaluations ce trimestre
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* Recent grades timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dernières notes</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={SUBJECTS.flatMap((s) =>
              s.grades.slice(0, 1).map((g) => ({ ...g, subject: s.name, emoji: s.emoji, color: s.color })),
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.recentList}
            renderItem={({ item }) => {
              const ratio = item.value / item.maxValue;
              const gradeColor =
                ratio >= 0.75 ? Colors.green : ratio >= 0.5 ? Colors.orange : Colors.red;

              return (
                <View style={styles.recentCard}>
                  <Text style={styles.recentEmoji}>{item.emoji}</Text>
                  <Text style={[styles.recentGrade, { color: gradeColor }]}>
                    {item.value}/{item.maxValue}
                  </Text>
                  <Text style={styles.recentSubject} numberOfLines={1}>
                    {item.subject}
                  </Text>
                  <Text style={styles.recentDate}>{item.date}</Text>
                  <Text style={styles.recentType}>{item.type}</Text>
                </View>
              );
            }}
          />
        </View>

        {/* Import bulletin CTA */}
        <TouchableOpacity style={styles.importCTA} activeOpacity={0.8}>
          <LinearGradient
            colors={[Colors.violet, Colors.violetDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.importGradient}
          >
            <Ionicons name="scan" size={22} color={Colors.white} />
            <View style={styles.importTextCol}>
              <Text style={styles.importTitle}>Importer un bulletin</Text>
              <Text style={styles.importDesc}>Scanner ou importer un PDF</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blueNight,
  },
  // Header
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 4,
  },
  headerChild: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.cyan,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontWeight: '600',
  },
  // Body
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  // Filters
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.blueNightCard,
  },
  filterTabActive: {
    backgroundColor: Colors.violet,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray,
  },
  filterLabelActive: {
    color: Colors.white,
  },
  scanButton: {
    marginLeft: 'auto',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(34,211,238,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Subject cards
  subjectCard: {
    backgroundColor: Colors.blueNightCard,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  subjectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  subjectEmoji: {
    fontSize: 28,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  subjectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subjectClassAvg: {
    fontSize: 12,
    color: Colors.gray,
  },
  diffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  diffText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subjectRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  subjectAvg: {
    fontSize: 24,
    fontWeight: '900',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avgBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  avgBarLabel: {
    fontSize: 11,
    color: Colors.gray,
    fontWeight: '600',
  },
  // Expanded grade list
  gradeList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  gradeRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  gradeLeft: {
    flex: 1,
  },
  gradeDateCol: {},
  gradeDate: {
    fontSize: 13,
    color: Colors.lightGray,
    fontWeight: '600',
  },
  gradeType: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 2,
  },
  gradeRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  gradeValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  gradeMax: {
    fontSize: 13,
    color: Colors.gray,
    fontWeight: '600',
  },
  expandedSummary: {
    backgroundColor: 'rgba(109,40,217,0.08)',
    padding: 12,
    alignItems: 'center',
  },
  expandedSummaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.violetLight,
  },
  expandedSummaryDetail: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 2,
  },
  // Section
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 14,
  },
  // Recent grades horizontal
  recentList: {
    gap: 10,
  },
  recentCard: {
    width: 110,
    backgroundColor: Colors.blueNightCard,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  recentEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  recentGrade: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  recentSubject: {
    fontSize: 11,
    color: Colors.lightGray,
    fontWeight: '600',
    marginBottom: 2,
  },
  recentDate: {
    fontSize: 10,
    color: Colors.gray,
  },
  recentType: {
    fontSize: 10,
    color: Colors.gray,
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Import CTA
  importCTA: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  importGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
  },
  importTextCol: {
    flex: 1,
  },
  importTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  importDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
});
