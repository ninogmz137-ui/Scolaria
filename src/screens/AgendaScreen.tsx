import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChevronDown, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { FontFamily } from '../hooks/useSolariaFonts';
import { SCREEN_BACKGROUND } from '../constants/colors';

type AgendaEventType = 'cours' | 'devoir' | 'sortie' | 'reunion' | 'absence';

type AgendaEvent = {
  id: string;
  titre: string;
  heure: string;
  salle: string | null;
  type: AgendaEventType;
  couleur: string;
  fait?: boolean;
};

type DayItem = {
  key: string; // YYYY-MM-DD
  date: Date;
  lettre: string; // L M M J V S D
  jour: number;
};

const TEXT = '#0F172A';
const TEXT_MUTED = 'rgba(15,23,42,0.55)';
const TEXT_MUTED_35 = 'rgba(15,23,42,0.35)';
const BORDER_LIGHT = 'rgba(15,23,42,0.05)';
const INDIGO = '#4338CA';

const CATEGORY_COLORS: Record<AgendaEventType, string> = {
  cours: '#6366F1',
  devoir: '#F59E0B',
  sortie: '#14B8A6',
  reunion: '#8B5CF6',
  absence: '#EF4444',
};

const WEEK_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;
const DAY_NAMES = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
] as const;
const MONTHS_FULL = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;
const MONTHS_LOWER = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfWeekMonday(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function buildWeek7(d: Date): DayItem[] {
  const monday = startOfWeekMonday(d);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return {
      key: toKey(date),
      date,
      lettre: WEEK_LETTERS[i],
      jour: date.getDate(),
    };
  });
}

function formatDayTitle(d: Date) {
  const dayName = DAY_NAMES[d.getDay()];
  const month = MONTHS_LOWER[d.getMonth()];
  return `${dayName.charAt(0).toUpperCase()}${dayName.slice(1)} ${d.getDate()} ${month}`;
}

const DEMO_EVENTS: AgendaEvent[] = [
  { id: '1', titre: 'Histoire-Géographie', heure: '08:30 – 09:30', salle: 'Salle 305', type: 'cours', couleur: CATEGORY_COLORS.cours },
  { id: '2', titre: 'Anglais', heure: '10:00 – 11:00', salle: 'Salle 201', type: 'cours', couleur: CATEGORY_COLORS.sortie },
  { id: '3', titre: 'Apprendre vocabulaire ch.5', heure: '17:00', salle: null, type: 'devoir', couleur: CATEGORY_COLORS.devoir, fait: false },
];

const TIMING_EASE = Easing.out(Easing.ease);

function CreateEventSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(320);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (visible) setModalVisible(true);
  }, [visible]);

  useEffect(() => {
    if (visible) {
      translateY.value = 320;
      translateY.value = withTiming(0, { duration: 220, easing: TIMING_EASE });
      return;
    }
    if (!visible && modalVisible) {
      translateY.value = withTiming(320, { duration: 180, easing: TIMING_EASE }, (finished) => {
        if (finished) runOnJS(setModalVisible)(false);
      });
    }
  }, [modalVisible, translateY, visible]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            sheetAnimatedStyle,
            { paddingBottom: Math.max(18, insets.bottom + 10) },
          ]}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Créer un événement</Text>

          <Pressable style={styles.sheetRow} onPress={onClose}>
            <Text style={styles.sheetRowText}>Cours</Text>
          </Pressable>
          <Pressable style={styles.sheetRow} onPress={onClose}>
            <Text style={styles.sheetRowText}>Devoir</Text>
          </Pressable>
          <Pressable style={[styles.sheetRow, { borderBottomWidth: 0 }]} onPress={onClose}>
            <Text style={styles.sheetRowText}>Sortie</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();
  const now = useMemo(() => new Date(), []);
  const weekDays = useMemo(() => buildWeek7(now), [now]);
  const [selectedKey, setSelectedKey] = useState(weekDays[2]?.key ?? weekDays[0]?.key); // index 2 feels natural (Agenda tab index)
  const selectedDay = useMemo(
    () => weekDays.find((d) => d.key === selectedKey) ?? weekDays[0],
    [selectedKey, weekDays],
  );

  const [eventsByDay, setEventsByDay] = useState<Record<string, AgendaEvent[]>>(() => {
    const base: Record<string, AgendaEvent[]> = {};
    if (selectedDay) base[selectedDay.key] = DEMO_EVENTS;
    if (weekDays[4]) base[weekDays[4].key] = [
      { id: '4', titre: 'Sortie théâtre', heure: '13:30 – 16:00', salle: null, type: 'sortie', couleur: CATEGORY_COLORS.sortie },
    ];
    return base;
  });

  const events = eventsByDay[selectedKey] ?? [];
  const monthName = MONTHS_FULL[selectedDay.date.getMonth()];
  const year = selectedDay.date.getFullYear();

  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header fixe */}
      <View style={styles.header}>
        <View style={styles.monthRow}>
          <Text style={styles.monthText}>{monthName}</Text>
          <Text style={styles.yearText}>{year}</Text>
          <ChevronDown size={18} color={TEXT_MUTED_35} />
        </View>

        <View style={styles.weekStrip}>
          {weekDays.map((d) => {
            const isActive = d.key === selectedKey;
            const hasEvents = (eventsByDay[d.key]?.length ?? 0) > 0;
            return (
              <Pressable
                key={d.key}
                onPress={() => setSelectedKey(d.key)}
                style={styles.weekItem}
                hitSlop={8}
              >
                <Text style={[styles.weekLetter, isActive && styles.weekLetterActive]}>
                  {d.lettre}
                </Text>
                <View style={[styles.dayCircle, isActive && styles.dayCircleActive]}>
                  <Text style={[styles.dayNumber, isActive ? styles.dayNumberActive : styles.dayNumberInactive]}>
                    {d.jour}
                  </Text>
                </View>
                {hasEvents ? <View style={styles.dot} /> : <View style={styles.dotPlaceholder} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Info jour */}
      <View style={styles.infoRow}>
        <Text style={styles.infoLeft}>{formatDayTitle(selectedDay.date)}</Text>
        <Text style={styles.infoRight}>
          {events.length} événement{events.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Liste événements */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {events.map((e) => {
          const isDevoir = e.type === 'devoir';
          return (
            <View
              key={e.id}
              style={[
                styles.eventCard,
                { backgroundColor: `${e.couleur}14` },
              ]}
            >
              <View style={[styles.eventAccent, { backgroundColor: e.couleur }]} />
              <View style={styles.eventContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{e.titre}</Text>
                  <Text style={styles.eventMeta}>
                    {e.heure}
                    {e.salle ? ` · ${e.salle}` : ''}
                  </Text>
                </View>

                {isDevoir && (
                  <Pressable
                    onPress={() => {
                      setEventsByDay((prev) => {
                        const list = prev[selectedKey] ?? [];
                        return {
                          ...prev,
                          [selectedKey]: list.map((it) => (it.id === e.id ? { ...it, fait: !it.fait } : it)),
                        };
                      });
                    }}
                    hitSlop={10}
                    style={styles.checkboxWrap}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: !!e.fait }}
                  >
                    <View style={[styles.checkbox, e.fait && styles.checkboxChecked]} />
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => setSheetOpen(true)}
        style={({ pressed }) => [
          styles.fab,
          pressed && { transform: [{ scale: 0.97 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Créer un événement"
      >
        <Plus size={22} strokeWidth={2} color="#FFFFFF" />
      </Pressable>

      <CreateEventSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  header: {
    paddingTop: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_LIGHT,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingBottom: 10,
  },
  monthText: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.8,
    color: TEXT,
  },
  yearText: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.8,
    color: TEXT_MUTED_35,
  },

  weekStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  weekItem: {
    flex: 1,
    alignItems: 'center',
  },
  weekLetter: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 8.5,
    textTransform: 'uppercase',
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  weekLetterActive: {
    color: TEXT,
    fontFamily: FontFamily.sansBold,
  },
  dayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  dayCircleActive: {
    backgroundColor: TEXT,
  },
  dayNumber: {
    fontSize: 13,
  },
  dayNumberActive: {
    fontFamily: FontFamily.sansBold,
    color: '#FFFFFF',
  },
  dayNumberInactive: {
    fontFamily: FontFamily.sansRegular,
    color: TEXT,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: INDIGO,
    marginTop: 4,
  },
  dotPlaceholder: {
    width: 4,
    height: 4,
    marginTop: 4,
    backgroundColor: 'transparent',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  infoLeft: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: TEXT,
  },
  infoRight: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: TEXT_MUTED,
  },

  eventCard: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 14,
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
    flexDirection: 'row',
  },
  eventAccent: {
    width: 3,
  },
  eventContent: {
    flex: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: TEXT,
  },
  eventMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  checkboxWrap: {
    alignSelf: 'flex-end',
    paddingLeft: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.20)',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: TEXT,
    borderColor: TEXT,
  },

  fab: {
    position: 'absolute',
    bottom: 72,
    right: 14,
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: TEXT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TEXT,
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.16)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 0,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -4 },
    elevation: 18,
  },
  sheetHandle: {
    width: 34,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.14)',
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: TEXT,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sheetRow: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  sheetRowText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: TEXT,
  },
});
