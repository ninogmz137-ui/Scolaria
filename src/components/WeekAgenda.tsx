import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

type AgendaEvent = {
  id: string;
  time: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  isNow?: boolean;
};

type Props = {
  events: AgendaEvent[];
  dayLabel: string;
};

export default function WeekAgenda({ events, dayLabel }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Agenda</Text>
        <View style={styles.dayBadge}>
          <Text style={styles.dayText}>{dayLabel}</Text>
        </View>
      </View>

      <View style={styles.timeline}>
        {events.map((event, index) => (
          <View key={event.id} style={styles.eventRow}>
            {/* Time column */}
            <View style={styles.timeCol}>
              <Text style={[styles.time, event.isNow && styles.timeNow]}>
                {event.time}
              </Text>
            </View>

            {/* Timeline dot + line */}
            <View style={styles.dotCol}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: event.isNow ? Colors.cyan : event.color },
                ]}
              />
              {index < events.length - 1 && <View style={styles.line} />}
            </View>

            {/* Event card */}
            <View
              style={[
                styles.eventCard,
                event.isNow && styles.eventCardNow,
              ]}
            >
              <View style={[styles.eventIcon, { backgroundColor: event.color + '20' }]}>
                <Ionicons name={event.icon} size={18} color={event.color} />
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {event.subtitle && (
                  <Text style={styles.eventSubtitle}>{event.subtitle}</Text>
                )}
              </View>
              {event.isNow && (
                <View style={styles.nowBadge}>
                  <Text style={styles.nowText}>En cours</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  dayBadge: {
    backgroundColor: Colors.blueNightCard,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  dayText: {
    fontSize: 12,
    color: Colors.cyan,
    fontWeight: '600',
  },
  timeline: {
    gap: 0,
  },
  eventRow: {
    flexDirection: 'row',
    minHeight: 68,
  },
  timeCol: {
    width: 48,
    paddingTop: 14,
  },
  time: {
    fontSize: 12,
    color: Colors.gray,
    fontWeight: '500',
  },
  timeNow: {
    color: Colors.cyan,
    fontWeight: '700',
  },
  dotCol: {
    width: 20,
    alignItems: 'center',
    paddingTop: 17,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: 4,
  },
  eventCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blueNightCard,
    borderRadius: 14,
    padding: 12,
    marginLeft: 10,
    marginBottom: 8,
  },
  eventCardNow: {
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    backgroundColor: Colors.blueNightLight,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
    marginLeft: 10,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  eventSubtitle: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 2,
  },
  nowBadge: {
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nowText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.cyan,
  },
});
