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
import { aDesNotes, aUnEmploiDuTemps } from '../utils/niveau';
import { useDemoData } from '../contexts/DemoContext';
import { withAlpha } from '../utils/couleur';
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
  /** Couleur de la matière : même source que l'Agenda (couleur de l'événement de démo). */
  color: string;
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

// ─── Données démo : cours de l'agenda de démo de l'enfant actif ─────────────

/** Enseignants de l'univers de démo (src/data/demo/carnet.ts). */
const ENSEIGNANT_COLLEGE: Record<string, string> = {
  'Mathématiques': 'M. Petit',
  'Français': 'Mme Lambert',
  'SVT': 'M. Martin',
  'Anglais': 'Mme Bernard',
  'Physique-Chimie': 'M. Leclerc',
  'Histoire-Géo': 'M. Durand',
  'Vie de classe': 'Mme Rousseau',
};

const JOUR_LETTRE = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function lundiDe(d: Date): Date {
  const l = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  l.setDate(l.getDate() - ((l.getDay() + 6) % 7));
  return l;
}

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function enseignant(subject: string, college: boolean): string {
  if (college) return ENSEIGNANT_COLLEGE[subject] ?? '';
  return subject === 'EPS' ? 'M. Garcia' : 'Mme Dupont';
}

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
    <View style={[styles.courseCard, { backgroundColor: withAlpha(item.color, 0.08) }]}>
      {/* Barre gauche : couleur de la matière, comme les cartes de l'Agenda */}
      <View style={[styles.courseBar, { backgroundColor: item.color }]} />

      {/* Contenu */}
      <View style={styles.courseContent}>
        <View style={styles.courseTopRow}>
          <Text style={styles.courseSubject} numberOfLines={1}>
            {item.subject}
          </Text>
          {item.alert ? <AlertBadge label={item.alert} /> : null}
        </View>
        {(item.teacher || item.room) ? (
          <Text style={styles.courseMeta} numberOfLines={1}>
            {[item.teacher, item.room].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
    </View>
  </View>
);

// ─── Écran principal ──────────────────────────────────────────────────────────

function TimetableScreenContent({ childId, college }: { childId: string; college: boolean }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { getAgenda } = useDemoData();
  const aujourdHui = new Date();
  const [semaine, setSemaine] = useState(0);
  const lundi = lundiDe(aujourdHui);
  lundi.setDate(lundi.getDate() + semaine * 7);
  const jours = Array.from({ length: 7 }, (_, i) => new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + i));
  const indexAujourdHui = (aujourdHui.getDay() + 6) % 7;
  const [selectedDayIdx, setSelectedDayIdx] = useState(indexAujourdHui);

  const DAYS: DayInfo[] = jours.map((d, i) => ({ letter: JOUR_LETTRE[i], num: d.getDate() }));
  const dimanche = jours[6];
  const weekLabel = lundi.getMonth() === dimanche.getMonth()
    ? `Du ${lundi.getDate()} au ${dimanche.getDate()} ${MOIS[dimanche.getMonth()]}`
    : `Du ${lundi.getDate()} ${MOIS[lundi.getMonth()]} au ${dimanche.getDate()} ${MOIS[dimanche.getMonth()]}`;

  // Cours du jour choisi (journée type : identique chaque semaine), pauses ajoutées entre les créneaux.
  const cours = getAgenda(childId, isoLocal(jours[selectedDayIdx]))
    .filter((c) => c.type === 'cours' || c.type === 'examen')
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  // Primaire : l'enseignant titulaire et la salle de classe sont affichés UNE fois sous la bande
  // des jours ; chaque ligne ne montre que les exceptions (EPS : M. Garcia · Gymnase).
  // Collège : enseignant + salle sur chaque ligne.
  const titulaire = college ? '' : enseignant('', false);
  const salles = cours.map((c) => c.room).filter(Boolean);
  const salleClasse = college
    ? ''
    : salles.sort((a, b) => salles.filter((s) => s === b).length - salles.filter((s) => s === a).length)[0] ?? '';
  const SCHEDULE: ScheduleItem[] = [];
  cours.forEach((c, i) => {
    const precedent = cours[i - 1];
    if (precedent && precedent.endTime <= '12:00' && c.startTime >= '13:00') {
      SCHEDULE.push({ id: `pause-${c.id}`, type: 'break', label: 'Pause déjeuner · cantine' });
    }
    const prof = enseignant(c.subject, college);
    SCHEDULE.push({
      id: c.id,
      start: c.startTime,
      end: c.endTime,
      subject: c.title,
      teacher: college || prof !== titulaire ? prof : '',
      room: college || c.room !== salleClasse ? c.room : '',
      color: c.color || INDIGO,
    });
  });
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
          onPress={() => { setSemaine(0); setSelectedDayIdx(indexAujourdHui); }}
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
          onPress={() => setSemaine((s) => s - 1)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={18} color={TEXT55} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        <TouchableOpacity
          onPress={() => setSemaine((s) => s + 1)}
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

      {/* Primaire : titulaire + salle de classe, une seule fois */}
      {!college && cours.length > 0 && (
        <Text style={styles.classeLine} numberOfLines={1}>
          {[titulaire, salleClasse].filter(Boolean).join(' · ')}
        </Text>
      )}

      {/* ── Timeline du jour ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.timelineContent}
      >
        {SCHEDULE.length === 0 && (
          <Text style={styles.breakText}>{selectedDayIdx >= 5 || !college ? 'Pas d’école ce jour-là' : 'Pas de cours ce jour-là'}</Text>
        )}
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
  // Un ScrollView (même horizontal) a flexGrow: 1 par défaut : dans la colonne `root`, la bande
  // se partageait l'espace libre avec la timeline → grand vide sous les jours (Android). Hauteur
  // de la bande = son contenu, rien de plus.
  dayStrip: {
    flexGrow: 0,
    flexShrink: 0,
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
    borderRadius: 999,
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

  classeLine: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: TEXT55,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
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
 * Garde « un enfant = un carnet » : emploi du temps de l'enfant actif (démo uniquement).
 * Dès le CP (en primaire : journée type identique chaque semaine) ; jamais en maternelle.
 */
export default function TimetableScreen() {
  const { selectedChild } = useActiveChild();
  const { isDemo } = useAuth();
  if (!selectedChild) return <AucunEnfantPage title="Emploi du temps" />;
  if (!isDemo || !aUnEmploiDuTemps(selectedChild.cycle)) {
    return <PageVide title="Emploi du temps" message={`Pas d’emploi du temps pour ${selectedChild.name} pour l’instant.`} />;
  }
  return <TimetableScreenContent key={selectedChild.id} childId={selectedChild.id} college={aDesNotes(selectedChild.cycle)} />;
}
