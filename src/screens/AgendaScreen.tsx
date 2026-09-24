/**
 * AgendaScreen — Complete redesign v2.
 *
 * - Month title (tappable) → collapsible calendar panel
 * - Calendar panel: horizontal month scroll + full monthly grid
 * - Week day strip (always visible, 7 days, first-letter labels)
 * - Day title + event count
 * - Swipeable day pages (horizontal FlatList, pagingEnabled)
 * - Event card: left accent bar + text only (jamais d'emoji dans une card Agenda)
 * - Ajout d'événement : bouton + de la bottom bar (pas de FAB, voir tasks/todo.md Phase B)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions,
  LayoutAnimation,
  UIManager,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, ChevronDown, CalendarCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { C } from '../constants/design';
import { useTopbarScrollHandler } from '../contexts/TopbarScrollContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemoData } from '../contexts/DemoContext';
import { getAgendaEvents, createAgendaEvent, toggleEventDone } from '../services/database';
import { getBottomBarScrollPadding } from '../components/navigation/BottomBar';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text, TextInput, Pressable } from '../components/ui';
import { AucunEnfantOnglet } from '../components/AucunEnfant';
import { aDesNotes } from '../utils/niveau';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Constants ────────────────────────────────────────────

const FRENCH_MONTH_NAMES_FULL = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const SHORT_MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const FRENCH_MONTH_NAMES = [
  'janv', 'févr', 'mars', 'avr', 'mai', 'juin',
  'juil', 'août', 'sept', 'oct', 'nov', 'déc',
];
const FRENCH_DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const WEEK_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// ─── Types ────────────────────────────────────────────────

interface DayInfo {
  date: number;
  day: string;
  month: string;
  isToday: boolean;
}

interface AgendaEvent {
  id: string;
  title: string;
  time: string;
  endTime?: string;
  type: 'cours' | 'devoir' | 'examen' | 'activite' | 'reunion' | 'sortie';
  subject?: string;
  location?: string;
  description?: string;
  color: string;
  done?: boolean;
}

type NewEventType = 'devoir' | 'controle' | 'sortie' | 'autre';
type FilterTab = 'Tout' | 'Devoirs' | 'Événements' | 'Rappels';
const FILTER_TABS: FilterTab[] = ['Tout', 'Devoirs', 'Événements', 'Rappels'];

interface DevoirItem {
  id: string;
  subject: string;
  title: string;
  time: string;
  attachment?: string;
  isDemain?: boolean;
  done: boolean;
  detail?: string;
}

interface DevoirGroup {
  label: string;
  sublabel: string;
  isRendus?: boolean;
  devoirs: DevoirItem[];
}

const NEW_EVENT_TYPE_LABELS: Record<NewEventType, string> = {
  devoir: 'Devoir', controle: 'Contrôle', sortie: 'Sortie', autre: 'Autre',
};

// ─── Helpers ──────────────────────────────────────────────

/** '#RRGGBB' / '#RGB' → rgba(r,g,b,alpha). Évite les hex à 8 chiffres concaténés (color + '12'). */
function withAlpha(color: string, alpha: number): string {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(15,23,42,${alpha})`;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function buildWeekDays(referenceDate: Date): (DayInfo & { fullDate: Date })[] {
  const monday = getMondayOfWeek(referenceDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: d.getDate(),
      day: FRENCH_DAY_NAMES[d.getDay()],
      month: FRENCH_MONTH_NAMES[d.getMonth()],
      isToday: d.getTime() === today.getTime(),
      fullDate: d,
    };
  });
}

function formatDateFR(date: Date): string {
  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const months = [
    'jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin',
    'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
  ];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

function buildCalendarGrid(
  year: number,
  month: number,
): { day: number; isCurrentMonth: boolean; fullDate: Date }[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();

  const grid: { day: number; isCurrentMonth: boolean; fullDate: Date }[][] = [];
  let currentDay = 1 - startDayOfWeek;

  for (let week = 0; week < 6; week++) {
    const row: { day: number; isCurrentMonth: boolean; fullDate: Date }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(year, month, currentDay);
      row.push({
        day: date.getDate(),
        isCurrentMonth: currentDay >= 1 && currentDay <= daysInMonth,
        fullDate: date,
      });
      currentDay++;
    }
    grid.push(row);
    if (currentDay > daysInMonth) break;
  }
  return grid;
}

const DEFAULT_COLOR: Record<AgendaEvent['type'], string> = {
  cours: Colors.violet, devoir: Colors.orange, examen: Colors.red,
  activite: Colors.cyan, reunion: Colors.violet, sortie: Colors.cyan,
};
const TYPE_LABELS: Record<AgendaEvent['type'], string> = {
  cours: 'Cours', devoir: 'Devoir', examen: 'Examen',
  activite: 'Activité', reunion: 'Réunion', sortie: 'Sortie',
};

// ─── Animated checkbox ────────────────────────────────────

function AnimatedCheckbox({ done, onPress }: { done: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (done) {
      scale.value = withSequence(
        withSpring(0.85, { damping: 15, stiffness: 300 }),
        withSpring(1.1, { damping: 10, stiffness: 300 }),
        withSpring(1.0, { damping: 15, stiffness: 300 }),
      );
    }
  }, [done]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Animated.View style={[st.checkboxWrap, animatedStyle]}>
        {done ? (
          <View style={[st.checkboxGradient, { backgroundColor: '#0F172A' }]}>
            <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        ) : (
          <View style={st.checkboxEmpty} />
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Homework checkbox (18px) ─────────────────────────────

function HomeworkCheckbox({ done, onPress }: { done: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (done) {
      scale.value = withSequence(
        withSpring(0.75, { damping: 15, stiffness: 350 }),
        withSpring(1.15, { damping: 10, stiffness: 300 }),
        withSpring(1.0, { damping: 15, stiffness: 300 }),
      );
    }
  }, [done]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <Animated.View style={animStyle}>
        {done ? (
          <View style={st.hwCheckFilled}>
            <Check size={10} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : (
          <View style={st.hwCheckEmpty} />
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Component ────────────────────────────────────────────

function AgendaScreenContent() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { selectedChildId, selectedChild, loading: childLoading } = useActiveChild();
  const { user } = useAuth();
  const { isDemoMode, getAgenda: getDemoAgenda, toggleAgendaDone: demoToggleDone } = useDemoData();
  const getDemoAgendaRef = useRef(getDemoAgenda);
  getDemoAgendaRef.current = getDemoAgenda;
  const insets = useSafeAreaInsets();
  const scrollHandler = useTopbarScrollHandler();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // ─── Calendar panel state ──────────────────────────────
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // ─── Week / day state ──────────────────────────────────
  const flatListRef = useRef<FlatList>(null);
  const isProgrammaticScroll = useRef(false);

  const [weekOffset, setWeekOffset] = useState(0);
  const referenceDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const [weekDays, setWeekDays] = useState(() => buildWeekDays(new Date()));
  // Jamais d'événements fictifs : démo = agenda de l'enfant actif, compte réel = la base.
  const [eventsByDay, setEventsByDay] = useState<Record<number, AgendaEvent[]>>({});
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedFullDate, setSelectedFullDate] = useState(today);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Tout');
  const avecDevoirs = aDesNotes(selectedChild?.cycle);
  const filtres = FILTER_TABS.filter((f) => f !== 'Devoirs' || avecDevoirs);
  // Changement d'enfant vers la maternelle / le primaire : pas de filtre « Devoirs ».
  useEffect(() => {
    if (!avecDevoirs && activeFilter === 'Devoirs') setActiveFilter('Tout');
  }, [avecDevoirs, activeFilter]);
  const [expandedDevoir, setExpandedDevoir] = useState<string | null>(null);
  const [devoirDoneMap, setDevoirDoneMap] = useState<Record<string, boolean>>({});

  const isSelectedToday = useMemo(
    () => weekDays.find((d) => d.date === selectedDay)?.isToday ?? false,
    [weekDays, selectedDay],
  );

  // Calendar grid derived from currentMonth/currentYear
  const calendarGrid = useMemo(
    () => buildCalendarGrid(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  // All event dates for the current month (to show dots)
  const eventDatesSet = useMemo(() => {
    const set = new Set<string>();
    for (const [, events] of Object.entries(eventsByDay)) {
      if (events.length > 0) {
        // We derive which dates have events from weekDays
        weekDays.forEach((wd) => {
          if ((eventsByDay[wd.date]?.length ?? 0) > 0) {
            const key = `${wd.fullDate.getFullYear()}-${wd.fullDate.getMonth()}-${wd.date}`;
            set.add(key);
          }
        });
      }
    }
    return set;
  }, [eventsByDay, weekDays]);

  // Sync FlatList when selectedDay changes
  useEffect(() => {
    const idx = weekDays.findIndex((d) => d.date === selectedDay);
    if (idx >= 0) {
      isProgrammaticScroll.current = true;
      flatListRef.current?.scrollToIndex({ index: idx, animated: true });
    }
  }, [selectedDay, weekDays]);

  const selectDay = useCallback((dayInfo: (typeof weekDays)[0]) => {
    setSelectedDay(dayInfo.date);
    setSelectedFullDate(dayInfo.fullDate);
    setExpandedEvent(null);
    setCurrentMonth(dayInfo.fullDate.getMonth());
    setCurrentYear(dayInfo.fullDate.getFullYear());
  }, []);

  const goToToday = useCallback(() => {
    setWeekOffset(0);
    setSelectedDay(today.getDate());
    setSelectedFullDate(today);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setExpandedEvent(null);
  }, [today]);

  const toggleDone = useCallback((eventId: string) => {
    setEventsByDay((prev) => {
      const updated: Record<number, AgendaEvent[]> = {};
      for (const [day, events] of Object.entries(prev)) {
        updated[Number(day)] = events.map((e) =>
          e.id === eventId ? { ...e, done: !e.done } : e,
        );
      }
      if (isDemoMode) {
        demoToggleDone(eventId);
      } else if (!eventId.startsWith('local-')) {
        const newDone = !Object.values(prev).flat().find((e) => e.id === eventId)?.done;
        toggleEventDone(eventId, newDone).catch(() => {/* optimistic update already applied */});
      }
      return updated;
    });
  }, [isDemoMode, demoToggleDone]);

  // ─── Demo devoirs data ─────────────────────────────────
  const demoDevoirs = useMemo((): DevoirGroup[] => {
    // Devoirs de démo : collège / lycée, en mode démo uniquement (jamais pour un compte réel).
    if (!isDemoMode || !aDesNotes(selectedChild?.cycle)) return [];
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const tomorrow = new Date(t); tomorrow.setDate(t.getDate() + 1);
    const inThreeDays = new Date(t); inThreeDays.setDate(t.getDate() + 3);
    const fourDaysAgo = new Date(t); fourDaysAgo.setDate(t.getDate() - 4);
    const DAY_SHORT = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
    const DAY_FULL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const MONTH = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const fmt = (d: Date) => `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return [
      {
        label: fmt(tomorrow),
        sublabel: 'Demain',
        devoirs: [
          { id: 'hw1', subject: 'MATHS', title: 'Exercices p.84 n°12 à 18', time: '8h00', attachment: '1 PDF', isDemain: true, done: false },
          { id: 'hw2', subject: 'ANGLAIS', title: 'Apprendre vocabulaire unit 6', time: '10h00', done: false },
          { id: 'hw3', subject: 'HISTOIRE', title: 'Lire chapitre 7', time: '14h00', detail: 'Manuel p.142', isDemain: true, done: false },
        ],
      },
      {
        label: fmt(inThreeDays),
        sublabel: cap(DAY_FULL[inThreeDays.getDay()]),
        devoirs: [
          { id: 'hw4', subject: 'FRANÇAIS', title: 'Rédaction 200 mots', time: '9h00', attachment: 'Sujet PDF', done: false },
          { id: 'hw5', subject: 'SVT', title: 'Compléter fiche révision', time: '11h00', done: false },
        ],
      },
      {
        label: fmt(fourDaysAgo),
        sublabel: `${cap(DAY_FULL[fourDaysAgo.getDay()])} dernier`,
        isRendus: true,
        devoirs: [
          { id: 'hw6', subject: 'ESPAGNOL', title: 'Conjugaison pretérito', time: '', done: true },
          { id: 'hw7', subject: 'MATHS', title: 'DM n°3', time: '', done: true },
        ],
      },
    ];
  }, [isDemoMode, selectedChild?.cycle]);

  const toggleDevoirDone = useCallback((id: string) => {
    setDevoirDoneMap((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }));
  }, []);

  // ─── Add event modal ───────────────────────────────────
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<NewEventType>('devoir');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (route.params?.openAddModal) {
      setAddModalVisible(true);
      navigation.setParams({ openAddModal: false } as any);
    }
  }, [route.params?.openAddModal]);

  const selectedDayLabel = weekDays.find((d) => d.date === selectedDay);

  // ─── Data loading ──────────────────────────────────────
  const loadEvents = useCallback(async () => {
    if (!selectedChildId) return;
    const computed = buildWeekDays(referenceDate);
    setWeekDays(computed);

    setSelectedDay((prev) => {
      const isCurrentWeek = computed.some((d) => d.isToday);
      if (isCurrentWeek) {
        const todayInWeek = computed.find((d) => d.isToday);
        return todayInWeek ? todayInWeek.date : computed[0].date;
      }
      const stillValid = computed.find((d) => d.date === prev);
      return stillValid ? prev : computed[0].date;
    });

    // Sync selectedFullDate too
    setSelectedFullDate((prev) => {
      const isCurrentWeek = computed.some((d) => d.isToday);
      if (isCurrentWeek) {
        return computed.find((d) => d.isToday)?.fullDate ?? prev;
      }
      return computed.find((d) => d.fullDate.getTime() === prev.getTime())?.fullDate ?? computed[0].fullDate;
    });

    if (isDemoMode) {
      const grouped: Record<number, AgendaEvent[]> = {};
      for (let i = 0; i < 7; i++) {
        const dayDate = computed[i].fullDate;
        const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
        // Devoirs : collège / lycée uniquement (jamais en maternelle ni en primaire).
        const demoEvents = getDemoAgendaRef.current(selectedChildId, dateStr).filter(
          (ev) => avecDevoirs || ev.type !== 'devoir',
        );
        if (demoEvents.length > 0) {
          grouped[computed[i].date] = demoEvents.map((e) => ({
            id: e.id,
            title: e.title,
            time: e.startTime,
            endTime: e.endTime || undefined,
            type: (e.type || 'cours') as AgendaEvent['type'],
            subject: e.subject || undefined,
            location: e.room || undefined,
            description: e.description || undefined,
            color: e.color || Colors.violet,
            done: e.is_completed ?? false,
          }));
        }
      }
      if (Object.keys(grouped).length === 0) {
        setEventsByDay({});
      } else {
        setEventsByDay(grouped);
      }
      return;
    }

    const monday = computed[0].fullDate;
    const sunday = computed[6].fullDate;
    const endOfSunday = new Date(sunday);
    endOfSunday.setHours(23, 59, 59, 999);

    const result = await getAgendaEvents(selectedChildId, {
      startDate: monday.toISOString(),
      endDate: endOfSunday.toISOString(),
    });
    const rows = result?.data ?? [];
    if (rows.length === 0) { setEventsByDay({}); return; }

    const grouped: Record<number, AgendaEvent[]> = {};
    for (const row of rows) {
      const d = new Date(row.start_time);
      const dayNum = d.getDate();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const endDate2 = row.end_time ? new Date(row.end_time) : null;
      const endHH = endDate2 ? String(endDate2.getHours()).padStart(2, '0') : undefined;
      const endMM = endDate2 ? String(endDate2.getMinutes()).padStart(2, '0') : undefined;
      const type = (row.event_type ?? 'cours') as AgendaEvent['type'];
      const mapped: AgendaEvent = {
        id: row.id, title: row.title,
        time: `${hh}:${mm}`,
        endTime: endHH ? `${endHH}:${endMM}` : undefined,
        type, subject: row.subject,
        location: row.location, description: row.description,
        color: row.color ?? DEFAULT_COLOR[type] ?? Colors.violet,
        done: row.is_done ?? false,
      };
      if (!grouped[dayNum]) grouped[dayNum] = [];
      grouped[dayNum].push(mapped);
    }
    setEventsByDay(grouped);
  }, [selectedChildId, referenceDate, isDemoMode, avecDevoirs]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const openAddModal = useCallback(() => {
    if (childLoading) {
      Alert.alert('Chargement', 'Les données sont en cours de chargement, veuillez patienter.');
      return;
    }
    setNewEventTitle('');
    setNewEventType('devoir');
    setAddModalVisible(true);
  }, [selectedChild, selectedChildId, childLoading]);

  const handleCreateEvent = useCallback(async () => {
    if (!newEventTitle.trim()) {
      Alert.alert('Titre requis', 'Veuillez saisir un titre pour l\'événement.');
      return;
    }
    const currentChildId = selectedChild?.id ?? null;
    // Compte réel (jamais la démo) avec un enfant actif.
    const isReal = !!currentChildId && !isDemoMode;

    const selectedDayInfo = weekDays.find((d) => d.date === selectedDay);
    const dayDate = selectedDayInfo?.fullDate ?? new Date();
    dayDate.setHours(8, 0, 0, 0);

    const typeMap: Record<NewEventType, AgendaEvent['type']> = {
      devoir: 'devoir', controle: 'examen', sortie: 'sortie', autre: 'activite',
    };

    setIsSaving(true);
    try {
      if (isReal && currentChildId && user?.id) {
        const result = await createAgendaEvent({
          child_id: currentChildId,
          parent_id: user.id,
          title: newEventTitle.trim(),
          event_type: typeMap[newEventType],
          start_time: dayDate.toISOString(),
        });
        if (result?.error) {
          console.error('[Agenda] createAgendaEvent error:', JSON.stringify(result.error));
          Alert.alert('Erreur', `Impossible de créer l'événement : ${result.error.message || 'Veuillez réessayer.'}`);
          return;
        }
        await loadEvents();
      } else {
        const hh = dayDate.getHours().toString().padStart(2, '0');
        const localEvent: AgendaEvent = {
          id: `local-${Date.now()}`,
          title: newEventTitle.trim(),
          time: `${hh}h00`,
          type: typeMap[newEventType],
          color: DEFAULT_COLOR[typeMap[newEventType]] ?? '#4338CA',
        };
        setEventsByDay((prev) => ({
          ...prev,
          [selectedDay]: [...(prev[selectedDay] ?? []), localEvent],
        }));
      }
      setAddModalVisible(false);
    } finally {
      setIsSaving(false);
    }
  }, [newEventTitle, newEventType, selectedChild, selectedChildId, user, selectedDay, weekDays, loadEvents]);

  // ─── Calendar panel: toggle with LayoutAnimation ───────
  const toggleCalendar = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCalendarOpen((v) => !v);
  }, []);

  // ─── Calendar grid: tap a day ──────────────────────────
  const selectCalendarDay = useCallback((fullDate: Date) => {
    const dayOfWeek = fullDate.getDay(); // 0=Sun
    const weekContainingDay = buildWeekDays(fullDate);
    setWeekDays(weekContainingDay);
    // Semaine de référence = celle du jour choisi : sinon les événements restent ceux de la semaine en cours.
    const semaines = Math.round(
      (getMondayOfWeek(fullDate).getTime() - getMondayOfWeek(new Date()).getTime()) / (7 * 86400000),
    );
    setWeekOffset(semaines);

    const dayNum = fullDate.getDate();
    setSelectedDay(dayNum);
    setSelectedFullDate(fullDate);
    setCurrentMonth(fullDate.getMonth());
    setCurrentYear(fullDate.getFullYear());
    setExpandedEvent(null);

    // Scroll FlatList to correct index
    const idx = weekContainingDay.findIndex((d) => d.date === dayNum);
    if (idx >= 0) {
      isProgrammaticScroll.current = true;
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: idx, animated: false });
      }, 50);
    }

    // Close calendar
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCalendarOpen(false);
  }, []);

  // ─── Render homework (Cahier de texte) view ───────────
  const renderHomeworkView = () => {
    const pendingCount = demoDevoirs.reduce(
      (acc, g) => !g.isRendus ? acc + g.devoirs.filter((d) => !(devoirDoneMap[d.id] ?? d.done)).length : acc, 0,
    );
    const thisWeekCount = 2;
    const rendusCount = demoDevoirs.find((g) => g.isRendus)?.devoirs.length ?? 0;

    const renderDevoirRow = (devoir: DevoirItem, isRendu: boolean) => {
      const isDone = devoirDoneMap[devoir.id] ?? devoir.done;
      const isExpanded = expandedDevoir === devoir.id;
      const metaParts: string[] = [];
      if (devoir.time) metaParts.push(`Pour ${devoir.time}`);
      if (devoir.attachment) metaParts.push(devoir.attachment);
      if (devoir.detail) metaParts.push(devoir.detail);
      return (
        <Pressable
          key={devoir.id}
          onPress={() => setExpandedDevoir(isExpanded ? null : devoir.id)}
          style={({ pressed }) => [pressed && { opacity: 0.75 }]}
        >
          <View style={[st.hwRow, isRendu && st.hwRowRendu]}>
            <HomeworkCheckbox done={isDone} onPress={() => toggleDevoirDone(devoir.id)} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={st.hwPillRow}>
                <View style={st.hwSubjectPill}>
                  <Text style={st.hwSubjectText}>{devoir.subject}</Text>
                </View>
                {devoir.isDemain && !isRendu && (
                  <View style={st.hwDemainBadge}>
                    <Text style={st.hwDemainText}>DEMAIN</Text>
                  </View>
                )}
              </View>
              <Text style={[st.hwTitle, isDone && { textDecorationLine: 'line-through', opacity: 0.45 }]}>
                {devoir.title}
              </Text>
              {metaParts.length > 0 && (
                <Text style={st.hwMeta}>{metaParts.join(' · ')}</Text>
              )}
            </View>
          </View>
        </Pressable>
      );
    };

    return (
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: getBottomBarScrollPadding(insets.bottom),
        }}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
      >
        <View style={st.hwStats}>
          <Text style={st.hwStatNum}>{pendingCount}</Text>
          <Text style={st.hwStatLabel}> à faire</Text>
          <Text style={st.hwStatSep}> · </Text>
          <Text style={st.hwStatNum}>{thisWeekCount}</Text>
          <Text style={st.hwStatLabel}> cette semaine</Text>
          <Text style={st.hwStatSep}> · </Text>
          <Text style={st.hwStatNum}>{rendusCount}</Text>
          <Text style={st.hwStatLabel}> rendus</Text>
        </View>
        {demoDevoirs.map((group) => (
          <View key={group.label} style={{ marginBottom: 8 }}>
            <View style={st.hwSectionRow}>
              <Text style={st.hwSectionLabel}>
                {`${group.label} · ${group.sublabel}`.toUpperCase()}
              </Text>
              <Text style={st.hwSectionCount}>{group.devoirs.length}</Text>
            </View>
            <View style={group.isRendus ? st.hwRendusGroup : undefined}>
              {group.devoirs.map((d) => renderDevoirRow(d, group.isRendus ?? false))}
            </View>
          </View>
        ))}
      </Animated.ScrollView>
    );
  };

  // ─── Render event card ─────────────────────────────────
  const renderEventCard = (event: AgendaEvent) => {
    const isExam = event.type === 'examen';
    const isDevoir = event.type === 'devoir';

    return (
      <TouchableOpacity
        key={event.id}
        onPress={() =>
          navigation.navigate('EventDetail', {
            eventId: event.id,
            eventTitle: event.title,
            eventCategory: TYPE_LABELS[event.type] ?? event.type,
            eventTime: event.endTime ? `${event.time} – ${event.endTime}` : event.time,
            eventLocation: event.location,
            eventDescription: event.description,
          })
        }
        activeOpacity={0.8}
        style={[
          st.eventCard,
          { borderLeftColor: event.color, backgroundColor: withAlpha(event.color, 0.08) },
          isDevoir && event.done && { opacity: 0.55 },
        ]}
      >
        <View style={st.eventInner}>
          {/* Title + time */}
          <View style={{ flex: 1 }}>
            <Text
              style={[
                st.eventTitle,
                isDevoir && event.done && { textDecorationLine: 'line-through', color: '#94A3B8' },
              ]}
            >
              {event.title}
            </Text>
            <Text style={st.eventMeta}>
              {event.time}{event.endTime ? ` — ${event.endTime}` : ''}{event.location ? ` · ${event.location}` : ''}
            </Text>
          </View>

          {/* Right: exam badge or devoir checkbox */}
          {isExam && (
            <View style={st.examBadge}>
              <Text style={st.examBadgeText}>Examen</Text>
            </View>
          )}
          {isDevoir && (
            <AnimatedCheckbox
              done={event.done ?? false}
              onPress={() => toggleDone(event.id)}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Render day page ───────────────────────────────────
  const renderDayPage = ({ item }: { item: (typeof weekDays)[0] }) => {
    const dayEvents = eventsByDay[item.date] ?? [];
    const dayEventCount = dayEvents.length;

    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
        {/* Day title row */}
        <View style={st.dayTitleRow}>
          <Text style={st.dayTitleText}>
            {formatDateFR(item.fullDate).replace(/^./, (c) => c.toUpperCase())}
          </Text>
          <Text style={st.dayEventCount}>
            {dayEventCount > 0 ? `${dayEventCount} événement${dayEventCount > 1 ? 's' : ''}` : 'Libre'}
          </Text>
        </View>

        <Animated.ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: getBottomBarScrollPadding(insets.bottom),
          }}
          nestedScrollEnabled
        >
          {dayEvents.length === 0 ? (
            <View style={st.emptyState}>
              <View style={st.emptyIconWrap}>
                <CalendarCheck size={32} color="rgba(15,23,42,0.35)" strokeWidth={1.8} />
              </View>
              <Text style={st.emptyTitle}>Journée libre</Text>
              <Text style={st.emptySubtitle}>Rien de prévu ce jour</Text>
            </View>
          ) : (
            dayEvents.map((event) => renderEventCard(event))
          )}
        </Animated.ScrollView>
      </View>
    );
  };

  // ─── Derived: selected day event count ────────────────
  const dayEventCount = (eventsByDay[selectedDay] ?? []).length;

  // ─── Week strip swipe handler ──────────────────────────
  const stripSwipeStartX = useRef(0);
  const stripSwipeDayStart = useRef(0);

  const stripPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onMoveShouldSetPanResponderCapture: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderGrant: (_, g) => {
        stripSwipeStartX.current = g.x0;
      },
      onPanResponderRelease: (_, g) => {
        const threshold = 30;
        if (g.dx < -threshold) {
          setSelectedDay((prev) => {
            const idx = weekDays.findIndex((d) => d.date === prev);
            if (idx < weekDays.length - 1) {
              const next = weekDays[idx + 1];
              setSelectedFullDate(next.fullDate);
              setCurrentMonth(next.fullDate.getMonth());
              setCurrentYear(next.fullDate.getFullYear());
              return next.date;
            }
            return prev;
          });
        } else if (g.dx > threshold) {
          setSelectedDay((prev) => {
            const idx = weekDays.findIndex((d) => d.date === prev);
            if (idx > 0) {
              const prev2 = weekDays[idx - 1];
              setSelectedFullDate(prev2.fullDate);
              setCurrentMonth(prev2.fullDate.getMonth());
              setCurrentYear(prev2.fullDate.getFullYear());
              return prev2.date;
            }
            return prev;
          });
        }
      },
    })
  ).current;

  // ─── Render ────────────────────────────────────────────
  return (
    <View style={st.root}>
      {/* Content starts at safe area top */}
      <View style={{ paddingTop: insets.top + 64 + 12 }}>

        {/* 1. Month title (tappable) + bouton Emploi du temps */}
        <View style={st.monthTitleWrapper}>
          <Pressable
            onPress={toggleCalendar}
            style={st.monthTitleRow}
          >
            <Text style={st.monthName}>{FRENCH_MONTH_NAMES_FULL[currentMonth]}</Text>
            <Text style={st.yearText}>{currentYear}</Text>
            <ChevronDown
              size={18}
              color="#94A3B8"
              style={{ transform: [{ rotate: calendarOpen ? '180deg' : '0deg' }] }}
            />
          </Pressable>
          {aDesNotes(selectedChild?.cycle) && (
          <Pressable
            onPress={() => navigation.navigate('Timetable')}
            hitSlop={8}
            style={({ pressed }) => [st.timetableBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={st.timetableBtnText}>Emploi du temps</Text>
          </Pressable>
          )}
        </View>

        {/* 2. Collapsible calendar panel */}
        {calendarOpen && (
          <View style={st.calendarPanel}>
            {/* Horizontal month scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={st.monthScrollContent}
            >
              {FRENCH_MONTH_NAMES_FULL.map((name, idx) => {
                const isActive = idx === currentMonth;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setCurrentMonth(idx);
                    }}
                    style={[
                      st.monthPill,
                      isActive && { backgroundColor: '#0F172A' },
                    ]}
                  >
                    <Text style={[
                      st.monthPillText,
                      isActive ? st.monthPillTextActive : st.monthPillTextInactive,
                    ]}>
                      {SHORT_MONTHS[idx]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Calendar grid */}
            <View style={st.calendarGridCard}>
              {/* Header: L M M J V S D */}
              <View style={st.calendarHeaderRow}>
                {WEEK_LETTERS.map((letter, i) => (
                  <View key={i} style={st.calendarHeaderCell}>
                    <Text style={st.calendarHeaderText}>{letter}</Text>
                  </View>
                ))}
              </View>

              {/* Day rows */}
              {calendarGrid.map((row, rowIdx) => (
                <View key={rowIdx} style={st.calendarRow}>
                  {row.map((cell, colIdx) => {
                    const isToday =
                      cell.isCurrentMonth &&
                      cell.fullDate.getDate() === today.getDate() &&
                      cell.fullDate.getMonth() === today.getMonth() &&
                      cell.fullDate.getFullYear() === today.getFullYear();
                    const isSelected =
                      cell.isCurrentMonth &&
                      cell.fullDate.getDate() === selectedDay &&
                      cell.fullDate.getMonth() === selectedFullDate.getMonth() &&
                      cell.fullDate.getFullYear() === selectedFullDate.getFullYear();
                    const hasEvents =
                      cell.isCurrentMonth &&
                      eventDatesSet.has(`${cell.fullDate.getFullYear()}-${cell.fullDate.getMonth()}-${cell.day}`);

                    return (
                      <Pressable
                        key={colIdx}
                        style={st.calendarCell}
                        onPress={() => cell.isCurrentMonth && selectCalendarDay(cell.fullDate)}
                      >
                        <View style={[
                          st.calendarDayCircle,
                          isSelected && { backgroundColor: '#0F172A' },
                        ]}>
                          <Text style={[
                            st.calendarDayText,
                            !cell.isCurrentMonth && st.calendarDayOtherMonth,
                            isToday && !isSelected && { color: '#4338CA', fontFamily: FontFamily.displayBold },
                            isSelected && { color: '#FFFFFF', fontFamily: FontFamily.displayBold },
                          ]}>
                            {cell.day}
                          </Text>
                        </View>
                        {hasEvents && !isSelected && (
                          <View style={st.calendarDot} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 3. Week day strip */}
        <View style={st.weekStrip} {...stripPan.panHandlers}>
          {weekDays.map((day) => {
            const isSelected = day.date === selectedDay &&
              day.fullDate.getMonth() === selectedFullDate.getMonth();
            const isToday = day.isToday && !isSelected;
            const hasEvents = (eventsByDay[day.date]?.length ?? 0) > 0;

            return (
              <Pressable
                key={`${day.date}-${day.fullDate.getMonth()}`}
                onPress={() => selectDay(day)}
                style={st.weekStripDay}
              >
                <Text style={st.weekStripLetter}>{day.day[0]}</Text>
                <View style={[
                  st.weekStripCircle,
                  isSelected && { backgroundColor: '#0F172A' },
                ]}>
                  <Text style={[
                    st.weekStripNumber,
                    isSelected && { color: '#FFFFFF', fontFamily: FontFamily.displayBold },
                    isToday && { color: '#4338CA' },
                    !isSelected && !isToday && { color: '#0F172A' },
                  ]}>
                    {day.date}
                  </Text>
                </View>
                {hasEvents && !isSelected && <View style={st.weekStripDot} />}
                {!hasEvents && <View style={{ width: 4, height: 4 }} />}
              </Pressable>
            );
          })}
        </View>

        {/* Today button (when not on today) */}
        {!isSelectedToday && (
          <TouchableOpacity onPress={goToToday} style={st.todayBtn}>
            <Text style={st.todayBtnText}>Aujourd'hui</Text>
          </TouchableOpacity>
        )}

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.filterPillsContent}
          style={st.filterPillsRow}
        >
          {filtres.map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveFilter(tab)}
                style={[st.filterPill, isActive && st.filterPillActive]}
              >
                <Text style={[st.filterPillText, isActive && st.filterPillTextActive]}>
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. Devoirs view OR swipeable day pages */}
      {activeFilter === 'Devoirs' && avecDevoirs ? renderHomeworkView() : (
      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={weekDays}
        keyExtractor={(d) => `${d.date}-${d.fullDate.getMonth()}`}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onMomentumScrollEnd={(e) => {
          if (isProgrammaticScroll.current) {
            isProgrammaticScroll.current = false;
            return;
          }
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          const day = weekDays[idx];
          if (!day) return;
          setExpandedEvent(null);
          setSelectedDay(day.date);
          setSelectedFullDate(day.fullDate);
          setCurrentMonth(day.fullDate.getMonth());
          setCurrentYear(day.fullDate.getFullYear());
        }}
        onScrollBeginDrag={() => {
          isProgrammaticScroll.current = false;
        }}
        renderItem={renderDayPage}
        style={[
          { flex: 1 },
          Platform.OS === 'android' && { zIndex: 0, elevation: 0 },
        ]}
      />
      )}

      {/* ─── Add Event Modal ─────────────────────────────── */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={st.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => { Keyboard.dismiss(); setAddModalVisible(false); }}
          />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={st.modalContent}>
              <View style={st.modalHandle} />
              <Text style={st.modalTitle}>Nouvel événement</Text>

              {/* Date indicator */}
              <View style={st.modalDateRow}>
                <Text style={{ fontSize: 15 }}>📅</Text>
                <Text style={st.modalDateText}>
                  {selectedDayLabel?.day} {selectedDay} {selectedDayLabel?.month}
                </Text>
              </View>

              {/* Title input */}
              <TextInput
                value={newEventTitle}
                onChangeText={setNewEventTitle}
                placeholder="Ex: Contrôle de maths, Sortie scolaire…"
                placeholderTextColor="#94A3B8"
                autoFocus
                style={st.modalInput}
              />

              {/* Type selector */}
              <View style={st.modalTypeRow}>
                {(Object.keys(NEW_EVENT_TYPE_LABELS) as NewEventType[]).map((type) => {
                  const isActive = newEventType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setNewEventType(type)}
                      style={[
                        st.modalTypePill,
                        isActive && st.modalTypePillActive,
                      ]}
                    >
                      <Text style={[st.modalTypeText, isActive && st.modalTypeTextActive]}>
                        {NEW_EVENT_TYPE_LABELS[type]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Actions */}
              <View style={st.modalActions}>
                <Pressable onPress={() => setAddModalVisible(false)} style={st.cancelBtn}>
                  <Text style={st.cancelText}>Annuler</Text>
                </Pressable>
                <Pressable
                  onPress={handleCreateEvent}
                  disabled={isSaving}
                  style={[st.createBtn, isSaving && { opacity: 0.6 }]}
                >
                  <Text style={st.createText}>{isSaving ? 'Création…' : 'Créer'}</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    position: 'relative',
  },

  // Month title wrapper (titre + bouton EDT)
  monthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 20,
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flex: 1,
  },
  timetableBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(67,56,202,0.08)',
  },
  timetableBtnText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: '#4338CA',
    letterSpacing: -0.1,
  },
  monthName: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 32,
    color: '#0F172A',
  },
  yearText: {
    fontFamily: FontFamily.displayBold,
    fontSize: 20,
    color: '#94A3B8',
  },

  // Calendar panel
  calendarPanel: {
    paddingBottom: 8,
  },
  monthScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 12,
  },
  monthPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  monthPillText: {
    fontSize: 13,
  },
  monthPillTextActive: {
    fontFamily: FontFamily.sansBold,
    color: '#FFFFFF',
  },
  monthPillTextInactive: {
    fontFamily: FontFamily.sansMedium,
    color: '#94A3B8',
  },
  calendarGridCard: {
    marginHorizontal: 16,
    backgroundColor: C.bg,
    borderRadius: 20,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 0 },
      default: {},
    }),
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calendarHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calendarHeaderText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: '#94A3B8',
  },
  calendarRow: {
    flexDirection: 'row',
  },
  calendarCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  calendarDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  calendarDayText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: '#0F172A',
  },
  calendarDayOtherMonth: {
    color: '#D1D5DB',
  },
  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4338CA',
    marginTop: 1,
  },

  // Week strip
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  weekStripDay: {
    alignItems: 'center',
    gap: 4,
  },
  weekStripLetter: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  weekStripCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  weekStripNumber: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    color: '#0F172A',
  },
  weekStripDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4338CA',
  },

  // Today button
  todayBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 4,
  },
  todayBtnText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
  },

  // Day title row (inside each page)
  dayTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 8,
  },
  dayTitleText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#64748B',
  },
  dayEventCount: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: '#94A3B8',
  },

  // Event card
  // COMPONENTS.md §7 — Card événement Agenda
  eventCard: {
    borderRadius: 14,
    borderLeftWidth: 3,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  eventInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: '#0F172A',
  },
  eventMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  examBadge: {
    backgroundColor: '#EF444418',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  examBadgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: '#EF4444',
  },
  checkboxWrap: {
    width: 24,
    height: 24,
  },
  checkboxGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#94A3B8',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    color: '#0F172A',
  },
  emptySubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 24 },
      android: { elevation: 20 },
      default: {},
    }),
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 20,
    color: '#0F172A',
    marginBottom: 20,
  },
  modalDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  modalDateText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  modalInput: {
    backgroundColor: C.bg,
    borderWidth: 0,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 20,
    fontFamily: FontFamily.sansRegular,
  },
  modalTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  modalTypePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: C.bg,
  },
  modalTypePillActive: {
    backgroundColor: '#0F172A',
  },
  modalTypeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#6B7280',
  },
  modalTypeTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  cancelBtn: {
    padding: 8,
  },
  cancelText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 16,
    color: '#9CA3AF',
  },
  createBtn: {
    padding: 8,
  },
  createText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    color: '#0F172A',
  },

  // Filter pills
  filterPillsRow: {
    marginTop: 6,
    marginBottom: 2,
  },
  filterPillsContent: {
    paddingHorizontal: 16,
    gap: 6,
    paddingVertical: 4,
  },
  filterPill: {
    height: 30,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
  },
  filterPillText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: 'rgba(15,23,42,0.45)',
  },
  filterPillTextActive: {
    fontFamily: FontFamily.sansSemiBold,
    color: '#FFFFFF',
  },

  // Homework view
  hwStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: 12,
    paddingBottom: 14,
  },
  hwStatNum: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  hwStatLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: 'rgba(15,23,42,0.55)',
  },
  hwStatSep: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: 'rgba(15,23,42,0.28)',
  },
  hwSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginTop: 8,
  },
  hwSectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 8.5,
    color: 'rgba(15,23,42,0.28)',
    letterSpacing: 1.2,
  },
  hwSectionCount: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 8,
    color: 'rgba(15,23,42,0.30)',
    letterSpacing: 0.08,
  },
  hwRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 14,
    marginBottom: 6,
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 0 },
      default: {},
    }),
  },
  hwRowRendu: {
    backgroundColor: 'rgba(15,23,42,0.03)',
  },
  hwRendusGroup: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  hwPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  hwSubjectPill: {
    backgroundColor: 'rgba(67,56,202,0.10)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  hwSubjectText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 9,
    color: '#4338CA',
    letterSpacing: 0.4,
  },
  hwDemainBadge: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  hwDemainText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 9,
    color: '#D97706',
    letterSpacing: 0.4,
  },
  hwTitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 18,
  },
  hwMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: 'rgba(15,23,42,0.45)',
    marginTop: 2,
    lineHeight: 15,
  },
  hwCheckEmpty: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.25)',
    marginTop: 1,
  },
  hwCheckFilled: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});

/** Garde : compte réel sans enfant → état vide (jamais de données d'un autre carnet). */
export default function AgendaScreen() {
  const { selectedChild } = useActiveChild();
  if (!selectedChild) return <AucunEnfantOnglet />;
  return <AgendaScreenContent />;
}
