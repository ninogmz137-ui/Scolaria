import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

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

// ─── Mock data ────────────────────────────────────────────

const WEEK_DAYS: DayInfo[] = [
  { date: 16, day: 'Lun', month: 'mars', isToday: false },
  { date: 17, day: 'Mar', month: 'mars', isToday: false },
  { date: 18, day: 'Mer', month: 'mars', isToday: false },
  { date: 19, day: 'Jeu', month: 'mars', isToday: false },
  { date: 20, day: 'Ven', month: 'mars', isToday: true },
  { date: 21, day: 'Sam', month: 'mars', isToday: false },
  { date: 22, day: 'Dim', month: 'mars', isToday: false },
];

const EVENTS_BY_DAY: Record<number, AgendaEvent[]> = {
  16: [
    { id: 'e1', title: 'Mathématiques', time: '08:30', endTime: '09:30', type: 'cours', emoji: '📐', subject: 'Maths', color: Colors.cyan, location: 'Salle 204' },
    { id: 'e2', title: 'Français', time: '10:00', endTime: '11:00', type: 'cours', emoji: '📖', subject: 'Français', color: Colors.violet, location: 'Salle 102' },
    { id: 'e3', title: 'Devoir de géométrie', time: '17:00', type: 'devoir', emoji: '📝', subject: 'Maths', color: Colors.orange, description: 'Ex. 4, 5, 6 p.142', done: true },
  ],
  17: [
    { id: 'e4', title: 'Histoire-Géo', time: '08:30', endTime: '09:30', type: 'cours', emoji: '🏛️', subject: 'Histoire', color: Colors.orange, location: 'Salle 305' },
    { id: 'e5', title: 'Anglais', time: '10:00', endTime: '11:00', type: 'cours', emoji: '🇬🇧', subject: 'Anglais', color: Colors.green, location: 'Salle 201' },
    { id: 'e6', title: 'Apprendre vocabulaire ch.5', time: '17:00', type: 'devoir', emoji: '📝', subject: 'Anglais', color: Colors.orange },
  ],
  18: [
    { id: 'e7', title: 'Judo', time: '14:00', endTime: '15:30', type: 'activite', emoji: '🥋', color: Colors.warmOrange, location: 'Dojo municipal' },
    { id: 'e8', title: 'Piano', time: '16:00', endTime: '17:00', type: 'activite', emoji: '🎹', color: Colors.violet, location: 'Conservatoire' },
  ],
  19: [
    { id: 'e9', title: 'Sciences', time: '08:30', endTime: '10:00', type: 'cours', emoji: '🔬', subject: 'Sciences', color: Colors.pink, location: 'Labo' },
    { id: 'e10', title: 'Réunion parents', time: '18:00', endTime: '19:00', type: 'reunion', emoji: '👨‍👩‍👦', color: Colors.violet, location: 'Salle polyvalente', description: 'Bilan du 2ème trimestre' },
  ],
  20: [
    { id: 'e11', title: 'Contrôle de Maths', time: '08:30', endTime: '09:30', type: 'examen', emoji: '📐', subject: 'Maths', color: Colors.red, location: 'Salle 204', description: 'Chapitres 7-9 : fractions et proportionnalité' },
    { id: 'e12', title: 'EPS', time: '10:00', endTime: '11:30', type: 'cours', emoji: '⚽', subject: 'EPS', color: Colors.warmOrange, location: 'Gymnase' },
    { id: 'e13', title: 'Français', time: '14:00', endTime: '15:00', type: 'cours', emoji: '📖', subject: 'Français', color: Colors.violet, location: 'Salle 102' },
    { id: 'e14', title: 'Lire ch.8 du roman', time: '17:00', type: 'devoir', emoji: '📚', subject: 'Français', color: Colors.orange, description: 'Le Petit Prince, préparer questions' },
  ],
  21: [
    { id: 'e15', title: 'Sortie au musée', time: '10:00', endTime: '16:00', type: 'sortie', emoji: '🏛️', color: Colors.cyan, location: 'Musée d\'Orsay', description: 'Prévoir pique-nique' },
  ],
  22: [],
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
  const [selectedDay, setSelectedDay] = useState(20); // today
  const [viewMode, setViewMode] = useState<ViewMode>('jour');

  const events = EVENTS_BY_DAY[selectedDay] ?? [];
  const examCount = Object.values(EVENTS_BY_DAY)
    .flat()
    .filter((e) => e.type === 'examen').length;
  const devoirCount = Object.values(EVENTS_BY_DAY)
    .flat()
    .filter((e) => e.type === 'devoir').length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.blueNightLight, Colors.blueNight]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Agenda</Text>
            <Text style={styles.headerSubtitle}>
              Semaine du 16 — 22 mars 2026
            </Text>
          </View>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                viewMode === 'jour' && styles.toggleBtnActive,
              ]}
              onPress={() => setViewMode('jour')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  viewMode === 'jour' && styles.toggleTextActive,
                ]}
              >
                Jour
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                viewMode === 'semaine' && styles.toggleBtnActive,
              ]}
              onPress={() => setViewMode('semaine')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  viewMode === 'semaine' && styles.toggleTextActive,
                ]}
              >
                Semaine
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Week summary badges */}
        <View style={styles.weekBadges}>
          <View style={[styles.badge, { backgroundColor: 'rgba(248,113,113,0.12)' }]}>
            <Ionicons name="alert-circle" size={14} color={Colors.red} />
            <Text style={[styles.badgeText, { color: Colors.red }]}>
              {examCount} examen{examCount > 1 ? 's' : ''}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: 'rgba(251,191,36,0.12)' }]}>
            <Ionicons name="document-text" size={14} color={Colors.orange} />
            <Text style={[styles.badgeText, { color: Colors.orange }]}>
              {devoirCount} devoir{devoirCount > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Day selector */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={WEEK_DAYS}
          keyExtractor={(d) => d.date.toString()}
          contentContainerStyle={styles.daySelector}
          renderItem={({ item }) => {
            const isSelected = item.date === selectedDay;
            const hasEvents = (EVENTS_BY_DAY[item.date]?.length ?? 0) > 0;

            return (
              <TouchableOpacity
                style={[
                  styles.dayChip,
                  isSelected && styles.dayChipSelected,
                  item.isToday && !isSelected && styles.dayChipToday,
                ]}
                onPress={() => setSelectedDay(item.date)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    isSelected && styles.dayLabelSelected,
                  ]}
                >
                  {item.day}
                </Text>
                <Text
                  style={[
                    styles.dayDate,
                    isSelected && styles.dayDateSelected,
                  ]}
                >
                  {item.date}
                </Text>
                {hasEvents && (
                  <View
                    style={[
                      styles.dayDot,
                      isSelected && styles.dayDotSelected,
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </LinearGradient>

      {/* Events for selected day */}
      <View style={styles.body}>
        <Text style={styles.dayTitle}>
          {WEEK_DAYS.find((d) => d.date === selectedDay)?.day}{' '}
          {selectedDay} mars
        </Text>

        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌿</Text>
            <Text style={styles.emptyTitle}>Journée libre</Text>
            <Text style={styles.emptyText}>
              Aucun événement prévu ce jour
            </Text>
          </View>
        ) : (
          events.map((event, index) => {
            const isExam = event.type === 'examen';
            const isDevoir = event.type === 'devoir';

            return (
              <View key={event.id} style={styles.eventRow}>
                {/* Timeline */}
                <View style={styles.timeline}>
                  <Text style={styles.timeText}>{event.time}</Text>
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: event.color },
                    ]}
                  />
                  {index < events.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>

                {/* Event card */}
                <View
                  style={[
                    styles.eventCard,
                    isExam && styles.eventCardExam,
                    isDevoir && event.done && styles.eventCardDone,
                  ]}
                >
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventEmoji}>{event.emoji}</Text>
                    <View style={styles.eventInfo}>
                      <Text
                        style={[
                          styles.eventTitle,
                          isDevoir && event.done && styles.eventTitleDone,
                        ]}
                      >
                        {event.title}
                      </Text>
                      <View style={styles.eventTags}>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: event.color + '18' },
                          ]}
                        >
                          <Text
                            style={[styles.typeText, { color: event.color }]}
                          >
                            {TYPE_LABELS[event.type]}
                          </Text>
                        </View>
                        {event.endTime && (
                          <Text style={styles.eventDuration}>
                            {event.time} — {event.endTime}
                          </Text>
                        )}
                      </View>
                    </View>

                    {isDevoir && (
                      <TouchableOpacity
                        style={[
                          styles.checkBox,
                          event.done && styles.checkBoxDone,
                        ]}
                        activeOpacity={0.7}
                      >
                        {event.done && (
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={Colors.white}
                          />
                        )}
                      </TouchableOpacity>
                    )}

                    {isExam && (
                      <View style={styles.examAlert}>
                        <Ionicons name="alert" size={16} color={Colors.red} />
                      </View>
                    )}
                  </View>

                  {/* Details */}
                  {(event.location || event.description) && (
                    <View style={styles.eventDetails}>
                      {event.location && (
                        <View style={styles.detailRow}>
                          <Ionicons
                            name="location"
                            size={13}
                            color={Colors.gray}
                          />
                          <Text style={styles.detailText}>
                            {event.location}
                          </Text>
                        </View>
                      )}
                      {event.description && (
                        <View style={styles.detailRow}>
                          <Ionicons
                            name="information-circle"
                            size={13}
                            color={Colors.gray}
                          />
                          <Text style={styles.detailText}>
                            {event.description}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Add event button */}
        <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
          <LinearGradient
            colors={[Colors.violet, Colors.violetDark]}
            style={styles.addGradient}
          >
            <Ionicons name="add" size={24} color={Colors.white} />
            <Text style={styles.addText}>Ajouter un événement</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blueNight,
  },
  // Header
  header: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.gray,
    marginTop: 4,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.blueNightCard,
    borderRadius: 12,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: Colors.violet,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray,
  },
  toggleTextActive: {
    color: Colors.white,
  },
  // Week badges
  weekBadges: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Day selector
  daySelector: {
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 16,
  },
  dayChip: {
    width: 54,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: Colors.blueNightCard,
    gap: 4,
  },
  dayChipSelected: {
    backgroundColor: Colors.violet,
  },
  dayChipToday: {
    borderWidth: 1.5,
    borderColor: Colors.cyan,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray,
    textTransform: 'uppercase',
  },
  dayLabelSelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  dayDate: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.lightGray,
  },
  dayDateSelected: {
    color: Colors.white,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.cyan,
  },
  dayDotSelected: {
    backgroundColor: Colors.white,
  },
  // Body
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 18,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray,
  },
  // Event row
  eventRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  // Timeline
  timeline: {
    width: 60,
    alignItems: 'center',
    paddingTop: 2,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gray,
    marginBottom: 6,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: 4,
  },
  // Event card
  eventCard: {
    flex: 1,
    backgroundColor: Colors.blueNightCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  eventCardExam: {
    borderColor: 'rgba(248,113,113,0.25)',
    backgroundColor: 'rgba(248,113,113,0.05)',
  },
  eventCardDone: {
    opacity: 0.6,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  eventEmoji: {
    fontSize: 24,
    marginTop: 2,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 6,
  },
  eventTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.gray,
  },
  eventTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  eventDuration: {
    fontSize: 11,
    color: Colors.gray,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBoxDone: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  examAlert: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(248,113,113,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Details
  eventDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: Colors.gray,
    flex: 1,
  },
  // Add button
  addButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
  },
  addGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  addText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});
