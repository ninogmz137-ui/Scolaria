/**
 * NotesScreen — Single scroll, validated mockup (glass, neutral scores, Figtree).
 */

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
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
  ClipPath,
  Rect,
  Line,
  Text as SvgText,
} from 'react-native-svg';
import Reanimated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  createAnimatedComponent,
} from 'react-native-reanimated';
import {
  Check,
  Camera,
  Image as LucideImage,
  FileText,
  CalendarDays,
} from 'lucide-react-native';
import { useSchoolMode, getSchoolModeFromBirthDate } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useDemoData } from '../contexts/DemoContext';
import { useWallpaper } from '../contexts/WallpaperContext';
import { useTopbarScrollHandler } from '../contexts/TopbarScrollContext';
import { getSubjects, getGrades } from '../services/database';
import { FontFamily } from '../hooks/useSolariaFonts';
import { getBottomBarScrollPadding } from '../components/navigation/BottomBar';
import { C as DC } from '../constants/design';
import { nativeGlassCardShadow } from '../constants/theme';
import { Text, Pressable } from '../components/ui';
import { AucunEnfantOnglet } from '../components/AucunEnfant';
import ApprentissagesVue from './suivi/ApprentissagesVue';
import { getSuiviDemo, REGLAGES_DEMO } from '../data/demo/suivi';
import { getCompetences } from '../services/database';
import { referentielDuNiveau } from '../data/referentiels';
import type { Decoupage, ElementSuivi } from '../utils/competences';

const AnimatedRect = createAnimatedComponent(Rect);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Palette (mockup + violet polish) ─────────────────────

const C = {
  ink: '#0F172A',
  violet: '#4338CA',
  cyan: '#06B6D4',
  violetDeep: '#3730A3',
  label: '#9ca3af',
  labelUpper: '#6b7280',
  meta: 'rgba(15,23,42,0.45)',
  body: '#374151',
  glassBg: 'rgba(255,255,255,0.7)',
  glassBorder: 'rgba(255,255,255,0.9)',
  liquidBtn: 'rgba(255,255,255,0.6)',
  liquidBorder: 'rgba(255,255,255,0.8)',
  rowSep: 'rgba(15,23,42,0.06)',
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

/**
 * Démo : seul l'ordre d'affichage des matières est fixé ici. Moyennes, tendance, dernière note,
 * points forts et faibles sont CALCULÉS à partir des notes (demo-grades.json), comme en compte réel.
 */
interface DemoNotesProfile {
  subjectOrder: string[];
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

const COLOR_PALETTE = ['#4A90D9', '#4338CA', '#F59E0B', '#10B981', '#EC4899', '#EF4444'];

/** Wallpaper visible only behind the top area — clipped; scroll body uses C.bg. */
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

const DEMO_PROFILES: Record<string, DemoNotesProfile> = {
  'demo-emma': {
    subjectOrder: ['Mathématiques', 'Français', 'Histoire-Géo', 'Anglais', 'Physique-Chimie', 'SVT'],
  },
};


function parseGradeDateLoose(d: string): number {
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return new Date(d).getTime();
  return 0;
}

function clamp(v: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, v));
}

function gradeSortTime(g: Grade): number {
  if (g.sortDate && /^\d{4}-\d{2}-\d{2}/.test(g.sortDate)) return new Date(g.sortDate).getTime();
  return parseGradeDateLoose(g.date);
}

function avgArr(a: number[]): number {
  if (a.length === 0) return 0;
  return a.reduce((x, y) => x + y, 0) / a.length;
}

function getXLabelIndices(n: number): number[] {
  if (n <= 4) return Array.from({ length: n }, (_, i) => i);
  return [...new Set([0, Math.round(n / 3), Math.round((2 * n) / 3), n - 1])];
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
            <View style={[styles.bulletinIconWrap, { backgroundColor: 'rgba(67,56,202,0.08)' }]}>
              <Camera size={22} color="#4338CA" strokeWidth={1.8} />
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
              <FileText size={22} color="#0F172A" strokeWidth={1.8} />
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
          backgroundColor: 'rgba(255,255,255,0.92)',
          overflow: 'hidden',
          ...nativeGlassCardShadow,
        },
        style,
      ]}
    >
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
          backgroundColor: 'rgba(255,255,255,0.92)',
          overflow: 'hidden',
          ...nativeGlassCardShadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── Graph ────────────────────────────────────────────────

type NotesGraphPoint = { x: number; y: number; label: string };

function buildSmoothCubicPath(points: NotesGraphPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  // Catmull-Rom → cubic Bezier conversion for smooth segments.
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function approxPathLength(points: NotesGraphPoint[]): number {
  if (points.length < 2) return 1;
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.max(1, len);
}

const AnimatedSvgPath = Reanimated.createAnimatedComponent(Path);

function NotesProgressGraph({
  grades,
  width,
  height,
  gradKey,
}: {
  grades: Grade[];
  width: number;
  height: number;
  gradKey: string;
}) {
  const contentPadTop = 12;
  const contentPadRight = 14;
  const contentPadBottom = 26;
  const contentPadLeft = 34; // Y labels column

  const innerW = width - contentPadLeft - contentPadRight;
  const innerH = height - contentPadTop - contentPadBottom;

  const sortedAsc = useMemo(() => {
    const s = [...grades].sort((a, b) => gradeSortTime(a) - gradeSortTime(b));
    if (s.length <= 8) return s;
    return s.slice(s.length - 8);
  }, [grades]);

  const points: NotesGraphPoint[] = useMemo(() => {
    if (sortedAsc.length === 0) return [];
    const n = sortedAsc.length;
    return sortedAsc.map((g, i) => {
      const v20 = (g.value / (g.maxValue || 20)) * 20;
      const x = contentPadLeft + (n === 1 ? 0 : (i / (n - 1)) * innerW);
      const y = contentPadTop + (1 - clamp(v20 / 20, 0, 1)) * innerH;
      return { x, y, label: g.date };
    });
  }, [sortedAsc, innerW, innerH]);

  const d = useMemo(() => buildSmoothCubicPath(points), [points]);
  const progress = useSharedValue(0);
  const [pathLen, setPathLen] = useState<number>(() => approxPathLength(points));
  const pathRef = useRef<any>(null);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [d, progress]);

  useEffect(() => {
    const approx = approxPathLength(points);
    setPathLen(approx);

    const t = setTimeout(() => {
      const maybe = pathRef.current?.getTotalLength?.();
      if (typeof maybe === 'number' && Number.isFinite(maybe) && maybe > 0) {
        setPathLen(maybe);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [d, points]);

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: pathLen * (1 - progress.value),
    } as any;
  }, [pathLen]);

  const safeKey = gradKey.replace(/[^a-zA-Z0-9_-]/g, '');
  const lineId = `notesLine-v7-${safeKey}`;

  const hasEnough = points.length >= 2;

  return (
    <View style={{ width, height, position: 'relative' }}>
      {/* Y axis labels */}
      <View style={{ position: 'absolute', left: 0, top: contentPadTop, bottom: contentPadBottom, width: contentPadLeft }}>
        {([20, 10, 0] as const).map((v) => {
          const y = ((20 - v) / 20) * innerH;
          return (
            <Text
              key={`y-${v}`}
              style={[
                styles.graphAxisLabel,
                {
                  position: 'absolute',
                  left: 0,
                  top: y - 7,
                  width: contentPadLeft - 6,
                  textAlign: 'right',
                },
              ]}
              numberOfLines={1}
            >
              {v}
            </Text>
          );
        })}
      </View>

      {/* Chart */}
      <View style={{ position: 'absolute', left: contentPadLeft, right: 0, top: 0, bottom: 0 }}>
        {!hasEnough ? (
          <View style={styles.graphEmpty}>
            <Text style={styles.graphEmptyText}>Pas assez de données</Text>
          </View>
        ) : (
          <>
            <Svg width={width} height={height}>
              <Defs>
                <SvgLinearGradient id={lineId} x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
                  <Stop offset="0" stopColor={C.violet} />
                  <Stop offset="1" stopColor={C.cyan} />
                </SvgLinearGradient>
              </Defs>

              <AnimatedSvgPath
                ref={pathRef}
                d={d}
                fill="none"
                stroke={`url(#${lineId})`}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${pathLen} ${pathLen}`}
                animatedProps={animatedProps}
              />

              {points.map((p, idx) => (
                <Circle
                  key={`pt-${idx}`}
                  cx={p.x}
                  cy={p.y}
                  r={6}
                  fill="#FFFFFF"
                  stroke={`url(#${lineId})`}
                  strokeWidth={2}
                />
              ))}
            </Svg>

            {/* X axis labels */}
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: contentPadBottom }}>
              {points.map((p, idx) => {
                const labelW = 44;
                const x = clamp(p.x - contentPadLeft - labelW / 2, 0, innerW - labelW);
                return (
                  <Text
                    key={`x-${idx}`}
                    style={[
                      styles.graphAxisLabel,
                      {
                        position: 'absolute',
                        left: x,
                        bottom: 2,
                        width: labelW,
                        textAlign: 'center',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {p.label}
                  </Text>
                );
              })}
            </View>
          </>
        )}
      </View>
    </View>
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

// ─── Subject grade progression graph ─────────────────────

const SGH = 160;    // total SVG height
const SG_PL = 36;  // left padding (Y labels)
const SG_PR = 8;   // right padding
const SG_PT = 12;  // top padding
const SG_PB = 26;  // bottom padding (X labels)

function SubjectGradeGraph({
  grades,
  subjectId,
  width,
}: {
  grades: Grade[];
  subjectId: string;
  width: number;
}) {
  const innerW = width - SG_PL - SG_PR;
  const innerH = SGH - SG_PT - SG_PB;

  const sorted = useMemo(
    () => [...grades].sort((a, b) => gradeSortTime(a) - gradeSortTime(b)),
    [grades],
  );

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [subjectId, progress]);

  const animatedClipProps = useAnimatedProps(() => ({
    width: innerW * progress.value,
  }));

  if (sorted.length < 2) {
    return (
      <View
        style={{
          width,
          height: SGH,
          borderRadius: 20,
          backgroundColor: 'rgba(255,255,255,0.65)',
          alignItems: 'center',
          justifyContent: 'center',
          ...nativeGlassCardShadow,
        }}
      >
        <Text
          style={{
            fontFamily: FontFamily.sansRegular,
            fontSize: 13,
            color: '#94A3B8',
          }}
        >
          Pas assez de données
        </Text>
      </View>
    );
  }

  const pts = sorted.map((g, i) => ({
    x: SG_PL + (i / (sorted.length - 1)) * innerW,
    y: SG_PT + (1 - Math.min(1, Math.max(0, g.value / g.maxValue))) * innerH,
    label: g.date,
  }));

  function buildLine(): string {
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y},${cpx} ${curr.y},${curr.x} ${curr.y}`;
    }
    return d;
  }

  function buildArea(): string {
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `${buildLine()} L ${last.x} ${SGH - SG_PB} L ${first.x} ${SGH - SG_PB} Z`;
  }

  const safeId = subjectId.replace(/[^a-z0-9]/gi, '');
  const clipId = `sgc${safeId}`;
  const lineGId = `sgl${safeId}`;
  const areaGId = `sga${safeId}`;
  const xIndices = getXLabelIndices(sorted.length);

  return (
    <View
      style={{
        width,
        height: SGH,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.65)',
        overflow: 'hidden',
        ...nativeGlassCardShadow,
      }}
    >
      <Svg width={width} height={SGH}>
        <Defs>
          <SvgLinearGradient id={areaGId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#4338CA" stopOpacity={0.14} />
            <Stop offset="1" stopColor="#4338CA" stopOpacity={0} />
          </SvgLinearGradient>
          <SvgLinearGradient
            id={lineGId}
            x1={String(SG_PL)}
            y1="0"
            x2={String(width - SG_PR)}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#4338CA" />
            <Stop offset="1" stopColor="#06B6D4" />
          </SvgLinearGradient>
          <ClipPath id={clipId}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <AnimatedRect
              x={SG_PL}
              y={0}
              height={SGH}
              animatedProps={animatedClipProps as any}
            />
          </ClipPath>
        </Defs>

        {([20, 10, 0] as const).map((val) => {
          const yPos = SG_PT + (1 - val / 20) * innerH;
          return (
            <Fragment key={val}>
              <Line
                x1={SG_PL}
                y1={yPos}
                x2={width - SG_PR}
                y2={yPos}
                stroke="rgba(0,0,0,0.05)"
                strokeWidth={1}
              />
              <SvgText
                x={SG_PL - 6}
                y={yPos + 4}
                textAnchor="end"
                fontSize={11}
                fill="#94A3B8"
              >
                {String(val)}
              </SvgText>
            </Fragment>
          );
        })}

        <Path d={buildArea()} fill={`url(#${areaGId})`} clipPath={`url(#${clipId})`} />
        <Path
          d={buildLine()}
          fill="none"
          stroke={`url(#${lineGId})`}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath={`url(#${clipId})`}
        />

        {pts.map((pt, i) => (
          <Fragment key={i}>
            <Circle cx={pt.x} cy={pt.y} r={6} fill="white" clipPath={`url(#${clipId})`} />
            <Circle
              cx={pt.x}
              cy={pt.y}
              r={6}
              fill="none"
              stroke={`url(#${lineGId})`}
              strokeWidth={2}
              clipPath={`url(#${clipId})`}
            />
          </Fragment>
        ))}

        {xIndices.map((idx) => (
          <SvgText
            key={idx}
            x={pts[idx].x}
            y={SGH - 6}
            textAnchor="middle"
            fontSize={11}
            fill="#94A3B8"
          >
            {pts[idx].label}
          </SvgText>
        ))}
      </Svg>
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
      <View style={[{ height, width: `${w}%` as const, borderRadius: radius }, { backgroundColor: C.violet }]} />
    </View>
  );
}

// ─── Competency dot ───────────────────────────────────────

function CompetencyDot({ level }: { level: CompetencyLevel }) {
  const size = 12;
  if (level === 'acquis') {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
        <View style={[{ width: '100%', height: '100%' }, { backgroundColor: C.violet }]} />
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
        <View style={[{ width: '100%', height: '100%' }, { backgroundColor: 'rgba(67,56,202,0.45)' }]} />
      </View>
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(67,56,202,0.18)',
      }}
    />
  );
}

// ─── Main ─────────────────────────────────────────────────

function NotesScreenContent() {
  const { selectedChild } = useActiveChild();
  const { mode } = useSchoolMode();
  const { wallpaperSource } = useWallpaper();
  const { isDemoMode, getSubjects: getDemoSubjects, getGrades: getDemoGrades } = useDemoData();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const scrollHandler = useTopbarScrollHandler();

  // Jamais de matières fictives : démo = carnet de l'enfant actif, compte réel = la base.
  const [subjects, setSubjects] = useState<Subject[]>([]);
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
  const GRAPH_H = 160;

  const schoolMode = selectedChild?.birthDate
    ? getSchoolModeFromBirthDate(selectedChild.birthDate)
    : mode;

  // Le cycle de l'enfant (niveau saisi) fait foi ; la date de naissance n'est qu'un repli.
  const cycle = selectedChild?.cycle ?? null;
  const isMaternelle = cycle ? cycle === 'maternelle' : schoolMode === 'maternelle';
  const isPrimaire = cycle ? cycle === 'primaire' : schoolMode === 'primaire';

  // Maternelle (observations) et primaire (compétences) : démo = src/data/demo/suivi.ts (même source
  // que l'Accueil) ; compte réel = table competences (échelle et période de chaque ligne).
  const [competences, setCompetences] = useState<ElementSuivi[]>([]);
  // Découpage de l'année : démo = réglage de l'école de démo ; compte réel : défaut du niveau
  // (périodes) tant que la résolution serveur (decoupage_annee) n'est pas branchée côté app.
  const decoupageSuivi: Decoupage =
    (isDemoMode && selectedChild ? REGLAGES_DEMO[selectedChild.id]?.decoupage : undefined) ?? 'periodes';
  useEffect(() => {
    let annule = false;
    if (!(isPrimaire || isMaternelle) || !selectedChild) {
      setCompetences([]);
      return;
    }
    if (isDemoMode) {
      setCompetences(getSuiviDemo(selectedChild.id));
      return;
    }
    if (isMaternelle) {
      // Pas encore de table d'observations : état vide (jamais de donnée inventée).
      setCompetences([]);
      return;
    }
    getCompetences(selectedChild.id).then(({ data }) => {
      if (annule) return;
      setCompetences(
        data.map((c) => ({
          id: c.id,
          domaine: c.domaine,
          texte: c.competence,
          niveau: c.niveau,
          echelle: c.echelle,
          periode: c.periode ?? undefined,
          date: c.date,
          source: c.source,
        })),
      );
    });
    return () => {
      annule = true;
    };
  }, [isPrimaire, isMaternelle, isDemoMode, selectedChild]);

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
          // Moyenne (pondérée) et tendance calculées à partir des notes : une seule source de vérité.
          const poids = subGrades.reduce((s, g) => s + (g.coefficient || 1), 0);
          const avg = poids > 0
            ? subGrades.reduce((s, g) => s + (g.value / g.outOf) * 20 * (g.coefficient || 1), 0) / poids
            : 0;
          const chrono = [...subGrades].sort((a, b) => a.date.localeCompare(b.date));
          const ecart = chrono.length >= 2
            ? chrono[chrono.length - 1].value / chrono[chrono.length - 1].outOf - chrono[0].value / chrono[0].outOf
            : 0;
          return {
            id: sub.id,
            name: sub.name,
            color: sub.color || COLOR_PALETTE[idx % COLOR_PALETTE.length],
            grades,
            average: Math.round(avg * 10) / 10,
            classAvg: Math.round((sub.classAverage ?? 0) * 10) / 10,
            trend: (ecart > 0.05 ? 'up' : ecart < -0.05 ? 'down' : 'stable') as Subject['trend'],
          };
        });

        const prof = DEMO_PROFILES[selectedChild.id];
        if (prof?.subjectOrder) {
          const order = prof.subjectOrder;
          mapped = mapped
            .filter((s) => order.includes(s.name))
            .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
        }

        setYearMeta(null);
        setSubjects(mapped);
        return;
      }
      setYearMeta(null);
      setSubjects([]);
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
      setSubjects([]);
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

  // Moyenne et tendance générales : calculées à partir des notes affichées (démo comme compte réel).
  const avecNotesSaisies = subjects.filter((s) => s.grades.length > 0);
  const overallAvg = useMemo(() => {
    if (isAnnee && !isDemoMode && yearMeta) {
      return yearMeta.overall;
    }
    if (avecNotesSaisies.length === 0) return 0;
    return avecNotesSaisies.reduce((s, sub) => s + sub.average, 0) / avecNotesSaisies.length;
  }, [avecNotesSaisies, isDemoMode, isAnnee, yearMeta]);

  const overallTrendNum = useMemo(() => {
    if (isAnnee && !isDemoMode && yearMeta) {
      const [a, , c] = yearMeta.trimAvgs;
      return Math.round(((c - a) / 2) * 10) / 10;
    }
    const ecarts = subjects
      .map((s) => [...s.grades].sort((a, b) => gradeSortTime(a) - gradeSortTime(b)))
      .filter((g) => g.length >= 2)
      .map((g) => (g[g.length - 1].value / g[g.length - 1].maxValue - g[0].value / g[0].maxValue) * 20);
    if (ecarts.length === 0) return 0;
    return Math.round((ecarts.reduce((s, e) => s + e, 0) / ecarts.length) * 10) / 10;
  }, [subjects, isDemoMode, isAnnee, yearMeta]);

  const activeSubject = subjects[Math.min(selectedSubjectIdx, subjects.length - 1)] ?? null;

  const graphGradesForSelectedSubject = useMemo(() => {
    if (!activeSubject) return [];
    return activeSubject.grades;
  }, [activeSubject]);

  const lastGradeDisplay = useMemo(() => {
    const allGrades = subjects.flatMap((sub) => sub.grades.map((g) => ({ ...g })));
    const sorted = [...allGrades].sort((a, b) => gradeSortTime(b) - gradeSortTime(a));
    const g = sorted[0];
    if (!g) return null;
    return { value: g.value, max: g.maxValue, type: g.type, date: g.date };
  }, [subjects]);

  const bestWorst = useMemo(() => {
    const notees = subjects.filter((s) => s.grades.length > 0);
    if (notees.length === 0) return { best: null, worst: null };
    const best = notees.reduce((a, b) => (a.average > b.average ? a : b), notees[0]);
    const worst = notees.reduce((a, b) => (a.average < b.average ? a : b), notees[0]);
    return {
      best: { name: subjectNamePlain(best.name), score: `${best.average.toFixed(1)}/20` },
      worst:
        worst.id !== best.id
          ? { name: subjectNamePlain(worst.name), score: `${worst.average.toFixed(1)}/20` }
          : null,
    };
  }, [subjects]);

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

  // Collège / lycée uniquement (la maternelle et le primaire ont leur propre vue).
  // Jamais d'observation inventée : sans donnée, rien.
  const observationText = isAnnee ? 'Vue annuelle — moyenne sur 3 trimestres' : '';

  // ─── MATERNELLE : domaines → observations (texte, date, source), sans niveau ni score ─────
  // ─── PRIMAIRE : disciplines → compétences, barre à 3 ou 4 segments selon CHAQUE ligne,
  //     sélecteur de période (P1…P5 ou S1/S2), jamais de trimestre ni de note /20 ─────

  if (isPrimaire || isMaternelle) {
    return (
      <ApprentissagesVue
        mode={isMaternelle ? 'maternelle' : 'primaire'}
        titre={
          isMaternelle
            ? `Carnet de suivi des apprentissages · ${selectedChild?.niveau ?? ''}`
            : `Compétences · ${selectedChild?.niveau ?? ''}`
        }
        items={competences}
        decoupage={decoupageSuivi}
        referentiel={referentielDuNiveau(selectedChild?.niveau)}
        vide={
          isMaternelle
            ? `Aucune observation pour ${selectedChild?.name ?? 'cet enfant'} pour l’instant.`
            : `Aucune compétence pour ${selectedChild?.name ?? 'cet enfant'} sur cette période.`
        }
      />
    );
  }

  // ─── COLLÈGE / LYCÉE (notes v7) ──────────────────────────

  function trendArrow(t: 'up' | 'down' | 'stable') {
    if (t === 'up') return '↗';
    if (t === 'down') return '↘';
    return '→';
  }

  return (
    <View style={styles.root}>
      <View style={styles.wallpaperClip} pointerEvents="none">
        <Image source={wallpaperSource.source} style={styles.wallpaperFill} resizeMode="cover" />
        <View style={styles.wallpaperFade} />
      </View>

      <Reanimated.ScrollView
        style={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 64 + 12, paddingBottom: getBottomBarScrollPadding(insets.bottom) },
        ]}
      >
        <View style={styles.titleRow}>
          <View style={styles.titleActions}>
            <Pressable onPress={() => setShowTrimesterPicker((v) => !v)}>
              <LiquidGlass style={styles.trimPill}>
                <View style={styles.trimPillInner}>
                  {selectedTrimester === 'ANNEE' ? (
                    <>
                      <CalendarDays size={16} color="#0F172A" strokeWidth={1.8} />
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
            <View style={styles.graphZone}>
              <NotesProgressGraph
                grades={graphGradesForSelectedSubject}
                width={graphW - 8}
                height={GRAPH_H}
                gradKey={`${selectedChild?.id ?? 'x'}-${selectedTrimester}-${activeSubject?.id ?? 'none'}`}
              />
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
            <Text style={[styles.statLabelViolet, { marginTop: 10, color: '#4338CA' }]}>À RENFORCER</Text>
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

        {/* Lien bulletin trimestriel */}
        {selectedTrimester !== 'ANNEE' && (
          <Pressable
            onPress={() => navigation.navigate('BulletinScreen', { childName: (selectedChild?.name ?? 'Enfant').split(' ')[0] })}
            style={({ pressed }) => [styles.bulletinLink, pressed && { opacity: 0.65 }]}
          >
            <Text style={styles.bulletinLinkTxt}>
              Voir le bulletin {selectedTrimester === 'T1' ? 'T1' : selectedTrimester === 'T2' ? 'T2' : 'T3'} complet →
            </Text>
          </Pressable>
        )}

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
                    <View style={[styles.pill, styles.pillActive]}>
                      <Text style={[styles.pillTxt, styles.pillTxtOn]} numberOfLines={1}>
                        {subject.name}
                      </Text>
                    </View>
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

        {/* Subject progression graph */}
        {activeSubject && (
          <View style={{ marginBottom: 12 }}>
            <SubjectGradeGraph
              grades={activeSubject.grades}
              subjectId={activeSubject.id}
              width={graphW}
            />
          </View>
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
                            navigation.navigate('GradeDetail', {
                              subject: activeSubject.name,
                              grade: grade.value,
                              maxGrade: grade.maxValue,
                              coeff: grade.coefficient,
                              date: grade.date,
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
                        navigation.navigate('GradeDetail', {
                          subject: activeSubject.name,
                          grade: grade.value,
                          maxGrade: grade.maxValue,
                          coeff: grade.coefficient,
                          date: grade.date,
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

        <View style={[styles.obsCardGrad, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.06)' }]}>
          <Text style={styles.obsLabelViolet}>OBSERVATION ENSEIGNANT</Text>
          <Text style={styles.obsQuote}>{observationText}</Text>
        </View>
      </Reanimated.ScrollView>
      <BulletinImportSheet
        visible={showBulletinImport}
        onClose={() => setShowBulletinImport(false)}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F1EE' },
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
    backgroundColor: '#F2F1EE',
  },
  scroll: { paddingHorizontal: 18 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 18,
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
  bulletinLink: {
    alignSelf: 'center',
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  bulletinLinkTxt: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: 'rgba(15,23,42,0.45)',
    letterSpacing: -0.1,
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
    color: '#0F172A',
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
    color: '#0F172A',
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
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    overflow: 'hidden',
    minWidth: 120,
    ...nativeGlassCardShadow,
  },
  trimesterOption: { paddingHorizontal: 16, paddingVertical: 12 },
  trimesterOptionActive: { backgroundColor: 'rgba(67,56,202,0.06)' },
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
    backgroundColor: 'rgba(67,56,202,0.08)',
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
    color: '#C7D2FE',
    textAlign: 'center',
  },

  graphZone: {
    height: 160,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    ...nativeGlassCardShadow,
  },
  graphAxisLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#94A3B8',
  },
  graphEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphEmptyText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#94A3B8',
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
  pillActive: { backgroundColor: '#0F172A' },
  pillGlass: {
    backgroundColor: 'rgba(15,23,42,0.07)',
  },
  pillTxt: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: 'rgba(15,23,42,0.55)' },
  pillTxtOn: { color: '#FFFFFF', fontWeight: '500' },

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
    borderBottomColor: 'rgba(67,56,202,0.06)',
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

/** Garde : compte réel sans enfant → état vide (jamais de données d'un autre carnet). */
export default function NotesScreen() {
  const { selectedChild } = useActiveChild();
  if (!selectedChild) return <AucunEnfantOnglet />;
  return <NotesScreenContent />;
}
