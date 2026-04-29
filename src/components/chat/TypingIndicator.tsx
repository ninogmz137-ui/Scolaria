import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { Box, HStack } from '../ui';
import { Colors } from '../../constants/colors';

export default function TypingIndicator() {
  const dots = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [dots]);

  return (
    <HStack className="items-center py-1 px-0.5" style={{ gap: 5 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: Colors.violet,
            opacity: dot.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
            }),
            transform: [
              {
                translateY: dot.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -6],
                }),
              },
            ],
          }}
        />
      ))}
    </HStack>
  );
}
