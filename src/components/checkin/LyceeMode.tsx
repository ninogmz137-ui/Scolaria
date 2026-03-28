import { useState } from 'react';
import { TextInput, Linking } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../ui';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { detectCriticalKeywords } from '../profile/JoyAlerts';

interface SliderData {
  key: string;
  label: string;
  icon: string;
  color: string;
  emoji: (v: number) => string;
}

const SLIDERS: SliderData[] = [
  {
    key: 'energy',
    label: 'Energie',
    icon: '⚡',
    color: Colors.warmOrange,
    emoji: (v) => (v >= 7 ? '🔋' : v >= 4 ? '🔌' : '🪫'),
  },
  {
    key: 'stress',
    label: 'Stress',
    icon: '😰',
    color: Colors.red,
    emoji: (v) => (v >= 7 ? '🔥' : v >= 4 ? '😐' : '😌'),
  },
  {
    key: 'motivation',
    label: 'Motivation',
    icon: '🎯',
    color: Colors.cyan,
    emoji: (v) => (v >= 7 ? '🚀' : v >= 4 ? '👍' : '😴'),
  },
  {
    key: 'social',
    label: 'Social',
    icon: '👥',
    color: Colors.violet,
    emoji: (v) => (v >= 7 ? '🤝' : v >= 4 ? '🙂' : '😶'),
  },
];

interface Props {
  onSubmit: (data: {
    energy: number;
    stress: number;
    motivation: number;
    social: number;
    message?: string;
  }) => void;
}

export default function LyceeMode({ onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, number>>({
    energy: 5,
    stress: 3,
    motivation: 5,
    social: 5,
  });
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const updateValue = (key: string, val: number) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    onSubmit({
      energy: values.energy,
      stress: values.stress,
      motivation: values.motivation,
      social: values.social,
      message: message || undefined,
    });
  };

  if (submitted) {
    return (
      <VStack className="items-center pt-[50px]">
        <Text style={{ fontSize: 64, marginBottom: 12 }}>✅</Text>
        <Text
          className="text-2xl font-extrabold mb-2"
          style={{ color: Colors.warmOrange }}
        >
          Ressenti enregistre
        </Text>
        <Text
          className="text-[15px] mb-4"
          style={{ color: Colors.warmCreamDark }}
        >
          Tes donnees restent confidentielles
        </Text>
        <HStack className="items-center" style={{ gap: 6 }}>
          <Ionicons name="lock-closed" size={16} color={Colors.warmOrangeLight} />
          <Text className="text-[13px] font-semibold" style={{ color: Colors.warmOrangeLight }}>
            Chiffre · Visible uniquement par toi
          </Text>
        </HStack>
      </VStack>
    );
  }

  return (
    <Box className="pt-2.5">
      {/* Confidentiality badge */}
      <HStack
        className="self-end items-center px-3 py-[5px] rounded-[20px] mb-3"
        style={{ backgroundColor: Colors.warmCardLight, gap: 6 }}
      >
        <Ionicons name="lock-closed" size={14} color={Colors.warmOrangeLight} />
        <Text className="text-[13px] font-semibold" style={{ color: Colors.warmOrangeLight }}>
          Confidentiel
        </Text>
      </HStack>

      <Text className="text-[22px] font-extrabold mb-5" style={{ color: Colors.warmCream }}>
        Mon ressenti du jour
      </Text>

      {/* Sliders */}
      {SLIDERS.map((s) => (
        <Box key={s.key} className="mb-[18px]">
          <HStack className="justify-between items-center mb-1">
            <Text className="text-base font-semibold" style={{ color: Colors.warmCream }}>
              {s.icon} {s.label}
            </Text>
            <Text className="text-[15px] font-bold" style={{ color: Colors.warmOrangeLight }}>
              {s.emoji(values[s.key])} {values[s.key]}/10
            </Text>
          </HStack>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={10}
            step={1}
            value={values[s.key]}
            onValueChange={(v) => updateValue(s.key, v)}
            minimumTrackTintColor={s.color}
            maximumTrackTintColor={Colors.warmCardLight}
            thumbTintColor={s.color}
          />
        </Box>
      ))}

      {/* Confidential message */}
      <Box className="mt-2 mb-6">
        <HStack className="items-center mb-2.5" style={{ gap: 8 }}>
          <Ionicons name="chatbubble-ellipses" size={18} color={Colors.warmOrangeLight} />
          <Text className="text-base font-bold" style={{ color: Colors.warmCream }}>
            Message confidentiel
          </Text>
        </HStack>
        <TextInput
          className="rounded-2xl p-4 text-[15px]"
          style={{
            backgroundColor: Colors.warmCard,
            color: Colors.warmCream,
            minHeight: 100,
            textAlignVertical: 'top',
            borderWidth: 1,
            borderColor: Colors.warmCardLight,
          }}
          placeholder="Ce que tu ressens est important..."
          placeholderTextColor={Colors.warmCreamDark}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
        />
        <Text className="text-xs text-right mt-1" style={{ color: Colors.warmCreamDark }}>
          {message.length}/500
        </Text>
      </Box>

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
            Si tu traverses un moment difficile, n'hesite pas a en parler. Ces numeros sont gratuits et anonymes :
          </Text>
          <Pressable
            className="flex-row items-center p-3 rounded-xl mb-1.5"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', gap: 10 }}
            onPress={() => Linking.openURL('tel:3020')}
          >
            <Text className="text-lg font-black" style={{ color: Colors.white }}>📞 3020</Text>
            <Text className="text-xs" style={{ color: Colors.gray }}>Non au Harcelement — gratuit</Text>
          </Pressable>
          <Pressable
            className="flex-row items-center p-3 rounded-xl mb-1.5"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', gap: 10 }}
            onPress={() => Linking.openURL('tel:3114')}
          >
            <Text className="text-lg font-black" style={{ color: Colors.white }}>🆘 3114</Text>
            <Text className="text-xs" style={{ color: Colors.gray }}>Prevention du suicide — 24h/24, 7j/7</Text>
          </Pressable>
          <Pressable
            className="flex-row items-center p-3 rounded-xl mb-1.5"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', gap: 10 }}
            onPress={() => Linking.openURL('tel:119')}
          >
            <Text className="text-lg font-black" style={{ color: Colors.white }}>🛡️ 119</Text>
            <Text className="text-xs" style={{ color: Colors.gray }}>Allo Enfance en Danger — 24h/24</Text>
          </Pressable>
          <Text
            className="text-xs text-center mt-2 leading-[17px]"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            Tu peux aussi parler a un adulte de confiance : parent, prof, CPE, infirmier(ere) scolaire.
          </Text>
        </Box>
      )}

      {/* Submit */}
      <Pressable
        className="py-[18px] rounded-[30px] flex-row items-center justify-center"
        style={{ backgroundColor: Colors.warmOrange, gap: 10 }}
        onPress={handleSubmit}
      >
        <Ionicons name="shield-checkmark" size={22} color={Colors.white} />
        <Text className="text-lg font-extrabold" style={{ color: Colors.white }}>
          Enregistrer mon ressenti
        </Text>
      </Pressable>

      <Text
        className="text-xs text-center mt-3.5 leading-[18px]"
        style={{ color: Colors.warmCreamDark }}
      >
        🔒 Tes reponses sont chiffrees et ne sont partagees avec personne.
      </Text>
    </Box>
  );
}
