/**
 * AgendaScreen — Complete redesign v2.
 *
 * - Month title (tappable) → collapsible calendar panel
 * - Calendar panel: horizontal month scroll + full monthly grid
 * - Week day strip (always visible, 7 days, first-letter labels)
 * - Day title + event count
 * - Swipeable day pages (horizontal FlatList, pagingEnabled)
 * - New event card style with left accent bar + emoji circle
 * - FAB: black square-rounded button
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, ChevronDown, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemoData } from '../contexts/DemoContext';
import { getAgendaEvents, createAgendaEvent, toggleEventDone } from '../services/database';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';
import { FontFamily } from '../hooks/useSolariaFonts';

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
  emoji: string;
  location?: string;
  description?: string;
  color: string;
  done?: boolean;
}

type NewEventType = 'devoir' | 'controle' | 'sortie' | 'autre';

const NEW_EVENT_TYPE_LABELS: Record<NewEventType, string> = {
  devoir: 'Devoir', controle: 'Contrôle', sortie: 'Sortie', autre: 'Autre',
};
const NEW_EVENT_TYPE_EMOJI: Record<NewEventType, string> = {
  devoir: '📝', controle: '📐', sortie: '🏛️', autre: '📅',
};

// ─── Helpers ──────────────────────────────────────────────

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

const DEFAULT_EMOJI: Record<AgendaEvent['type'], string> = {
  cours: '📚', devoir: '📝', examen: '📐', activite: '🎯', reunion: '👨‍👩‍👦', sortie: '🏛️',
};
const DEFAULT_COLOR: Record<AgendaEvent['type'], string> = {
  cours: Colors.violet, devoir: Colors.orange, examen: Colors.red,
  activite: Colors.cyan, reunion: Colors.violet, sortie: Colors.cyan,
};
const TYPE_LABELS: Record<AgendaEvent['type'], string> = {
  cours: 'Cours', devoir: 'Devoir', examen: 'Examen',
  activite: 'Activité', reunion: 'Réunion', sortie: 'Sortie',
};

// ─── Mock data ────────────────────────────────────────────

const MOCK_WEEK_DAYS = buildWeekDays(new Date());
const MOCK_EVENTS_BY_DAY: Record<number, AgendaEvent[]> = {
  [MOCK_WEEK_DAYS[0]?.date ?? 0]: [
    { id: 'e1', title: 'Mathématiques', time: '08:30', endTime: '09:30', type: 'cours', emoji: '📐', subject: 'Maths', color: Colors.cyan, location: 'Salle 204' },
    { id: 'e2', title: 'Français', time: '10:00', endTime: '11:00', type: 'cours', emoji: '📖', subject: 'Français', color: Colors.violet, location: 'Salle 102' },
    { id: 'e3', title: 'Devoir de géométrie', time: '17:00', type: 'devoir', emoji: '📝', subject: 'Maths', color: Colors.orange, description: 'Ex. 4, 5, 6 p.142', done: true },
  ],
  [MOCK_WEEK_DAYS[1]?.date ?? 0]: [
    { id: 'e4', title: 'Histoire-Géo', time: '08:30', endTime: '09:30', type: 'cours', emoji: '🏛️', subject: 'Histoire', color: Colors.orange, location: 'Salle 305' },
    { id: 'e5', title: 'Anglais', time: '10:00', endTime: '11:00', type: 'cours', emoji: '🇬🇧', subject: 'Anglais', color: Colors.green, location: 'Salle 201' },
    { id: 'e6', title: 'Apprendre vocabulaire ch.5', time: '17:00', type: 'devoir', emoji: '📝', subject: 'Anglais', color: Colors.orange },
  ],
  [MOCK_WEEK_DAYS[2]?.date ?? 0]: [
    { id: 'e7', title: 'Judo', time: '14:00', endTime: '15:30', type: 'activite', emoji: '🥋', color: Colors.warmOrange, location: 'Dojo municipal' },
    { id: 'e8', title: 'Piano', time: '16:00', endTime: '17:00', type: 'activite', emoji: '🎹', color: Colors.violet, location: 'Conservatoire' },
  ],
  [MOCK_WEEK_DAYS[3]?.date ?? 0]: [
    { id: 'e9', title: 'Sciences', time: '08:30', endTime: '10:00', type: 'cours', emoji: '🔬', subject: 'Sciences', color: Colors.pink, location: 'Labo' },
    { id: 'e10', title: 'Réunion parents', time: '18:00', endTime: '19:00', type: 'reunion', emoji: '👨‍👩‍👦', color: Colors.violet, location: 'Salle polyvalente', description: 'Bilan du 2ème trimestre' },
  ],
  [MOCK_WEEK_DAYS[4]?.date ?? 0]: [
    { id: 'e11', title: 'Contrôle de Maths', time: '08:30', endTime: '09:30', type: 'examen', emoji: '📐', subject: 'Maths', color: Colors.red, location: 'Salle 204', description: 'Chapitres 7-9 : fractions et proportionnalité' },
    { id: 'e12', title: 'EPS', time: '10:00', endTime: '11:30', type: 'cours', emoji: '⚽', subject: 'EPS', color: Colors.warmOrange, location: 'Gymnase' },
    { id: 'e13', title: 'Français', time: '14:00', endTime: '15:00', type: 'cours', emoji: '📖', subject: 'Français', color: Colors.violet, location: 'Salle 102' },
    { id: 'e14', title: 'Lire ch.8 du roman', time: '17:00', type: 'devoir', emoji: '📚', subject: 'Français', color: Colors.orange, description: 'Le Petit Prince, préparer questions' },
  ],
  [MOCK_WEEK_DAYS[5]?.date ?? 0]: [
    { id: 'e15', title: 'Sortie au musée', time: '10:00', endTime: '16:00', type: 'sortie', emoji: '🏛️', color: Colors.cyan, location: 'Musée d\'Orsay', description: 'Prévoir pique-nique' },
  ],
  [MOCK_WEEK_DAYS[6]?.date ?? 0]: [],
};

// ─── Component ────────────────────────────────────────────

export default function AgendaScreen() {
  useChildTheme();
  const { selectedChildId, selectedChild, loading: childLoading } = useActiveChild();
  const { user } = useAuth();
  const { isDemoMode, getAgenda: getDemoAgenda, toggleAgendaDone: demoToggleDone } = useDemoData();
  const insets = useSafeAreaInsets();

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
  const [eventsByDay, setEventsByDay] = useState<Record<number, AgendaEvent[]>>(MOCK_EVENTS_BY_DAY);
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedFullDate, setSelectedFullDate] = useState(today);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

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

  // ─── Add event modal ───────────────────────────────────
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<NewEventType>('devoir');
  const [isSaving, setIsSaving] = useState(false);

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
        const demoEvents = getDemoAgenda(selectedChildId, dateStr);
        if (demoEvents.length > 0) {
          grouped[computed[i].date] = demoEvents.map((e) => ({
            id: e.id,
            title: e.title,
            time: e.startTime,
            endTime: e.endTime || undefined,
            type: (e.type || 'cours') as AgendaEvent['type'],
            subject: e.subject || undefined,
            emoji: e.emoji || '📅',
            location: e.room || undefined,
            description: e.description || undefined,
            color: e.color || Colors.violet,
            done: e.is_completed ?? false,
          }));
        }
      }
      if (Object.keys(grouped).length === 0) {
        setEventsByDay(MOCK_EVENTS_BY_DAY);
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
    if (rows.length === 0) { setEventsByDay(MOCK_EVENTS_BY_DAY); return; }

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
        emoji: row.emoji ?? DEFAULT_EMOJI[type] ?? '📅',
        location: row.location, description: row.description,
        color: row.color ?? DEFAULT_COLOR[type] ?? Colors.violet,
        done: row.is_done ?? false,
      };
      if (!grouped[dayNum]) grouped[dayNum] = [];
      grouped[dayNum].push(mapped);
    }
    setEventsByDay(grouped);
  }, [selectedChildId, referenceDate, isDemoMode, getDemoAgenda]);

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
    const currentChildId = selectedChild?.id ?? selectedChildId;
    const isReal = currentChildId.includes('-') && currentChildId.length > 10;

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
          emoji: NEW_EVENT_TYPE_EMOJI[newEventType],
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
          emoji: NEW_EVENT_TYPE_EMOJI[newEventType],
          color: DEFAULT_COLOR[typeMap[newEventType]] ?? '#3B82F6',
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

  // ─── Render event card ─────────────────────────────────
  const renderEventCard = (event: AgendaEvent) => {
    const isExam = event.type === 'examen';
    const isDevoir = event.type === 'devoir';

    return (
      <View
        key={event.id}
        style={[
          st.eventCard,
          { backgroundColor: event.color + '12' },
          isDevoir && event.done && { opacity: 0.55 },
        ]}
      >
        {/* Left accent bar */}
        <View style={[st.eventAccentBar, { backgroundColor: event.color }]} />

        <View style={st.eventInner}>
          {/* Emoji circle */}
          <View style={st.emojiCircle}>
            <Text style={{ fontSize: 22 }}>{event.emoji}</Text>
          </View>

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
            <Pressable
              onPress={() => toggleDone(event.id)}
              hitSlop={8}
            >
              <View
                style={[
                  st.checkbox,
                  event.done && { backgroundColor: '#10B981', borderColor: '#10B981' },
                ]}
              >
                {event.done && <Check size={14} color="#FFFFFF" strokeWidth={2.5} />}
              </View>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  // ─── Render day page ───────────────────────────────────
  const renderDayPage = ({ item }: { item: (typeof weekDays)[0] }) => {
    const dayEvents = eventsByDay[item.date] ?? [];
    const dayEventCount = dayEvents.length;

    return (
      <View style={{ width: SCREEN_WIDTH }}>
        {/* Day title row */}
        <View style={st.dayTitleRow}>
          <Text style={st.dayTitleText}>
            {formatDateFR(item.fullDate).replace(/^./, (c) => c.toUpperCase())}
          </Text>
          <Text style={st.dayEventCount}>
            {dayEventCount > 0 ? `${dayEventCount} événement${dayEventCount > 1 ? 's' : ''}` : 'Libre'}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: FLOATING_TAB_BAR_HEIGHT + 80,
          }}
          nestedScrollEnabled
        >
          {dayEvents.length === 0 ? (
            <View style={st.emptyState}>
              <View style={st.emptyIconWrap}>
                <Text style={{ fontSize: 36 }}>🏖️</Text>
              </View>
              <Text style={st.emptyTitle}>Journée libre</Text>
              <Text style={st.emptySubtitle}>Rien de prévu ce jour</Text>
            </View>
          ) : (
            dayEvents.map((event) => renderEventCard(event))
          )}
        </ScrollView>
      </View>
    );
  };

  // ─── Derived: selected day event count ────────────────
  const dayEventCount = (eventsByDay[selectedDay] ?? []).length;

  // ─── Render ────────────────────────────────────────────
  return (
    <View style={st.root}>
      {/* Content starts at safe area top */}
      <View style={{ paddingTop: insets.top + 16 }}>

        {/* 1. Month title (tappable) */}
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
                      isActive && { backgroundColor: '#1A1A1A' },
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
                          isSelected && { backgroundColor: '#1A1A1A' },
                        ]}>
                          <Text style={[
                            st.calendarDayText,
                            !cell.isCurrentMonth && st.calendarDayOtherMonth,
                            isToday && !isSelected && { color: '#7C3AED', fontFamily: FontFamily.displayBold },
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
        <View style={st.weekStrip}>
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
                  isSelected && { backgroundColor: '#1A1A1A' },
                ]}>
                  <Text style={[
                    st.weekStripNumber,
                    isSelected && { color: '#FFFFFF', fontFamily: FontFamily.displayBold },
                    isToday && { color: '#7C3AED' },
                    !isSelected && !isToday && { color: '#1A1A1A' },
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
      </View>

      {/* 5. Swipeable day pages */}
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
        style={{ flex: 1 }}
      />

      {/* 7. FAB */}
      <Pressable
        onPress={openAddModal}
        style={({ pressed }) => [st.fab, pressed && { opacity: 0.8 }]}
      >
        <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>

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
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={st.modalContent}>
              <View style={st.modalHandle} />
              <Text style={st.modalTitle}>Nouvel événement</Text>

              {/* Date indicator */}
              <View style={[st.modalDateRow, { backgroundColor: '#3B82F612', borderColor: '#3B82F630' }]}>
                <Text style={{ fontSize: 15 }}>📅</Text>
                <Text style={[st.modalDateText, { color: '#3B82F6' }]}>
                  {selectedDayLabel?.day} {selectedDay} {selectedDayLabel?.month}
                </Text>
              </View>

              {/* Title input */}
              <Text style={st.modalLabel}>Titre</Text>
              <TextInput
                value={newEventTitle}
                onChangeText={setNewEventTitle}
                placeholder="Ex: Contrôle de maths, Sortie scolaire…"
                placeholderTextColor="#94A3B8"
                autoFocus
                style={st.modalInput}
              />

              {/* Type selector */}
              <Text style={st.modalLabel}>Type</Text>
              <View style={st.modalTypeRow}>
                {(Object.keys(NEW_EVENT_TYPE_LABELS) as NewEventType[]).map((type) => {
                  const isActive = newEventType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setNewEventType(type)}
                      style={[
                        st.modalTypePill,
                        { borderColor: isActive ? '#3B82F6' : '#EEF0F5' },
                        isActive && { backgroundColor: '#3B82F615' },
                      ]}
                    >
                      <Text style={[st.modalTypeText, isActive && { color: '#3B82F6' }]}>
                        {NEW_EVENT_TYPE_EMOJI[type]} {NEW_EVENT_TYPE_LABELS[type]}
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
                  style={{ flex: 2, borderRadius: 14, overflow: 'hidden' }}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#6366F1']}
                    style={[st.createBtn, isSaving && { opacity: 0.6 }]}
                  >
                    <Text style={st.createText}>{isSaving ? 'Création…' : 'Créer'}</Text>
                  </LinearGradient>
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
  root: { flex: 1, backgroundColor: '#F8F7FF' },

  // Month title
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  monthName: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 32,
    color: '#1A1A1A',
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
    backgroundColor: '#FFFFFF',
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
  },
  calendarDayText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: '#1A1A1A',
  },
  calendarDayOtherMonth: {
    color: '#D1D5DB',
  },
  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#7C3AED',
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
  },
  weekStripNumber: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    color: '#1A1A1A',
  },
  weekStripDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#7C3AED',
  },

  // Today button
  todayBtn: {
    backgroundColor: '#1A1A1A',
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
  eventCard: {
    flexDirection: 'row',
    borderRadius: 20,
    marginBottom: 10,
    overflow: 'hidden',
  },
  eventAccentBar: {
    width: 4,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  eventInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 0 },
      default: {},
    }),
  },
  eventTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: '#1A1A1A',
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#1A1A1A',
  },
  emptySubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 22,
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 0 },
      default: {},
    }),
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
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
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 20,
  },
  modalDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  modalDateText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
  },
  modalLabel: {
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F7F8FC',
    borderWidth: 1.5,
    borderColor: '#EEF0F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  modalTypeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#64748B',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EEF0F5',
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: '#64748B',
  },
  createBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  createText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
