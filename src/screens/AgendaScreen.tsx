import { useState } from 'react';
import { ScrollView, FlatList } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useI18n } from '../contexts/I18nContext';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useChildTheme } from '../contexts/ChildThemeContext';

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
  { date: 20, day: 'Ven', month: 'mars', isToday: false },
  { date: 21, day: 'Sam', month: 'mars', isToday: false },
  { date: 22, day: 'Dim', month: 'mars', isToday: true },
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
  const { theme } = useChildTheme();
  const [selectedDay, setSelectedDay] = useState(22); // today
  const [viewMode, setViewMode] = useState<ViewMode>('jour');

  const events = EVENTS_BY_DAY[selectedDay] ?? [];
  const examCount = Object.values(EVENTS_BY_DAY)
    .flat()
    .filter((e) => e.type === 'examen').length;
  const devoirCount = Object.values(EVENTS_BY_DAY)
    .flat()
    .filter((e) => e.type === 'devoir').length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={theme.headerGradient}
        style={{ paddingTop: 12, paddingBottom: 4 }}
      >
        <HStack className="justify-between items-start px-5 mb-3.5">
          <VStack>
            <Text className="text-2xl" style={{ fontWeight: '900', color: theme.textPrimary }}>
              Agenda
            </Text>
            <Text className="text-[13px] mt-1" style={{ color: theme.textMuted }}>
              Semaine du 16 — 22 mars 2026
            </Text>
          </VStack>
          <HStack className="rounded-xl p-[3px]" style={{ backgroundColor: theme.card }}>
            <Pressable
              className="px-3 py-1.5 rounded-[10px]"
              style={viewMode === 'jour' ? { backgroundColor: theme.accent } : undefined}
              onPress={() => setViewMode('jour')}
            >
              <Text
                className="text-xs"
                style={{
                  fontWeight: '600',
                  color: viewMode === 'jour' ? Colors.white : Colors.gray,
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
                  color: viewMode === 'semaine' ? Colors.white : Colors.gray,
                }}
              >
                Semaine
              </Text>
            </Pressable>
          </HStack>
        </HStack>

        {/* Week summary badges */}
        <HStack className="px-5 gap-2.5 mb-4">
          <HStack
            className="items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(248,113,113,0.12)' }}
          >
            <Ionicons name="alert-circle" size={14} color={Colors.red} />
            <Text className="text-xs" style={{ fontWeight: '700', color: Colors.red }}>
              {examCount} examen{examCount > 1 ? 's' : ''}
            </Text>
          </HStack>
          <HStack
            className="items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(251,191,36,0.12)' }}
          >
            <Ionicons name="document-text" size={14} color={Colors.orange} />
            <Text className="text-xs" style={{ fontWeight: '700', color: Colors.orange }}>
              {devoirCount} devoir{devoirCount > 1 ? 's' : ''}
            </Text>
          </HStack>
        </HStack>

        {/* Day selector */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={WEEK_DAYS}
          keyExtractor={(d) => d.date.toString()}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingBottom: 16 }}
          renderItem={({ item }) => {
            const isSelected = item.date === selectedDay;
            const hasEvents = (EVENTS_BY_DAY[item.date]?.length ?? 0) > 0;

            return (
              <Pressable
                className="w-[54px] items-center py-2.5 rounded-2xl gap-1"
                style={{
                  backgroundColor: isSelected ? theme.accent : theme.card,
                  ...(item.isToday && !isSelected
                    ? { borderWidth: 1.5, borderColor: theme.accent }
                    : {}),
                }}
                onPress={() => setSelectedDay(item.date)}
              >
                <Text
                  className="text-[11px] uppercase"
                  style={{
                    fontWeight: '600',
                    color: isSelected ? 'rgba(255,255,255,0.7)' : Colors.gray,
                  }}
                >
                  {item.day}
                </Text>
                <Text
                  className="text-xl"
                  style={{
                    fontWeight: '800',
                    color: isSelected ? Colors.white : theme.textPrimary,
                  }}
                >
                  {item.date}
                </Text>
                {hasEvents && (
                  <Box
                    className="w-[5px] h-[5px] rounded-full"
                    style={{
                      backgroundColor: isSelected ? Colors.white : Colors.cyan,
                    }}
                  />
                )}
              </Pressable>
            );
          }}
        />
      </LinearGradient>

      {/* Events for selected day */}
      <Box className="px-5 pt-4" style={{ backgroundColor: theme.bg }}>
        <Text className="text-lg mb-[18px]" style={{ fontWeight: '700', color: theme.textPrimary }}>
          {WEEK_DAYS.find((d) => d.date === selectedDay)?.day}{' '}
          {selectedDay} mars
        </Text>

        {events.length === 0 ? (
          <VStack className="items-center py-[50px]">
            <Text className="text-[48px] mb-3">🌿</Text>
            <Text className="text-lg mb-1.5" style={{ fontWeight: '700', color: theme.textPrimary }}>
              Journée libre
            </Text>
            <Text className="text-sm" style={{ color: Colors.gray }}>
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
                  <Text className="text-xs mb-1.5" style={{ fontWeight: '700', color: Colors.gray }}>
                    {event.time}
                  </Text>
                  <Box
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: event.color }}
                  />
                  {index < events.length - 1 && (
                    <Box
                      className="w-0.5 flex-1 mt-1"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                    />
                  )}
                </VStack>

                {/* Event card */}
                <Box
                  className="flex-1 rounded-xl p-3.5"
                  style={{
                    backgroundColor: isExam ? 'rgba(248,113,113,0.05)' : theme.card,
                    borderWidth: 1,
                    borderColor: isExam ? 'rgba(248,113,113,0.25)' : theme.cardBorder,
                    opacity: isDevoir && event.done ? 0.6 : 1,
                  }}
                >
                  <HStack className="items-start gap-2.5">
                    <Text className="text-2xl mt-0.5">{event.emoji}</Text>
                    <VStack className="flex-1">
                      <Text
                        className="text-[15px] mb-1.5"
                        style={{
                          fontWeight: '700',
                          color: isDevoir && event.done ? Colors.gray : theme.textPrimary,
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
                          <Text className="text-[11px]" style={{ color: Colors.gray }}>
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
                      style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' }}
                    >
                      {event.location && (
                        <HStack className="items-center gap-1.5">
                          <Ionicons
                            name="location"
                            size={13}
                            color={Colors.gray}
                          />
                          <Text className="text-xs flex-1" style={{ color: Colors.gray }}>
                            {event.location}
                          </Text>
                        </HStack>
                      )}
                      {event.description && (
                        <HStack className="items-center gap-1.5">
                          <Ionicons
                            name="information-circle"
                            size={13}
                            color={Colors.gray}
                          />
                          <Text className="text-xs flex-1" style={{ color: Colors.gray }}>
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
        <Pressable className="rounded-2xl overflow-hidden mt-2.5">
          <LinearGradient
            colors={[Colors.violet, Colors.violetDark]}
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
    </ScrollView>
  );
}
