/**
 * NotesScreen — Single scroll, validated mockup (glass, neutral scores, Barlow + DM Sans).
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  Platform,
  UIManager,
  LayoutAnimation,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Animated,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Stop,
} from 'react-native-svg';
import {
  ScanLine,
  Check,
  Camera,
  Image as LucideImage,
  FileText,
  CalendarDays,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSchoolMode, getSchoolModeFromBirthDate } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useDemoData } from '../contexts/DemoContext';
import { useWallpaper } from '../contexts/WallpaperContext';
import { getSubjects, getGrades } from '../services/database';
import { FontFamily } from '../hooks/useSolariaFonts';
import { FLOATING_TAB_BAR_HEIGHT, TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';
import { SCREEN_BACKGROUND } from '../constants/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Palette (mockup + violet polish) ─────────────────────

const C = {
  ink: '#1A2340',
  violet: '#7C3AED',
  cyan: '#06B6D4',
  violetDeep: '#5B21B6',
  label: '#9ca3af',
  labelUpper: '#6b7280',
  meta: '#c4b5fd',
  body: '#374151',
  glassBg: 'rgba(255,255,255,0.7)',
  glassBorder: 'rgba(255,255,255,0.9)',
  liquidBtn: 'rgba(255,255,255,0.6)',
  liquidBorder: 'rgba(255,255,255,0.8)',
  rowSep: 'rgba(124,58,237,0.06)',
  track: 'rgba(0,0,0,0.06)',
};

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
  /** 1–3 from source data; used when grouping “Année” by trimestre */
  trimester?: number;
  /** ISO date when available — for tri “dernière note” annuelle */
  sortDate?: string;
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

type CompetencyLevel = 'acquis' | 'en_cours' | 'non_travaille';

interface Competency {
  id: string;
  name: string;
  level: CompetencyLevel;
}

interface CompetencyDomain {
  id: string;
  name: string;
  competencies: Competency[];
}

interface DemoNotesProfile {
  childId: string;
  overallAverage: number;
  overallTrend: number;
  graph: number[];
  /** Moyennes par trimestre (démo) pour vue Année */
  trimAverages: [number, number, number];
  yearOverallAverage: number;
  lastNote: { value: number; max: number; label: string; date: string };
  strong: { label: string; score: string };
  weak: { label: string; score: string };
  observation: string;
  subjectOrder: string[];
  emmaMathNotes?: Grade[];
  lucasFrNotes?: Grade[];
}

// ─── Constants ────────────────────────────────────────────

const TRIMESTER_OPTIONS: { label: string; value: string; number?: number }[] = [
  { label: 'T1', value: 'T1', number: 1 },
  { label: 'T2', value: 'T2', number: 2 },
  { label: 'T3', value: 'T3', number: 3 },
  { label: 'Année', value: 'ANNEE' },
];

function getCurrentTrimester(): string {
  const month = new Date().getMonth();
  if (month >= 8 && month <= 10) return 'T1';
  if (month >= 11 || month <= 1) return 'T2';
  return 'T3';
}

const COLOR_PALETTE = ['#4A90D9', '#7C3AED', '#F59E0B', '#10B981', '#EC4899', '#EF4444'];

/** Wallpaper visible only behind the top area — clipped; scroll body uses SCREEN_BACKGROUND. */
const NOTES_WALLPAPER_HEADER_HEIGHT = Math.min(Dimensions.get('window').height * 0.42, 380);

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

const MOCK_SUBJECTS: Subject[] = [
  {
    id: '1', name: 'Mathématiques', emoji: '📐', color: '#4A90D9',
    average: 15.5, classAvg: 12.3, trend: 'up',
    grades: [
      { id: 'g1', value: 17, maxValue: 20, date: '15 mars', type: 'Contrôle', coefficient: 2 },
      { id: 'g2', value: 14, maxValue: 20, date: '8 mars', type: 'Devoir maison', coefficient: 1 },
    ],
  },
  {
    id: '2', name: 'Français', emoji: '📖', color: '#7C3AED',
    average: 14.0, classAvg: 13.1, trend: 'stable',
    grades: [
      { id: 'g5', value: 15, maxValue: 20, date: '14 mars', type: 'Rédaction', coefficient: 1 },
    ],
  },
];

function buildYearCurveFromTrims(t1: number, t2: number, t3: number): number[] {
  return [
    t1,
    t1 + (t2 - t1) * (1 / 3),
    t1 + (t2 - t1) * (2 / 3),
    t2,
    t2 + (t3 - t2) * (1 / 3),
    t2 + (t3 - t2) * (2 / 3),
    t3,
    Math.round((t3 + 0.05) * 10) / 10,
  ];
}

const DEMO_PROFILES: Record<string, DemoNotesProfile> = {
  'demo-emma': {
    childId: 'demo-emma',
    overallAverage: 14.2,
    overallTrend: 0.3,
    trimAverages: [13.1, 13.8, 14.2],
    yearOverallAverage: 13.7,
    graph: [12.8, 13.1, 13.6, 14.0, 14.1, 14.2],
    lastNote: { value: 14, max: 20, label: "Géométrie dans l'espace", date: '12 mars' },
    strong: { label: 'Anglais', score: '16/20' },
    weak: { label: 'Physique-Chimie', score: '11.5/20' },
    observation:
      "Emma progresse bien en algèbre. Les fractions restent un point à consolider avant le brevet.",
    subjectOrder: ['Mathématiques', 'Français', 'Histoire-Géo', 'Anglais', 'Physique-Chimie', 'SVT'],
    emmaMathNotes: [
      {
        id: 'e1',
        value: 14,
        maxValue: 20,
        date: '12 mars',
        type: "Géométrie dans l'espace",
        coefficient: 2,
        sortDate: '2026-03-12',
        trimester: 3,
      },
      {
        id: 'e2',
        value: 12,
        maxValue: 20,
        date: '28 fév',
        type: 'Fractions avancées',
        coefficient: 1,
        sortDate: '2026-02-28',
        trimester: 3,
      },
      {
        id: 'e3',
        value: 15,
        maxValue: 20,
        date: '14 fév',
        type: 'Statistiques',
        coefficient: 1,
        sortDate: '2026-02-14',
        trimester: 3,
      },
    ],
  },
  'demo-lucas': {
    childId: 'demo-lucas',
    overallAverage: 13.8,
    overallTrend: 0.5,
    trimAverages: [12.8, 13.3, 13.8],
    yearOverallAverage: 13.3,
    graph: [12.9, 13.2, 13.5, 13.6, 13.7, 13.8],
    lastNote: { value: 15, max: 20, label: 'Dictée', date: '7 avril' },
    strong: { label: 'Lecture', score: '16/20' },
    weak: { label: 'Mathématiques', score: '11/20' },
    observation:
      'Lucas fait de beaux progrès en expression écrite. Il doit consolider ses tables de multiplication.',
    subjectOrder: ['Français', 'Mathématiques', 'Sciences', 'Histoire-Géo'],
    lucasFrNotes: [
      {
        id: 'l1',
        value: 15,
        maxValue: 20,
        date: '7 avril',
        type: 'Dictée',
        coefficient: 1,
        sortDate: '2026-04-07',
        trimester: 3,
      },
      {
        id: 'l2',
        value: 16,
        maxValue: 20,
        date: '24 mars',
        type: 'Rédaction — La forêt',
        coefficient: 2,
        sortDate: '2026-03-24',
        trimester: 3,
      },
      {
        id: 'l3',
        value: 13,
        maxValue: 20,
        date: '10 mars',
        type: 'Lecture à voix haute',
        coefficient: 1,
        sortDate: '2026-03-10',
        trimester: 3,
      },
    ],
  },
};

/** 17 compétences · 10 acquis · 5 en cours · 2 non travaillés — 4 domaines (pilules) */
const LE_DOMAINS: CompetencyDomain[] = [
  {
    id: 'd1',
    name: 'Mobiliser le langage',
    competencies: [
      { id: 'c1', name: 'Communiquer avec les adultes', level: 'acquis' },
      { id: 'c2', name: "S'exprimer en langage oral", level: 'acquis' },
      { id: 'c3', name: 'Écouter et comprendre une histoire', level: 'en_cours' },
      { id: 'c4', name: 'Reconnaître les lettres de son prénom', level: 'acquis' },
      { id: 'c5', name: 'Identifier des écrits du quotidien', level: 'acquis' },
      { id: 'c6', name: 'Écrire son prénom en majuscules', level: 'en_cours' },
      { id: 'c7', name: 'Copier des mots simples', level: 'non_travaille' },
    ],
  },
  {
    id: 'd2',
    name: 'Activités artistiques',
    competencies: [
      { id: 'c8', name: 'Dessiner et représenter', level: 'acquis' },
      { id: 'c9', name: 'Chanter et rythmer', level: 'en_cours' },
      { id: 'c10', name: 'Explorer différents matériaux', level: 'acquis' },
    ],
  },
  {
    id: 'd3',
    name: 'Agir dans le monde',
    competencies: [
      { id: 'c11', name: 'Respecter les règles de la classe', level: 'acquis' },
      { id: 'c12', name: 'Participer aux routines', level: 'en_cours' },
      { id: 'c13', name: 'Partager le matériel', level: 'acquis' },
    ],
  },
  {
    id: 'd4',
    name: 'Explorer le monde',
    competencies: [
      { id: 'c14', name: 'Observer le vivant', level: 'acquis' },
      { id: 'c15', name: 'Se repérer dans l’espace', level: 'acquis' },
      { id: 'c16', name: 'Expérimenter avec l’eau', level: 'en_cours' },
      { id: 'c17', name: 'Nommer les saisons', level: 'non_travaille' },
    ],
  },
];

const LE_OBSERVATION =
  "Léa est une élève curieuse et sociable. Elle progresse bien en langage oral et adore les activités artistiques. Un beau trimestre !";

const LE_ANNEE_COMPARE = 'T1 : 8 acquis → T2 : 9 → T3 : 10';

const GRAPH_MONTHS = ['Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr'];
const GRAPH_MONTHS_YEAR = ['Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];

function parseGradeDateLoose(d: string): number {
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return new Date(d).getTime();
  return 0;
}

function gradeSortTime(g: Grade): number {
  if (g.sortDate && /^\d{4}-\d{2}-\d{2}/.test(g.sortDate)) return new Date(g.sortDate).getTime();
  return parseGradeDateLoose(g.date);
}

function avgArr(a: number[]): number {
  if (a.length === 0) return 0;
  return a.reduce((x, y) => x + y, 0) / a.length;
}

function groupGradesByTrimester(grades: Grade[]): { trim: number; grades: Grade[] }[] {
  const m: Record<number, Grade[]> = { 1: [], 2: [], 3: [] };
  for (const g of grades) {
    const tr = g.trimester != null && g.trimester >= 1 && g.trimester <= 3 ? g.trimester : 1;
    m[tr].push(g);
  }
  return ([1, 2, 3] as const)
    .map((trim) => ({
      trim,
      grades: [...m[trim]].sort((a, b) => gradeSortTime(b) - gradeSortTime(a)),
    }))
    .filter((x) => x.grades.length > 0);
}

function trimesterPillLabel(v: string): string {
  return v === 'ANNEE' ? 'Année' : v;
}

/** Point fort / À renforcer: plain subject name only (strip emoji / pictographs). */
function subjectNamePlain(raw: string): string {
  return raw
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\uFE0F\u200D]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function BulletinImportSheet({
  visible,
  onClose,
  bottomInset,
}: {
  visible: boolean;
  onClose: () => void;
  bottomInset: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const dismissSheet = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      onClose();
    });
  }, [onClose, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 72 || g.vy > 0.4) {
            dismissSheet();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              friction: 9,
            }).start();
          }
        },
      }),
    [dismissSheet, translateY],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.bulletinModalRoot}>
        <Pressable style={styles.bulletinBackdrop} onPress={onClose} accessibilityRole="button" />
        <Animated.View
          style={[
            styles.bulletinSheet,
            {
              paddingBottom: 12 + bottomInset,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.bulletinHandle} />
          <Text style={styles.bulletinSheetTitle}>Importer un bulletin</Text>
          <View style={styles.bulletinDivider} />

          <Pressable
            style={styles.bulletinRow}
            onPress={() => {
              if (__DEV__) console.log('bulletin: prendre en photo');
              Alert.alert('Démo', 'Prendre en photo');
            }}
          >
            <View style={[styles.bulletinIconWrap, { backgroundColor: 'rgba(124,58,237,0.08)' }]}>
              <Camera size={22} color="#7C3AED" strokeWidth={1.8} />
            </View>
            <View style={styles.bulletinRowText}>
              <Text style={styles.bulletinRowTitle}>Prendre en photo</Text>
              <Text style={styles.bulletinRowSub}>Photographiez le bulletin avec votre caméra</Text>
            </View>
            <Text style={styles.bulletinChev}>›</Text>
          </Pressable>
          <View style={styles.bulletinRowSep} />

          <Pressable
            style={styles.bulletinRow}
            onPress={() => {
              if (__DEV__) console.log('bulletin: galerie');
              Alert.alert('Démo', 'Depuis la galerie');
            }}
          >
            <View style={[styles.bulletinIconWrap, { backgroundColor: 'rgba(6,182,212,0.08)' }]}>
              <LucideImage size={22} color="#06B6D4" strokeWidth={1.8} />
            </View>
            <View style={styles.bulletinRowText}>
              <Text style={styles.bulletinRowTitle}>Depuis la galerie</Text>
              <Text style={styles.bulletinRowSub}>Sélectionnez une image ou capture ENT</Text>
            </View>
            <Text style={styles.bulletinChev}>›</Text>
          </Pressable>
          <View style={styles.bulletinRowSep} />

          <Pressable
            style={styles.bulletinRow}
            onPress={() => {
              if (__DEV__) console.log('bulletin: PDF');
              Alert.alert('Démo', 'Importer un PDF');
            }}
          >
            <View style={[styles.bulletinIconWrap, { backgroundColor: 'rgba(26,35,64,0.06)' }]}>
              <FileText size={22} color="#1A2340" strokeWidth={1.8} />
            </View>
            <View style={styles.bulletinRowText}>
              <Text style={styles.bulletinRowTitle}>Importer un PDF</Text>
              <Text style={styles.bulletinRowSub}>Bulletin téléchargé depuis l'ENT</Text>
            </View>
            <Text style={styles.bulletinChev}>›</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Liquid glass + cards ─────────────────────────────────

function LiquidGlass({
  children,
  style,
  circle,
}: {
  children: React.ReactNode;
  style?: object;
  circle?: boolean;
}) {
  return (
    <View
      style={[
        {
          borderRadius: circle ? 17 : 17,
          borderWidth: 1,
          borderColor: C.liquidBorder,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : C.liquidBtn,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill} />
      ) : null}
      {children}
    </View>
  );
}

function GlassPanel({
  children,
  style,
  smallRadius,
}: {
  children: React.ReactNode;
  style?: object;
  smallRadius?: boolean;
}) {
  const r = smallRadius ? 16 : 20;
  return (
    <View
      style={[
        {
          borderRadius: r,
          borderWidth: 1,
          borderColor: C.glassBorder,
          backgroundColor: C.glassBg,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 2,
        },
        style,
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={12} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: r }]} />
      ) : null}
      {children}
    </View>
  );
}

// ─── Graph ────────────────────────────────────────────────

function ProgressionGraph({
  data,
  width,
  height,
  gradKey,
}: {
  data: number[];
  width: number;
  height: number;
  gradKey: string;
}) {
  const padTop = 6;
  const padBottom = 4;
  const padLeft = 4;
  const padRight = 4;

  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const minVal = Math.min(...data) - 1;
  const maxVal = Math.max(...data) + 1;
  const range = maxVal - minVal || 1;

  const n = data.length;
  const points = data.map((v, i) => ({
    x: padLeft + (n <= 1 ? 0 : i / (n - 1)) * innerW,
    y: padTop + (1 - (v - minVal) / range) * innerH,
  }));

  function buildPath(): string {
    if (points.length < 2) return points.length === 1 ? `M ${points[0].x} ${points[0].y}` : '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }

  function buildFillPath(): string {
    const linePath = buildPath();
    if (!linePath) return '';
    const last = points[points.length - 1];
    const first = points[0];
    return `${linePath} L ${last.x} ${height - padBottom} L ${first.x} ${height - padBottom} Z`;
  }

  const lastPt = points[points.length - 1];
  const safeKey = gradKey.replace(/[^a-zA-Z0-9_-]/g, '');
  const fillId = `notesFill-${safeKey}`;
  const lineId = `notesLine-${safeKey}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgLinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.violet} stopOpacity={0.12} />
          <Stop offset="1" stopColor={C.violet} stopOpacity={0} />
        </SvgLinearGradient>
        <SvgLinearGradient id={lineId} x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor={C.violet} />
          <Stop offset="1" stopColor={C.cyan} />
        </SvgLinearGradient>
      </Defs>
      <Path d={buildFillPath()} fill={`url(#${fillId})`} />
      <Path
        d={buildPath()}
        fill="none"
        stroke={`url(#${lineId})`}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={lastPt.x} cy={lastPt.y} r={4.5} fill={C.cyan} fillOpacity={0.4} />
      <Circle cx={lastPt.x} cy={lastPt.y} r={2} fill={C.cyan} />
    </Svg>
  );
}

function GraphCardHalo({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ position: 'relative', overflow: 'hidden', borderRadius: 20 }}>
      <Svg
        width={120}
        height={120}
        style={{ position: 'absolute', top: -24, right: -24 }}
        pointerEvents="none"
      >
        <Defs>
          <SvgRadialGradient id="graphHaloRad" cx="60" cy="60" r="60" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={C.violet} stopOpacity={0.08} />
            <Stop offset="0.7" stopColor={C.violet} stopOpacity={0} />
            <Stop offset="1" stopColor={C.violet} stopOpacity={0} />
          </SvgRadialGradient>
        </Defs>
        <Circle cx={60} cy={60} r={60} fill="url(#graphHaloRad)" />
      </Svg>
      {children}
    </View>
  );
}

function GradientTrack({
  height,
  pct,
  radius = 2,
}: {
  height: number;
  pct: number;
  radius?: number;
}) {
  const w = Math.min(100, Math.max(0, pct));
  return (
    <View style={{ height, borderRadius: radius, backgroundColor: C.track, overflow: 'hidden' }}>
      <LinearGradient
        colors={[C.violet, C.cyan]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height, width: `${w}%` as const, borderRadius: radius }}
      />
    </View>
  );
}

// ─── Competency dot ───────────────────────────────────────

function CompetencyDot({ level }: { level: CompetencyLevel }) {
  const size = 12;
  if (level === 'acquis') {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
        <LinearGradient
          colors={[C.violet, C.violetDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    );
  }
  if (level === 'en_cours') {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={[C.violet, 'rgba(124,58,237,0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: 'rgba(124,58,237,0.2)',
        backgroundColor: 'rgba(124,58,237,0.1)',
      }}
    />
  );
}

// ─── Main ─────────────────────────────────────────────────

export default function NotesScreen() {
  useChildTheme();
  const { selectedChild } = useActiveChild();
  const { mode } = useSchoolMode();
  const { wallpaperSource } = useWallpaper();
  const { isDemoMode, getSubjects: getDemoSubjects, getGrades: getDemoGrades } = useDemoData();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [subjects, setSubjects] = useState<Subject[]>(MOCK_SUBJECTS);
  const [selectedSubjectIdx, setSelectedSubjectIdx] = useState(0);
  const [selectedDomainIdx, setSelectedDomainIdx] = useState(0);
  const [selectedTrimester, setSelectedTrimester] = useState<string>(getCurrentTrimester());
  const [showTrimesterPicker, setShowTrimesterPicker] = useState(false);
  const [showBulletinImport, setShowBulletinImport] = useState(false);
  const [yearMeta, setYearMeta] = useState<{
    trimAvgs: [number, number, number];
    overall: number;
  } | null>(null);

  const isAnnee = selectedTrimester === 'ANNEE';

  const screenW = Dimensions.get('window').width;
  const graphW = screenW - 36;
  const GRAPH_H = 70;

  const schoolMode = selectedChild?.birthDate
    ? getSchoolModeFromBirthDate(selectedChild.birthDate)
    : mode;

  const isMaternelle = schoolMode === 'maternelle';

  const demoProfile = selectedChild?.id ? DEMO_PROFILES[selectedChild.id] : undefined;

  const loadNotes = useCallback(async () => {
    if (!selectedChild?.id) return;

    const yearView = selectedTrimester === 'ANNEE';
    const trimNum = yearView ? undefined : selectedTrimester === 'T1' ? 1 : selectedTrimester === 'T2' ? 2 : 3;

    if (isDemoMode) {
      const demoSubs = getDemoSubjects(selectedChild.id);
      const demoGradesList = getDemoGrades(selectedChild.id, trimNum);

      if (demoSubs.length > 0) {
        const gradesBySub: Record<string, typeof demoGradesList> = {};
        for (const g of demoGradesList) {
          if (!gradesBySub[g.subjectId]) gradesBySub[g.subjectId] = [];
          gradesBySub[g.subjectId].push(g);
        }

        let mapped: Subject[] = demoSubs.map((sub, idx) => {
          const subGrades = gradesBySub[sub.id] ?? [];
          const grades: Grade[] = subGrades.map((g) => ({
            id: g.id,
            value: g.value,
            maxValue: g.outOf,
            date: toFrenchDate(g.date),
            type: g.title,
            coefficient: g.coefficient,
            comment: g.comment || undefined,
            trimester: g.trimester,
            sortDate: g.date,
          }));
          const avg =
            sub.average ??
            (grades.length > 0
              ? grades.reduce((s, g) => s + (g.value / g.maxValue) * 20, 0) / grades.length
              : 0);
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

        const prof = DEMO_PROFILES[selectedChild.id];
        if (prof?.subjectOrder) {
          const order = prof.subjectOrder;
          mapped = mapped
            .filter((s) => order.includes(s.name))
            .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
        }

        if (!yearView && selectedChild.id === 'demo-emma' && prof?.emmaMathNotes) {
          mapped = mapped.map((s) => {
            if (s.name === 'Mathématiques') {
              return {
                ...s,
                average: 13.5,
                trend: 'up' as const,
                grades: prof.emmaMathNotes!.map((g) => ({ ...g })),
              };
            }
            if (s.name === 'Anglais') return { ...s, average: 16 };
            if (s.name === 'Physique-Chimie') return { ...s, average: 11.5 };
            return s;
          });
        }

        if (!yearView && selectedChild.id === 'demo-lucas' && prof?.lucasFrNotes) {
          mapped = mapped.map((s) => {
            if (s.name === 'Français') {
              return {
                ...s,
                average: 14.5,
                trend: 'up' as const,
                grades: prof.lucasFrNotes!.map((g) => ({ ...g })),
              };
            }
            if (s.name === 'Mathématiques') return { ...s, average: 11 };
            return s;
          });
        }

        setYearMeta(null);
        setSubjects(mapped);
        return;
      }
      setYearMeta(null);
      setSubjects(MOCK_SUBJECTS);
      return;
    }

    const [subjectsResult, gradesResult] = await Promise.all([
      getSubjects(selectedChild.id),
      getGrades(selectedChild.id),
    ]);
    const rawSubjects = subjectsResult.data ?? [];
    let rawGrades = (gradesResult.data ?? []) as any[];
    if (rawSubjects.length === 0) {
      setYearMeta(null);
      setSubjects(MOCK_SUBJECTS);
      return;
    }

    if (!yearView) {
      rawGrades = rawGrades.filter((g: any) => {
        const tr = g.trimester ?? g.trimestre;
        if (tr == null) return true;
        return tr === trimNum;
      });
    }

    const gradesBySubject: Record<string, any[]> = {};
    for (const g of rawGrades) {
      if (!gradesBySubject[g.subject_id]) gradesBySubject[g.subject_id] = [];
      gradesBySubject[g.subject_id].push(g);
    }

    if (yearView && rawGrades.length > 0) {
      const buckets: Record<number, number[]> = { 1: [], 2: [], 3: [] };
      for (const g of rawGrades) {
        const tr = g.trimester ?? g.trimestre ?? 1;
        const t = tr >= 1 && tr <= 3 ? tr : 1;
        const maxV = g.max_value ?? 20;
        buckets[t].push((g.value / maxV) * 20);
      }
      const ta: [number, number, number] = [
        Math.round(avgArr(buckets[1]) * 10) / 10,
        Math.round(avgArr(buckets[2]) * 10) / 10,
        Math.round(avgArr(buckets[3]) * 10) / 10,
      ];
      const overallY = Math.round(((ta[0] + ta[1] + ta[2]) / 3) * 10) / 10;
      setYearMeta({ trimAvgs: ta, overall: overallY });
    } else {
      setYearMeta(null);
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
        trimester: g.trimester ?? g.trimestre ?? undefined,
        sortDate: typeof g.date === 'string' ? g.date : undefined,
      }));
      const avg =
        grades.length > 0
          ? grades.reduce((s, g) => s + (g.value / g.maxValue) * 20, 0) / grades.length
          : 0;
      const classAvg = subGrades.reduce((s: number, g: any) => s + (g.class_avg ?? 0), 0) / (subGrades.length || 1);
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
  }, [selectedChild?.id, isDemoMode, getDemoSubjects, getDemoGrades, selectedTrimester]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    setSelectedSubjectIdx(0);
    setSelectedDomainIdx(0);
  }, [selectedChild?.id, selectedTrimester]);

  const trimesterDelta = isAnnee
    ? 0
    : selectedTrimester === 'T1'
      ? -0.4
      : selectedTrimester === 'T2'
        ? -0.2
        : 0;

  const overallAvg = useMemo(() => {
    if (isAnnee && demoProfile && isDemoMode) {
      return demoProfile.yearOverallAverage;
    }
    if (isAnnee && !isDemoMode && yearMeta) {
      return yearMeta.overall;
    }
    if (demoProfile && isDemoMode) {
      return Math.round((demoProfile.overallAverage + trimesterDelta) * 10) / 10;
    }
    if (subjects.length === 0) return 0;
    return subjects.reduce((s, sub) => s + sub.average, 0) / subjects.length;
  }, [subjects, demoProfile, isDemoMode, trimesterDelta, isAnnee, yearMeta]);

  const overallTrendNum = useMemo(() => {
    if (isAnnee && demoProfile && isDemoMode) {
      const [a, , c] = demoProfile.trimAverages;
      return Math.round(((c - a) / 2) * 10) / 10;
    }
    if (isAnnee && !isDemoMode && yearMeta) {
      const [a, , c] = yearMeta.trimAvgs;
      return Math.round(((c - a) / 2) * 10) / 10;
    }
    if (demoProfile && isDemoMode) {
      const base = demoProfile.overallTrend;
      const t = selectedTrimester === 'T1' ? -0.1 : selectedTrimester === 'T2' ? 0.1 : base;
      return Math.round(t * 10) / 10;
    }
    return 0.3;
  }, [demoProfile, isDemoMode, selectedTrimester, isAnnee, yearMeta]);

  const graphData = useMemo(() => {
    if (isAnnee && demoProfile && isDemoMode) {
      const [a, b, c] = demoProfile.trimAverages;
      return buildYearCurveFromTrims(a, b, c);
    }
    if (isAnnee && !isDemoMode && yearMeta) {
      const [a, b, c] = yearMeta.trimAvgs;
      return buildYearCurveFromTrims(a, b, c);
    }
    if (demoProfile && isDemoMode) {
      return demoProfile.graph.map((v) => Math.round((v + trimesterDelta * 0.5) * 10) / 10);
    }
    return [12.5, 13.2, 12.8, 14.1, 14.5, 14.8].map(
      (v) => Math.round((v + trimesterDelta * 0.3) * 10) / 10,
    );
  }, [demoProfile, isDemoMode, trimesterDelta, isAnnee, yearMeta]);

  const graphMonthLabels = isAnnee && graphData.length >= 8 ? GRAPH_MONTHS_YEAR : GRAPH_MONTHS;

  const lastGradeDisplay = useMemo(() => {
    if (demoProfile && isDemoMode && isAnnee) {
      const allGrades = subjects.flatMap((sub) => sub.grades.map((g) => ({ ...g })));
      const sorted = [...allGrades].sort((a, b) => gradeSortTime(b) - gradeSortTime(a));
      const g = sorted[0];
      if (!g) return null;
      return { value: g.value, max: g.maxValue, type: g.type, date: g.date };
    }
    if (demoProfile && isDemoMode) {
      return {
        value: demoProfile.lastNote.value,
        max: demoProfile.lastNote.max,
        type: demoProfile.lastNote.label,
        date: demoProfile.lastNote.date,
      };
    }
    const allGrades = subjects.flatMap((sub) => sub.grades.map((g) => ({ ...g })));
    const sorted = [...allGrades].sort((a, b) => gradeSortTime(b) - gradeSortTime(a));
    const g = sorted[0];
    if (!g) return null;
    return { value: g.value, max: g.maxValue, type: g.type, date: g.date };
  }, [subjects, demoProfile, isDemoMode, isAnnee]);

  const bestWorst = useMemo(() => {
    if (demoProfile && isDemoMode && !isAnnee) {
      return {
        best: { name: subjectNamePlain(demoProfile.strong.label), score: demoProfile.strong.score },
        worst: { name: subjectNamePlain(demoProfile.weak.label), score: demoProfile.weak.score },
      };
    }
    if (subjects.length === 0) return { best: null, worst: null };
    const best = subjects.reduce((a, b) => (a.average > b.average ? a : b), subjects[0]);
    const worst = subjects.reduce((a, b) => (a.average < b.average ? a : b), subjects[0]);
    return {
      best: { name: subjectNamePlain(best.name), score: `${best.average.toFixed(1)}/20` },
      worst:
        worst.id !== best.id
          ? { name: subjectNamePlain(worst.name), score: `${worst.average.toFixed(1)}/20` }
          : null,
    };
  }, [subjects, demoProfile, isDemoMode, isAnnee]);

  const activeSubject = subjects[Math.min(selectedSubjectIdx, subjects.length - 1)] ?? null;

  const gradesGroupedForSubject = useMemo(() => {
    if (!activeSubject) return [];
    if (!isAnnee) return [];
    return groupGradesByTrimester(activeSubject.grades);
  }, [activeSubject, isAnnee]);

  const lastGradeIdOverall = useMemo(() => {
    if (!activeSubject || activeSubject.grades.length === 0) return '';
    if (!isAnnee) return activeSubject.grades[activeSubject.grades.length - 1]?.id ?? '';
    const g = gradesGroupedForSubject;
    const lb = g[g.length - 1];
    return lb?.grades[lb.grades.length - 1]?.id ?? '';
  }, [activeSubject, isAnnee, gradesGroupedForSubject]);

  const observationText = useMemo(() => {
    if (!isMaternelle && isAnnee) {
      return 'Vue annuelle — moyenne sur 3 trimestres';
    }
    if (isMaternelle && isAnnee) {
      return 'Vue annuelle — progression sur les 3 trimestres.';
    }
    if (selectedChild?.id === 'demo-lea') return LE_OBSERVATION;
    if (demoProfile && isDemoMode) return demoProfile.observation;
    return `« ${selectedChild?.name?.split(' ')[0] ?? 'Votre enfant'} progresse régulièrement. »`;
  }, [selectedChild, demoProfile, isDemoMode, isAnnee, isMaternelle]);

  const screenTitle = isMaternelle ? 'Compétences' : 'Notes';

  // ─── MATERNELLE (Léa / GS) ───────────────────────────────

  if (isMaternelle) {
    const domains = LE_DOMAINS;
    const totalCompetencies = domains.reduce((s, d) => s + d.competencies.length, 0);
    const acquired = domains.reduce(
      (s, d) => s + d.competencies.filter((c) => c.level === 'acquis').length,
      0,
    );
    const inProgress = domains.reduce(
      (s, d) => s + d.competencies.filter((c) => c.level === 'en_cours').length,
      0,
    );
    const pctAcquis = totalCompetencies > 0 ? Math.round((acquired / totalCompetencies) * 100) : 0;
    const activeDomain = domains[selectedDomainIdx] ?? domains[0];
    const domainAcquired = activeDomain.competencies.filter((c) => c.level === 'acquis').length;
    const domainTotal = activeDomain.competencies.length;
    const domainPct = domainTotal > 0 ? Math.round((domainAcquired / domainTotal) * 100) : 0;

    return (
      <View style={styles.root}>
        <View style={styles.wallpaperClip} pointerEvents="none">
          {wallpaperSource.type === 'image' ? (
            <Image source={{ uri: wallpaperSource.uri }} style={styles.wallpaperFill} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={wallpaperSource.colors as [string, string, ...string[]]}
              style={styles.wallpaperFill}
            />
          )}
          <View style={styles.wallpaperFade} />
        </View>

        <ScrollView
          style={styles.mainScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 16, paddingBottom: FLOATING_TAB_BAR_HEIGHT + TAB_BAR_SCROLL_PADDING + insets.bottom + 16 },
          ]}
        >
          <View style={styles.titleRow}>
            <Text style={styles.screenTitle}>{screenTitle}</Text>
            <View style={styles.titleActions}>
              <Pressable
                onPress={() => setShowBulletinImport(true)}
                accessibilityRole="button"
                accessibilityLabel="Scanner un bulletin"
              >
                <LiquidGlass circle style={styles.iconCircle}>
                  <View style={styles.iconCircleInner}>
                    <ScanLine size={18} color="#1A2340" strokeWidth={1.8} />
                  </View>
                </LiquidGlass>
              </Pressable>
              <Pressable onPress={() => setShowTrimesterPicker((v) => !v)}>
                <LiquidGlass style={styles.trimPill}>
                  <View style={styles.trimPillInner}>
                    {selectedTrimester === 'ANNEE' ? (
                      <>
                        <CalendarDays size={16} color="#1A2340" strokeWidth={1.8} />
                        <Text style={[styles.trimPillText, { marginLeft: 4 }]}>▾</Text>
                      </>
                    ) : (
                      <Text style={styles.trimPillText}>
                        {trimesterPillLabel(selectedTrimester)} ▾
                      </Text>
                    )}
                  </View>
                </LiquidGlass>
              </Pressable>
            </View>
          </View>

          <Modal visible={showTrimesterPicker} transparent animationType="fade">
            <View style={styles.modalRoot} pointerEvents="box-none">
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTrimesterPicker(false)} />
              <View style={[styles.trimesterDropdownWrap, { top: insets.top + 52 }]}>
                <View style={styles.trimesterDropdown}>
                  {TRIMESTER_OPTIONS.map((opt) => {
                    const isActive = opt.value === selectedTrimester;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[styles.trimesterOption, isActive && styles.trimesterOptionActive]}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setSelectedTrimester(opt.value);
                          setShowTrimesterPicker(false);
                        }}
                      >
                        <View style={styles.trimesterOptionRow}>
                          <View style={styles.trimesterOptionLabelWrap}>
                            {opt.value === 'ANNEE' ? (
                              <CalendarDays
                                size={16}
                                color={isActive ? C.violet : C.label}
                                strokeWidth={1.8}
                              />
                            ) : null}
                            <Text style={[styles.trimesterOptionText, isActive && styles.trimesterOptionTextActive]}>
                              {opt.label}
                            </Text>
                          </View>
                          {isActive ? <Check size={16} color={C.violet} strokeWidth={2.5} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </Modal>

          {/* Overview */}
          <GlassPanel style={{ padding: 18, paddingHorizontal: 20, marginBottom: 12 }}>
            <View style={styles.maternelleStatsRow}>
              <View style={styles.maternelleStat}>
                <Text style={[styles.bigNum, { fontSize: 44 }]}>{acquired}</Text>
                <Text style={styles.maternelleStatLabel}>Acquis</Text>
              </View>
              <View style={styles.maternelleStat}>
                <Text style={[styles.bigNum, { fontSize: 44 }]}>{inProgress}</Text>
                <Text style={styles.maternelleStatLabel}>En cours</Text>
              </View>
              <View style={styles.maternelleStat}>
                <Text style={[styles.bigNum, { fontSize: 44 }]}>{totalCompetencies}</Text>
                <Text style={styles.maternelleStatLabel}>Total</Text>
              </View>
            </View>
            <View style={{ marginTop: 14 }}>
              <GradientTrack height={4} pct={pctAcquis} />
            </View>
            <Text style={styles.captionViolet}>{pctAcquis}% des compétences acquises</Text>
          </GlassPanel>

          {isAnnee ? (
            <Text style={styles.anneeCompare}>{LE_ANNEE_COMPARE}</Text>
          ) : null}

          {/* Domain pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
            style={{ marginBottom: 14 }}
          >
            {domains.map((domain, idx) => {
              const isActive = selectedDomainIdx === idx;
              return (
                <Pressable
                  key={domain.id}
                  onPress={() => setSelectedDomainIdx(idx)}
                  style={({ pressed }) => [pressed && { opacity: 0.92 }]}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={[C.violet, C.violetDeep]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.pillActiveGrad}
                    >
                      <Text style={[styles.pillTxt, styles.pillTxtOn]} numberOfLines={1}>
                        {domain.name}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.pill, styles.pillGlass]}>
                      <Text style={styles.pillTxt} numberOfLines={1}>
                        {domain.name}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.ink }]} />
              <Text style={styles.legendLabel}>Acquis</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={{ width: 10, height: 10, borderRadius: 5, overflow: 'hidden' }}>
                <LinearGradient
                  colors={[C.ink, 'rgba(26,35,64,0.25)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ flex: 1 }}
                />
              </View>
              <Text style={styles.legendLabel}>En cours</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  borderWidth: 1,
                  borderColor: 'rgba(26,35,64,0.2)',
                  backgroundColor: 'rgba(0,0,0,0.04)',
                }}
              />
              <Text style={styles.legendLabel}>Non travaillé</Text>
            </View>
          </View>

          {/* Domain card */}
          <GlassPanel smallRadius style={{ padding: 16, marginBottom: 12 }}>
            <View style={styles.domainHead}>
              <Text style={styles.domainTitle}>{activeDomain.name}</Text>
              <Text style={styles.domainMetaViolet}>
                {domainAcquired}/{domainTotal} acquis
              </Text>
            </View>
            <GradientTrack height={4} pct={domainPct} />
            {activeDomain.competencies.map((comp, i) => (
              <View
                key={comp.id}
                style={[styles.compRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.rowSep }]}
              >
                <Text style={styles.compLabel}>{comp.name}</Text>
                <CompetencyDot level={comp.level} />
              </View>
            ))}
          </GlassPanel>

          <LinearGradient
            colors={['rgba(124,58,237,0.05)', 'rgba(6,182,212,0.03)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.obsCardGrad}
          >
            <Text style={styles.obsLabelViolet}>OBSERVATION ENSEIGNANT</Text>
            <Text style={styles.obsQuote}>{observationText}</Text>
          </LinearGradient>
        </ScrollView>
        <BulletinImportSheet
          visible={showBulletinImport}
          onClose={() => setShowBulletinImport(false)}
          bottomInset={insets.bottom}
        />
      </View>
    );
  }

  // ─── PRIMAIRE / COLLÈGE / LYCÉE ──────────────────────────

  function trendArrow(t: 'up' | 'down' | 'stable') {
    if (t === 'up') return '↗';
    if (t === 'down') return '↘';
    return '→';
  }

  return (
    <View style={styles.root}>
      <View style={styles.wallpaperClip} pointerEvents="none">
        {wallpaperSource.type === 'image' ? (
          <Image source={{ uri: wallpaperSource.uri }} style={styles.wallpaperFill} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={wallpaperSource.colors as [string, string, ...string[]]}
            style={styles.wallpaperFill}
          />
        )}
        <View style={styles.wallpaperFade} />
      </View>

      <ScrollView
        style={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: FLOATING_TAB_BAR_HEIGHT + TAB_BAR_SCROLL_PADDING + insets.bottom + 16 },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>{screenTitle}</Text>
          <View style={styles.titleActions}>
            <Pressable
              onPress={() => setShowBulletinImport(true)}
              accessibilityRole="button"
              accessibilityLabel="Scanner un bulletin"
            >
              <LiquidGlass circle style={styles.iconCircle}>
                <View style={styles.iconCircleInner}>
                  <ScanLine size={18} color="#1A2340" strokeWidth={1.8} />
                </View>
              </LiquidGlass>
            </Pressable>
            <Pressable onPress={() => setShowTrimesterPicker((v) => !v)}>
              <LiquidGlass style={styles.trimPill}>
                <View style={styles.trimPillInner}>
                  {selectedTrimester === 'ANNEE' ? (
                    <>
                      <CalendarDays size={16} color="#1A2340" strokeWidth={1.8} />
                      <Text style={[styles.trimPillText, { marginLeft: 4 }]}>▾</Text>
                    </>
                  ) : (
                    <Text style={styles.trimPillText}>{trimesterPillLabel(selectedTrimester)} ▾</Text>
                  )}
                </View>
              </LiquidGlass>
            </Pressable>
          </View>
        </View>

        <Modal visible={showTrimesterPicker} transparent animationType="fade">
          <View style={styles.modalRoot} pointerEvents="box-none">
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTrimesterPicker(false)} />
            <View style={[styles.trimesterDropdownWrap, { top: insets.top + 52 }]}>
              <View style={styles.trimesterDropdown}>
                {TRIMESTER_OPTIONS.map((opt) => {
                  const isActive = opt.value === selectedTrimester;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.trimesterOption, isActive && styles.trimesterOptionActive]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setSelectedTrimester(opt.value);
                        setShowTrimesterPicker(false);
                      }}
                    >
                      <View style={styles.trimesterOptionRow}>
                        <View style={styles.trimesterOptionLabelWrap}>
                          {opt.value === 'ANNEE' ? (
                            <CalendarDays
                              size={16}
                              color={isActive ? C.violet : C.label}
                              strokeWidth={1.8}
                            />
                          ) : null}
                          <Text style={[styles.trimesterOptionText, isActive && styles.trimesterOptionTextActive]}>
                            {opt.label}
                          </Text>
                        </View>
                        {isActive ? <Check size={16} color={C.violet} strokeWidth={2.5} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>

        {/* Graph card */}
        <GraphCardHalo>
          <GlassPanel style={{ padding: 18, paddingHorizontal: 20, marginBottom: 10 }}>
            <View style={styles.avgCardHeader}>
              <Text style={styles.cardSectionLabelViolet}>MOYENNE GÉNÉRALE</Text>
              <View style={styles.trendPill}>
                <Text style={styles.trendPillTxt}>
                  {overallTrendNum >= 0 ? '↗' : '↘'} {overallTrendNum >= 0 ? '+' : ''}
                  {overallTrendNum.toFixed(1)}
                </Text>
              </View>
            </View>
            <View style={styles.avgNumRow}>
              <Text style={styles.avgBig}>{overallAvg.toFixed(1)}</Text>
              <Text style={styles.avgSlash}>/20</Text>
            </View>
            <ProgressionGraph
              data={graphData}
              width={graphW - 8}
              height={GRAPH_H}
              gradKey={`${selectedChild?.id ?? 'x'}-${selectedTrimester}`}
            />
            <View style={styles.monthRow}>
              {graphMonthLabels.map((m) => (
                <Text key={m} style={[styles.monthLbl, { flex: 1 }]}>
                  {m}
                </Text>
              ))}
            </View>
          </GlassPanel>
        </GraphCardHalo>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <GlassPanel style={styles.statCard}>
            <Text style={styles.statLabelViolet}>DERNIÈRE NOTE</Text>
            {lastGradeDisplay ? (
              <>
                <View style={styles.inlineScore}>
                  <Text style={styles.score26}>{lastGradeDisplay.value}</Text>
                  <Text style={styles.scoreSlash}>/20</Text>
                </View>
                <Text style={styles.statSub} numberOfLines={2}>
                  {lastGradeDisplay.type}
                </Text>
                <Text style={styles.statDate}>{lastGradeDisplay.date}</Text>
              </>
            ) : (
              <Text style={styles.statSub}>—</Text>
            )}
          </GlassPanel>
          <GlassPanel style={styles.statCard}>
            <Text style={styles.statLabelViolet}>POINT FORT</Text>
            {bestWorst.best ? (
              <>
                <Text style={styles.statStrong} numberOfLines={2}>
                  {bestWorst.best.name}
                </Text>
                <View style={styles.inlineScore}>
                  <Text style={styles.score26}>{bestWorst.best.score.replace(/\/20\s*$/, '')}</Text>
                  <Text style={styles.scoreSlash}>/20</Text>
                </View>
              </>
            ) : (
              <Text style={styles.statSub}>—</Text>
            )}
            <Text style={[styles.statLabelViolet, { marginTop: 10, color: '#7C3AED' }]}>À RENFORCER</Text>
            {bestWorst.worst ? (
              <>
                <Text style={styles.statStrong} numberOfLines={2}>
                  {bestWorst.worst.name}
                </Text>
                <View style={styles.inlineScore}>
                  <Text style={styles.score26}>{bestWorst.worst.score.replace(/\/20\s*$/, '')}</Text>
                  <Text style={styles.scoreSlash}>/20</Text>
                </View>
              </>
            ) : (
              <Text style={styles.statSub}>—</Text>
            )}
          </GlassPanel>
        </View>

        {/* Subject pills */}
        {subjects.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
            style={{ marginBottom: 14 }}
          >
            {subjects.map((subject, idx) => {
              const isActive = selectedSubjectIdx === idx;
              return (
                <Pressable
                  key={subject.id}
                  onPress={() => setSelectedSubjectIdx(idx)}
                  style={({ pressed }) => [pressed && { opacity: 0.92 }]}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={[C.violet, C.violetDeep]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.pillActiveGrad}
                    >
                      <Text style={[styles.pillTxt, styles.pillTxtOn]} numberOfLines={1}>
                        {subject.name}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.pill, styles.pillGlass]}>
                      <Text style={styles.pillTxt} numberOfLines={1}>
                        {subject.name}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Subject detail */}
        {activeSubject && (
          <GlassPanel style={{ padding: 18, marginBottom: 12 }}>
            <View style={styles.subjHead}>
              <Text style={styles.subjTitle}>{activeSubject.name.toUpperCase()}</Text>
              <Text style={styles.subjRight}>
                {activeSubject.average.toFixed(1)}/20 {trendArrow(activeSubject.trend)}
              </Text>
            </View>
            <GradientTrack height={3} pct={Math.min(100, (activeSubject.average / 20) * 100)} />
            {isAnnee
              ? gradesGroupedForSubject.map((block) => (
                  <View key={`trim-block-${block.trim}`} style={{ marginTop: 4 }}>
                    <Text style={styles.trimSectionLbl}>Trimestre {block.trim}</Text>
                    {block.grades.map((grade) => {
                      const showSep = grade.id !== lastGradeIdOverall;
                      return (
                        <Pressable
                          key={grade.id}
                          onPress={() =>
                            navigation.navigate('SubjectDetail', {
                              subjectId: activeSubject.id,
                              subjectName: activeSubject.name,
                              subjectEmoji: activeSubject.emoji,
                              subjectColor: activeSubject.color,
                              average: activeSubject.average,
                              classAvg: activeSubject.classAvg,
                              trend: activeSubject.trend,
                              grades: JSON.stringify(
                                activeSubject.grades.map((g) => ({
                                  id: g.id,
                                  value: g.value,
                                  maxValue: g.maxValue,
                                  date: g.date,
                                  type: g.type,
                                  comment: g.comment,
                                })),
                              ),
                            })
                          }
                          style={({ pressed }) => [
                            styles.noteRow,
                            showSep && styles.noteRowBorder,
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <View style={styles.noteRowInner}>
                            <View style={styles.noteLineMain}>
                              <Text style={styles.noteTitleLeft} numberOfLines={2}>
                                {grade.type}
                              </Text>
                              <View style={styles.noteRight}>
                                <Text style={styles.noteScore}>
                                  {grade.value}
                                  <Text style={styles.scoreSlashSmall}>/20</Text>
                                </Text>
                                <Text style={styles.chev}>›</Text>
                              </View>
                            </View>
                            <Text style={styles.noteMeta}>
                              {grade.date}
                              {grade.coefficient != null && grade.coefficient > 0
                                ? ` · Coeff. ${grade.coefficient}`
                                : ''}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ))
              : activeSubject.grades.map((grade, gi) => {
                  const showSep = gi < activeSubject.grades.length - 1;
                  return (
                    <Pressable
                      key={grade.id}
                      onPress={() =>
                        navigation.navigate('SubjectDetail', {
                          subjectId: activeSubject.id,
                          subjectName: activeSubject.name,
                          subjectEmoji: activeSubject.emoji,
                          subjectColor: activeSubject.color,
                          average: activeSubject.average,
                          classAvg: activeSubject.classAvg,
                          trend: activeSubject.trend,
                          grades: JSON.stringify(
                            activeSubject.grades.map((g) => ({
                              id: g.id,
                              value: g.value,
                              maxValue: g.maxValue,
                              date: g.date,
                              type: g.type,
                              comment: g.comment,
                            })),
                          ),
                        })
                      }
                      style={({ pressed }) => [
                        styles.noteRow,
                        showSep && styles.noteRowBorder,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <View style={styles.noteRowInner}>
                        <View style={styles.noteLineMain}>
                          <Text style={styles.noteTitleLeft} numberOfLines={2}>
                            {grade.type}
                          </Text>
                          <View style={styles.noteRight}>
                            <Text style={styles.noteScore}>
                              {grade.value}
                              <Text style={styles.scoreSlashSmall}>/20</Text>
                            </Text>
                            <Text style={styles.chev}>›</Text>
                          </View>
                        </View>
                        <Text style={styles.noteMeta}>
                          {grade.date}
                          {grade.coefficient != null && grade.coefficient > 0
                            ? ` · Coeff. ${grade.coefficient}`
                            : ''}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
          </GlassPanel>
        )}

        <LinearGradient
          colors={['rgba(124,58,237,0.05)', 'rgba(6,182,212,0.03)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.obsCardGrad}
        >
          <Text style={styles.obsLabelViolet}>OBSERVATION ENSEIGNANT</Text>
          <Text style={styles.obsQuote}>{observationText}</Text>
        </LinearGradient>
      </ScrollView>
      <BulletinImportSheet
        visible={showBulletinImport}
        onClose={() => setShowBulletinImport(false)}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SCREEN_BACKGROUND },
  wallpaperClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: NOTES_WALLPAPER_HEADER_HEIGHT,
    overflow: 'hidden',
    zIndex: 0,
  },
  wallpaperFill: {
    ...StyleSheet.absoluteFillObject,
  },
  wallpaperFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248,249,250,0.88)',
  },
  mainScroll: {
    flex: 1,
    zIndex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  scroll: { paddingHorizontal: 18 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  screenTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 32,
    color: C.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 34, height: 34 },
  iconCircleInner: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trimPill: { borderRadius: 17, minWidth: 72 },
  trimPillInner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trimPillText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: C.ink,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  bulletinModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  bulletinBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bulletinSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 0,
    overflow: 'hidden',
  },
  bulletinHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  bulletinSheetTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 17,
    fontWeight: '600',
    color: '#1A2340',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  bulletinDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  bulletinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  bulletinIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bulletinRowText: { flex: 1, minWidth: 0 },
  bulletinRowTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2340',
  },
  bulletinRowSub: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  bulletinChev: {
    fontSize: 22,
    color: '#d1d5db',
    marginLeft: 8,
  },
  bulletinRowSep: {
    height: 1,
    marginLeft: 24,
    marginRight: 24,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  trimesterDropdownWrap: {
    position: 'absolute',
    right: 18,
    zIndex: 2,
  },
  trimesterDropdown: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.glassBorder,
    overflow: 'hidden',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  trimesterOption: { paddingHorizontal: 16, paddingVertical: 12 },
  trimesterOptionActive: { backgroundColor: 'rgba(124,58,237,0.06)' },
  trimesterOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  trimesterOptionLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  trimesterOptionText: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: C.label },
  trimesterOptionTextActive: { fontFamily: FontFamily.sansSemiBold, color: C.violet },

  cardSectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: C.labelUpper,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardSectionLabelViolet: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: C.violet,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  avgCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  trendPill: {
    backgroundColor: 'rgba(124,58,237,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  trendPillTxt: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: C.violet,
  },
  avgNumRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 },
  avgBig: {
    fontFamily: FontFamily.displayBold,
    fontSize: 52,
    color: C.ink,
    letterSpacing: -1,
  },
  avgSlash: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 18,
    color: C.label,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  monthLbl: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#c4b5fd',
    textAlign: 'center',
  },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, paddingVertical: 12, paddingHorizontal: 22 },
  statLabelSm: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    color: C.label,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statLabelViolet: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    color: C.violet,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inlineScore: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  score26: {
    fontFamily: FontFamily.displayBold,
    fontSize: 26,
    color: C.ink,
  },
  scoreSlash: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: C.label,
  },
  statSub: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: C.label, marginTop: 4 },
  statDate: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: C.label, marginTop: 4 },
  statStrong: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, color: C.ink, marginTop: 4 },

  pillRow: { gap: 10, paddingVertical: 4, paddingHorizontal: 22 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  pillActive: { backgroundColor: C.ink },
  pillActiveGrad: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    minHeight: 36,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: C.violet,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  pillGlass: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: C.liquidBorder,
  },
  pillTxt: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: '#374151' },
  pillTxtOn: { color: '#fff', fontWeight: '500' },

  subjHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 20,
    color: C.ink,
    flex: 1,
    textTransform: 'uppercase',
  },
  subjRight: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: C.label,
  },
  track3: {
    height: 3,
    borderRadius: 2,
    backgroundColor: C.track,
    overflow: 'hidden',
    marginBottom: 14,
  },
  track3fill: { height: 3, backgroundColor: C.ink, borderRadius: 2 },
  noteRow: {
    paddingVertical: 12,
  },
  noteRowInner: {
    width: '100%',
  },
  noteLineMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  noteTitleLeft: {
    flex: 1,
    paddingRight: 10,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: C.ink,
  },
  noteRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124,58,237,0.06)',
  },
  trimSectionLbl: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: C.violet,
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 4,
  },
  noteTitle: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: C.ink },
  noteMeta: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: C.meta, marginTop: 6 },
  noteRight: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, gap: 6 },
  noteScore: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    color: C.ink,
  },
  scoreSlashSmall: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: C.label,
  },
  chev: { fontSize: 18, color: C.meta, marginLeft: 4 },

  obsLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    color: C.label,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  obsLabelViolet: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    color: C.violet,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  obsCardGrad: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.1)',
    padding: 14,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  obsQuote: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: C.body,
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: 8,
  },

  maternelleStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  maternelleStat: { flex: 1, alignItems: 'center' },
  bigNum: {
    fontFamily: FontFamily.displayBold,
    fontSize: 44,
    color: C.ink,
  },
  maternelleStatLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: C.label,
    marginTop: 4,
  },
  track4: {
    height: 4,
    borderRadius: 2,
    backgroundColor: C.track,
    overflow: 'hidden',
  },
  track4fill: { height: 4, backgroundColor: C.ink, borderRadius: 2 },
  captionRight: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: C.label,
    textAlign: 'right',
    marginTop: 8,
  },
  captionViolet: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: C.violet,
    textAlign: 'right',
    marginTop: 8,
  },
  anneeCompare: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: C.violet,
    marginBottom: 12,
    textAlign: 'center',
  },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: C.body },
  domainHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  domainTitle: { fontFamily: FontFamily.sansBold, fontSize: 14, color: C.ink, flex: 1 },
  domainMeta: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: C.label },
  domainMetaViolet: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: C.violet },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  compLabel: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: '#374151', flex: 1, paddingRight: 12 },
});
