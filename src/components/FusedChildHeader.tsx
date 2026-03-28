import { useRef, useEffect } from 'react';
import { Animated, Pressable as RNPressable } from 'react-native';
import { Box, Text, HStack } from './ui';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { FontFamily } from '../hooks/useSolariaFonts';

interface Props {
  onAddChild?: () => void;
}

export default function FusedChildHeader({ onAddChild }: Props) {
  const { children: allChildren, selectedChild, selectedChildId, selectChild } = useActiveChild();
  const { theme } = useChildTheme();
  const accent = theme.accent;

  const otherChildren = allChildren.filter((c) => c.id !== selectedChildId);

  // Accent bar width animation
  const barWidth = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    barWidth.setValue(0);
    Animated.spring(barWidth, {
      toValue: 44,
      tension: 80,
      friction: 12,
      useNativeDriver: false,
      delay: 150,
    }).start();
  }, [selectedChildId]);

  // Pulse animation for accent bar
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 1500, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  // Entrance fade
  const enterAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;
  useEffect(() => {
    enterAnim.setValue(0);
    slideAnim.setValue(15);
    Animated.parallel([
      Animated.timing(enterAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [selectedChildId]);

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  // Capitalize first letter
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  const classeShort = selectedChild.classe.split('—')[0]?.trim() || selectedChild.classe;

  return (
    <Box>
      {/* Fused header row */}
      <Animated.View
        style={{ opacity: enterAnim, transform: [{ translateY: slideAnim }] }}
      >
        <HStack
          className="items-center px-3.5 py-3"
          style={{ backgroundColor: accent + '08', gap: 10 }}
        >
          {/* Active child card */}
          <HStack
            className="flex-1 items-center rounded-[14px] px-3.5 py-2.5"
            style={{
              backgroundColor: '#FFFFFF',
              borderWidth: 1.5,
              borderColor: accent + '25',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 2,
              gap: 10,
            }}
          >
            <Box
              className="w-11 h-11 rounded-xl items-center justify-center"
              style={{
                backgroundColor: accent + '12',
                borderWidth: 1.5,
                borderColor: accent + '20',
              }}
            >
              <Text style={{ fontSize: 24 }}>{selectedChild.avatar}</Text>
            </Box>
            <Box className="flex-1">
              <Text style={{ fontFamily: FontFamily.loraRegular, fontSize: 18, color: '#0F172A' }}>
                Bonjour,{' '}
                <Text style={{ fontFamily: FontFamily.loraBoldItalic, color: accent }}>
                  {selectedChild.name}
                </Text>
                {' '}👋
              </Text>
              <Text
                className="mt-0.5"
                style={{
                  fontFamily: FontFamily.sansSemiBold,
                  fontSize: 9,
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                  letterSpacing: 1.5,
                }}
              >
                {formattedDate} · {classeShort}
              </Text>
            </Box>
          </HStack>

          {/* Other children mini avatars */}
          <HStack style={{ gap: 8 }}>
            {otherChildren.map((child) => (
              <MiniAvatar
                key={child.id}
                emoji={child.avatar}
                onPress={() => selectChild(child.id)}
              />
            ))}
          </HStack>
        </HStack>
      </Animated.View>

      {/* Accent bar */}
      <Box className="px-4 pt-2.5 pb-3">
        <Animated.View
          style={{
            width: barWidth,
            height: 2.5,
            borderRadius: 2,
            opacity: pulseAnim,
            backgroundColor: accent,
          }}
        />
      </Box>
    </Box>
  );
}

function MiniAvatar({ emoji, onPress }: { emoji: string; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <RNPressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: '#F1F5F9',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </Animated.View>
    </RNPressable>
  );
}
