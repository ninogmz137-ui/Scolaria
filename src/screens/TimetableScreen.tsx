/**
 * TimetableScreen — Emploi du temps (page profonde depuis Agenda)
 *
 * Header : ‹ Agenda | "Emploi du temps" centré | "Aujourd'hui" ghost
 * Sélecteur semaine + strip 7 jours L M M J V S D
 * Timeline du jour : colonne horaire gauche + blocs cours indigo
 * Fond #F2F1EE · paddingBottom 32
 *
 * Android rules:
 * - No `gap` → marginRight / marginBottom explicit
 * - No height:'100%' → flex:1
 * - No backdropFilter → semi-opaque colors
 */
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text } from '../components/ui';
import { AucunEnfantPage, PageVide } from '../components/AucunEnfant';
import { aDesNotes } from '../utils/niveau';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';

// ─── Tokens locaux ────────────────────────────────────────────────────────────

const BG         = '#F2F1EE';
const INDIGO     = '#4338CA';
const INDIGO_BG  = 'rgba(67,56,202,0.06)';
const AMBER      = '#F59E0B';
const AMBER_BG   = 'rgba(245,158,11,0.10)';
const TEXT       = '#0F172A';
const TEXT55     = 'rgba(15,23,42,0.55)';
const TEXT35     = 'rgba(15,23,42,0.35)';
const TEXT38     = 'rgba(15,23,42,0.38)';
const BORDER     = 'rgba(15,23,42,0.08)';

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertKind = 'SALLE CHANGÉE' | 'PROF ABSENT';

type CourseItem = {
  id: string;
  type?: undefined;
  start: string;
  end: string;
  subject: string;
  teacher: string;
  room: string;
  alert?: AlertKind;
};

type BreakItem = {
  id: string;
  type: 'break';
  label: string;
};

type ScheduleItem = CourseItem | BreakItem;

type DayInfo = {
  letter: string;
  num: number;
  modified?: boolean;
};

// ─── Données démo — élève de collège (Emma, 3e B) ────────────────────────────

const SCHEDULE: ScheduleItem[] = [
  {
    id: '1',
    start: '08:00',
    end: '09:00',
    subject: 'Mathématiques',
    teacher: 'M. Bernard',
    room: 'Salle A112',
  },
  {
    id: '2',
    start: '09:00',
    end: '10:00',
    subject: 'Anglais',
    teacher: 'Mme Larson',
    room: 'Salle C301',
  },
  { id: 'b1', type: 'break', label: 'Récréation · 15 min' },
  {
    id: '3',
    start: '10:15',
    end: '11:15',
    subject: 'Histoire',
    teacher: 'M. Renault',
    room: 'Salle B105',
  },
  {
    id: '4',
    start: '11:15',
    end: '12:15',
    subject: 'Français',
    teacher: 'Mme Dupont',
    room: 'Salle A210',
  },
  { id: 'b2', type: 'break', label: 'Pause déjeuner · cantine' },
  {
    id: '5',
    start: '13:30',
    end: '14:30',
    subject: 'SVT',
    teacher: 'Mme Pichon',
    room: 'Salle B204',
    alert: 'SALLE CHANGÉE',
  },
  {
    id: '6',
    start: '14:30',
    end: '15:30',
    subject: 'EPS',
    teacher: 'M. Olivier',
    room: 'Gymnase',
  },
];

// Semaine 18 · 4–10 mai 2026
// Point rouge sur Mardi (SVT salle changée)
const DAYS: DayInfo[] = [
  { letter: 'L', num: 4 },
  { letter: 'M', num: 5, modified: true },
  { letter: 'M', num: 6 },
  { letter: 'J', num: 7 },
  { letter: 'V', num: 8 },
  { letter: 'S', num: 9 },
  { letter: 'D', num: 10 },
];

// ─── Composants ───────────────────────────────────────────────────────────────

const AlertBadge: React.FC<{ label: AlertKind }> = ({ label }) => (
  <View style={styles.alertBadge}>
    <Text style={styles.alertBadgeText}>{label}</Text>
  </View>
);

const BreakRow: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.breakRow}>
    <Text style={styles.breakText}>{label}</Text>
  </View>
);

const CourseRow: React.FC<{ item: CourseItem }> = ({ item }) => (
  <View style={styles.courseRow}>
    {/* Colonne horaire */}
    <View style={styles.timeCol}>
      <Text style={styles.timeStart}>{item.start}</Text>
      <Text style={styles.timeEnd}>{item.end}</Text>
    </View>

    {/* Bloc cours */}
    <View style={styles.courseCard}>
      {/* Barre accent gauche */}
      <View style={styles.courseBar} />

      {/* Contenu */}
      <View style={styles.courseContent}>
        <View style={styles.courseTopRow}>
          <Text style={styles.courseSubject} numberOfLines={1}>
            {item.subject}
          </Text>
          {item.alert ? <AlertBadge label={item.alert} /> : null}
        </View>
        <Text style={styles.courseMeta} numberOfLines={1}>
          {item.teacher} · {item.room}
        </Text>
      </View>
    </View>
  </View>
);

// ─── Écran principal ──────────────────────────────────────────────────────────

function TimetableScreenContent() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [selectedDayIdx, setSelectedDayIdx] = useState(1); // Mardi par défaut

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header page profonde ── */}
      <View style={styles.header}>
        {/* Titre absolument centré */}
        <Text style={styles.headerTitle} pointerEvents="none">
          Emploi du temps
        </Text>

        {/* Gauche : ‹ Agenda */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={18} color={TEXT55} strokeWidth={2} />
          <Text style={styles.backLabel}>Agenda</Text>
        </TouchableOpacity>

        {/* Droite : Aujourd'hui */}
        <TouchableOpacity
          style={styles.todayBtnWrap}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Text style={styles.todayBtnText}>Aujourd'hui</Text>
        </TouchableOpacity>
      </View>

      {/* ── Sélecteur semaine ── */}
      <View style={styles.weekNav}>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={18} color={TEXT55} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>Semaine 18 · 4–10 mai 2026</Text>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <ChevronRight size={18} color={TEXT55} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* ── Strip 7 jours ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayStripContent}
        style={styles.dayStrip}
      >
        {DAYS.map((d, i) => {
          const isActive = i === selectedDayIdx;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => setSelectedDayIdx(i)}
              activeOpacity={0.75}
              style={[
                styles.dayItem,
                i < DAYS.length - 1 && styles.dayItemSpacing,
              ]}
            >
              <Text style={[styles.dayLetter, isActive && styles.dayLetterActive]}>
                {d.letter}
              </Text>
              <View style={[styles.dayCircle, isActive && styles.dayCircleActive]}>
                <Text style={[styles.dayNum, isActive && styles.dayNumActive]}>
                  {d.num}
                </Text>
              </View>
              {d.modified && !isActive ? (
                <View style={styles.modifiedDot} />
              ) : (
                <View style={styles.modifiedDotPlaceholder} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Timeline du jour ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.timelineContent}
      >
        {SCHEDULE.map((item) => {
          if (item.type === 'break') {
            return <BreakRow key={item.id} label={item.label} />;
          }
          return <CourseRow key={item.id} item={item as CourseItem} />;
        })}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    position: 'relative',
    backgroundColor: BG,
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: TEXT,
    letterSpacing: -0.2,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  backLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: TEXT55,
    marginLeft: 2,
  },
  todayBtnWrap: {
    zIndex: 1,
  },
  todayBtnText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: INDIGO,
  },

  // ── Semaine nav ──
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  weekLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: TEXT,
    letterSpacing: -0.2,
    flex: 1,
    textAlign: 'center',
  },

  // ── Day strip ──
  dayStrip: {
    marginBottom: 4,
  },
  dayStripContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  dayItem: {
    alignItems: 'center',
    minWidth: 38,
  },
  dayItemSpacing: {
    marginRight: 10,
  },
  dayLetter: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: TEXT38,
    letterSpacing: 0.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayLetterActive: {
    fontFamily: FontFamily.sansBold,
    color: TEXT,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: TEXT,
  },
  dayNum: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: TEXT38,
    letterSpacing: -0.2,
  },
  dayNumActive: {
    fontFamily: FontFamily.sansBold,
    color: '#FFFFFF',
  },
  modifiedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EF4444',
    marginTop: 3,
  },
  modifiedDotPlaceholder: {
    width: 4,
    height: 4,
    marginTop: 3,
  },

  // ── Timeline ──
  timelineContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },

  // ── Bloc cours ──
  courseRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    marginBottom: 8,
    alignItems: 'stretch',
  },
  timeCol: {
    width: 44,
    alignItems: 'flex-end',
    marginRight: 10,
    paddingTop: 9,
  },
  timeStart: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: TEXT35,
    letterSpacing: -0.1,
  },
  timeEnd: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 10,
    color: TEXT35,
    marginTop: 2,
    opacity: 0.8,
  },
  courseCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: INDIGO_BG,
    borderRadius: 10,
    overflow: 'hidden',
  },
  courseBar: {
    width: 3,
    backgroundColor: INDIGO,
  },
  courseContent: {
    flex: 1,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 10,
  },
  courseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  courseSubject: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: TEXT,
    letterSpacing: -0.1,
    flex: 1,
    marginRight: 6,
  },
  courseMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: TEXT55,
    letterSpacing: -0.05,
  },

  // ── Badge alerte ──
  alertBadge: {
    backgroundColor: AMBER_BG,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
  },
  alertBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 9,
    color: AMBER,
    letterSpacing: 0.3,
  },

  // ── Pause / récréation ──
  breakRow: {
    marginHorizontal: 14,
    marginLeft: 68, // aligné avec les blocs cours (44 timeCol + 10 margin + 14 padding = 68)
    marginBottom: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: TEXT35,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

/**
 * Garde « un enfant = un carnet » : ces données de démo sont celles d'un élève de collège.
 * Elles ne s'affichent qu'en mode démo, pour un enfant de collège / lycée ; sinon, page vide.
 */
export default function TimetableScreen() {
  const { selectedChild } = useActiveChild();
  const { isDemo } = useAuth();
  if (!selectedChild) return <AucunEnfantPage title="Emploi du temps" />;
  if (!isDemo || !aDesNotes(selectedChild.cycle)) {
    return <PageVide title="Emploi du temps" message={`Pas d’emploi du temps pour ${selectedChild.name} pour l’instant.`} />;
  }
  return <TimetableScreenContent />;
}
