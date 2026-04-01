import { useRef, useEffect } from 'react';
import { Animated, Platform } from 'react-native';
import { Box, Text, HStack } from '../ui';
import { FontFamily } from '../../hooks/useSolariaFonts';

interface Props {
  summary: string;
  accent: string;
  delay?: number;
}

export default function AriaCard({ summary, accent, delay = 200 }: Props) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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

  return (
    <Animated.View style={{ opacity: enterAnim, transform: [{ translateY: slideAnim }] }}>
      <Box
        className="rounded-[14px] p-4"
        style={{
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#EEF0F5',
          borderLeftWidth: 3,
          borderLeftColor: accent,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
            android: { elevation: 1 },
            default: {},
          }),
        }}
      >
        <HStack className="items-center gap-1.5 mb-2">
          <Text style={{ fontSize: 13, color: accent }}>✦</Text>
          <Text
            style={{
              fontFamily: FontFamily.displayBold,
              fontSize: 13,
              color: accent,
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            Synthèse Aria · Ce matin
          </Text>
        </HStack>
        <Text
          style={{
            fontFamily: FontFamily.sansMedium,
            fontSize: 14,
            color: '#0F172A',
            lineHeight: 21,
          }}
        >
          {summary}
        </Text>
      </Box>
    </Animated.View>
  );
}
