import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontFamily } from '../../hooks/useSolariaFonts';

interface DayScore {
  day: number;
  score: number;
}

interface Props {
  data: DayScore[];
  month: string;
}

const getDotColor = (score: number) => {
  if (score >= 8) return '#22C55E';
  if (score >= 6) return '#3B82F6';
  if (score >= 4) return '#F59E0B';
  return '#EF4444';
};

export default function JoyHistory({ data, month }: Props) {
  const avg = data.length ? data.reduce((s, d) => s + d.score, 0) / data.length : 0;
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
  const happyDays = data.filter((d) => d.score >= 7).length;

  return (
    <View style={styles.wrap}>
      <BlurView intensity={16} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <Text style={styles.labelLeft}>Score de Joie</Text>
          <Text style={styles.monthRight}>{month}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: '#7C3AED' }]}>{avg.toFixed(1)}</Text>
            <Text style={styles.statMeta}>Moyenne</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: '#22C55E' }]}>{maxStreak}j</Text>
            <Text style={styles.statMeta}>Série</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: '#F59E0B' }]}>{happyDays}</Text>
            <Text style={styles.statMeta}>Jours</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.dotsRow}>
            {data.map((d) => (
              <View key={d.day} style={styles.dotCol}>
                <View style={[styles.dot, { backgroundColor: getDotColor(d.score) }]} />
                <Text style={styles.dayLabel}>{d.day}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.legendText}>8–10</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>6–7</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>4–5</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>0–3</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  inner: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  labelLeft: {
    fontFamily: FontFamily.displayBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#9CA3AF',
  },
  monthRight: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#06B6D4',
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 14,
    backgroundColor: 'rgba(248,249,252,0.9)',
  },
  statCol: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
  statNum: {
    fontFamily: FontFamily.displayBold,
    fontSize: 26,
    marginBottom: 2,
  },
  statMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#9CA3AF',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  dotCol: { width: 28, alignItems: 'center', gap: 4 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  dayLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 10,
    color: '#9CA3AF',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#9CA3AF',
  },
});
