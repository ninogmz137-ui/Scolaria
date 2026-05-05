/**
 * TimetableScreen — Emploi du temps
 * Semaine 18 · Emma 4ᵉB — vue journée avec créneaux et AriaInlineCard.
 *
 * Android rules applied:
 * - No `gap` → marginRight/marginBottom explicit
 * - CourseCard: outer View (shadow) + inner View (overflow:hidden) pattern
 * - No `height: '100%'` on left bar → flex:1 on content, bar auto-stretches
 * - No backdropFilter → semi-opaque colors only
 * - useSafeAreaInsets unused here (SafeAreaView handles it)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { C, SHADOW } from '../constants/design';
import { FontFamily } from '../hooks/useSolariaFonts';
import { DeepScreenHeader } from '../components/DeepScreenHeader';
import { AriaInlineCard } from '../components/AriaInlineCard';

// ─── Types ────────────────────────────────────────────────────────────────────

type CourseItem = {
  id: string;
  type?: never;
  start: string;
  end: string;
  subject: string;
  teacher: string;
  room: string;
  color: string;
  colorBg: string;
  alert?: string;
};

type BreakItem = {
  id: string;
  type: 'break';
  label: string;
};

type ScheduleItem = CourseItem | BreakItem;

// ─── Demo data ────────────────────────────────────────────────────────────────

const SCHEDULE: ScheduleItem[] = [
  {
    id: '1',
    start: '08:00',
    end: '09:00',
    subject: 'Mathématiques',
    teacher: 'M. Dupont',
    room: 'Salle 204',
    color: '#4338CA',
    colorBg: 'rgba(67,56,202,0.08)',
  },
  {
    id: '2',
    start: '09:00',
    end: '10:00',
    subject: 'Français',
    teacher: 'Mme Laurent',
    room: 'Salle 102',
    color: '#059669',
    colorBg: 'rgba(5,150,105,0.08)',
  },
  {
    id: 'break1',
    type: 'break',
    label: 'Récréation · 10 min',
  },
  {
    id: '3',
    start: '10:15',
    end: '11:15',
    subject: 'Histoire-Géo',
    teacher: 'M. Martin',
    room: 'Salle 110',
    color: '#D97706',
    colorBg: 'rgba(217,119,6,0.08)',
  },
  {
    id: '4',
    start: '11:15',
    end: '12:15',
    subject: 'Anglais',
    teacher: 'Mme Petit',
    room: 'Salle 201',
    color: '#0891B2',
    colorBg: 'rgba(8,145,178,0.08)',
  },
  {
    id: 'break2',
    type: 'break',
    label: 'Déjeuner · 1h30',
  },
  {
    id: '5',
    start: '13:45',
    end: '14:45',
    subject: 'SVT',
    teacher: 'M. Rousseau',
    room: 'Labo B204',
    color: '#7C3AED',
    colorBg: 'rgba(124,58,237,0.08)',
    alert: 'Salle changée',
  },
  {
    id: '6',
    start: '14:45',
    end: '15:45',
    subject: 'EPS',
    teacher: 'M. Leblanc',
    room: 'Gymnase',
    color: '#DB2777',
    colorBg: 'rgba(219,39,119,0.08)',
  },
];

type DayInfo = {
  letter: string;
  num: number;
  active?: boolean;
};

const DAYS: DayInfo[] = [
  { letter: 'L', num: 4 },
  { letter: 'M', num: 5, active: true },
  { letter: 'M', num: 6 },
  { letter: 'J', num: 7 },
  { letter: 'V', num: 8 },
  { letter: 'S', num: 9 },
  { letter: 'D', num: 10 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const WeekHeader: React.FC = () => (
  <View style={styles.weekHeader}>
    <TouchableOpacity
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
    >
      <ChevronLeft size={20} color={C.text55} strokeWidth={2} />
    </TouchableOpacity>
    <Text style={styles.weekLabel}>Semaine 18 · 4-10 mai 2026</Text>
    <TouchableOpacity
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
    >
      <ChevronRight size={20} color={C.text55} strokeWidth={2} />
    </TouchableOpacity>
  </View>
);

const DayPill: React.FC<DayInfo> = ({ letter, num, active }) => {
  if (active) {
    return (
      <View style={[styles.dayPill, styles.dayPillActive]}>
        <Text style={[styles.dayLetter, styles.dayLetterActive]}>{letter}</Text>
        <Text style={[styles.dayNum, styles.dayNumActive]}>{num}</Text>
      </View>
    );
  }
  return (
    <View style={styles.dayPill}>
      <Text style={styles.dayLetter}>{letter}</Text>
      <Text style={styles.dayNum}>{num}</Text>
    </View>
  );
};

const BreakRow: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.breakRow}>
    <Text style={styles.breakText}>{label}</Text>
  </View>
);

const AlertBadge: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.alertBadge}>
    <Text style={styles.alertBadgeText}>{label.toUpperCase()}</Text>
  </View>
);

const CourseCard: React.FC<{ item: CourseItem }> = ({ item }) => (
  <View style={styles.courseRow}>
    {/* Time column */}
    <View style={styles.timeCol}>
      <Text style={styles.timeStart}>{item.start}</Text>
      <Text style={styles.timeEnd}>{item.end}</Text>
    </View>

    {/* Card — Android shadow pattern: outer = bg+shadow, inner = overflow:hidden */}
    <View style={styles.courseCardOuter}>
      <View style={styles.courseCardInner}>
        {/* Left accent bar */}
        <View style={[styles.courseBar, { backgroundColor: item.color }]} />

        {/* Content */}
        <View style={styles.courseContent}>
          {/* Subject badge row */}
          <View style={styles.courseTopRow}>
            <View style={[styles.subjectBadge, { backgroundColor: item.colorBg }]}>
              <Text style={[styles.subjectBadgeText, { color: item.color }]}>
                {item.subject.toUpperCase()}
              </Text>
            </View>
            {item.alert && <AlertBadge label={item.alert} />}
          </View>

          {/* Teacher */}
          <Text style={styles.teacherName} numberOfLines={1}>
            {item.teacher}
          </Text>

          {/* Room */}
          <Text style={styles.roomText} numberOfLines={1}>
            {item.room}
          </Text>
        </View>
      </View>
    </View>
  </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TimetableScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.root}>
      <DeepScreenHeader
        onBack={() => navigation.goBack()}
        title="Emploi du temps"
        subtitle="Emma · 4ᵉB"
        rightElement={
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.todayBtn}>Aujourd'hui</Text>
          </TouchableOpacity>
        }
      />

      {/* Week navigation */}
      <WeekHeader />

      {/* Day strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayStripContainer}
        style={styles.dayStrip}
      >
        {DAYS.map((d, i) => (
          <View key={i} style={i < DAYS.length - 1 ? styles.dayPillSpacing : undefined}>
            <DayPill {...d} />
          </View>
        ))}
      </ScrollView>

      {/* Schedule list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scheduleContent}
      >
        {SCHEDULE.map((item) => {
          if (item.type === 'break') {
            return <BreakRow key={item.id} label={item.label} />;
          }
          return <CourseCard key={item.id} item={item as CourseItem} />;
        })}

        {/* Aria alert card */}
        <AriaInlineCard>
          <Text style={styles.ariaText}>
            Salle SVT déplacée en B204 demain.
          </Text>
        </AriaInlineCard>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const iosShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  android: {},
  default: {},
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── Today button ──
  todayBtn: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: C.indigo,
    letterSpacing: -0.1,
  },

  // ── Week header ──
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  weekLabel: {
    flex: 1,
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: C.text,
    letterSpacing: -0.2,
    textAlign: 'center',
  },

  // ── Day strip ──
  dayStrip: {
    marginBottom: 12,
  },
  dayStripContainer: {
    paddingHorizontal: 14,
  },
  dayPill: {
    width: 42,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
  },
  dayPillActive: {
    backgroundColor: C.text,
  },
  dayPillSpacing: {
    marginRight: 8,
  },
  dayLetter: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: C.text35,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  dayLetterActive: {
    color: C.white,
  },
  dayNum: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    color: C.text,
    letterSpacing: -0.3,
  },
  dayNumActive: {
    color: C.white,
  },

  // ── Schedule scroll ──
  scheduleContent: {
    paddingBottom: 100,
    paddingTop: 4,
  },

  // ── Break row ──
  breakRow: {
    height: 32,
    marginHorizontal: 14,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: C.text28,
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // ── Course row ──
  courseRow: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginBottom: 8,
    alignItems: 'stretch',
  },

  // ── Time column ──
  timeCol: {
    width: 48,
    alignItems: 'flex-end',
    marginRight: 12,
    paddingTop: 10,
  },
  timeStart: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: C.text35,
    letterSpacing: -0.1,
  },
  timeEnd: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: C.text28,
    marginTop: 2,
  },

  // ── Course card ──
  // outer: bg + shadow (Android elevation 0, iOS shadow)
  courseCardOuter: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: C.white,
    ...iosShadow,
  },
  // inner: overflow:hidden for left bar clip
  courseCardInner: {
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  courseBar: {
    width: 3,
  },
  courseContent: {
    flex: 1,
    padding: 10,
    paddingLeft: 12,
  },
  courseTopRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  subjectBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 6,
  },
  subjectBadgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  teacherName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13.5,
    color: C.text,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  roomText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11.5,
    color: C.text55,
    letterSpacing: -0.1,
  },

  // ── Alert badge ──
  alertBadge: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  alertBadgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    color: C.amber,
    letterSpacing: 0.4,
  },

  // ── Aria text ──
  ariaText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13.5,
    color: C.text,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
});
