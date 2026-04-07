/**
 * NotesScreen — Clean white/black/grey redesign.
 *
 * Structure (primaire/lycee):
 * - Title row + scanner + trimester selector
 * - Average card with SVG progression graph
 * - Asymmetric row: dernière note | point fort + à renforcer
 * - Horizontal subject pills
 * - Subject summary bar
 * - Expandable grade cards list
 *
 * Structure (maternelle):
 * - Title row
 * - Acquis/En cours/Compétences summary card
 * - Horizontal domain pills
 * - Domain detail + competency list
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Polyline,
  Line,
  Text as SvgText,
} from 'react-native-svg';
import { ScanLine, ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useSchoolMode, getSchoolModeFromBirthDate } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useDemoData } from '../contexts/DemoContext';
import { getSubjects, getGrades } from '../services/database';
import { FontFamily } from '../hooks/useSolariaFonts';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Types ────────────────────────────────────────────────

interface Grade {
  id: string;
  value: number;
  maxValue: number;
  date: string;
  type: string;
  coefficient?: number;
  comment?: string;
  classAvg?: number;
}

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

// ─── Constants ────────────────────────────────────────────

const TRIMESTER_OPTIONS = [
  { label: 'T1', value: 'T1', number: 1 },
  { label: 'T2', value: 'T2', number: 2 },
  { label: 'T3', value: 'T3', number: 3 },
];

function getCurrentTrimester(): string {
  const month = new Date().getMonth();
  if (month >= 8 && month <= 10) return 'T1';
  if (month >= 11 || month <= 1) return 'T2';
  return 'T3';
}

const COLOR_PALETTE = ['#4A90D9', '#7C3AED', '#F59E0B', '#10B981', '#EC4899', '#EF4444'];

const FRENCH_MONTHS: Record<string, string> = {
  '01': 'jan', '02': 'fév', '03': 'mars', '04': 'avr',
  '05': 'mai', '06': 'juin', '07': 'juil', '08': 'août',
  '09': 'sep', '10': 'oct', '11': 'nov', '12': 'déc',
};

function toFrenchDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  return `${parseInt(parts[2], 10)} ${FRENCH_MONTHS[parts[1]] ?? parts[1]}`;
}

// Fallback mock subjects for non-demo, non-Supabase state
const MOCK_SUBJECTS: Subject[] = [
  {
    id: '1', name: 'Mathématiques', emoji: '📐', color: '#4A90D9',
    average: 15.5, classAvg: 12.3, trend: 'up',
    grades: [
      { id: 'g1', value: 17, maxValue: 20, date: '15 mars', type: 'Contrôle', coefficient: 2, comment: 'Excellent travail, très bonne maîtrise des équations.' },
      { id: 'g2', value: 14, maxValue: 20, date: '8 mars', type: 'Devoir maison', coefficient: 1 },
      { id: 'g3', value: 16, maxValue: 20, date: '1 mars', type: 'Contrôle', coefficient: 2 },
    ],
  },
  {
    id: '2', name: 'Français', emoji: '📖', color: '#7C3AED',
    average: 14.0, classAvg: 13.1, trend: 'stable',
    grades: [
      { id: 'g5', value: 15, maxValue: 20, date: '14 mars', type: 'Rédaction', coefficient: 1, comment: 'Belle écriture, quelques fautes d\'accord.' },
      { id: 'g6', value: 13, maxValue: 20, date: '7 mars', type: 'Dictée', coefficient: 1 },
    ],
  },
  {
    id: '3', name: 'Histoire-Géo', emoji: '🏛️', color: '#F59E0B',
    average: 16.0, classAvg: 11.8, trend: 'up',
    grades: [
      { id: 'g8', value: 18, maxValue: 20, date: '12 mars', type: 'Exposé', coefficient: 1 },
      { id: 'g9', value: 15, maxValue: 20, date: '5 mars', type: 'Contrôle', coefficient: 2 },
    ],
  },
  {
    id: '4', name: 'Anglais', emoji: '📚', color: '#10B981',
    average: 17.0, classAvg: 13.7, trend: 'up',
    grades: [
      { id: 'g11', value: 18, maxValue: 20, date: '13 mars', type: 'Oral', coefficient: 1, comment: 'Excellent niveau, accent très naturel.' },
      { id: 'g12', value: 16, maxValue: 20, date: '6 mars', type: 'Contrôle', coefficient: 2 },
    ],
  },
  {
    id: '5', name: 'Sciences', emoji: '🔬', color: '#EC4899',
    average: 13.0, classAvg: 12.5, trend: 'down',
    grades: [
      { id: 'g14', value: 12, maxValue: 20, date: '11 mars', type: 'TP', coefficient: 1 },
      { id: 'g15', value: 14, maxValue: 20, date: '4 mars', type: 'Contrôle', coefficient: 2 },
    ],
  },
];

const MATERNELLE_DOMAINS: CompetencyDomain[] = [
  {
    id: 'd1', name: 'Mobiliser le langage', emoji: '🗣️', color: '#7C3AED',
    competencies: [
      { id: 'c1', name: 'Communiquer avec les adultes', level: 'acquis' },
      { id: 'c2', name: 'S\'exprimer dans un langage oral', level: 'acquis' },
      { id: 'c3', name: 'Écouter et comprendre une histoire', level: 'en_cours' },
      { id: 'c4', name: 'Reconnaître les lettres de son prénom', level: 'acquis' },
    ],
  },
  {
    id: 'd2', name: 'Activités artistiques', emoji: '🎨', color: '#EC4899',
    competencies: [
      { id: 'c5', name: 'Dessiner (bonhomme, maison)', level: 'acquis' },
      { id: 'c6', name: 'Chanter en groupe', level: 'acquis' },
      { id: 'c7', name: 'Explorer différents matériaux', level: 'en_cours' },
    ],
  },
  {
    id: 'd3', name: 'Activités physiques', emoji: '🤸', color: '#22D3EE',
    competencies: [
      { id: 'c8', name: 'Courir, sauter, lancer', level: 'acquis' },
      { id: 'c9', name: 'Se déplacer avec aisance', level: 'acquis' },
      { id: 'c10', name: 'Jouer collectivement', level: 'en_cours' },
    ],
  },
  {
    id: 'd4', name: 'Structurer sa pensée', emoji: '🔢', color: '#F59E0B',
    competencies: [
      { id: 'c11', name: 'Compter jusqu\'à 10', level: 'acquis' },
      { id: 'c12', name: 'Reconnaître des formes', level: 'en_cours' },
      { id: 'c13', name: 'Trier et classer des objets', level: 'acquis' },
      { id: 'c14', name: 'Se repérer dans le temps', level: 'a_renforcer' },
    ],
  },
  {
    id: 'd5', name: 'Explorer le monde', emoji: '🌍', color: '#10B981',
    competencies: [
      { id: 'c15', name: 'Connaître les parties du corps', level: 'acquis' },
      { id: 'c16', name: 'Observer le vivant (animaux, plantes)', level: 'en_cours' },
      { id: 'c17', name: 'Utiliser des outils numériques simples', level: 'a_renforcer' },
    ],
  },
];

const DEMO_GRAPH_DATA = [12.5, 13.2, 12.8, 14.1, 14.5, 14.8];
const GRAPH_MONTHS = ['Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr'];

// ─── Helpers ──────────────────────────────────────────────

function gradeColor(value: number): string {
  if (value >= 16) return '#059669';
  if (value >= 14) return '#059669';
  if (value >= 10) return '#0F172A';
  return '#DC2626';
}

function leftBarColor(normalizedOutOf20: number): string {
  if (normalizedOutOf20 >= 16) return '#059669';
  if (normalizedOutOf20 >= 14) return '#94A3B8';
  if (normalizedOutOf20 >= 10) return '#F59E0B';
  return '#DC2626';
}

// ─── Sub-components ───────────────────────────────────────

// Smooth SVG progression graph
function ProgressionGraph({ data, width, height }: { data: number[]; width: number; height: number }) {
  const padTop = 8;
  const padBottom = 20;
  const padLeft = 8;
  const padRight = 16;

  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const minVal = Math.min(...data) - 1;
  const maxVal = Math.max(...data) + 1;
  const range = maxVal - minVal || 1;

  const points = data.map((v, i) => ({
    x: padLeft + (i / (data.length - 1)) * innerW,
    y: padTop + (1 - (v - minVal) / range) * innerH,
  }));

  // Build smooth cubic bezier path
  function buildPath(): string {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }

  // Build closed fill path
  function buildFillPath(): string {
    const linePath = buildPath();
    if (!linePath) return '';
    const last = points[points.length - 1];
    const first = points[0];
    return `${linePath} L ${last.x} ${height - padBottom} L ${first.x} ${height - padBottom} Z`;
  }

  const lastPt = points[points.length - 1];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgLinearGradient id="graphFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0F172A" stopOpacity="0.07" />
          <Stop offset="1" stopColor="#0F172A" stopOpacity="0" />
        </SvgLinearGradient>
      </Defs>
      {/* Fill */}
      <Path d={buildFillPath()} fill="url(#graphFill)" />
      {/* Line */}
      <Path d={buildPath()} fill="none" stroke="#0F172A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Month labels */}
      {GRAPH_MONTHS.map((m, i) => {
        const x = padLeft + (i / (data.length - 1)) * innerW;
        return (
          <SvgText
            key={m}
            x={x}
            y={height - 4}
            fontSize={9}
            fill="#94A3B8"
            textAnchor="middle"
            fontFamily={FontFamily.sansRegular}
          >
            {m}
          </SvgText>
        );
      })}
      {/* Last point dot */}
      <Circle cx={lastPt.x} cy={lastPt.y} r={5} fill="#FFFFFF" stroke="#0F172A" strokeWidth={2} />
    </Svg>
  );
}

// Single expandable grade card
function GradeCard({ grade, subjectColor }: { grade: Grade; subjectColor: string }) {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const normalized = (grade.value / grade.maxValue) * 20;
  const barColor = leftBarColor(normalized);
  const numColor = gradeColor(normalized);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Pressable onPress={toggle} style={({ pressed }) => [s.gradeCard, expanded && s.gradeCardExpanded, pressed && { opacity: 0.92 }]}>
      <View style={s.gradeCardInner}>
        {/* Left accent bar */}
        <View style={[s.gradeAccentBar, { backgroundColor: barColor }]} />

        {/* Main content */}
        <View style={s.gradeCardBody}>
          {/* Top row */}
          <View style={s.gradeCardTopRow}>
            {/* Grade badge */}
            <View style={s.gradeBadgeBox}>
              <Text style={[s.gradeBadgeNum, { color: numColor }]}>
                {grade.value}
              </Text>
              <Text style={s.gradeBadgeMax}>/{grade.maxValue}</Text>
            </View>

            {/* Info */}
            <View style={s.gradeCardInfo}>
              <View style={s.gradeCardTitleRow}>
                <Text style={s.gradeCardTitle} numberOfLines={1}>{grade.type}</Text>
                {grade.coefficient !== undefined && grade.coefficient > 1 && (
                  <View style={s.coeffBadge}>
                    <Text style={s.coeffBadgeText}>×{grade.coefficient}</Text>
                  </View>
                )}
              </View>
              <Text style={s.gradeCardDate}>{grade.date}</Text>
            </View>

            {/* Chevron */}
            <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
              <ChevronDown size={16} color="#94A3B8" strokeWidth={2} />
            </Animated.View>
          </View>

          {/* Expanded details */}
          {expanded && (
            <View style={s.gradeExpanded}>
              {grade.comment ? (
                <Text style={s.gradeComment}>"{grade.comment}"</Text>
              ) : null}
              <View style={s.gradeStatsRow}>
                <View style={s.gradeStat}>
                  <Text style={s.gradeStatLabel}>Note</Text>
                  <Text style={[s.gradeStatValue, { color: numColor }]}>{grade.value}/{grade.maxValue}</Text>
                </View>
                <View style={s.gradeStatDivider} />
                <View style={s.gradeStat}>
                  <Text style={s.gradeStatLabel}>Coeff.</Text>
                  <Text style={s.gradeStatValue}>{grade.coefficient ?? 1}</Text>
                </View>
                <View style={s.gradeStatDivider} />
                <View style={s.gradeStat}>
                  <Text style={s.gradeStatLabel}>Classe</Text>
                  <Text style={s.gradeStatValue}>{grade.classAvg ? `${grade.classAvg.toFixed(1)}` : '—'}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main screen ─────────────────────────────────────────

export default function NotesScreen() {
  useChildTheme();
  const { selectedChild } = useActiveChild();
  const { mode } = useSchoolMode();
  const { isDemoMode, getSubjects: getDemoSubjects, getGrades: getDemoGrades } = useDemoData();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [subjects, setSubjects] = useState<Subject[]>(MOCK_SUBJECTS);
  const [selectedSubjectIdx, setSelectedSubjectIdx] = useState(0);
  const [selectedDomainIdx, setSelectedDomainIdx] = useState(0);
  const [selectedTrimester, setSelectedTrimester] = useState<string>(getCurrentTrimester());
  const [showTrimesterPicker, setShowTrimesterPicker] = useState(false);

  // Detect school mode from active child's birth date
  const isMaternelle = selectedChild?.birthDate
    ? getSchoolModeFromBirthDate(selectedChild.birthDate) === 'maternelle'
    : mode === 'maternelle';

  const loadNotes = useCallback(async () => {
    if (!selectedChild?.id) return;

    if (isDemoMode) {
      const demoSubs = getDemoSubjects(selectedChild.id);
      const trimNum = selectedTrimester === 'T1' ? 1 : selectedTrimester === 'T2' ? 2 : 3;
      const demoGradesList = getDemoGrades(selectedChild.id, trimNum);

      if (demoSubs.length > 0) {
        const gradesBySub: Record<string, typeof demoGradesList> = {};
        for (const g of demoGradesList) {
          if (!gradesBySub[g.subjectId]) gradesBySub[g.subjectId] = [];
          gradesBySub[g.subjectId].push(g);
        }
        const mapped: Subject[] = demoSubs.map((sub, idx) => {
          const subGrades = gradesBySub[sub.id] ?? [];
          const grades: Grade[] = subGrades.map((g) => ({
            id: g.id,
            value: g.value,
            maxValue: g.outOf,
            date: toFrenchDate(g.date),
            type: g.title,
            coefficient: g.coefficient,
            comment: g.comment || undefined,
          }));
          const avg = sub.average ??
            (grades.length > 0 ? grades.reduce((s, g) => s + (g.value / g.maxValue) * 20, 0) / grades.length : 0);
          return {
            id: sub.id,
            name: sub.name,
            emoji: sub.emoji || '📚',
            color: sub.color || COLOR_PALETTE[idx % COLOR_PALETTE.length],
            grades,
            average: Math.round(avg * 10) / 10,
            classAvg: Math.round((sub.classAverage ?? 0) * 10) / 10,
            trend: (sub.trend as Subject['trend']) || 'stable',
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
        id: g.id,
        value: g.value,
        maxValue: g.max_value ?? 20,
        date: g.date ? toFrenchDate(g.date) : '',
        type: g.type ?? 'Contrôle',
        coefficient: g.coefficient,
        comment: g.comment,
      }));
      const avg = grades.length > 0 ? grades.reduce((s, g) => s + (g.value / g.maxValue) * 20, 0) / grades.length : 0;
      const classAvg = subGrades.reduce((s: number, g: any) => s + (g.class_avg ?? 0), 0) / (subGrades.length || 1);
      let trend: Subject['trend'] = 'stable';
      if (grades.length >= 2) {
        const last = (grades[0].value / grades[0].maxValue) * 20;
        const prev = (grades[1].value / grades[1].maxValue) * 20;
        if (last > prev + 0.5) trend = 'up'; else if (last < prev - 0.5) trend = 'down';
      }
      return {
        id: sub.id, name: sub.name, emoji: sub.emoji ?? '📚',
        color: sub.color ?? COLOR_PALETTE[idx % COLOR_PALETTE.length],
        grades, average: Math.round(avg * 10) / 10,
        classAvg: Math.round(classAvg * 10) / 10, trend,
      };
    });
    setSubjects(mapped);
  }, [selectedChild?.id, isDemoMode, getDemoSubjects, getDemoGrades, selectedTrimester]);

  useEffect(() => { loadNotes(); }, [loadNotes]);
  useEffect(() => { setSelectedSubjectIdx(0); }, [subjects]);

  // Derived stats
  const overallAvg = subjects.length > 0
    ? subjects.reduce((s, sub) => s + sub.average, 0) / subjects.length
    : 0;

  const allGrades = subjects.flatMap((sub) =>
    sub.grades.map((g) => ({ ...g, subject: sub, normalized: (g.value / g.maxValue) * 20 }))
  );

  const lastGrade = allGrades.length > 0 ? allGrades[0] : null;

  const bestSubject = subjects.length > 0
    ? subjects.reduce((best, sub) => sub.average > best.average ? sub : best, subjects[0])
    : null;

  const worstSubject = subjects.length > 0
    ? subjects.reduce((worst, sub) => sub.average < worst.average ? sub : worst, subjects[0])
    : null;

  // Trend relative to previous trimester — simple heuristic from last 2 grades
  const avgTrend = subjects.length > 0
    ? subjects.reduce<'up' | 'down' | 'stable'>((acc, sub) => {
        if (acc === 'up') return 'up';
        return sub.trend === 'up' ? 'up' : acc;
      }, 'stable')
    : 'stable';

  const activeSubject = subjects[Math.min(selectedSubjectIdx, subjects.length - 1)] ?? null;

  // ─── MATERNELLE MODE ─────────────────────────────────────

  if (isMaternelle) {
    const totalCompetencies = MATERNELLE_DOMAINS.reduce((s, d) => s + d.competencies.length, 0);
    const acquired = MATERNELLE_DOMAINS.reduce(
      (s, d) => s + d.competencies.filter((c) => c.level === 'acquis').length, 0,
    );
    const inProgress = MATERNELLE_DOMAINS.reduce(
      (s, d) => s + d.competencies.filter((c) => c.level === 'en_cours').length, 0,
    );

    const activeDomain = MATERNELLE_DOMAINS[selectedDomainIdx] ?? MATERNELLE_DOMAINS[0];
    const domainAcquired = activeDomain.competencies.filter((c) => c.level === 'acquis').length;
    const domainPct = Math.round((domainAcquired / activeDomain.competencies.length) * 100);

    const levelConfig: Record<CompetencyLevel, { label: string; color: string; bg: string }> = {
      acquis: { label: 'Acquis', color: '#059669', bg: '#F0FDF4' },
      en_cours: { label: 'En cours', color: '#D97706', bg: '#FFFBEB' },
      a_renforcer: { label: 'À renforcer', color: '#DC2626', bg: '#FEF2F2' },
      non_evalue: { label: 'Non évalué', color: '#94A3B8', bg: '#F8FAFC' },
    };

    return (
      <View style={s.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 20 }]}
        >
          {/* Title row */}
          <View style={s.titleRow}>
            <Text style={s.screenTitle}>Notes</Text>
          </View>

          {/* Summary card */}
          <View style={s.summaryCard}>
            <Text style={s.cardSectionLabel}>SUIVI DES APPRENTISSAGES</Text>
            <View style={s.maternelleStatsRow}>
              <View style={s.maternelleStat}>
                <Text style={[s.maternelleStatNum, { color: '#059669' }]}>{acquired}</Text>
                <Text style={s.maternelleStatLabel}>Acquis</Text>
              </View>
              <View style={s.maternelleStatDivider} />
              <View style={s.maternelleStat}>
                <Text style={[s.maternelleStatNum, { color: '#D97706' }]}>{inProgress}</Text>
                <Text style={s.maternelleStatLabel}>En cours</Text>
              </View>
              <View style={s.maternelleStatDivider} />
              <View style={s.maternelleStat}>
                <Text style={[s.maternelleStatNum, { color: '#0F172A' }]}>{totalCompetencies}</Text>
                <Text style={s.maternelleStatLabel}>Compétences</Text>
              </View>
            </View>
          </View>

          {/* Domain pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
            style={{ marginTop: 20, marginBottom: 16 }}
          >
            {MATERNELLE_DOMAINS.map((domain, idx) => {
              const isActive = selectedDomainIdx === idx;
              return (
                <Pressable
                  key={domain.id}
                  onPress={() => setSelectedDomainIdx(idx)}
                  style={({ pressed }) => [
                    s.pill,
                    isActive ? s.pillActive : s.pillInactive,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={{ fontSize: 14 }}>{domain.emoji}</Text>
                  <Text style={[s.pillText, isActive ? s.pillTextActive : s.pillTextInactive]}>
                    {domain.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Domain detail */}
          <View style={s.domainDetailCard}>
            <View style={s.domainHeader}>
              <Text style={{ fontSize: 28 }}>{activeDomain.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.domainName}>{activeDomain.name}</Text>
                <Text style={s.domainScore}>
                  <Text style={{ color: activeDomain.color }}>{domainAcquired}/{activeDomain.competencies.length} acquis</Text>
                  {'  ·  '}
                  <Text style={{ color: activeDomain.color }}>{domainPct}%</Text>
                </Text>
              </View>
            </View>
            {/* Progress bar */}
            <View style={s.domainProgressTrack}>
              <View style={[s.domainProgressFill, { width: `${domainPct}%`, backgroundColor: activeDomain.color }]} />
            </View>
          </View>

          {/* Competency list */}
          <View style={s.competencyList}>
            {activeDomain.competencies.map((comp, i) => {
              const cfg = levelConfig[comp.level];
              const isLast = i === activeDomain.competencies.length - 1;
              return (
                <View key={comp.id} style={[s.competencyItem, !isLast && s.competencyItemBorder]}>
                  <Text style={s.competencyName}>{comp.name}</Text>
                  <View style={[s.competencyBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.competencyBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Teacher observation */}
          <View style={[s.summaryCard, { marginTop: 8 }]}>
            <Text style={s.cardSectionLabel}>OBSERVATION DE LA MAÎTRESSE</Text>
            <Text style={s.observationText}>
              « {selectedChild?.name?.split(' ')[0] ?? 'L\'élève'} est une élève curieuse et sociable. Elle progresse bien dans le langage oral et adore les activités artistiques. Un beau trimestre ! »
            </Text>
            <Text style={s.observationAuthor}>Mme Laurent — Mars 2026</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── PRIMAIRE / LYCEE MODE ────────────────────────────────

  const graphData = DEMO_GRAPH_DATA;
  const GRAPH_W = 280;
  const GRAPH_H = 72;

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 20 }]}
      >
        {/* ── Title row ── */}
        <View style={s.titleRow}>
          <Text style={s.screenTitle}>Notes</Text>
          <View style={s.titleActions}>
            {/* Scanner button */}
            <Pressable
              style={s.iconCircleBtn}
              onPress={() => navigation.navigate('ScannerBulletin')}
            >
              <ScanLine size={17} color="#0F172A" strokeWidth={2} />
            </Pressable>
            {/* Trimester selector */}
            <Pressable
              style={s.trimesterBtn}
              onPress={() => setShowTrimesterPicker((v) => !v)}
            >
              <Text style={s.trimesterBtnText}>{selectedTrimester}</Text>
              <ChevronDown size={13} color="#64748B" strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Trimester dropdown */}
        {showTrimesterPicker && (
          <Pressable style={s.dropdownOverlay} onPress={() => setShowTrimesterPicker(false)}>
            <View style={s.trimesterDropdown}>
              {TRIMESTER_OPTIONS.map((opt) => {
                const isActive = opt.value === selectedTrimester;
                return (
                  <Pressable
                    key={opt.value}
                    style={[s.trimesterOption, isActive && s.trimesterOptionActive]}
                    onPress={() => { setSelectedTrimester(opt.value); setShowTrimesterPicker(false); }}
                  >
                    <Text style={[s.trimesterOptionText, isActive && s.trimesterOptionTextActive]}>
                      Trimestre {opt.number}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        )}

        {/* ── Average card with graph ── */}
        <View style={s.avgCard}>
          {/* Header row */}
          <View style={s.avgCardHeader}>
            <Text style={s.cardSectionLabel}>MOYENNE GÉNÉRALE</Text>
            {/* Trend badge */}
            <View style={s.trendBadge}>
              <TrendingUp size={11} color="#059669" strokeWidth={2.5} />
              <Text style={s.trendBadgeText}>+0.3</Text>
            </View>
          </View>

          {/* Big number */}
          <View style={s.avgNumRow}>
            <Text style={s.avgNum}>{overallAvg.toFixed(1)}</Text>
            <Text style={s.avgDenom}>/20</Text>
          </View>

          {/* Graph */}
          <View style={s.graphWrapper}>
            <ProgressionGraph data={graphData} width={GRAPH_W} height={GRAPH_H} />
          </View>
        </View>

        {/* ── Asymmetric row: dernière note | point fort + à renforcer ── */}
        <View style={s.asymRow}>
          {/* Dernière note */}
          <View style={[s.miniCard, { flex: 1.2 }]}>
            <Text style={s.cardSectionLabel}>DERNIÈRE NOTE</Text>
            {lastGrade ? (
              <>
                <Text style={[s.lastGradeNum, { color: gradeColor(lastGrade.normalized) }]}>
                  {lastGrade.value}
                  <Text style={s.lastGradeDenom}>/{lastGrade.maxValue}</Text>
                </Text>
                <Text style={s.lastGradeTitle} numberOfLines={1}>{lastGrade.type}</Text>
                <Text style={s.lastGradeDate}>{lastGrade.date}</Text>
              </>
            ) : (
              <Text style={s.noDataText}>—</Text>
            )}
          </View>

          {/* Stacked: point fort + à renforcer */}
          <View style={[s.stackedCol, { flex: 1 }]}>
            {/* Point fort */}
            <View style={s.miniCard}>
              <Text style={s.cardSectionLabel}>POINT FORT</Text>
              {bestSubject ? (
                <>
                  <Text style={s.miniSubjectName} numberOfLines={1}>{bestSubject.emoji} {bestSubject.name}</Text>
                  <Text style={[s.miniSubjectAvg, { color: '#059669' }]}>{bestSubject.average.toFixed(1)}/20</Text>
                </>
              ) : (
                <Text style={s.noDataText}>—</Text>
              )}
            </View>

            {/* À renforcer */}
            <View style={s.miniCard}>
              <Text style={s.cardSectionLabel}>À RENFORCER</Text>
              {worstSubject && worstSubject.id !== bestSubject?.id ? (
                <>
                  <Text style={s.miniSubjectName} numberOfLines={1}>{worstSubject.emoji} {worstSubject.name}</Text>
                  <Text style={[s.miniSubjectAvg, { color: '#DC2626' }]}>{worstSubject.average.toFixed(1)}/20</Text>
                </>
              ) : (
                <Text style={s.noDataText}>—</Text>
              )}
            </View>
          </View>
        </View>

        {/* ── Subject pills ── */}
        {subjects.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
            style={{ marginTop: 24, marginBottom: 16 }}
          >
            {subjects.map((subject, idx) => {
              const isActive = selectedSubjectIdx === idx;
              return (
                <Pressable
                  key={subject.id}
                  onPress={() => setSelectedSubjectIdx(idx)}
                  style={({ pressed }) => [
                    s.pill,
                    isActive ? s.pillActive : s.pillInactive,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={{ fontSize: 14 }}>{subject.emoji}</Text>
                  <Text style={[s.pillText, isActive ? s.pillTextActive : s.pillTextInactive]}>
                    {subject.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* ── Selected subject summary ── */}
        {activeSubject && (
          <View style={s.subjectSummaryCard}>
            <View style={s.subjectSummaryRow}>
              <View>
                <View style={s.subjectAvgRow}>
                  <Text style={s.subjectAvgNum}>{activeSubject.average.toFixed(1)}</Text>
                  <Text style={s.subjectAvgDenom}>/20</Text>
                </View>
                <Text style={s.subjectClassAvg}>
                  Classe {activeSubject.classAvg.toFixed(1)}
                  {'  '}
                  {activeSubject.trend === 'up' ? '↑' : activeSubject.trend === 'down' ? '↓' : '='}
                </Text>
              </View>
              {/* Progress bar */}
              <View style={s.subjectProgressWrap}>
                <View style={s.subjectProgressTrack}>
                  <View style={[
                    s.subjectProgressFill,
                    {
                      width: `${(activeSubject.average / 20) * 100}%`,
                      backgroundColor: activeSubject.color + 'B3',
                    },
                  ]} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  {activeSubject.trend === 'up' && <TrendingUp size={12} color="#059669" strokeWidth={2} />}
                  {activeSubject.trend === 'down' && <TrendingDown size={12} color="#DC2626" strokeWidth={2} />}
                  {activeSubject.trend === 'stable' && <Minus size={12} color="#94A3B8" strokeWidth={2} />}
                  <Text style={[
                    s.subjectTrendText,
                    {
                      color: activeSubject.trend === 'up' ? '#059669'
                        : activeSubject.trend === 'down' ? '#DC2626'
                        : '#94A3B8',
                    },
                  ]}>
                    {activeSubject.trend === 'up' ? 'En hausse' : activeSubject.trend === 'down' ? 'En baisse' : 'Stable'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Grade list ── */}
        {activeSubject ? (
          activeSubject.grades.length > 0 ? (
            <View style={s.gradeList}>
              {activeSubject.grades.map((grade) => (
                <GradeCard key={grade.id} grade={grade} subjectColor={activeSubject.color} />
              ))}
            </View>
          ) : (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>Aucune note pour cette matière</Text>
            </View>
          )
        ) : (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>Aucune matière disponible</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Scanner FAB ── */}
      <Pressable
        onPress={() => navigation.navigate('ScannerBulletin')}
        style={({ pressed }) => [s.fab, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel="Scanner une note"
      >
        <ScanLine size={22} color="#FFFFFF" strokeWidth={2} />
      </Pressable>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.03,
  shadowRadius: 3,
  elevation: 1,
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F8FA' },
  scroll: { paddingHorizontal: 18, gap: 0 },

  // Title row
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  screenTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -1.5,
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8EA',
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },
  trimesterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8EA',
    ...CARD_SHADOW,
  },
  trimesterBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#0F172A',
  },

  // Trimester dropdown
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    right: 18,
    zIndex: 100,
  },
  trimesterDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8EA',
    overflow: 'hidden',
    marginTop: 56,
    ...CARD_SHADOW,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  trimesterOption: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  trimesterOptionActive: {
    backgroundColor: '#F8F8FA',
  },
  trimesterOptionText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: '#64748B',
  },
  trimesterOptionTextActive: {
    fontFamily: FontFamily.sansSemiBold,
    color: '#0F172A',
  },

  // Average card
  avgCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#F0F0F2',
    marginBottom: 10,
    ...CARD_SHADOW,
  },
  avgCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardSectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: '#999999',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  trendBadgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: '#059669',
  },
  avgNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginBottom: 12,
  },
  avgNum: {
    fontFamily: FontFamily.displayBold,
    fontSize: 42,
    color: '#0F172A',
    letterSpacing: -2.5,
    lineHeight: 44,
  },
  avgDenom: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 18,
    color: '#94A3B8',
    lineHeight: 22,
  },
  graphWrapper: {
    marginTop: 4,
    marginHorizontal: -4,
  },

  // Asymmetric row
  asymRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 0,
  },
  stackedCol: {
    gap: 10,
  },
  miniCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0F0F2',
    ...CARD_SHADOW,
  },
  lastGradeNum: {
    fontFamily: FontFamily.displayBold,
    fontSize: 34,
    letterSpacing: -1.5,
    lineHeight: 40,
    marginTop: 8,
  },
  lastGradeDenom: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#94A3B8',
  },
  lastGradeTitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  lastGradeDate: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  miniSubjectName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: '#0F172A',
    marginTop: 6,
  },
  miniSubjectAvg: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  noDataText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 18,
    color: '#94A3B8',
    marginTop: 8,
  },

  // Pills
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 50,
  },
  pillActive: {
    backgroundColor: '#1A2340',
  },
  pillInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8EA',
  },
  pillText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  pillTextInactive: {
    color: '#64748B',
  },

  // Subject summary
  subjectSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0F0F2',
    marginBottom: 10,
    ...CARD_SHADOW,
  },
  subjectSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectAvgRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  subjectAvgNum: {
    fontFamily: FontFamily.displayBold,
    fontSize: 28,
    color: '#0F172A',
    letterSpacing: -1,
  },
  subjectAvgDenom: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#94A3B8',
  },
  subjectClassAvg: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  subjectProgressWrap: {
    flex: 1,
    marginLeft: 20,
  },
  subjectProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8E8EA',
    overflow: 'hidden',
  },
  subjectProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  subjectTrendText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
  },

  // Grade list
  gradeList: {
    gap: 8,
  },
  gradeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0F0F2',
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  gradeCardExpanded: {
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  gradeCardInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  gradeAccentBar: {
    width: 3,
  },
  gradeCardBody: {
    flex: 1,
    padding: 14,
  },
  gradeCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gradeBadgeBox: {
    width: 44,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F0F0F2',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  gradeBadgeNum: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  gradeBadgeMax: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 10,
    color: '#94A3B8',
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  gradeCardInfo: {
    flex: 1,
  },
  gradeCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gradeCardTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#0F172A',
    flex: 1,
  },
  gradeCardDate: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  coeffBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  coeffBadgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    color: '#64748B',
  },
  gradeExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F2',
  },
  gradeComment: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  gradeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeStat: {
    flex: 1,
    alignItems: 'center',
  },
  gradeStatLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  gradeStatValue: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  gradeStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#F0F0F2',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F2',
    ...CARD_SHADOW,
  },
  emptyText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    color: '#94A3B8',
  },

  // Maternelle
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#F0F0F2',
    ...CARD_SHADOW,
  },
  maternelleStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  maternelleStat: {
    flex: 1,
    alignItems: 'center',
  },
  maternelleStatNum: {
    fontFamily: FontFamily.displayBold,
    fontSize: 32,
    letterSpacing: -1.5,
  },
  maternelleStatLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  maternelleStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#F0F0F2',
  },
  domainDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0F0F2',
    marginBottom: 10,
    ...CARD_SHADOW,
  },
  domainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  domainName: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 2,
  },
  domainScore: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#64748B',
  },
  domainProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8E8EA',
    overflow: 'hidden',
  },
  domainProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  competencyList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0F0F2',
    overflow: 'hidden',
    marginBottom: 10,
    ...CARD_SHADOW,
  },
  competencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  competencyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F6',
  },
  competencyName: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: '#0F172A',
    flex: 1,
  },
  competencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  competencyBadgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
  },
  observationText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 20,
  },
  observationAuthor: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
  },

  // FAB
  fab: {
    backgroundColor: '#7C3AED',
    borderRadius: 28,
    width: 56,
    height: 56,
    position: 'absolute',
    bottom: 80,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
});
