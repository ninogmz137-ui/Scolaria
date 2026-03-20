import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Colors } from '../constants/colors';

type Grade = {
  id: string;
  subject: string;
  grade: number;
  maxGrade: number;
  date: string;
  emoji: string;
  color: string;
};

type Props = {
  grades: Grade[];
};

function getGradeColor(grade: number, max: number): string {
  const ratio = grade / max;
  if (ratio >= 0.7) return Colors.green;
  if (ratio >= 0.5) return Colors.orange;
  return Colors.red;
}

export default function RecentGrades({ grades }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notes récentes</Text>
        <Text style={styles.seeAll}>Voir tout →</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {grades.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={[styles.emojiCircle, { backgroundColor: item.color + '20' }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
            <View style={styles.gradeRow}>
              <Text style={[styles.grade, { color: getGradeColor(item.grade, item.maxGrade) }]}>
                {item.grade}
              </Text>
              <Text style={styles.maxGrade}>/{item.maxGrade}</Text>
            </View>
            <Text style={styles.date}>{item.date}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  seeAll: {
    fontSize: 13,
    color: Colors.cyan,
    fontWeight: '500',
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.blueNightCard,
    borderRadius: 16,
    padding: 16,
    width: 130,
    alignItems: 'center',
  },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emoji: {
    fontSize: 22,
  },
  subject: {
    fontSize: 13,
    color: Colors.lightGray,
    fontWeight: '500',
    marginBottom: 6,
    textAlign: 'center',
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  grade: {
    fontSize: 24,
    fontWeight: '800',
  },
  maxGrade: {
    fontSize: 13,
    color: Colors.gray,
    fontWeight: '500',
  },
  date: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 4,
  },
});
