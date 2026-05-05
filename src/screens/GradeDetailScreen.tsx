/**
 * GradeDetailScreen — Détail d'une note avec sparkline, stats, appréciation.
 * Notes : JAMAIS de couleur sur les chiffres de notes → C.text uniquement.
 * Pattern Android 2-Views sur toutes les cartes.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TrendingUp, Target, FileText } from 'lucide-react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { C, BOTTOM_BAR_HEIGHT } from '../constants/design';
import { FontFamily } from '../hooks/useSolariaFonts';
import DeepScreenHeader from '../components/DeepScreenHeader';
import AriaInlineCard from '../components/AriaInlineCard';

// ─── Demo data ───────────────────────────────────────────

const DEMO = {
  subject: 'Mathématiques',
  grade: 15,
  maxGrade: 20,
  coeff: 3,
  date: '18 avr. 2026',
  teacher: 'M. Dupont',
  classAvg: 12.8,
  classBest: 19,
  trend: [12.4, 13.1, 12.8, 13.6, 14.2, 14.0, 15],
  appreciation: 'Bon travail, méthodologie solide. Attention aux calculs de limite en fin d\'épreuve.',
  strengths: ['Algèbre', 'Démonstrations'],
  toWork: ['Calcul intégral', 'Limites'],
};

// ─── Sparkline ───────────────────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  const W = 280;
  const H = 56;
  const PAD = 8;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
    return { x, y };
  });

  const d = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y} ${cx} ${p.y} ${p.x} ${p.y}`;
  }, '');

  return (
    <Svg width={W} height={H}>
      <Path d={d} stroke={C.text} strokeWidth={1.5} fill="none" />
      {pts.map((p, i) => (
        <Circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === pts.length - 1 ? 5 : 3}
          fill={i === pts.length - 1 ? C.text : C.white}
          stroke={C.text}
          strokeWidth={1.5}
        />
      ))}
    </Svg>
  );
}

// ─── SectionLabel ────────────────────────────────────────

function SectionLbl({ children, top = 20 }: { children: string; top?: number }) {
  return (
    <Text style={[styles.sectionLabel, { paddingTop: top }]}>{children}</Text>
  );
}

// ─── Row pour les stats ──────────────────────────────────

function StatCol({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCol}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Composant principal ─────────────────────────────────

export default function GradeDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const subject = route.params?.subject ?? DEMO.subject;
  const grade = route.params?.grade ?? DEMO.grade;
  const maxGrade = route.params?.maxGrade ?? DEMO.maxGrade;
  const coeff = route.params?.coeff ?? DEMO.coeff;
  const date = route.params?.date ?? DEMO.date;
  const teacher = route.params?.teacher ?? DEMO.teacher;

  return (
    <SafeAreaView style={styles.root}>
      <DeepScreenHeader onBack={() => navigation.goBack()} title={subject} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: BOTTOM_BAR_HEIGHT + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero note */}
        <View style={[styles.cardOuter, { marginTop: 12 }]}>
          <View style={styles.cardInner}>
            <View style={styles.heroCenter}>
              <View style={styles.gradeRow}>
                <Text style={styles.gradeNumber}>{grade}</Text>
                <Text style={styles.gradeMax}>/{maxGrade}</Text>
              </View>
              <View style={styles.coeffPill}>
                <Text style={styles.coeffText}>Coeff {coeff}</Text>
              </View>
              <Text style={styles.heroMeta}>{date} · {teacher}</Text>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={[styles.cardOuter, { marginTop: 6 }]}>
          <View style={[styles.cardInner, styles.statsRow]}>
            <StatCol label="Moyenne classe" value={String(DEMO.classAvg)} />
            <View style={styles.statDivider} />
            <StatCol label="Meilleure note" value={String(DEMO.classBest)} />
            <View style={styles.statDivider} />
            <StatCol label="Coefficient" value={`×${coeff}`} />
          </View>
        </View>

        {/* Progression sparkline */}
        <SectionLbl>PROGRESSION</SectionLbl>
        <View style={styles.cardOuter}>
          <View style={[styles.cardInner, { padding: 16, alignItems: 'center' }]}>
            <Sparkline data={DEMO.trend} />
            <Text style={styles.sparkMeta}>7 dernières notes en {subject}</Text>
          </View>
        </View>

        {/* Forces & À travailler */}
        <SectionLbl>FORCES &amp; À TRAVAILLER</SectionLbl>
        <View style={styles.forceRow}>
          <View style={[styles.cardOuter, { flex: 1, marginRight: 6 }]}>
            <View style={[styles.cardInner, { padding: 12 }]}>
              <View style={styles.forceHeader}>
                <TrendingUp size={15} color={C.green} strokeWidth={2} />
                <Text style={[styles.forceTitle, { marginLeft: 6, color: C.green }]}>Forces</Text>
              </View>
              {DEMO.strengths.map((s) => (
                <Text key={s} style={styles.forceItem}>· {s}</Text>
              ))}
            </View>
          </View>
          <View style={[styles.cardOuter, { flex: 1, marginLeft: 6 }]}>
            <View style={[styles.cardInner, { padding: 12 }]}>
              <View style={styles.forceHeader}>
                <Target size={15} color={C.amber} strokeWidth={2} />
                <Text style={[styles.forceTitle, { marginLeft: 6, color: C.amber }]}>À travailler</Text>
              </View>
              {DEMO.toWork.map((s) => (
                <Text key={s} style={styles.forceItem}>· {s}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Pièce jointe */}
        <SectionLbl>PIÈCE JOINTE</SectionLbl>
        <View style={styles.cardOuter}>
          <View style={styles.cardInner}>
            <TouchableOpacity style={styles.pjRow} activeOpacity={0.75}>
              <View style={styles.pjIcon}>
                <FileText size={18} color={C.text55} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pjName}>Correction_Controle_Fonctions.pdf</Text>
                <Text style={styles.pjMeta}>856 Ko · PDF</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Appréciation */}
        <SectionLbl>APPRÉCIATION</SectionLbl>
        <View style={styles.cardOuter}>
          <View style={[styles.cardInner, { padding: 14 }]}>
            <Text style={styles.appreciation}>{DEMO.appreciation}</Text>
          </View>
        </View>

        {/* Aria */}
        <View style={{ marginTop: 8 }}>
          <AriaInlineCard>
            Les fonctions, c'est ton point fort. Ce résultat confirme la progression du trimestre.
          </AriaInlineCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  android: { elevation: 0 },
  default: {},
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Card pattern 2-Views (Android-safe)
  cardOuter: {
    marginHorizontal: 14,
    marginBottom: 6,
    borderRadius: 18,
    backgroundColor: C.white,
    ...(cardShadow as any),
  },
  cardInner: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.borderL,
  },

  // Hero
  heroCenter: { alignItems: 'center', padding: 24 },
  gradeRow: { flexDirection: 'row', alignItems: 'flex-end' },
  gradeNumber: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 64,
    color: C.text,
    lineHeight: 68,
  },
  gradeMax: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 20,
    color: C.text35,
    marginBottom: 10,
    marginLeft: 4,
  },
  coeffPill: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  coeffText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: C.text55,
  },
  heroMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: C.text35,
    marginTop: 6,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: 20,
    color: C.text,
  },
  statLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    color: C.text28,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 3,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.border,
  },

  // Sparkline
  sparkMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: C.text35,
    marginTop: 8,
  },

  // Forces
  forceRow: { flexDirection: 'row', marginHorizontal: 14, marginBottom: 6 },
  forceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  forceTitle: { fontFamily: FontFamily.sansSemiBold, fontSize: 13 },
  forceItem: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: C.text,
    marginBottom: 4,
  },

  // PJ
  pjRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  pjIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pjName: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: C.text,
  },
  pjMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: C.text35,
    marginTop: 2,
  },

  // Appréciation
  appreciation: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: C.text,
    lineHeight: 21,
    fontStyle: 'italic',
  },

  // Section label
  sectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: C.text,
    opacity: 0.28,
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
});
