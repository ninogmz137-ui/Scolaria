/**
 * AgendaScreen — Wallpaper + glass design with day selector and expandable events.
 *
 * - Day selector: horizontal scroll with accent-colored active pill
 * - Events: GlassCard with left color bar, tap to expand details
 * - Papicons everywhere, no Ionicons
 * - Add event modal preserved
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  Platform,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Papicons } from '@getpapillon/papicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../components/GlassCard';
import WallpaperBackground from '../components/WallpaperBackground';
import ScreenHeader from '../components/ScreenHeader';
import { Colors } from '../constants/colors';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';
import { getAgendaEvents, createAgendaEvent } from '../services/database';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';
import { FontFamily } from '../hooks/useSolariaFonts';

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

// ─── Week helpers ─────────────────────────────────────────

const FRENCH_DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const FRENCH_MONTH_NAMES = [
  'janv', 'févr', 'mars', 'avr', 'mai', 'juin',
  'juil', 'août', 'sept', 'oct', 'nov', 'déc',
];

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

function formatWeekHeader(days: DayInfo[]): string {
  if (!days.length) return '';
  const first = days[0];
  const last = days[days.length - 1];
  return `${first.date} — ${last.date} ${last.month}`;
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
  const { theme } = useChildTheme();
  const { selectedChildId, selectedChild, loading: childLoading } = useActiveChild();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;
  const cardText = theme.isDarkBg ? '#FFFFFF' : '#0F172A';
  const cardTextSecondary = theme.isDarkBg ? 'rgba(255,255,255,0.7)' : '#64748B';
  const cardTextMuted = theme.isDarkBg ? 'rgba(255,255,255,0.5)' : '#94A3B8';

  const todayDate = new Date().getDate();
  const initialWeekDays = buildWeekDays(new Date());

  const [weekDays, setWeekDays] = useState(initialWeekDays);
  const [eventsByDay, setEventsByDay] = useState<Record<number, AgendaEvent[]>>(MOCK_EVENTS_BY_DAY);
  const [selectedDay, setSelectedDay] = useState(todayDate);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Add event modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<NewEventType>('devoir');
  const [isSaving, setIsSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    if (!selectedChildId) return;
    const computed = buildWeekDays(new Date());
    setWeekDays(computed);

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
  }, [selectedChildId]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const openAddModal = useCallback(() => {
    if (childLoading) {
      Alert.alert('Chargement', 'Les données sont en cours de chargement, veuillez patienter.');
      return;
    }
    const currentId = selectedChild?.id ?? selectedChildId;
    const isReal = currentId.includes('-') && currentId.length > 10;
    if (!isReal) {
      Alert.alert('Info', 'Aucun enfant connecté. Veuillez vous connecter pour ajouter des événements.');
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
    if (!currentChildId || !user?.id) return;
    if (!isReal) {
      Alert.alert('Erreur', 'Aucun enfant connecté. Veuillez vous connecter.');
      return;
    }

    const selectedDayInfo = weekDays.find((d) => d.date === selectedDay);
    const dayDate = selectedDayInfo?.fullDate ?? new Date();
    dayDate.setHours(8, 0, 0, 0);

    const typeMap: Record<NewEventType, AgendaEvent['type']> = {
      devoir: 'devoir', controle: 'examen', sortie: 'sortie', autre: 'activite',
    };

    setIsSaving(true);
    try {
      const result = await createAgendaEvent({
        child_id: selectedChild?.id ?? selectedChildId,
        parent_id: user.id,
        title: newEventTitle.trim(),
        event_type: typeMap[newEventType],
        emoji: NEW_EVENT_TYPE_EMOJI[newEventType],
        start_time: dayDate.toISOString(),
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
  }, [newEventTitle, newEventType, selectedChild, selectedChildId, user, selectedDay, weekDays, loadEvents]);

  const events = eventsByDay[selectedDay] ?? [];
  const examCount = Object.values(eventsByDay).flat().filter((e) => e.type === 'examen').length;
  const devoirCount = Object.values(eventsByDay).flat().filter((e) => e.type === 'devoir').length;

  const selectedDayLabel = weekDays.find((d) => d.date === selectedDay);

  return (
    <View style={st.root}>
      <WallpaperBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: TOPBAR_H + 8, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10 }}
      >
        {/* Week header + badges */}
        <View style={st.weekHeader}>
          <Text
            style={[
              st.weekTitle,
              { textShadowColor: theme.isDarkBg ? 'rgba(0,0,0,0.4)' : 'transparent' },
            ]}
          >
            {formatWeekHeader(weekDays)}
          </Text>
          <View style={st.badgeRow}>
            <View style={[st.badge, { backgroundColor: 'rgba(248,113,113,0.18)', borderColor: 'rgba(248,113,113,0.25)' }]}>
              <Papicons name="Warning" size={13} color="#FCA5A5" />
              <Text style={[st.badgeText, { color: '#FCA5A5' }]}>{examCount} examen{examCount > 1 ? 's' : ''}</Text>
            </View>
            <View style={[st.badge, { backgroundColor: 'rgba(251,191,36,0.18)', borderColor: 'rgba(251,191,36,0.25)' }]}>
              <Papicons name="Paper" size={13} color="#FCD34D" />
              <Text style={[st.badgeText, { color: '#FCD34D' }]}>{devoirCount} devoir{devoirCount > 1 ? 's' : ''}</Text>
            </View>
          </View>
        </View>

        {/* Day selector */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={weekDays}
          keyExtractor={(d) => d.date.toString()}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
          renderItem={({ item }) => {
            const isSelected = item.date === selectedDay;
            const hasEvents = (eventsByDay[item.date]?.length ?? 0) > 0;
            return (
              <Pressable
                style={[
                  st.dayPill,
                  isSelected && { backgroundColor: theme.accent },
                  !isSelected && item.isToday && { borderColor: theme.accent, borderWidth: 2 },
                ]}
                onPress={() => { setSelectedDay(item.date); setExpandedEvent(null); }}
              >
                <Text style={[st.dayLabel, !isSelected && { color: theme.isDarkBg ? 'rgba(255,255,255,0.6)' : '#94A3B8' }, isSelected && { color: 'rgba(255,255,255,0.7)' }]}>{item.day}</Text>
                <Text style={[st.dayNumber, !isSelected && { color: theme.isDarkBg ? '#FFFFFF' : '#0F172A' }, isSelected && { color: '#FFFFFF' }]}>{item.date}</Text>
                {hasEvents && <View style={[st.dayDot, isSelected && { backgroundColor: '#FFFFFF' }]} />}
              </Pressable>
            );
          }}
        />

        {/* Day title */}
        <View style={st.dayTitle}>
          <View style={[st.sectionBar, { backgroundColor: theme.accent }]} />
          <Text
            style={[
              st.sectionText,
              {
                color: theme.textOnBg,
                textShadowColor: theme.isDarkBg ? 'rgba(0,0,0,0.4)' : 'transparent',
              },
            ]}
          >
            {selectedDayLabel?.day} {selectedDay} {selectedDayLabel?.month}
          </Text>
        </View>

        {/* Events */}
        <View style={{ paddingHorizontal: 18 }}>
          {events.length === 0 ? (
            <GlassCard style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 10 }}>🌿</Text>
              <Text style={[st.emptyTitle, { color: cardText }]}>Journée libre</Text>
              <Text style={[st.emptySubtitle, { color: cardTextMuted }]}>Aucun événement prévu ce jour</Text>
            </GlassCard>
          ) : (
            events.map((event) => {
              const isExpanded = expandedEvent === event.id;
              const isExam = event.type === 'examen';
              const isDevoir = event.type === 'devoir';

              return (
                <Pressable key={event.id} onPress={() => setExpandedEvent(isExpanded ? null : event.id)}>
                  <GlassCard
                    style={{ marginBottom: 10, overflow: 'hidden', opacity: isDevoir && event.done ? 0.6 : 1 }}
                    noPadding
                  >
                    <View style={{ flexDirection: 'row' }}>
                      {/* Left color bar */}
                      <View style={[st.colorBar, { backgroundColor: event.color }]} />

                      <View style={{ flex: 1, padding: 14, gap: 6 }}>
                        {/* Time + title row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={{ fontSize: 22 }}>{event.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                st.eventTitle,
                                { color: cardText },
                                isDevoir && event.done && { textDecorationLine: 'line-through', color: cardTextMuted },
                              ]}
                            >
                              {event.title}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                              <View style={[st.typePill, { backgroundColor: event.color + '18' }]}>
                                <Text style={[st.typeLabel, { color: event.color }]}>{TYPE_LABELS[event.type]}</Text>
                              </View>
                              <Text style={[st.timeText, { color: cardTextMuted }]}>
                                {event.time}{event.endTime ? ` — ${event.endTime}` : ''}
                              </Text>
                            </View>
                          </View>

                          {isDevoir && (
                            <View
                              style={[
                                st.checkbox,
                                event.done && { backgroundColor: Colors.green, borderColor: Colors.green },
                              ]}
                            >
                              {event.done && <Papicons name="Check" size={14} color="#FFFFFF" />}
                            </View>
                          )}
                          {isExam && (
                            <View style={st.examBadge}>
                              <Papicons name="Warning" size={16} color={Colors.red} />
                            </View>
                          )}
                          <Papicons name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={14} color="#94A3B8" />
                        </View>

                        {/* Expanded details */}
                        {isExpanded && (event.location || event.description) && (
                          <View style={st.detailSection}>
                            {event.location && (
                              <View style={st.detailRow}>
                                <Papicons name="Pin" size={13} color="#94A3B8" />
                                <Text style={[st.detailText, { color: cardTextMuted }]}>{event.location}</Text>
                              </View>
                            )}
                            {event.description && (
                              <View style={st.detailRow}>
                                <Papicons name="Info" size={13} color="#94A3B8" />
                                <Text style={[st.detailText, { color: cardTextMuted }]}>{event.description}</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })
          )}

          {/* Add event button */}
          <Pressable onPress={openAddModal} style={{ borderRadius: 16, overflow: 'hidden', marginTop: 4 }}>
            <LinearGradient
              colors={[theme.accent, '#6366F1']}
              style={st.addBtn}
            >
              <Papicons name="Plus" size={22} color="#FFFFFF" />
              <Text style={st.addBtnText}>Ajouter un événement</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>

      <ScreenHeader />

      {/* ─── Add Event Modal ─────────────────────────────── */}
      <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={st.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={st.modalContent}>
                <View style={st.modalHandle} />
                <Text style={st.modalTitle}>Nouvel événement</Text>

                {/* Date indicator */}
                <View style={[st.modalDateRow, { backgroundColor: theme.accent + '12', borderColor: theme.accent + '30' }]}>
                  <Papicons name="Calendar" size={15} color={theme.accent} />
                  <Text style={[st.modalDateText, { color: theme.accent }]}>
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
                          { borderColor: isActive ? theme.accent : '#EEF0F5' },
                          isActive && { backgroundColor: theme.accent + '15' },
                        ]}
                      >
                        <Text style={[st.modalTypeText, isActive && { color: theme.accent }]}>
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
                  <Pressable onPress={handleCreateEvent} disabled={isSaving} style={{ flex: 2, borderRadius: 14, overflow: 'hidden' }}>
                    <LinearGradient colors={[theme.accent, '#6366F1']} style={[st.createBtn, isSaving && { opacity: 0.6 }]}>
                      <Text style={st.createText}>{isSaving ? 'Création…' : 'Créer'}</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const st = StyleSheet.create({
  root: { flex: 1 },

  weekHeader: { paddingHorizontal: 20, marginBottom: 4 },
  weekTitle: {
    fontFamily: FontFamily.sansBold, fontSize: 13, color: '#FFFFFF',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8,
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontFamily: FontFamily.sansBold, fontSize: 11 },

  dayPill: {
    width: 54, alignItems: 'center', paddingVertical: 10, borderRadius: 16, gap: 4,
    backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  dayLabel: { fontFamily: FontFamily.sansSemiBold, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase' },
  dayNumber: { fontFamily: FontFamily.sansBold, fontSize: 20, color: '#0F172A' },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.cyan },

  dayTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginVertical: 10 },
  sectionBar: { width: 4, height: 18, borderRadius: 2 },
  sectionText: {
    fontFamily: FontFamily.sansBold, fontSize: 16,
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },

  emptyTitle: { fontFamily: FontFamily.sansBold, fontSize: 18, color: '#0F172A', marginBottom: 4 },
  emptySubtitle: { fontFamily: FontFamily.sansRegular, fontSize: 14, color: '#94A3B8' },

  colorBar: { width: 5, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },

  eventTitle: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#0F172A' },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeLabel: { fontFamily: FontFamily.sansBold, fontSize: 11 },
  timeText: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: '#94A3B8' },

  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center',
  },
  examBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(248,113,113,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  detailSection: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', paddingTop: 8, gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#94A3B8', flex: 1 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  addBtnText: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#FFFFFF' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 24 },
      android: { elevation: 20 },
      default: {},
    }),
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: FontFamily.sansBold, fontSize: 18, color: '#0F172A', marginBottom: 20 },
  modalDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, marginBottom: 16 },
  modalDateText: { fontFamily: FontFamily.sansSemiBold, fontSize: 13 },
  modalLabel: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  modalInput: {
    backgroundColor: '#F7F8FC', borderWidth: 1.5, borderColor: '#EEF0F5', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F172A', marginBottom: 20,
  },
  modalTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  modalTypePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, backgroundColor: '#FFFFFF' },
  modalTypeText: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, color: '#64748B' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#EEF0F5', alignItems: 'center' },
  cancelText: { fontFamily: FontFamily.sansSemiBold, fontSize: 15, color: '#64748B' },
  createBtn: { paddingVertical: 14, alignItems: 'center' },
  createText: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#FFFFFF' },
});
