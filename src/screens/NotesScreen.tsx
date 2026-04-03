/**
 * NotesScreen — Grades dashboard with wallpaper + glass design.
 *
 * Structure:
 * - Summary glass cards (average, best subject, total)
 * - New grades horizontal carousel
 * - Expandable accordion subject list with glass cards
 * - Badge colors: green ≥14, orange 10-13, red <10
 */

import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, FlatList, Pressable, StyleSheet, Text, TextInput, Modal, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Papicons } from '@getpapillon/papicons';
import { Search, ChevronDown, Check } from 'lucide-react-native';
import GlassCard from '../components/GlassCard';
import WallpaperBackground from '../components/WallpaperBackground';
import { Colors } from '../constants/colors';
import { useI18n } from '../contexts/I18nContext';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { getSubjects, getGrades } from '../services/database';
import { useDemoData } from '../contexts/DemoContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';

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
  type: string;
  comment?: string;
}

type SortMode = 'date' | 'alpha' | 'average';

// ─── Period picker config ─────────────────────────────────

interface Period {
  label: string;
  value: string;
  dates: string;
  number?: number;
}

const PERIODS: Period[] = [
  { label: 'Trimestre 1', value: 'T1', dates: 'sept. 2025 - nov. 2025', number: 1 },
  { label: 'Trimestre 2', value: 'T2', dates: 'nov. 2025 - mars 2026', number: 2 },
  { label: 'Trimestre 3', value: 'T3', dates: 'mars 2026 - juil. 2026', number: 3 },
  { label: 'Bac blanc',   value: 'bac',    dates: 'sept. 2025 - juil. 2026' },
  { label: 'Brevet blanc',value: 'brevet', dates: 'sept. 2025 - juil. 2026' },
  { label: 'Hors période',value: 'other',  dates: 'sept. 2025 - juil. 2026' },
];

function getCurrentPeriod(): string {
  const month = new Date().getMonth(); // 0-11
  if (month >= 8 && month <= 10) return 'T1';  // sept-nov
  if (month >= 11 || month <= 1) return 'T2';  // dec-feb (nov-mars)
  return 'T3'; // mars-juil
}

const SORT_OPTIONS: { label: string; value: SortMode }[] = [
  { label: 'Date',          value: 'date' },
  { label: 'Alphabétique',  value: 'alpha' },
  { label: 'Moyennes',      value: 'average' },
];

// ─── Maternelle competencies ─────────────────────────────

type CompetencyLevel = 'acquis' | 'en_cours' | 'a_renforcer' | 'non_evalue';

interface Competency {
  id: string;
  name: string;
  level: CompetencyLevel;
}

interface CompetencyDomain {
  id: string;
  name: string;
  emoji: string;
  color: string;
  competencies: Competency[];
}

const COMPETENCY_LEVELS: Record<CompetencyLevel, { label: string; emoji: string; color: string }> = {
  acquis: { label: 'Acquis', emoji: '🌟', color: Colors.green },
  en_cours: { label: 'En cours', emoji: '🌱', color: Colors.orange },
  a_renforcer: { label: 'À renforcer', emoji: '💪', color: Colors.warmOrange },
  non_evalue: { label: 'Non évalué', emoji: '⏳', color: Colors.gray },
};

const MATERNELLE_DOMAINS: CompetencyDomain[] = [
  {
    id: 'd1', name: 'Mobiliser le langage', emoji: '🗣️', color: Colors.violet,
    competencies: [
      { id: 'c1', name: 'Communiquer avec les adultes', level: 'acquis' },
      { id: 'c2', name: 'S\'exprimer dans un langage oral', level: 'acquis' },
      { id: 'c3', name: 'Écouter et comprendre une histoire', level: 'en_cours' },
      { id: 'c4', name: 'Reconnaître les lettres de son prénom', level: 'acquis' },
    ],
  },
  {
    id: 'd2', name: 'Activités artistiques', emoji: '🎨', color: Colors.pink,
    competencies: [
      { id: 'c5', name: 'Dessiner (bonhomme, maison)', level: 'acquis' },
      { id: 'c6', name: 'Chanter en groupe', level: 'acquis' },
      { id: 'c7', name: 'Explorer différents matériaux', level: 'en_cours' },
    ],
  },
  {
    id: 'd3', name: 'Activités physiques', emoji: '🤸', color: Colors.cyan,
    competencies: [
      { id: 'c8', name: 'Courir, sauter, lancer', level: 'acquis' },
      { id: 'c9', name: 'Se déplacer avec aisance', level: 'acquis' },
      { id: 'c10', name: 'Jouer collectivement', level: 'en_cours' },
    ],
  },
  {
    id: 'd4', name: 'Structurer sa pensée', emoji: '🔢', color: Colors.orange,
    competencies: [
      { id: 'c11', name: 'Compter jusqu\'à 10', level: 'acquis' },
      { id: 'c12', name: 'Reconnaître des formes', level: 'en_cours' },
      { id: 'c13', name: 'Trier et classer des objets', level: 'acquis' },
      { id: 'c14', name: 'Se repérer dans le temps', level: 'a_renforcer' },
    ],
  },
  {
    id: 'd5', name: 'Explorer le monde', emoji: '🌍', color: Colors.green,
    competencies: [
      { id: 'c15', name: 'Connaître les parties du corps', level: 'acquis' },
      { id: 'c16', name: 'Observer le vivant (animaux, plantes)', level: 'en_cours' },
      { id: 'c17', name: 'Utiliser des outils numériques simples', level: 'a_renforcer' },
    ],
  },
];

// ─── Mock data ────────────────────────────────────────────

const MOCK_SUBJECTS: Subject[] = [
  { id: '1', name: 'Mathématiques', emoji: '📐', color: Colors.cyan, average: 15.5, classAvg: 12.3, trend: 'up',
    grades: [
      { id: 'g1', value: 17, maxValue: 20, date: '15 mars', type: 'Contrôle', comment: 'Très bien' },
      { id: 'g2', value: 14, maxValue: 20, date: '8 mars', type: 'Devoir maison' },
      { id: 'g3', value: 16, maxValue: 20, date: '1 mars', type: 'Contrôle' },
    ] },
  { id: '2', name: 'Français', emoji: '📖', color: Colors.violet, average: 14.0, classAvg: 13.1, trend: 'stable',
    grades: [
      { id: 'g5', value: 15, maxValue: 20, date: '14 mars', type: 'Rédaction' },
      { id: 'g6', value: 13, maxValue: 20, date: '7 mars', type: 'Dictée' },
    ] },
  { id: '3', name: 'Histoire-Géo', emoji: '🏛️', color: Colors.orange, average: 16.0, classAvg: 11.8, trend: 'up',
    grades: [
      { id: 'g8', value: 18, maxValue: 20, date: '12 mars', type: 'Exposé' },
      { id: 'g9', value: 15, maxValue: 20, date: '5 mars', type: 'Contrôle' },
    ] },
  { id: '4', name: 'Anglais', emoji: '📚', color: Colors.green, average: 17.0, classAvg: 13.7, trend: 'up',
    grades: [
      { id: 'g11', value: 18, maxValue: 20, date: '13 mars', type: 'Oral' },
      { id: 'g12', value: 16, maxValue: 20, date: '6 mars', type: 'Contrôle' },
    ] },
  { id: '5', name: 'Sciences', emoji: '🔬', color: Colors.pink, average: 13.0, classAvg: 12.5, trend: 'down',
    grades: [
      { id: 'g14', value: 12, maxValue: 20, date: '11 mars', type: 'TP' },
      { id: 'g15', value: 14, maxValue: 20, date: '4 mars', type: 'Contrôle' },
    ] },
  { id: '6', name: 'EPS', emoji: '⚽', color: Colors.warmOrange, average: 15.0, classAvg: 14.2, trend: 'stable',
    grades: [
      { id: 'g17', value: 16, maxValue: 20, date: '10 mars', type: 'Course' },
      { id: 'g18', value: 14, maxValue: 20, date: '24 fév', type: 'Gymnastique' },
    ] },
];

// ─── Helpers ──────────────────────────────────────────────

const getBadgeColor = (value: number) =>
  value >= 14 ? '#10B981' : value >= 10 ? '#F59E0B' : '#EF4444';

function GradeBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = (value / max) * 100;
  return (
    <View style={[s.barTrack]}>
      <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────

export default function NotesScreen() {
  useChildTheme(); // kept for future theme re-integration
  const { selectedChild } = useActiveChild();
  const { mode } = useSchoolMode();
  const { isDemoMode, getSubjects: getDemoSubjects, getGrades: getDemoGrades } = useDemoData();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;

  const [subjects, setSubjects] = useState<Subject[]>(MOCK_SUBJECTS);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(getCurrentPeriod());
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const isMaternelle = mode === 'maternelle';

  const cardText = '#0F172A';
  const cardTextSecondary = '#64748B';
  const cardTextMuted = '#94A3B8';

  const COLOR_PALETTE = [Colors.cyan, Colors.violet, Colors.orange, Colors.green, Colors.pink, Colors.warmOrange];

  const FRENCH_MONTHS: Record<string, string> = {
    '01': 'jan', '02': 'fév', '03': 'mars', '04': 'avr',
    '05': 'mai', '06': 'juin', '07': 'juil', '08': 'août',
    '09': 'sep', '10': 'oct', '11': 'nov', '12': 'déc',
  };
  const toFrenchDate = (iso: string): string => {
    const parts = iso.split('-');
    if (parts.length < 3) return iso;
    return `${parseInt(parts[2], 10)} ${FRENCH_MONTHS[parts[1]] ?? parts[1]}`;
  };

  const loadNotes = useCallback(async () => {
    if (!selectedChild?.id) return;

    // ── Demo mode: load from DemoContext ──
    if (isDemoMode) {
      const demoSubs = getDemoSubjects(selectedChild.id);
      // Filter by trimester if a T1/T2/T3 period is selected
      const trimesterNum = selectedPeriod === 'T1' ? 1 : selectedPeriod === 'T2' ? 2 : selectedPeriod === 'T3' ? 3 : undefined;
      const demoGradesList = getDemoGrades(selectedChild.id, trimesterNum);
      if (demoSubs.length > 0) {
        const gradesBySub: Record<string, typeof demoGradesList> = {};
        for (const g of demoGradesList) {
          if (!gradesBySub[g.subjectId]) gradesBySub[g.subjectId] = [];
          gradesBySub[g.subjectId].push(g);
        }
        const mapped: Subject[] = demoSubs.map((sub, idx) => {
          const subGrades = gradesBySub[sub.id] ?? [];
          const grades: Grade[] = subGrades.map((g) => ({
            id: g.id, value: g.value, maxValue: g.outOf,
            date: toFrenchDate(g.date), type: g.title, comment: g.comment || undefined,
          }));
          const avg = sub.average ?? (grades.length > 0 ? grades.reduce((s, g) => s + (g.value / g.maxValue) * 20, 0) / grades.length : 0);
          const classAvg = sub.classAverage ?? 0;
          let trend: Subject['trend'] = (sub.trend as Subject['trend']) || 'stable';
          return {
            id: sub.id, name: sub.name, emoji: sub.emoji || '📚',
            color: sub.color || COLOR_PALETTE[idx % COLOR_PALETTE.length],
            grades, average: Math.round(avg * 10) / 10,
            classAvg: Math.round(classAvg * 10) / 10, trend,
          };
        });
        setSubjects(mapped);
        return;
      }
      setSubjects(MOCK_SUBJECTS);
      return;
    }

    const [subjectsResult, gradesResult] = await Promise.all([
      getSubjects(selectedChild.id),
      getGrades(selectedChild.id),
    ]);
    const rawSubjects = subjectsResult.data ?? [];
    const rawGrades = (gradesResult.data ?? []) as any[];
    if (rawSubjects.length === 0) { setSubjects(MOCK_SUBJECTS); return; }

    const gradesBySubject: Record<string, any[]> = {};
    for (const g of rawGrades) {
      if (!gradesBySubject[g.subject_id]) gradesBySubject[g.subject_id] = [];
      gradesBySubject[g.subject_id].push(g);
    }

    const mapped: Subject[] = rawSubjects.map((sub: any, idx: number) => {
      const subGrades = gradesBySubject[sub.id] ?? [];
      const grades: Grade[] = subGrades.map((g: any) => ({
        id: g.id, value: g.value, maxValue: g.max_value ?? 20,
        date: g.date ? toFrenchDate(g.date) : '', type: g.type ?? 'Contrôle', comment: g.comment,
      }));
      const avg = grades.length > 0 ? grades.reduce((s, g) => s + (g.value / g.maxValue) * 20, 0) / grades.length : 0;
      const classAvg = subGrades.length > 0 ? subGrades.reduce((s: number, g: any) => s + (g.class_avg ?? 0), 0) / subGrades.length : 0;
      let trend: Subject['trend'] = 'stable';
      if (grades.length >= 2) {
        const last = (grades[0].value / grades[0].maxValue) * 20;
        const prev = (grades[1].value / grades[1].maxValue) * 20;
        if (last > prev + 0.5) trend = 'up'; else if (last < prev - 0.5) trend = 'down';
      }
      return { id: sub.id, name: sub.name, emoji: sub.emoji ?? '📚', color: sub.color ?? COLOR_PALETTE[idx % COLOR_PALETTE.length], grades, average: Math.round(avg * 10) / 10, classAvg: Math.round(classAvg * 10) / 10, trend };
    });
    setSubjects(mapped);
  }, [selectedChild?.id, isDemoMode, getDemoSubjects, getDemoGrades, selectedPeriod]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  // Sorted + filtered subjects
  const activePeriodLabel = PERIODS.find((p) => p.value === selectedPeriod)?.label ?? 'Trimestre';
  const activeSortLabel   = SORT_OPTIONS.find((o) => o.value === sortMode)?.label ?? 'Trier';

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const sortedSubjects = [...filteredSubjects].sort((a, b) => {
    if (sortMode === 'alpha')   return a.name.localeCompare(b.name);
    if (sortMode === 'average') return b.average - a.average;
    return 0; // 'date' — keep insertion order
  });

  const overallAvg = subjects.reduce((s, sub) => s + sub.average, 0) / (subjects.length || 1);
  const bestSubject = subjects.reduce((best, sub) => sub.average > best.average ? sub : best, subjects[0]);
  const totalGrades = subjects.reduce((s, sub) => s + sub.grades.length, 0);

  // Recent grades for carousel
  const recentGrades = subjects.flatMap((sub) =>
    sub.grades.slice(0, 2).map((g) => ({ ...g, subject: sub.name, emoji: sub.emoji, color: sub.color }))
  );

  // ─── Maternelle competency view ────────────────────────
  if (isMaternelle) {
    const totalCompetencies = MATERNELLE_DOMAINS.reduce((s, d) => s + d.competencies.length, 0);
    const acquired = MATERNELLE_DOMAINS.reduce(
      (s, d) => s + d.competencies.filter((c) => c.level === 'acquis').length, 0,
    );
    const inProgress = MATERNELLE_DOMAINS.reduce(
      (s, d) => s + d.competencies.filter((c) => c.level === 'en_cours').length, 0,
    );

    return (
      <View style={s.root}>
        <WallpaperBackground />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { paddingTop: TOPBAR_H + 20, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10 }]}
        >
          {/* Summary */}
          <Text style={[s.maternelleTitle, {
            color: '#0F172A',
            textShadowColor: 'transparent',
          }]}>Suivi des apprentissages</Text>
          <View style={s.summaryRow}>
            <GlassCard style={s.summaryCard}>
              <Text style={[s.summaryValue, { color: cardText }]}>🌟 {acquired}</Text>
              <Text style={[s.summaryLabel, { color: cardTextMuted }]}>Acquis</Text>
            </GlassCard>
            <GlassCard style={s.summaryCard}>
              <Text style={[s.summaryValue, { color: cardText }]}>🌱 {inProgress}</Text>
              <Text style={[s.summaryLabel, { color: cardTextMuted }]}>En cours</Text>
            </GlassCard>
            <GlassCard style={s.summaryCard}>
              <Text style={[s.summaryValue, { color: cardText }]}>{totalCompetencies}</Text>
              <Text style={[s.summaryLabel, { color: cardTextMuted }]}>Compétences</Text>
            </GlassCard>
          </View>

          {/* Legend */}
          <GlassCard style={{ marginBottom: 12 }}>
            <View style={s.legendRow}>
              {Object.entries(COMPETENCY_LEVELS).map(([key, level]) => (
                <View key={key} style={s.legendItem}>
                  <Text style={{ fontSize: 14 }}>{level.emoji}</Text>
                  <Text style={[s.legendLabel, { color: cardTextMuted }]}>{level.label}</Text>
                </View>
              ))}
            </View>
          </GlassCard>

          {/* Competency domains — 2×2 grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {MATERNELLE_DOMAINS.map((domain) => {
              const domainAcquired = domain.competencies.filter((c) => c.level === 'acquis').length;
              const pct = Math.round((domainAcquired / domain.competencies.length) * 100);

              return (
                <Pressable
                  key={domain.id}
                  onPress={() => setExpandedDomain(expandedDomain === domain.id ? null : domain.id)}
                  style={{ width: (Dimensions.get('window').width - 18 * 2 - 12) / 2 }}
                >
                  <GlassCard style={{ height: 150, padding: 14 }} noPadding={false}>
                    {/* Emoji */}
                    <Text style={{ fontSize: 28, marginBottom: 6 }}>{domain.emoji}</Text>
                    {/* Name */}
                    <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 12, color: cardText }} numberOfLines={2}>
                      {domain.name}
                    </Text>
                    {/* Score */}
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
                      <Text style={{ fontFamily: FontFamily.displayExtraBold, fontSize: 26, color: domain.color }}>
                        {domainAcquired}/{domain.competencies.length}
                      </Text>
                      <Text style={{ fontFamily: FontFamily.sansSemiBold, fontSize: 11, color: '#94A3B8' }}>acquis</Text>
                    </View>
                    {/* Progress bar */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <View style={{ flex: 1 }}>
                        <GradeBar value={domainAcquired} max={domain.competencies.length} color={domain.color} />
                      </View>
                      <Text style={{ fontFamily: FontFamily.sansSemiBold, fontSize: 11, color: '#94A3B8' }}>{pct}%</Text>
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>

          {/* Expanded domain detail */}
          {expandedDomain && (() => {
            const domain = MATERNELLE_DOMAINS.find((d) => d.id === expandedDomain);
            if (!domain) return null;
            return (
              <GlassCard style={{ marginTop: 4, marginBottom: 10 }} noPadding>
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}
                  onPress={() => setExpandedDomain(null)}
                >
                  <Text style={{ fontSize: 22 }}>{domain.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FontFamily.displayBold, fontSize: 15, color: cardText }}>{domain.name}</Text>
                  </View>
                  <Papicons name="ChevronUp" size={16} color="#94A3B8" />
                </Pressable>
                <View style={s.gradeList}>
                  {domain.competencies.map((comp, i) => {
                    const levelInfo = COMPETENCY_LEVELS[comp.level];
                    return (
                      <View key={comp.id} style={[s.gradeRow, i < domain.competencies.length - 1 && s.gradeBorder]}>
                        <View style={s.flex}>
                          <Text style={[s.gradeDate, { color: cardTextSecondary }]}>{comp.name}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 18 }}>{levelInfo.emoji}</Text>
                          <Text style={[s.competencyLabel, { color: levelInfo.color }]}>{levelInfo.label}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </GlassCard>
            );
          })()}

          {/* Teacher observation */}
          <View style={s.sectionHeader}>
            <View style={[s.sectionBar, { backgroundColor: '#3B82F6' }]} />
            <Text style={[s.sectionTitle, {
              color: '#0F172A',
              textShadowColor: 'transparent',
            }]}>Observation de la maîtresse</Text>
          </View>
          <GlassCard>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>👩‍🏫</Text>
            <Text style={[s.observationText, { color: cardTextSecondary }]}>
              « {selectedChild.name.split(' ')[0]} est une élève curieuse et sociable. Elle progresse bien dans le langage oral et adore les activités artistiques. Elle commence à s'intéresser aux chiffres et aux lettres. Un beau trimestre ! »
            </Text>
            <Text style={[s.observationAuthor, { color: cardTextMuted }]}>Mme Laurent — Mars 2026</Text>
          </GlassCard>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <WallpaperBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingTop: TOPBAR_H + 20, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10 }]}
      >
        {/* ── Summary cards ── */}
        <View style={s.summaryRow}>
          <GlassCard style={s.summaryCard}>
            <Text style={[s.summaryValue, { color: cardText }]}>{overallAvg.toFixed(1)}</Text>
            <Text style={[s.summaryLabel, { color: cardTextMuted }]}>Moyenne</Text>
          </GlassCard>
          <GlassCard style={s.summaryCard}>
            <Text style={[s.summaryValue, { color: cardText }]}>{bestSubject?.emoji} {bestSubject?.average}</Text>
            <Text style={[s.summaryLabel, { color: cardTextMuted }]}>Meilleure</Text>
          </GlassCard>
          <GlassCard style={s.summaryCard}>
            <Text style={[s.summaryValue, { color: cardText }]}>{totalGrades}</Text>
            <Text style={[s.summaryLabel, { color: cardTextMuted }]}>Notes</Text>
          </GlassCard>
        </View>

        {/* ── New grades carousel ── */}
        <View style={s.sectionHeader}>
          <View style={[s.sectionBar, { backgroundColor: '#3B82F6' }]} />
          <Text style={[s.sectionTitle, {
            color: '#0F172A',
            textShadowColor: 'transparent',
          }]}>Nouvelles notes</Text>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={recentGrades}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingRight: 18 }}
          style={{ marginBottom: 16 }}
          renderItem={({ item }) => {
            const parentSubject = subjects.find((sub) => sub.name === item.subject);
            return (
              <Pressable
                onPress={() => {
                  if (parentSubject) {
                    navigation.navigate('SubjectDetail', {
                      subjectId: parentSubject.id,
                      subjectName: parentSubject.name,
                      subjectEmoji: parentSubject.emoji,
                      subjectColor: parentSubject.color,
                      average: parentSubject.average,
                      classAvg: parentSubject.classAvg,
                      trend: parentSubject.trend,
                      grades: JSON.stringify(parentSubject.grades),
                    });
                  }
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <GlassCard style={{ width: 110, alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, marginBottom: 6 }}>{item.emoji}</Text>
                  <View style={[s.gradeBadge, { backgroundColor: getBadgeColor(item.value) }]}>
                    <Text style={s.gradeBadgeText}>{item.value}/{item.maxValue}</Text>
                  </View>
                  <Text style={[s.carouselSubject, { color: cardTextSecondary }]} numberOfLines={1}>{item.subject}</Text>
                  <Text style={[s.carouselDate, { color: cardTextMuted }]}>{item.date}</Text>
                </GlassCard>
              </Pressable>
            );
          }}
        />

        {/* ── Period + Sort pickers ── */}
        <View style={s.filtersRow}>
          {/* Period picker trigger */}
          <Pressable
            style={s.pickerTrigger}
            onPress={() => { setShowSortDropdown(false); setShowPeriodDropdown(true); }}
          >
            <Text style={s.pickerTriggerText}>{activePeriodLabel}</Text>
            <ChevronDown size={14} color="#64748B" strokeWidth={2} />
          </Pressable>

          <View style={s.filterSpacer} />

          {/* Sort trigger */}
          <Pressable
            style={s.pickerTrigger}
            onPress={() => { setShowPeriodDropdown(false); setShowSortDropdown(true); }}
          >
            <Text style={s.pickerTriggerText}>{activeSortLabel}</Text>
            <ChevronDown size={14} color="#64748B" strokeWidth={2} />
          </Pressable>

          {/* Scan button */}
          <Pressable
            style={s.scanButton}
            onPress={() => navigation.navigate('ScannerBulletin')}
          >
            <Papicons name="QrCode" size={18} color="#3B82F6" />
          </Pressable>
        </View>

        {/* ── Search bar ── */}
        <View style={s.searchBar}>
          <Search size={18} color="#94A3B8" strokeWidth={2} />
          <TextInput
            placeholder="Rechercher une matière"
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            style={s.searchInput}
          />
        </View>

        {/* ── Period picker dropdown ── */}
        <Modal
          visible={showPeriodDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPeriodDropdown(false)}
        >
          <Pressable style={s.dropdownOverlay} onPress={() => setShowPeriodDropdown(false)}>
            <View style={s.dropdownSheet}>
              <Text style={s.dropdownTitle}>Période</Text>
              {PERIODS.map((period) => {
                const isSelected = selectedPeriod === period.value;
                return (
                  <Pressable
                    key={period.value}
                    style={[s.dropdownItem, isSelected && s.dropdownItemActive]}
                    onPress={() => { setSelectedPeriod(period.value); setShowPeriodDropdown(false); }}
                  >
                    {period.number !== undefined && (
                      <View style={[s.periodBadge, { backgroundColor: isSelected ? '#3B82F6' : '#E2E8F0' }]}>
                        <Text style={[s.periodBadgeText, { color: isSelected ? '#FFFFFF' : '#64748B' }]}>
                          {period.number}
                        </Text>
                      </View>
                    )}
                    <View style={s.dropdownItemBody}>
                      <Text style={[s.dropdownItemLabel, isSelected && { color: '#3B82F6' }]}>{period.label}</Text>
                      <Text style={s.dropdownItemDates}>{period.dates}</Text>
                    </View>
                    {isSelected && <Check size={16} color="#3B82F6" strokeWidth={2.5} />}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Modal>

        {/* ── Sort dropdown ── */}
        <Modal
          visible={showSortDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSortDropdown(false)}
        >
          <Pressable style={s.dropdownOverlay} onPress={() => setShowSortDropdown(false)}>
            <View style={s.dropdownSheet}>
              <Text style={s.dropdownTitle}>Trier par</Text>
              {SORT_OPTIONS.map((opt) => {
                const isSelected = sortMode === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[s.dropdownItem, isSelected && s.dropdownItemActive]}
                    onPress={() => { setSortMode(opt.value); setShowSortDropdown(false); }}
                  >
                    <View style={s.dropdownItemBody}>
                      <Text style={[s.dropdownItemLabel, isSelected && { color: '#3B82F6' }]}>{opt.label}</Text>
                    </View>
                    {isSelected && <Check size={16} color="#3B82F6" strokeWidth={2.5} />}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Modal>

        {/* ── Subject grid 2×2 ── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {sortedSubjects.map((subject) => {
            const badgeColor = getBadgeColor(subject.average);
            const trendIcon = subject.trend === 'up' ? '↑' : subject.trend === 'down' ? '↓' : '=';
            const trendColor = subject.trend === 'up' ? '#10B981' : subject.trend === 'down' ? '#EF4444' : '#94A3B8';

            return (
              <Pressable
                key={subject.id}
                onPress={() => {
                  navigation.navigate('SubjectDetail', {
                    subjectId: subject.id,
                    subjectName: subject.name,
                    subjectEmoji: subject.emoji,
                    subjectColor: subject.color,
                    average: subject.average,
                    classAvg: subject.classAvg,
                    trend: subject.trend,
                    grades: JSON.stringify(subject.grades),
                  });
                }}
                style={{ width: (Dimensions.get('window').width - 18 * 2 - 12) / 2 }}
              >
                <GlassCard style={{ height: 140, padding: 14 }} noPadding={false}>
                  {/* Emoji */}
                  <Text style={{ fontSize: 28, marginBottom: 6 }}>{subject.emoji}</Text>
                  {/* Name */}
                  <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 13, color: cardText }} numberOfLines={1}>
                    {subject.name}
                  </Text>
                  {/* Average + trend */}
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
                    <Text style={{ fontFamily: FontFamily.displayExtraBold, fontSize: 28, color: badgeColor }}>
                      {subject.average.toFixed(1)}
                    </Text>
                    <Text style={{ fontFamily: FontFamily.sansSemiBold, fontSize: 11, color: '#94A3B8' }}>/20</Text>
                    <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 14, color: trendColor, marginLeft: 4 }}>
                      {trendIcon}
                    </Text>
                  </View>
                  {/* Progress bar */}
                  <View style={{ marginTop: 6 }}>
                    <GradeBar value={subject.average} max={20} color={subject.color} />
                  </View>
                </GlassCard>
              </Pressable>
            );
          })}
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 18, gap: 8 },
  flex: { flex: 1 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  summaryValue: { fontFamily: FontFamily.displayBold, fontSize: 32, color: '#0F172A', marginBottom: 2 },
  summaryLabel: { fontFamily: FontFamily.sansSemiBold, fontSize: 10, color: '#94A3B8', textTransform: 'uppercase' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionBar: { width: 4, height: 16, borderRadius: 2 },
  sectionTitle: {
    fontFamily: FontFamily.displayBold, fontSize: 13,
    textTransform: 'uppercase', letterSpacing: 2,
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },

  gradeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  gradeBadgeText: { fontFamily: FontFamily.displayExtraBold, fontSize: 13, color: '#FFFFFF' },

  carouselSubject: { fontFamily: FontFamily.sansSemiBold, fontSize: 11, color: '#64748B', marginTop: 6 },
  carouselDate: { fontFamily: FontFamily.sansRegular, fontSize: 10, color: '#94A3B8' },

  // Filters row (period + sort)
  filtersRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  filterSpacer: { flex: 1 },
  pickerTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  pickerTriggerText: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, color: '#0F172A' },
  scanButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },

  // Search bar
  searchBar: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 12, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  searchInput: {
    flex: 1, marginLeft: 10,
    fontFamily: FontFamily.sansRegular, fontSize: 14, color: '#0F172A',
  },

  // Dropdown modal
  dropdownOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  dropdownSheet: {
    width: '100%', backgroundColor: '#FFFFFF',
    borderRadius: 16, paddingVertical: 8, overflow: 'hidden',
  },
  dropdownTitle: {
    fontFamily: FontFamily.displayBold, fontSize: 13,
    textTransform: 'uppercase', letterSpacing: 1.5, color: '#94A3B8',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  dropdownItemActive: { backgroundColor: '#F0F7FF' },
  dropdownItemBody: { flex: 1 },
  dropdownItemLabel: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: '#0F172A' },
  dropdownItemDates: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: '#94A3B8', marginTop: 2 },
  periodBadge: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  periodBadgeText: { fontFamily: FontFamily.displayBold, fontSize: 12 },

  subjectHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  subjectDot: { width: 4, height: 28, borderRadius: 2 },
  subjectName: { fontFamily: FontFamily.displayBold, fontSize: 17, color: '#0F172A' },
  subjectClass: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: '#94A3B8', marginTop: 2 },
  subjectRight: { alignItems: 'flex-end', gap: 2, marginRight: 6 },
  subjectAvg: { fontFamily: FontFamily.displayExtraBold, fontSize: 24 },

  barRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12, gap: 6 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(128,128,128,0.15)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barLabel: { fontFamily: FontFamily.sansSemiBold, fontSize: 11, color: '#94A3B8' },

  gradeList: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  gradeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  gradeBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  gradeDate: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, color: '#64748B' },
  gradeType: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: '#94A3B8', marginTop: 2 },

  importCta: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 16, marginTop: 8 },
  importTitle: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#FFFFFF' },
  importSub: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  // Maternelle
  maternelleTitle: {
    fontFamily: FontFamily.displayBold, fontSize: 22, marginBottom: 12,
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  legendRow: { flexDirection: 'row', justifyContent: 'space-around' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendLabel: { fontFamily: FontFamily.sansSemiBold, fontSize: 11, color: '#94A3B8' },
  competencyLabel: { fontFamily: FontFamily.sansBold, fontSize: 12 },
  observationText: { fontFamily: FontFamily.sansRegular, fontSize: 14, lineHeight: 22, color: '#64748B' },
  observationAuthor: { fontFamily: FontFamily.sansSemiBold, fontSize: 11, color: '#94A3B8', marginTop: 8 },
});
