import { useEffect, useRef } from 'react';
import { ScrollView, Animated } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../ui';
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
    <Box className="mb-1">
      <HStack className="justify-between items-center mb-3">
        <Box>
          <Text className="text-base font-bold" style={{ color: Colors.white }}>
            Portfolio extra-scolaire
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: Colors.gray }}>
            {activities.length} activité{activities.length > 1 ? 's' : ''}
            {' '}•{' '}
            {activities.reduce((sum, a) => sum + (a.hoursPerWeek || 0), 0)}h/semaine
          </Text>
        </Box>
        <Pressable
          className="justify-center items-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(34,211,238,0.1)',
          }}
        >
          <Ionicons name="add" size={18} color={Colors.cyan} />
        </Pressable>
      </HStack>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 20 }}
      >
        {activities.map((activity, i) => (
          <Animated.View
            key={activity.id}
            style={{
              opacity: fadeAnims[i],
              transform: [{ translateX: slideAnims[i] }],
            }}
          >
            <VStack
              className="items-center rounded-2xl p-3.5"
              style={{
                width: 140,
                backgroundColor: Colors.blueNightCard,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              {/* Icon */}
              <Box
                className="justify-center items-center mb-2.5"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: activity.color + '20',
                }}
              >
                <Text className="text-2xl">{activity.emoji}</Text>
              </Box>

              <Text className="text-[13px] font-bold text-center mb-0.5" style={{ color: Colors.white }}>
                {activity.name}
              </Text>
              <Text className="text-[11px] mb-2" style={{ color: Colors.gray }}>
                {activity.category}
              </Text>

              {/* Progress bar */}
              {activity.progressPercent != null && (
                <HStack className="items-center gap-1.5 w-full mb-2">
                  <Box
                    className="flex-1 rounded-sm overflow-hidden"
                    style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <Box
                      className="rounded-sm"
                      style={{
                        height: '100%',
                        width: `${activity.progressPercent}%`,
                        backgroundColor: activity.color,
                      }}
                    />
                  </Box>
                  <Text className="text-[10px] font-bold" style={{ color: activity.color }}>
                    {activity.progressPercent}%
                  </Text>
                </HStack>
              )}

              {/* Level badge */}
              <Box
                className="rounded-xl px-2 py-0.5 mb-1"
                style={{ borderWidth: 1, borderColor: activity.color }}
              >
                <Text className="text-[10px] font-bold" style={{ color: activity.color }}>
                  {activity.level}
                </Text>
              </Box>

              {/* Hours */}
              {activity.hoursPerWeek != null && (
                <Text className="text-[10px] mt-0.5" style={{ color: Colors.gray }}>
                  {activity.hoursPerWeek}h/sem
                  {activity.since ? ` • ${activity.since}` : ''}
                </Text>
              )}
            </VStack>
          </Animated.View>
        ))}
      </ScrollView>
    </Box>
  );
}
