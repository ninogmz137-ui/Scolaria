import { useState, useEffect, useCallback } from 'react';
import { ScrollView, FlatList, Platform, Modal, TextInput, Alert, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';
import { getAgendaEvents, createAgendaEvent } from '../services/database';
import DecorativeBlobs from '../components/DecorativeBlobs';


// ─── Helpers ─────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 8 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
});

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

type ViewMode = 'semaine' | 'jour';

type NewEventType = 'devoir' | 'controle' | 'sortie' | 'autre';

const NEW_EVENT_TYPE_LABELS: Record<NewEventType, string> = {
  devoir: 'Devoir',
  controle: 'Contrôle',
  sortie: 'Sortie',
  autre: 'Autre',
};

const NEW_EVENT_TYPE_EMOJI: Record<NewEventType, string> = {
  devoir: '📝',
  controle: '📐',
  sortie: '🏛️',
  autre: '📅',
};

// ─── Week helpers ─────────────────────────────────────────

const FRENCH_DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const FRENCH_MONTH_NAMES = [
  'janv', 'févr', 'mars', 'avr', 'mai', 'juin',
  'juil', 'août', 'sept', 'oct', 'nov', 'déc',
];

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift so Mon=0
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function buildWeekDays(referenceDate: Date): DayInfo[] {
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
      fullDate: d, // kept for ISO string generation
    } as DayInfo & { fullDate: Date };
  });
}

function formatWeekHeader(days: (DayInfo & { fullDate?: Date })[]): string {
  if (!days.length) return '';
  const first = days[0];
  const last = days[days.length - 1];
  const year = (days[0] as any).fullDate
    ? (days[0] as any).fullDate.getFullYear()
    : new Date().getFullYear();
  return `Semaine du ${first.date} — ${last.date} ${last.month} ${year}`;
}

const DEFAULT_EMOJI: Record<AgendaEvent['type'], string> = {
  cours: '📚', devoir: '📝', examen: '📐', activite: '🎯', reunion: '👨‍👩‍👦', sortie: '🏛️',
};

const DEFAULT_COLOR: Record<AgendaEvent['type'], string> = {
  cours: Colors.violet, devoir: Colors.orange, examen: Colors.red,
  activite: Colors.cyan, reunion: Colors.violet, sortie: Colors.cyan,
};

// ─── Mock data ────────────────────────────────────────────

const MOCK_WEEK_DAYS: (DayInfo & { fullDate?: Date })[] = buildWeekDays(new Date());

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

const TYPE_LABELS: Record<AgendaEvent['type'], string> = {
  cours: 'Cours',
  devoir: 'Devoir',
  examen: 'Examen',
  activite: 'Activité',
  reunion: 'Réunion',
  sortie: 'Sortie',
};

// ─── Component ────────────────────────────────────────────

export default function AgendaScreen() {
  const { theme } = useChildTheme();
  const { selectedChildId, selectedChild, loading: childLoading } = useActiveChild();
  const { user } = useAuth();

  const todayDate = new Date().getDate();
  const initialWeekDays = buildWeekDays(new Date());

  const [weekDays, setWeekDays] = useState<(DayInfo & { fullDate?: Date })[]>(initialWeekDays);
  const [eventsByDay, setEventsByDay] = useState<Record<number, AgendaEvent[]>>(MOCK_EVENTS_BY_DAY);
  const [selectedDay, setSelectedDay] = useState(todayDate);
  const [viewMode, setViewMode] = useState<ViewMode>('jour');

  // Add event modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<NewEventType>('devoir');
  const [isSaving, setIsSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    if (!selectedChildId) return;

    const computed = buildWeekDays(new Date());
    setWeekDays(computed);

    const monday = (computed[0] as any).fullDate as Date;
    const sunday = (computed[6] as any).fullDate as Date;
    const endOfSunday = new Date(sunday);
    endOfSunday.setHours(23, 59, 59, 999);

    const startDate = monday.toISOString();
    const endDate = endOfSunday.toISOString();

    const result = await getAgendaEvents(selectedChildId, { startDate, endDate });
    const rows = result?.data ?? [];

    if (rows.length === 0) {
      setEventsByDay(MOCK_EVENTS_BY_DAY);
      return;
    }

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
        id: row.id,
        title: row.title,
        time: `${hh}:${mm}`,
        endTime: endHH ? `${endHH}:${endMM}` : undefined,
        type,
        subject: row.subject,
        emoji: row.emoji ?? DEFAULT_EMOJI[type] ?? '📅',
        location: row.location,
        description: row.description,
        color: row.color ?? DEFAULT_COLOR[type] ?? Colors.violet,
        done: row.is_done ?? false,
      };
      if (!grouped[dayNum]) grouped[dayNum] = [];
      grouped[dayNum].push(mapped);
    }
    setEventsByDay(grouped);
  }, [selectedChildId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const isRealChild = selectedChildId.includes('-') && selectedChildId.length > 10;

  const openAddModal = useCallback(() => {
    if (childLoading) {
      Alert.alert('Chargement', 'Les données sont en cours de chargement, veuillez patienter.');
      return;
    }
    if (!isRealChild) {
      Alert.alert('Info', 'Aucun enfant connecté. Veuillez vous connecter pour ajouter des événements.');
      return;
    }
    setNewEventTitle('');
    setNewEventType('devoir');
    setAddModalVisible(true);
  }, [isRealChild, childLoading]);

  const handleCreateEvent = useCallback(async () => {
    if (!newEventTitle.trim()) {
      Alert.alert('Titre requis', 'Veuillez saisir un titre pour l\'événement.');
      return;
    }
    if (!selectedChildId || !user?.id) return;
    if (!isRealChild) {
      Alert.alert('Erreur', 'Aucun enfant connecté. Veuillez vous connecter.');
      return;
    }

    // Build a start_time from the selected day in the current week
    const selectedDayInfo = weekDays.find((d) => d.date === selectedDay) as (DayInfo & { fullDate?: Date }) | undefined;
    const dayDate = selectedDayInfo?.fullDate ?? new Date();
    dayDate.setHours(8, 0, 0, 0);
    const startTime = dayDate.toISOString();

    const typeMap: Record<NewEventType, AgendaEvent['type']> = {
      devoir: 'devoir',
      controle: 'examen',
      sortie: 'sortie',
      autre: 'activite',
    };

    setIsSaving(true);
    try {
      const result = await createAgendaEvent({
        child_id: selectedChildId,
        parent_id: user.id,
        title: newEventTitle.trim(),
        event_type: typeMap[newEventType],
        emoji: NEW_EVENT_TYPE_EMOJI[newEventType],
        start_time: startTime,
      });

      if (result?.error) {
        console.error('[Agenda] createAgendaEvent error:', JSON.stringify(result.error));
        Alert.alert('Erreur', `Impossible de créer l'événement : ${result.error.message || 'Veuillez réessayer.'}`);
      } else {
        setAddModalVisible(false);
        await loadEvents();
      }
    } finally {
      setIsSaving(false);
    }
  }, [newEventTitle, newEventType, selectedChildId, isRealChild, user, selectedDay, weekDays, loadEvents]);

  const events = eventsByDay[selectedDay] ?? [];
  const examCount = Object.values(eventsByDay)
    .flat()
    .filter((e) => e.type === 'examen').length;
  const devoirCount = Object.values(eventsByDay)
    .flat()
    .filter((e) => e.type === 'devoir').length;

  const accentRgb = hexToRgb(theme.accent);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#E8EDF5' }} showsVerticalScrollIndicator={false}>
      {/* Header — dark gradient */}
      <LinearGradient
        colors={['#0B1628', theme.accent + 'DD']}
        style={{
          paddingTop: 16,
          paddingBottom: 24,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <HStack className="justify-between items-start px-5 mb-3.5">
          <VStack>
            <Text className="text-2xl" style={{ fontWeight: '900', color: '#FFFFFF' }}>
              Agenda
            </Text>
            <Text className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {formatWeekHeader(weekDays)}
            </Text>
          </VStack>
          <HStack
            className="rounded-xl p-[3px]"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}
          >
            <Pressable
              className="px-3 py-1.5 rounded-[10px]"
              style={viewMode === 'jour' ? { backgroundColor: theme.accent } : undefined}
              onPress={() => setViewMode('jour')}
            >
              <Text
                className="text-xs"
                style={{
                  fontWeight: '600',
                  color: viewMode === 'jour' ? Colors.white : 'rgba(255,255,255,0.6)',
                }}
              >
                Jour
              </Text>
            </Pressable>
            <Pressable
              className="px-3 py-1.5 rounded-[10px]"
              style={viewMode === 'semaine' ? { backgroundColor: theme.accent } : undefined}
              onPress={() => setViewMode('semaine')}
            >
              <Text
                className="text-xs"
                style={{
                  fontWeight: '600',
                  color: viewMode === 'semaine' ? Colors.white : 'rgba(255,255,255,0.6)',
                }}
              >
                Semaine
              </Text>
            </Pressable>
          </HStack>
        </HStack>

        {/* Week summary badges — glass style */}
        <HStack className="px-5 gap-2.5 mb-4">
          <HStack
            className="items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(248,113,113,0.18)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)' }}
          >
            <Ionicons name="alert-circle" size={14} color="#FCA5A5" />
            <Text className="text-xs" style={{ fontWeight: '700', color: '#FCA5A5' }}>
              {examCount} examen{examCount > 1 ? 's' : ''}
            </Text>
          </HStack>
          <HStack
            className="items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(251,191,36,0.18)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)' }}
          >
            <Ionicons name="document-text" size={14} color="#FCD34D" />
            <Text className="text-xs" style={{ fontWeight: '700', color: '#FCD34D' }}>
              {devoirCount} devoir{devoirCount > 1 ? 's' : ''}
            </Text>
          </HStack>
        </HStack>
      </LinearGradient>

      {/* Day selector */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={weekDays}
        keyExtractor={(d) => d.date.toString()}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingTop: 18, paddingBottom: 16 }}
        renderItem={({ item }) => {
          const isSelected = item.date === selectedDay;
          const hasEvents = (eventsByDay[item.date]?.length ?? 0) > 0;

          return (
            <Pressable
              className="w-[54px] items-center py-2.5 rounded-2xl gap-1"
              style={{
                backgroundColor: isSelected ? theme.accent : '#FFFFFF',
                borderWidth: isSelected ? 0 : 1.5,
                borderColor: isSelected ? 'transparent' : `rgba(${accentRgb}, 0.15)`,
                ...(item.isToday && !isSelected
                  ? { borderWidth: 1.5, borderColor: theme.accent }
                  : {}),
                ...CARD_SHADOW,
              }}
              onPress={() => setSelectedDay(item.date)}
            >
              <Text
                className="text-[11px] uppercase"
                style={{
                  fontWeight: '600',
                  color: isSelected ? 'rgba(255,255,255,0.7)' : '#94A3B8',
                }}
              >
                {item.day}
              </Text>
              <Text
                className="text-xl"
                style={{
                  fontWeight: '800',
                  color: isSelected ? '#FFFFFF' : '#0F172A',
                }}
              >
                {item.date}
              </Text>
              {hasEvents && (
                <Box
                  className="w-[5px] h-[5px] rounded-full"
                  style={{
                    backgroundColor: isSelected ? '#FFFFFF' : Colors.cyan,
                  }}
                />
              )}
            </Pressable>
          );
        }}
      />

      {/* Events for selected day */}
      <Box style={{ position: 'relative', overflow: 'hidden' }}>
        <DecorativeBlobs accent={theme.accent} />

        <Box className="px-5 pt-4">
          {/* Section title with colored left bar */}
          <HStack className="items-center mb-[18px] gap-2.5">
            <Box
              style={{
                width: 4,
                height: 22,
                borderRadius: 2,
                backgroundColor: theme.accent,
              }}
            />
            <Text className="text-lg" style={{ fontWeight: '700', color: '#0F172A' }}>
              {weekDays.find((d) => d.date === selectedDay)?.day}{' '}
              {selectedDay} {weekDays.find((d) => d.date === selectedDay)?.month}
            </Text>
          </HStack>

          {events.length === 0 ? (
            <VStack className="items-center py-[50px]">
              <Text className="text-[48px] mb-3">🌿</Text>
              <Text className="text-lg mb-1.5" style={{ fontWeight: '700', color: '#0F172A' }}>
                Journée libre
              </Text>
              <Text className="text-sm" style={{ color: '#94A3B8' }}>
                Aucun événement prévu ce jour
              </Text>
            </VStack>
          ) : (
            events.map((event, index) => {
              const isExam = event.type === 'examen';
              const isDevoir = event.type === 'devoir';

              return (
                <HStack key={event.id} className="mb-3.5">
                  {/* Timeline */}
                  <VStack className="w-[60px] items-center pt-0.5">
                    <Text className="text-xs mb-1.5" style={{ fontWeight: '700', color: '#94A3B8' }}>
                      {event.time}
                    </Text>
                    <Box
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: event.color }}
                    />
                    {index < events.length - 1 && (
                      <Box
                        className="w-0.5 flex-1 mt-1"
                        style={{ backgroundColor: '#EEF0F5' }}
                      />
                    )}
                  </VStack>

                  {/* Event card */}
                  <Box
                    className="flex-1 rounded-xl p-3.5"
                    style={{
                      backgroundColor: isExam ? 'rgba(248,113,113,0.05)' : '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: isExam ? 'rgba(248,113,113,0.25)' : `rgba(${accentRgb}, 0.15)`,
                      opacity: isDevoir && event.done ? 0.6 : 1,
                      ...CARD_SHADOW,
                    }}
                  >
                    <HStack className="items-start gap-2.5">
                      <Text className="text-2xl mt-0.5">{event.emoji}</Text>
                      <VStack className="flex-1">
                        <Text
                          className="text-[15px] mb-1.5"
                          style={{
                            fontWeight: '700',
                            color: isDevoir && event.done ? '#94A3B8' : '#0F172A',
                            textDecorationLine: isDevoir && event.done ? 'line-through' : 'none',
                          }}
                        >
                          {event.title}
                        </Text>
                        <HStack className="items-center gap-2">
                          <Box
                            className="px-2 py-[3px] rounded-lg"
                            style={{ backgroundColor: event.color + '18' }}
                          >
                            <Text className="text-[11px]" style={{ fontWeight: '700', color: event.color }}>
                              {TYPE_LABELS[event.type]}
                            </Text>
                          </Box>
                          {event.endTime && (
                            <Text className="text-[11px]" style={{ color: '#94A3B8' }}>
                              {event.time} — {event.endTime}
                            </Text>
                          )}
                        </HStack>
                      </VStack>

                      {isDevoir && (
                        <Pressable
                          className="w-6 h-6 rounded-full justify-center items-center"
                          style={{
                            borderWidth: 2,
                            borderColor: event.done ? Colors.green : Colors.gray,
                            backgroundColor: event.done ? Colors.green : 'transparent',
                          }}
                        >
                          {event.done && (
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color={Colors.white}
                            />
                          )}
                        </Pressable>
                      )}

                      {isExam && (
                        <Box
                          className="w-7 h-7 rounded-full justify-center items-center"
                          style={{ backgroundColor: 'rgba(248,113,113,0.15)' }}
                        >
                          <Ionicons name="alert" size={16} color={Colors.red} />
                        </Box>
                      )}
                    </HStack>

                    {/* Details */}
                    {(event.location || event.description) && (
                      <VStack
                        className="mt-2.5 pt-2.5 gap-1.5"
                        style={{ borderTopWidth: 1, borderTopColor: '#EEF0F5' }}
                      >
                        {event.location && (
                          <HStack className="items-center gap-1.5">
                            <Ionicons
                              name="location"
                              size={13}
                              color={'#94A3B8'}
                            />
                            <Text className="text-xs flex-1" style={{ color: '#94A3B8' }}>
                              {event.location}
                            </Text>
                          </HStack>
                        )}
                        {event.description && (
                          <HStack className="items-center gap-1.5">
                            <Ionicons
                              name="information-circle"
                              size={13}
                              color={'#94A3B8'}
                            />
                            <Text className="text-xs flex-1" style={{ color: '#94A3B8' }}>
                              {event.description}
                            </Text>
                          </HStack>
                        )}
                      </VStack>
                    )}
                  </Box>
                </HStack>
              );
            })
          )}

          {/* Add event button */}
          <Pressable className="rounded-2xl overflow-hidden mt-2.5" onPress={openAddModal}>
            <LinearGradient
              colors={[theme.accent, '#6366F1']}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 16,
              }}
            >
              <Ionicons name="add" size={24} color={Colors.white} />
              <Text className="text-base" style={{ fontWeight: '700', color: Colors.white }}>
                Ajouter un événement
              </Text>
            </LinearGradient>
          </Pressable>

          <Box className="h-10" />
        </Box>
      </Box>

      {/* ─── Add Event Modal ─────────────────────────────── */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Box
            style={{
              flex: 1,
              backgroundColor: 'rgba(15,23,42,0.55)',
              justifyContent: 'flex-end',
            }}
          >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Box
                style={{
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
                }}
              >
                {/* Handle bar */}
                <Box
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: '#CBD5E1',
                    alignSelf: 'center',
                    marginBottom: 20,
                  }}
                />

                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: '#0F172A',
                    marginBottom: 20,
                  }}
                >
                  Nouvel événement
                </Text>

                {/* Date indicator */}
                <HStack
                  style={{
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 16,
                    backgroundColor: theme.accent + '12',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: theme.accent + '30',
                  }}
                >
                  <Ionicons name="calendar" size={15} color={theme.accent} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.accent }}>
                    {weekDays.find((d) => d.date === selectedDay)?.day}{' '}
                    {selectedDay}{' '}
                    {weekDays.find((d) => d.date === selectedDay)?.month}
                  </Text>
                </HStack>

                {/* Title input */}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: 8,
                  }}
                >
                  Titre
                </Text>
                <TextInput
                  value={newEventTitle}
                  onChangeText={setNewEventTitle}
                  placeholder="Ex: Contrôle de maths, Sortie scolaire…"
                  placeholderTextColor="#94A3B8"
                  autoFocus
                  style={{
                    backgroundColor: '#F7F8FC',
                    borderWidth: 1.5,
                    borderColor: '#EEF0F5',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 15,
                    color: '#0F172A',
                    marginBottom: 20,
                  }}
                />

                {/* Type selector */}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: 10,
                  }}
                >
                  Type
                </Text>
                <HStack style={{ gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                  {(Object.keys(NEW_EVENT_TYPE_LABELS) as NewEventType[]).map((type) => {
                    const isActive = newEventType === type;
                    return (
                      <Pressable
                        key={type}
                        onPress={() => setNewEventType(type)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 20,
                          borderWidth: 1.5,
                          borderColor: isActive ? theme.accent : '#EEF0F5',
                          backgroundColor: isActive ? theme.accent + '15' : '#FFFFFF',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: isActive ? theme.accent : '#64748B',
                          }}
                        >
                          {NEW_EVENT_TYPE_EMOJI[type]} {NEW_EVENT_TYPE_LABELS[type]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </HStack>

                {/* Actions */}
                <HStack style={{ gap: 12 }}>
                  <Pressable
                    onPress={() => setAddModalVisible(false)}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: '#EEF0F5',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#64748B' }}>
                      Annuler
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleCreateEvent}
                    disabled={isSaving}
                    style={{ flex: 2, borderRadius: 14, overflow: 'hidden' }}
                  >
                    <LinearGradient
                      colors={[theme.accent, '#6366F1']}
                      style={{
                        paddingVertical: 14,
                        alignItems: 'center',
                        opacity: isSaving ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                        {isSaving ? 'Création…' : 'Créer'}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </HStack>
              </Box>
            </KeyboardAvoidingView>
          </Box>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}
