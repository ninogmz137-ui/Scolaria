import { useState, useEffect, useCallback } from 'react';
import { ScrollView, FlatList, Platform } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { useI18n } from '../contexts/I18nContext';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { getSubjects, getGrades } from '../services/database';
import DecorativeBlobs from '../components/DecorativeBlobs';
import { FontFamily } from '../hooks/useSolariaFonts';

const NOTES_BG = '#E8EDF5';
const NOTES_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 6 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
}) as Record<string, any>;

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

const MOCK_SUBJECTS: Subject[] = [
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
    id: 'd1',
    name: 'Mobiliser le langage',
    emoji: '🗣️',
    color: Colors.violet,
    competencies: [
      { id: 'c1', name: 'Communiquer avec les adultes', level: 'acquis' },
      { id: 'c2', name: 'S\'exprimer dans un langage oral', level: 'acquis' },
      { id: 'c3', name: 'Écouter et comprendre une histoire', level: 'en_cours' },
      { id: 'c4', name: 'Reconnaître les lettres de son prénom', level: 'acquis' },
    ],
  },
  {
    id: 'd2',
    name: 'Agir, s\'exprimer, comprendre (activités artistiques)',
    emoji: '🎨',
    color: Colors.pink,
    competencies: [
      { id: 'c5', name: 'Dessiner (bonhomme, maison)', level: 'acquis' },
      { id: 'c6', name: 'Chanter en groupe', level: 'acquis' },
      { id: 'c7', name: 'Explorer différents matériaux', level: 'en_cours' },
    ],
  },
  {
    id: 'd3',
    name: 'Agir, s\'exprimer, comprendre (activités physiques)',
    emoji: '🤸',
    color: Colors.cyan,
    competencies: [
      { id: 'c8', name: 'Courir, sauter, lancer', level: 'acquis' },
      { id: 'c9', name: 'Se déplacer avec aisance', level: 'acquis' },
      { id: 'c10', name: 'Jouer collectivement', level: 'en_cours' },
    ],
  },
  {
    id: 'd4',
    name: 'Construire les premiers outils pour structurer sa pensée',
    emoji: '🔢',
    color: Colors.orange,
    competencies: [
      { id: 'c11', name: 'Compter jusqu\'à 10', level: 'acquis' },
      { id: 'c12', name: 'Reconnaître des formes', level: 'en_cours' },
      { id: 'c13', name: 'Trier et classer des objets', level: 'acquis' },
      { id: 'c14', name: 'Se repérer dans le temps', level: 'a_renforcer' },
    ],
  },
  {
    id: 'd5',
    name: 'Explorer le monde',
    emoji: '🌍',
    color: Colors.green,
    competencies: [
      { id: 'c15', name: 'Connaître les parties du corps', level: 'acquis' },
      { id: 'c16', name: 'Observer le vivant (animaux, plantes)', level: 'en_cours' },
      { id: 'c17', name: 'Utiliser des outils numériques simples', level: 'a_renforcer' },
    ],
  },
];


const FILTER_TABS: { key: FilterTab; labelKey?: string; label?: string }[] = [
  { key: 'all', labelKey: 'grades.all' },
  { key: 'trimestre1', label: 'T1' },
  { key: 'trimestre2', label: 'T2' },
  { key: 'trimestre3', label: 'T3' },
];

// ─── Helper ───────────────────────────────────────────────

const trendIcon = (t: Subject['trend']): keyof typeof Ionicons.glyphMap =>
  t === 'up' ? 'trending-up' : t === 'down' ? 'trending-down' : 'remove';
const trendColor = (t: Subject['trend']) =>
  t === 'up' ? Colors.green : t === 'down' ? Colors.red : Colors.gray;

// ─── Grade mini bar ──────────────────────────────────────

function GradeBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = (value / max) * 100;
  return (
    <Box className="h-1.5 flex-1 overflow-hidden rounded-sm" style={{ backgroundColor: 'rgba(128,128,128,0.15)' }}>
      <Box className="h-full rounded-sm" style={{ width: `${pct}%`, backgroundColor: color }} />
    </Box>
  );
}

// ─── Main screen ─────────────────────────────────────────

export default function NotesScreen() {
  const { t } = useI18n();
  const { mode } = useSchoolMode();
  const { theme } = useChildTheme();
  const { selectedChild } = useActiveChild();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>(MOCK_SUBJECTS);

  const COLOR_PALETTE = [
    Colors.cyan, Colors.violet, Colors.orange, Colors.green,
    Colors.pink, Colors.warmOrange,
  ];

  const FRENCH_MONTHS: Record<string, string> = {
    '01': 'jan', '02': 'fév', '03': 'mars', '04': 'avr',
    '05': 'mai', '06': 'juin', '07': 'juil', '08': 'août',
    '09': 'sep', '10': 'oct', '11': 'nov', '12': 'déc',
  };

  const toFrenchDate = (iso: string): string => {
    const parts = iso.split('-');
    if (parts.length < 3) return iso;
    const day = parseInt(parts[2], 10);
    const month = FRENCH_MONTHS[parts[1]] ?? parts[1];
    return `${day} ${month}`;
  };

  const loadNotes = useCallback(async () => {
    if (!selectedChild?.id) return;
    const childId = selectedChild.id;

    const [subjectsResult, gradesResult] = await Promise.all([
      getSubjects(childId),
      getGrades(childId),
    ]);

    const rawSubjects = subjectsResult.data ?? [];
    const rawGrades = (gradesResult.data ?? []) as {
      id: string;
      subject_id: string;
      value: number;
      max_value?: number;
      class_avg?: number;
      type?: string;
      comment?: string;
      date?: string;
    }[];

    if (rawSubjects.length === 0) {
      setSubjects(MOCK_SUBJECTS);
      return;
    }

    // Group grades by subject_id
    const gradesBySubject: Record<string, typeof rawGrades> = {};
    for (const g of rawGrades) {
      if (!gradesBySubject[g.subject_id]) gradesBySubject[g.subject_id] = [];
      gradesBySubject[g.subject_id].push(g);
    }

    const mapped: Subject[] = rawSubjects.map((sub: { id: string; name: string; emoji?: string; color?: string }, idx: number) => {
      const subGrades = gradesBySubject[sub.id] ?? [];

      const grades: Grade[] = subGrades.map((g) => ({
        id: g.id,
        value: g.value,
        maxValue: g.max_value ?? 20,
        date: g.date ? toFrenchDate(g.date) : '',
        type: g.type ?? 'Contrôle',
        comment: g.comment,
      }));

      const avg =
        grades.length > 0
          ? grades.reduce((s, g) => s + (g.value / g.maxValue) * 20, 0) / grades.length
          : 0;

      const classAvg =
        subGrades.length > 0
          ? subGrades.reduce((s, g) => s + (g.class_avg ?? 0), 0) / subGrades.length
          : 0;

      let trend: Subject['trend'] = 'stable';
      if (grades.length >= 2) {
        const last = (grades[0].value / grades[0].maxValue) * 20;
        const prev = (grades[1].value / grades[1].maxValue) * 20;
        if (last > prev + 0.5) trend = 'up';
        else if (last < prev - 0.5) trend = 'down';
      }

      return {
        id: sub.id,
        name: sub.name,
        emoji: sub.emoji ?? '📚',
        color: sub.color ?? COLOR_PALETTE[idx % COLOR_PALETTE.length],
        grades,
        average: Math.round(avg * 10) / 10,
        classAvg: Math.round(classAvg * 10) / 10,
        trend,
      };
    });

    setSubjects(mapped);
  }, [selectedChild?.id]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const toggleSubject = (id: string) => {
    setExpandedSubject((prev) => (prev === id ? null : id));
  };

  const isMaternelle = mode === 'maternelle';

  const currentSubjects = subjects;
  const childAvatar = selectedChild.avatar;
  const childName = selectedChild.name;
  const childClasse = selectedChild.classe.split(' — ')[0] || selectedChild.classe;

  const currentOverallAvg =
    currentSubjects.reduce((sum, s) => sum + s.average, 0) / currentSubjects.length;
  const currentBestSubject = currentSubjects.reduce((best, s) =>
    s.average > best.average ? s : best,
  );

  // ─── Maternelle view ──────────────────────────────────
  if (isMaternelle) {
    const totalCompetencies = MATERNELLE_DOMAINS.reduce((s, d) => s + d.competencies.length, 0);
    const acquired = MATERNELLE_DOMAINS.reduce(
      (s, d) => s + d.competencies.filter((c) => c.level === 'acquis').length,
      0,
    );
    const inProgress = MATERNELLE_DOMAINS.reduce(
      (s, d) => s + d.competencies.filter((c) => c.level === 'en_cours').length,
      0,
    );

    return (
      <Box className="flex-1" style={{ backgroundColor: NOTES_BG }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#0B1628', theme.accent + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={{ paddingTop: 70, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' }}
        >
          <Text className="text-2xl mb-1" style={{ fontWeight: '900', color: '#FFFFFF' }}>
            Suivi des apprentissages
          </Text>
          <Text className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {childAvatar} {childName} — {childClasse}
          </Text>

          <HStack className="gap-2.5">
            <Box className="flex-1 rounded-xl p-3 items-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
              <Text className="text-xl mb-1" style={{ fontWeight: '900', color: '#FFFFFF' }}>
                🌟 {acquired}
              </Text>
              <Text className="text-[10px] text-center" style={{ fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>
                Acquis
              </Text>
            </Box>
            <Box className="flex-1 rounded-xl p-3 items-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
              <Text className="text-xl mb-1" style={{ fontWeight: '900', color: '#FFFFFF' }}>
                🌱 {inProgress}
              </Text>
              <Text className="text-[10px] text-center" style={{ fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>
                En cours
              </Text>
            </Box>
            <Box className="flex-1 rounded-xl p-3 items-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
              <Text className="text-xl mb-1" style={{ fontWeight: '900', color: '#FFFFFF' }}>
                {totalCompetencies}
              </Text>
              <Text className="text-[10px] text-center" style={{ fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>
                Compétences
              </Text>
            </Box>
          </HStack>
        </LinearGradient>

        <Box className="px-5 pt-4" style={{ position: 'relative' }}>
          <DecorativeBlobs accent={theme.accent} size={90} />
          {/* Progress legend */}
          <HStack className="justify-around py-3 px-2 mb-4" style={{ borderBottomWidth: 1, borderColor: theme.cardBorder }}>
            {Object.entries(COMPETENCY_LEVELS).map(([key, level]) => (
              <HStack key={key} className="items-center gap-1">
                <Text className="text-sm">{level.emoji}</Text>
                <Text className="text-[11px]" style={{ fontWeight: '600', color: theme.textMuted }}>
                  {level.label}
                </Text>
              </HStack>
            ))}
          </HStack>

          {/* Competency domains */}
          {MATERNELLE_DOMAINS.map((domain) => {
            const isExpanded = expandedDomain === domain.id;
            const domainAcquired = domain.competencies.filter((c) => c.level === 'acquis').length;

            return (
              <Box
                key={domain.id}
                className="rounded-2xl mb-3 overflow-hidden"
                style={{ backgroundColor: theme.card, borderWidth: 1.5, borderColor: `${theme.accent}25`, ...NOTES_SHADOW }}
              >
                <Pressable
                  className="flex-row items-center justify-between p-3.5"
                  onPress={() => setExpandedDomain(isExpanded ? null : domain.id)}
                >
                  <HStack className="items-center gap-3 flex-1">
                    <Text className="text-[28px]">{domain.emoji}</Text>
                    <VStack className="flex-1">
                      <Text
                        className="text-[15px] mb-1"
                        style={{ fontWeight: '700', color: theme.textPrimary }}
                        numberOfLines={2}
                      >
                        {domain.name}
                      </Text>
                      <Text className="text-xs" style={{ color: theme.textMuted }}>
                        {domainAcquired}/{domain.competencies.length} acquis
                      </Text>
                    </VStack>
                  </HStack>
                  <VStack className="items-end gap-1">
                    <Text style={{ fontSize: 22, fontWeight: '900', color: domain.color }}>
                      {domainAcquired}/{domain.competencies.length}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={theme.textMuted}
                    />
                  </VStack>
                </Pressable>

                {/* Progress bar */}
                <HStack className="items-center px-3.5 pb-3.5 gap-2">
                  <GradeBar
                    value={domainAcquired}
                    max={domain.competencies.length}
                    color={domain.color}
                  />
                  <Text className="text-[11px]" style={{ fontWeight: '600', color: theme.textMuted }}>
                    {Math.round((domainAcquired / domain.competencies.length) * 100)}%
                  </Text>
                </HStack>

                {/* Expanded competency list */}
                {isExpanded && (
                  <Box style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
                    {domain.competencies.map((comp, i) => {
                      const levelInfo = COMPETENCY_LEVELS[comp.level];
                      return (
                        <HStack
                          key={comp.id}
                          className="items-center justify-between px-3.5 py-3"
                          style={
                            i < domain.competencies.length - 1
                              ? { borderBottomWidth: 1, borderBottomColor: theme.cardBorder }
                              : undefined
                          }
                        >
                          <Box className="flex-1">
                            <Text className="text-sm" style={{ fontWeight: '600', color: theme.textPrimary }}>
                              {comp.name}
                            </Text>
                          </Box>
                          <HStack className="items-center gap-1.5">
                            <Text className="text-lg">{levelInfo.emoji}</Text>
                            <Text className="text-xs" style={{ fontWeight: '700', color: levelInfo.color }}>
                              {levelInfo.label}
                            </Text>
                          </HStack>
                        </HStack>
                      );
                    })}
                  </Box>
                )}
              </Box>
            );
          })}

          {/* Observation enseignante */}
          <Box className="mt-6 mb-4">
            <Text className="text-lg mb-3.5" style={{ fontWeight: '700', color: theme.textPrimary }}>
              Observation de la maîtresse
            </Text>
            <Box
              className="rounded-2xl p-4"
              style={{ backgroundColor: theme.card, borderWidth: 1.5, borderColor: `${theme.accent}25`, ...NOTES_SHADOW }}
            >
              <Text className="text-[28px] mb-2">👩‍🏫</Text>
              <Text className="text-sm leading-[22px]" style={{ color: theme.textSecondary }}>
                « {childName} est une élève curieuse et sociable. Elle progresse bien dans le langage oral et adore les activités artistiques. Elle commence à s'intéresser aux chiffres et aux lettres. Un beau trimestre ! »
              </Text>
              <Text className="text-[11px] mt-2" style={{ fontWeight: '600', color: theme.textMuted }}>
                Mme Laurent — Mars 2026
              </Text>
            </Box>
          </Box>

          <Box className="h-10" />
        </Box>
      </ScrollView>
      </Box>
    );
  }

  // ─── Primaire / Lycée view (grades) ───────────────────
  return (
    <Box className="flex-1" style={{ backgroundColor: NOTES_BG }}>
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* Overview header — dark gradient */}
      <LinearGradient
        colors={['#0B1628', theme.accent + 'CC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={{ paddingTop: 70, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' }}
      >
        <Text className="text-2xl mb-1" style={{ fontWeight: '900', color: '#FFFFFF' }}>
          Notes & Résultats
        </Text>
        <Text className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {childAvatar} {childName} — {childClasse}
        </Text>

        {/* Summary cards — glass-style inside header */}
        <HStack className="gap-2.5">
          <Box className="flex-1 rounded-xl p-3 items-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
            <Text className="text-xl mb-1" style={{ fontWeight: '900', color: '#FFFFFF' }}>
              {currentOverallAvg.toFixed(1)}
            </Text>
            <Text className="text-[10px] text-center" style={{ fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>
              Moyenne générale
            </Text>
          </Box>
          <Box className="flex-1 rounded-xl p-3 items-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
            <Text className="text-xl mb-1" style={{ fontWeight: '900', color: '#FFFFFF' }}>
              {currentBestSubject.emoji} {currentBestSubject.average}
            </Text>
            <Text className="text-[10px] text-center" style={{ fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>
              Meilleure matière
            </Text>
          </Box>
          <Box className="flex-1 rounded-xl p-3 items-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
            <Text className="text-xl mb-1" style={{ fontWeight: '900', color: '#FFFFFF' }}>
              {currentSubjects.reduce((s, sub) => s + sub.grades.length, 0)}
            </Text>
            <Text className="text-[10px] text-center" style={{ fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>
              Notes total
            </Text>
          </Box>
        </HStack>
      </LinearGradient>

      <Box className="px-5 pt-4" style={{ position: 'relative' }}>
        <DecorativeBlobs accent={theme.accent} size={90} />
        {/* Filter tabs */}
        <HStack className="items-center gap-2 mb-5">
          {FILTER_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              className="px-4 py-2 rounded-full"
              style={{
                backgroundColor: filter === tab.key ? theme.accent : theme.card,
                borderWidth: 1,
                borderColor: theme.cardBorder,
              }}
              onPress={() => setFilter(tab.key)}
            >
              <Text
                className="text-[13px]"
                style={{
                  fontWeight: '600',
                  color: filter === tab.key ? Colors.white : theme.textMuted,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}

          {/* Scanner shortcut */}
          <Pressable
            className="ml-auto w-[38px] h-[38px] rounded-full justify-center items-center"
            style={{ backgroundColor: 'rgba(34,211,238,0.1)' }}
            onPress={() => navigation.navigate('ScannerBulletin')}
          >
            <Ionicons name="scan" size={18} color={theme.accent} />
          </Pressable>
        </HStack>

        {/* Subject list */}
        {currentSubjects.map((subject) => {
          const isExpanded = expandedSubject === subject.id;
          const diff = subject.average - subject.classAvg;

          return (
            <Box
              key={subject.id}
              className="rounded-2xl mb-3 overflow-hidden"
              style={{ backgroundColor: theme.card, borderWidth: 1.5, borderColor: `${theme.accent}25`, ...NOTES_SHADOW }}
            >
              {/* Subject header row */}
              <Pressable
                className="flex-row items-center justify-between p-3.5"
                onPress={() => toggleSubject(subject.id)}
              >
                <HStack className="items-center gap-3 flex-1">
                  <Text className="text-[28px]">{subject.emoji}</Text>
                  <VStack className="flex-1">
                    <Text className="text-[15px] mb-1" style={{ fontWeight: '700', color: theme.textPrimary }}>
                      {subject.name}
                    </Text>
                    <HStack className="items-center gap-2">
                      <Text className="text-xs" style={{ color: theme.textMuted }}>
                        Classe : {subject.classAvg}
                      </Text>
                      <Box
                        className="px-1.5 py-0.5 rounded-lg"
                        style={{
                          backgroundColor:
                            diff >= 0
                              ? 'rgba(52,211,153,0.12)'
                              : 'rgba(248,113,113,0.12)',
                        }}
                      >
                        <Text
                          className="text-[11px]"
                          style={{ fontWeight: '700', color: diff >= 0 ? Colors.green : Colors.red }}
                        >
                          {diff >= 0 ? '+' : ''}
                          {diff.toFixed(1)}
                        </Text>
                      </Box>
                    </HStack>
                  </VStack>
                </HStack>

                <VStack className="items-end gap-1">
                  <Text className="text-2xl" style={{ fontWeight: '900', color: subject.color }}>
                    {subject.average.toFixed(1)}
                  </Text>
                  <HStack className="items-center">
                    <Ionicons
                      name={trendIcon(subject.trend)}
                      size={14}
                      color={trendColor(subject.trend)}
                    />
                  </HStack>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={theme.textMuted}
                  />
                </VStack>
              </Pressable>

              {/* Average bar */}
              <HStack className="items-center px-3.5 pb-3.5 gap-2">
                <GradeBar value={subject.average} max={20} color={subject.color} />
                <Text className="text-[11px]" style={{ fontWeight: '600', color: theme.textMuted }}>
                  /20
                </Text>
              </HStack>

              {/* Expanded grade list */}
              {isExpanded && (
                <Box style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
                  {subject.grades.map((grade, i) => {
                    const ratio = grade.value / grade.maxValue;
                    const gradeColor =
                      ratio >= 0.75
                        ? Colors.green
                        : ratio >= 0.5
                        ? Colors.orange
                        : Colors.red;

                    return (
                      <HStack
                        key={grade.id}
                        className="items-center justify-between px-3.5 py-3"
                        style={
                          i < subject.grades.length - 1
                            ? { borderBottomWidth: 1, borderBottomColor: theme.cardBorder }
                            : undefined
                        }
                      >
                        <Box className="flex-1">
                          <VStack>
                            <Text className="text-[13px]" style={{ fontWeight: '600', color: theme.textSecondary }}>
                              {grade.date}
                            </Text>
                            <Text className="text-[11px] mt-0.5" style={{ color: theme.textMuted }}>
                              {grade.type}
                            </Text>
                          </VStack>
                        </Box>
                        <HStack className="items-baseline">
                          <Text className="text-xl" style={{ fontWeight: '800', color: gradeColor }}>
                            {grade.value}
                          </Text>
                          <Text className="text-[13px]" style={{ fontWeight: '600', color: theme.textMuted }}>
                            /{grade.maxValue}
                          </Text>
                        </HStack>
                      </HStack>
                    );
                  })}

                  {/* Average summary within expanded */}
                  <Box className="p-3 items-center" style={{ backgroundColor: 'rgba(109,40,217,0.08)' }}>
                    <Text className="text-[13px]" style={{ fontWeight: '700', color: Colors.violetLight }}>
                      Moyenne : {subject.average.toFixed(1)}/20
                    </Text>
                    <Text className="text-[11px] mt-0.5" style={{ color: theme.textMuted }}>
                      {subject.grades.length} évaluations ce trimestre
                    </Text>
                  </Box>
                </Box>
              )}
            </Box>
          );
        })}

        {/* Recent grades timeline */}
        <Box className="mt-6 mb-4">
          <Text className="text-lg mb-3.5" style={{ fontWeight: '700', color: theme.textPrimary }}>
            Dernières notes
          </Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={currentSubjects.flatMap((s) =>
              s.grades.slice(0, 1).map((g) => ({ ...g, subject: s.name, emoji: s.emoji, color: s.color })),
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => {
              const ratio = item.value / item.maxValue;
              const gradeColor =
                ratio >= 0.75 ? Colors.green : ratio >= 0.5 ? Colors.orange : Colors.red;

              return (
                <Box
                  className="w-[110px] rounded-xl p-3 items-center"
                  style={{ backgroundColor: theme.card, borderWidth: 1.5, borderColor: `${theme.accent}25`, ...NOTES_SHADOW }}
                >
                  <Text className="text-2xl mb-1.5">{item.emoji}</Text>
                  <Text className="text-lg mb-1" style={{ fontWeight: '900', color: gradeColor }}>
                    {item.value}/{item.maxValue}
                  </Text>
                  <Text
                    className="text-[11px] mb-0.5"
                    style={{ fontWeight: '600', color: theme.textSecondary }}
                    numberOfLines={1}
                  >
                    {item.subject}
                  </Text>
                  <Text className="text-[10px]" style={{ color: theme.textMuted }}>
                    {item.date}
                  </Text>
                  <Text className="text-[10px] italic mt-0.5" style={{ color: theme.textMuted }}>
                    {item.type}
                  </Text>
                </Box>
              );
            }}
          />
        </Box>

        {/* Import bulletin CTA */}
        <Pressable
          className="rounded-2xl overflow-hidden mt-2"
          onPress={() => navigation.navigate('ScannerBulletin')}
        >
          <LinearGradient
            colors={[Colors.violet, Colors.violetDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 }}
          >
            <Ionicons name="scan" size={22} color={Colors.white} />
            <VStack className="flex-1">
              <Text className="text-base" style={{ fontWeight: '700', color: Colors.white }}>
                Importer un bulletin
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Scanner ou importer un PDF
              </Text>
            </VStack>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
        </Pressable>

        <Box className="h-10" />
      </Box>
    </ScrollView>
    </Box>
  );
}
