import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface Activity {
  id: string;
  name: string;
  emoji: string;
  category: string;
  level: string;
  color: string;
}

interface Props {
  activities: Activity[];
}

export default function Portfolio({ activities }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Portfolio extra-scolaire</Text>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.7}>
          <Ionicons name="add" size={18} color={Colors.cyan} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activities.map((activity) => (
          <View key={activity.id} style={styles.card}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: activity.color + '20' },
              ]}
            >
              <Text style={styles.cardEmoji}>{activity.emoji}</Text>
            </View>
            <Text style={styles.cardName}>{activity.name}</Text>
            <Text style={styles.cardCategory}>{activity.category}</Text>
            <View style={[styles.levelBadge, { borderColor: activity.color }]}>
              <Text style={[styles.levelText, { color: activity.color }]}>
                {activity.level}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34,211,238,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    gap: 10,
    paddingRight: 20,
  },
  card: {
    width: 130,
    backgroundColor: Colors.blueNightCard,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 2,
  },
  cardCategory: {
    fontSize: 11,
    color: Colors.gray,
    marginBottom: 8,
  },
  levelBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
