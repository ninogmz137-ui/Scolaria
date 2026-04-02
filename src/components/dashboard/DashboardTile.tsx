import { useRef, useEffect } from 'react';
import { Animated, Pressable as RNPressable, Platform } from 'react-native';
import { Box, Text, HStack } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '../../hooks/useSolariaFonts';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string;
  label: string;
  detail: string;
  detailColor?: string;
  badge?: number;
  borderColor: string;
  delay?: number;
  onPress: () => void;
}

export default function DashboardTile({
  icon,
  iconColor,
  value,
  label,
  detail,
  detailColor,
  badge,
  borderColor,
  delay = 0,
  onPress,
}: Props) {
  // Press state animation
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Entrance animation
  const enterAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Icon bounce
  const iconScale = useRef(new Animated.Value(0)).current;

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
      Animated.spring(iconScale, {
        toValue: 1,
        tension: 120,
        friction: 8,
        delay: delay + 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: enterAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        width: '47%',
        flexGrow: 1,
      }}
    >
      <RNPressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Box
          className="p-3.5 rounded-[14px]"
          style={{
            backgroundColor: 'rgba(255,255,255,0.45)',
            borderWidth: 0,
            borderLeftWidth: 3,
            borderLeftColor: borderColor,
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 },
              android: { elevation: 1 },
              default: {},
            }),
          }}
        >
          <HStack className="justify-between items-center mb-2.5">
            <Animated.View
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                backgroundColor: iconColor + '15',
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: iconScale }],
              }}
            >
              <Ionicons name={icon} size={18} color={iconColor} />
            </Animated.View>
            {badge !== undefined && badge > 0 && (
              <Box
                className="min-w-[20px] h-5 rounded-full justify-center items-center px-1"
                style={{ backgroundColor: '#EF4444' }}
              >
                <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 10, color: '#FFFFFF' }}>
                  {badge}
                </Text>
              </Box>
            )}
          </HStack>
          <Text
            style={{
              fontFamily: FontFamily.displayBold,
              fontSize: 32,
              color: '#0F172A',
              letterSpacing: -0.5,
              marginBottom: 2,
            }}
          >
            {value}
          </Text>
          <Text
            style={{
              fontFamily: FontFamily.displayBold,
              fontSize: 11,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: 2,
              marginBottom: 4,
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              fontFamily: FontFamily.sansRegular,
              fontSize: 10,
              color: detailColor || '#94A3B8',
            }}
            numberOfLines={1}
          >
            {detail}
          </Text>
        </Box>
      </RNPressable>
    </Animated.View>
  );
}
