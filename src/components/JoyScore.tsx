import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';

type DayScore = {
  day: string;
  score: number; // 0 to 10
  emoji: string;
};

type Props = {
  data: DayScore[];
  average: number;
};

const BAR_MAX_HEIGHT = 60;

function getBarColor(score: number): string {
  if (score >= 7) return Colors.green;
  if (score >= 4) return Colors.orange;
  return Colors.red;
}

export default function JoyScore({ data, average }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Score de Joie</Text>
          <Text style={styles.subtitle}>7 derniers jours</Text>
        </View>
        <View style={styles.averageBadge}>
          <Text style={styles.averageValue}>{average.toFixed(1)}</Text>
          <Text style={styles.averageLabel}>/10</Text>
        </View>
      </View>

      <View style={styles.chart}>
        {data.map((item, index) => {
          const height = Math.max(4, (item.score / 10) * BAR_MAX_HEIGHT);
          return (
            <View key={index} style={styles.barColumn}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: getBarColor(item.score),
                    },
                  ]}
                />
              </View>
              <Text style={styles.dayLabel}>{item.day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    backgroundColor: Colors.blueNightCard,
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  averageBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  averageValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.cyan,
  },
  averageLabel: {
    fontSize: 12,
    color: Colors.gray,
    marginLeft: 2,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 16,
    marginBottom: 6,
  },
  barTrack: {
    width: 20,
    height: BAR_MAX_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: 20,
    borderRadius: 10,
  },
  dayLabel: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 6,
    fontWeight: '500',
  },
});
