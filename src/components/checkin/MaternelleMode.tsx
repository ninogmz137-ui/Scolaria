import { useState } from 'react';
import { Animated } from 'react-native';
import { Box, Text, Pressable, VStack } from '../ui';
import { Colors } from '../../constants/colors';

const EMOTIONS = [
  { emoji: '😄', label: 'Super !', value: 'super' },
  { emoji: '🙂', label: 'Bien', value: 'bien' },
  { emoji: '😢', label: 'Triste', value: 'triste' },
  { emoji: '😠', label: 'En colere', value: 'colere' },
];

interface Props {
  onSubmit: (value: string) => void;
}

export default function MaternelleMode({ onSubmit }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [scales] = useState(() => EMOTIONS.map(() => new Animated.Value(1)));

  const handlePress = (value: string, index: number) => {
    setSelected(value);
    Animated.sequence([
      Animated.spring(scales[index], {
        toValue: 1.25,
        useNativeDriver: true,
      }),
      Animated.spring(scales[index], {
        toValue: 1.1,
        useNativeDriver: true,
      }),
    ]).start();

    // Reset others
    scales.forEach((scale, i) => {
      if (i !== index) {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
      }
    });
  };

  return (
    <VStack className="items-center pt-5">
      <Text
        className="text-[26px] font-extrabold mb-1.5 text-center"
        style={{ color: Colors.warmOrange }}
      >
        Comment tu te sens ?
      </Text>
      <Text
        className="text-[15px] text-center mb-[30px]"
        style={{ color: '#64748B' }}
      >
        Touche le visage qui te ressemble
      </Text>

      <Box className="flex-row flex-wrap justify-center" style={{ gap: 16 }}>
        {EMOTIONS.map((emotion, index) => (
          <Pressable
            key={emotion.value}
            onPress={() => handlePress(emotion.value, index)}
          >
            <Animated.View
              style={{
                width: 140,
                height: 140,
                borderRadius: 24,
                backgroundColor: selected === emotion.value ? Colors.warmCardLight : Colors.warmCard,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 3,
                borderColor: selected === emotion.value ? Colors.warmOrange : 'transparent',
                transform: [{ scale: scales[index] }],
              }}
            >
              <Text style={{ fontSize: 56, marginBottom: 8 }}>{emotion.emoji}</Text>
              <Text
                className="text-base font-semibold"
                style={{ color: selected === emotion.value ? Colors.warmOrange : '#64748B' }}
              >
                {emotion.label}
              </Text>
            </Animated.View>
          </Pressable>
        ))}
      </Box>

      {selected && (
        <Pressable
          className="mt-9 px-12 py-[18px] rounded-[30px]"
          style={{ backgroundColor: Colors.warmOrange }}
          onPress={() => onSubmit(selected)}
        >
          <Text className="text-xl font-extrabold" style={{ color: Colors.white }}>
            C'est parti ! 🎉
          </Text>
        </Pressable>
      )}
    </VStack>
  );
}
