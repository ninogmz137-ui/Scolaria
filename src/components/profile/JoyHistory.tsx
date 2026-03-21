import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';

interface DayScore {
  day: number;
  score: number;
}

interface Props {
  data: DayScore[];
  month: string;
}

const getColor = (score: number) => {
  if (score >= 8) return Colors.green;
  if (score >= 6) return Colors.cyan;
  if (score >= 4) return Colors.orange;
  return Colors.red;
};

export default function JoyHistory({ data, month }: Props) {
  const avg = data.reduce((s, d) => s + d.score, 0) / data.length;
  const maxStreak = (() => {
    let max = 0;
    let cur = 0;
    for (const d of data) {
      if (d.score >= 7) {
        cur++;
        max = Math.max(max, cur);
      } else {
        cur = 0;
      }
    }
    return max;
  })();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Score de Joie</Text>
        <Text style={styles.month}>{month}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{avg.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Moyenne</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: Colors.green }]}>
            {maxStreak}j
          </Text>
          <Text style={styles.statLabel}>Meilleure série</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: Colors.orange }]}>
            {data.filter((d) => d.score >= 7).length}
          </Text>
          <Text style={styles.statLabel}>Jours heureux</Text>
        </View>
      </View>

      {/* Calendar grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.grid}>
          {data.map((d) => (
            <View key={d.day} style={styles.dayCell}>
              <View
                style={[
                  styles.dayDot,
                  { backgroundColor: getColor(d.score) },
                  d.score >= 8 && styles.dayDotGlow,
                ]}
              />
              <Text style={styles.dayNumber}>{d.day}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.green }]} />
          <Text style={styles.legendText}>8-10</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.cyan }]} />
          <Text style={styles.legendText}>6-7</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.orange }]} />
          <Text style={styles.legendText}>4-5</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.red }]} />
          <Text style={styles.legendText}>0-3</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.blueNightCard,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  month: {
    fontSize: 13,
    color: Colors.cyan,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.blueNightLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.cyan,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.gray,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  grid: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  dayCell: {
    alignItems: 'center',
    gap: 4,
    width: 28,
  },
  dayDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  dayDotGlow: {
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  dayNumber: {
    fontSize: 10,
    color: Colors.gray,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: Colors.gray,
  },
});
