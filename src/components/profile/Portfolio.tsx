import { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface Activity {
  id: string;
  name: string;
  emoji: string;
  category: string;
  level: string;
  color: string;
  hoursPerWeek?: number;
  progressPercent?: number;
  since?: string;
}

interface Props {
  activities: Activity[];
}

export default function Portfolio({ activities }: Props) {
  const fadeAnims = useRef(activities.map(() => new Animated.Value(0))).current;
  const slideAnims = useRef(activities.map(() => new Animated.Value(20))).current;

  useEffect(() => {
    Animated.stagger(
      100,
      activities.map((_, i) =>
        Animated.parallel([
          Animated.timing(fadeAnims[i], {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnims[i], {
            toValue: 0,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ),
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Portfolio extra-scolaire</Text>
          <Text style={styles.subtitle}>
            {activities.length} activité{activities.length > 1 ? 's' : ''}
            {' '}•{' '}
            {activities.reduce((sum, a) => sum + (a.hoursPerWeek || 0), 0)}h/semaine
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.7}>
          <Ionicons name="add" size={18} color={Colors.cyan} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activities.map((activity, i) => (
          <Animated.View
            key={activity.id}
            style={{
              opacity: fadeAnims[i],
              transform: [{ translateX: slideAnims[i] }],
            }}
          >
            <View style={styles.card}>
              {/* Icon */}
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

              {/* Progress bar */}
              {activity.progressPercent != null && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${activity.progressPercent}%`,
                          backgroundColor: activity.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: activity.color }]}>
                    {activity.progressPercent}%
                  </Text>
                </View>
              )}

              {/* Level badge */}
              <View style={[styles.levelBadge, { borderColor: activity.color }]}>
                <Text style={[styles.levelText, { color: activity.color }]}>
                  {activity.level}
                </Text>
              </View>

              {/* Hours */}
              {activity.hoursPerWeek != null && (
                <Text style={styles.hoursText}>
                  {activity.hoursPerWeek}h/sem
                  {activity.since ? ` • ${activity.since}` : ''}
                </Text>
              )}
            </View>
          </Animated.View>
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
  subtitle: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
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
    width: 140,
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    marginBottom: 8,
  },
  progressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '700',
  },
  levelBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
  },
  hoursText: {
    fontSize: 10,
    color: Colors.gray,
    marginTop: 2,
  },
});
