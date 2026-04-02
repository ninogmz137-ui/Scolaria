import { useRef, useEffect } from 'react';
import { Animated, Pressable as RNPressable, Platform } from 'react-native';
import { Box, Text, HStack, VStack } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '../../hooks/useSolariaFonts';

const JOY_TREND = {
  up: { label: 'En hausse', icon: 'trending-up' as const, color: '#10B981' },
  stable: { label: 'Stable', icon: 'remove' as const, color: '#F59E0B' },
  down: { label: 'Attention', icon: 'trending-down' as const, color: '#EF4444' },
};

interface Props {
  value: number;
  trend: 'up' | 'stable' | 'down';
  delay?: number;
  onPress: () => void;
}

export default function JoyScoreBanner({ value, trend, delay = 650, onPress }: Props) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const trendConfig = JOY_TREND[trend];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 350,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, tension: 200, friction: 10, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: enterAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <RNPressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <HStack
          className="items-center gap-3.5 p-4 rounded-[14px]"
          style={{
            backgroundColor: 'rgba(255,255,255,0.45)',
            borderWidth: 0,
            borderLeftWidth: 3,
            borderLeftColor: '#F59E0B',
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 },
              android: { elevation: 1 },
              default: {},
            }),
          }}
        >
          <Box
            className="w-11 h-11 rounded-full justify-center items-center"
            style={{ backgroundColor: trendConfig.color + '12' }}
          >
            <Text style={{ fontSize: 22 }}>💛</Text>
          </Box>
          <VStack className="flex-1">
            <Text style={{ fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: '#0F172A' }}>
              Score de Joie ·{' '}
              <Text style={{ fontFamily: FontFamily.sansBold }}>{value}/5</Text>
              {' '}cette semaine
            </Text>
            <HStack className="items-center gap-1 mt-0.5">
              <Ionicons name={trendConfig.icon} size={14} color={trendConfig.color} />
              <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 12, color: trendConfig.color }}>
                {trendConfig.label}
              </Text>
            </HStack>
          </VStack>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </HStack>
      </RNPressable>
    </Animated.View>
  );
}
