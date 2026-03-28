import { useState } from 'react';
import { TextInput, Linking } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../ui';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { detectCriticalKeywords } from '../profile/JoyAlerts';

const EMOTIONS = [
  { emoji: '😄', label: 'Super', value: 4 },
  { emoji: '🙂', label: 'Bien', value: 3 },
  { emoji: '😐', label: 'Bof', value: 2 },
  { emoji: '😢', label: 'Pas bien', value: 1 },
];

interface Props {
  onSubmit: (data: {
    emotion: number;
    energy: number;
    stress: number;
    message?: string;
  }) => void;
  currentXP: number;
}

export default function PrimaireMode({ onSubmit, currentXP }: Props) {
  const [emotion, setEmotion] = useState<number | null>(null);
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(3);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (emotion === null) return;
    setSubmitted(true);
    onSubmit({ emotion, energy, stress, message: message || undefined });
  };

  if (submitted) {
    return (
      <VStack className="items-center pt-10">
        <Text style={{ fontSize: 72, marginBottom: 12 }}>🌟</Text>
        <Text
          className="text-[28px] font-extrabold mb-2"
          style={{ color: Colors.warmOrange }}
        >
          Bravo !
        </Text>
        <Text
          className="text-4xl font-black mb-5"
          style={{ color: Colors.warmYellow }}
        >
          +50 XP
        </Text>
        <Box
          className="w-4/5 h-3.5 rounded-[7px] overflow-hidden mb-2"
          style={{ backgroundColor: Colors.warmCardLight }}
        >
          <Box
            className="h-full rounded-[7px]"
            style={{
              width: `${Math.min(((currentXP + 50) / 500) * 100, 100)}%`,
              backgroundColor: Colors.warmYellow,
            }}
          />
        </Box>
        <Text className="text-sm font-semibold" style={{ color: Colors.warmCreamDark }}>
          {currentXP + 50} / 500 XP
        </Text>
      </VStack>
    );
  }

  return (
    <Box className="pt-2.5">
      {/* XP badge */}
      <Box
        className="self-end px-3.5 py-1.5 rounded-[20px] mb-4"
        style={{ backgroundColor: Colors.warmCardLight }}
      >
        <Text className="text-sm font-bold" style={{ color: Colors.warmYellow }}>
          ⭐ {currentXP} XP
        </Text>
      </Box>

      {/* Emotion picker */}
      <Text className="text-lg font-bold mb-3" style={{ color: Colors.warmCream }}>
        Comment tu te sens ?
      </Text>
      <HStack className="justify-between mb-6">
        {EMOTIONS.map((e) => (
          <Pressable
            key={e.value}
            onPress={() => setEmotion(e.value)}
            className="items-center py-3 px-2.5 rounded-2xl flex-1 mx-[3px]"
            style={{
              borderWidth: 2,
              borderColor: emotion === e.value ? Colors.warmOrange : 'transparent',
              backgroundColor: emotion === e.value ? Colors.warmCardLight : Colors.warmCard,
            }}
          >
            <Text style={{ fontSize: 32, marginBottom: 4 }}>{e.emoji}</Text>
            <Text
              className="text-xs font-semibold"
              style={{ color: emotion === e.value ? Colors.warmOrange : Colors.warmCreamDark }}
            >
              {e.label}
            </Text>
          </Pressable>
        ))}
      </HStack>

      {/* Energy slider */}
      <Box className="mb-5">
        <HStack className="justify-between items-center mb-1.5">
          <Text className="text-base font-semibold" style={{ color: Colors.warmCream }}>
            ⚡ Energie
          </Text>
          <Text className="text-base font-bold" style={{ color: Colors.warmOrangeLight }}>
            {energy}/10
          </Text>
        </HStack>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={energy}
          onValueChange={setEnergy}
          minimumTrackTintColor={Colors.warmOrange}
          maximumTrackTintColor={Colors.warmCardLight}
          thumbTintColor={Colors.warmOrange}
        />
      </Box>

      {/* Stress slider */}
      <Box className="mb-5">
        <HStack className="justify-between items-center mb-1.5">
          <Text className="text-base font-semibold" style={{ color: Colors.warmCream }}>
            😰 Stress
          </Text>
          <Text className="text-base font-bold" style={{ color: Colors.warmOrangeLight }}>
            {stress}/10
          </Text>
        </HStack>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={stress}
          onValueChange={setStress}
          minimumTrackTintColor={Colors.red}
          maximumTrackTintColor={Colors.warmCardLight}
          thumbTintColor={Colors.red}
        />
      </Box>

      {/* Optional message */}
      <Text className="text-lg font-bold mb-3" style={{ color: Colors.warmCream }}>
        Un mot ? <Text className="text-sm font-normal" style={{ color: Colors.warmCreamDark }}>(optionnel)</Text>
      </Text>
      <TextInput
        className="rounded-2xl p-4 text-[15px] mb-6"
        style={{
          backgroundColor: Colors.warmCard,
          color: Colors.warmCream,
          minHeight: 80,
          textAlignVertical: 'top',
          borderWidth: 1,
          borderColor: Colors.warmCardLight,
        }}
        placeholder="Raconte ta journee..."
        placeholderTextColor={Colors.warmCreamDark}
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={200}
      />

      {/* Urgency protocol */}
      {detectCriticalKeywords(message) && (
        <Box
          className="rounded-2xl p-4 mb-5"
          style={{ backgroundColor: '#3D1010', borderWidth: 1, borderColor: '#F8717140' }}
        >
          <HStack className="items-center mb-2" style={{ gap: 8 }}>
            <Ionicons name="heart" size={18} color={Colors.red} />
            <Text className="text-base font-extrabold" style={{ color: Colors.white }}>
              Tu n'es pas seul(e)
            </Text>
          </HStack>
          <Text
            className="text-[13px] leading-[18px] mb-3"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Si tu traverses un moment difficile, parle a un adulte de confiance ou appelle :
          </Text>
          <Pressable
            className="flex-row items-center p-3 rounded-xl mb-1.5"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', gap: 10 }}
            onPress={() => Linking.openURL('tel:3020')}
          >
            <Text className="text-lg font-black" style={{ color: Colors.white }}>📞 3020</Text>
            <Text className="text-xs" style={{ color: Colors.gray }}>Non au Harcelement</Text>
          </Pressable>
          <Pressable
            className="flex-row items-center p-3 rounded-xl mb-1.5"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', gap: 10 }}
            onPress={() => Linking.openURL('tel:3114')}
          >
            <Text className="text-lg font-black" style={{ color: Colors.white }}>🆘 3114</Text>
            <Text className="text-xs" style={{ color: Colors.gray }}>Prevention du suicide — 24h/24</Text>
          </Pressable>
          <Pressable
            className="flex-row items-center p-3 rounded-xl mb-1.5"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', gap: 10 }}
            onPress={() => Linking.openURL('tel:119')}
          >
            <Text className="text-lg font-black" style={{ color: Colors.white }}>🛡️ 119</Text>
            <Text className="text-xs" style={{ color: Colors.gray }}>Allo Enfance en Danger</Text>
          </Pressable>
        </Box>
      )}

      {/* Submit */}
      <Pressable
        className="py-[18px] rounded-[30px] items-center"
        style={{
          backgroundColor: Colors.warmOrange,
          opacity: !emotion ? 0.4 : 1,
        }}
        onPress={handleSubmit}
        disabled={!emotion}
      >
        <Text className="text-lg font-extrabold" style={{ color: Colors.white }}>
          Valider +50 XP ⭐
        </Text>
      </Pressable>
    </Box>
  );
}
