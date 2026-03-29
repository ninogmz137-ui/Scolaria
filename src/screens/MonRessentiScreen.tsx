import { useState } from 'react';
import { ScrollView, Platform, Alert } from 'react-native';
import { Box, Text, Pressable, HStack } from '../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import DecorativeBlobs from '../components/DecorativeBlobs';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { createCheckin } from '../services/database';
import MaternelleMode from '../components/checkin/MaternelleMode';
import PrimaireMode from '../components/checkin/PrimaireMode';
import LyceeMode from '../components/checkin/LyceeMode';

type AgeMode = 'maternelle' | 'primaire' | 'lycee';

const MODES: { key: AgeMode; label: string; ages: string; icon: string }[] = [
  { key: 'maternelle', label: 'Maternelle', ages: '3-5 ans', icon: '🧒' },
  { key: 'primaire', label: 'Primaire', ages: '6-10 ans', icon: '👦' },
  { key: 'lycee', label: 'Collège/Lycée', ages: '11-18 ans', icon: '🧑‍🎓' },
];

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 8 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
});

const EMOJI_JOY: Record<string, number> = {
  '😊': 9,
  '😄': 10,
  '🥰': 10,
  '😁': 9,
  '😐': 5,
  '😔': 4,
  '😢': 3,
  '😡': 2,
  '😤': 2,
  '😰': 3,
  '😴': 4,
};

function emojiToJoy(emoji: string): number {
  return EMOJI_JOY[emoji] ?? 5;
}

function mapSchoolModeToAgeMode(schoolMode: 'maternelle' | 'primaire' | 'lycee'): AgeMode {
  if (schoolMode === 'maternelle') return 'maternelle';
  if (schoolMode === 'lycee') return 'lycee';
  return 'primaire';
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export default function MonRessentiScreen() {
  const { mode: schoolMode } = useSchoolMode();
  const [mode, setMode] = useState<AgeMode>(mapSchoolModeToAgeMode(schoolMode));
  const { theme } = useChildTheme();
  const { selectedChildId } = useActiveChild();

  const handleMaternelleSubmit = async (value: string) => {
    try {
      await createCheckin({
        child_id: selectedChildId,
        mode: 'maternelle',
        emotion: value,
        joy_score: emojiToJoy(value),
      });
      Alert.alert('Merci 💛', 'Ton ressenti a été enregistré !');
    } catch (error) {
      console.error('Maternelle check-in error:', error);
    }
  };

  const handlePrimaireSubmit = async (data: {
    emotion: number;
    energy: number;
    stress: number;
    message?: string;
  }) => {
    try {
      const joy_score = Math.round((data.emotion + (10 - data.stress) + data.energy) / 3);
      await createCheckin({
        child_id: selectedChildId,
        mode: 'primaire',
        emotion: String(data.emotion),
        energy: data.energy,
        stress: data.stress,
        message: data.message,
        joy_score,
      });
      Alert.alert('Merci 💛', 'Ton ressenti a été enregistré !');
    } catch (error) {
      console.error('Primaire check-in error:', error);
    }
  };

  const handleLyceeSubmit = async (data: {
    energy: number;
    stress: number;
    motivation: number;
    social: number;
    message?: string;
  }) => {
    try {
      const joy_score = Math.round((data.energy + (10 - data.stress) + data.motivation + data.social) / 4);
      await createCheckin({
        child_id: selectedChildId,
        mode: 'lycee',
        energy: data.energy,
        stress: data.stress,
        motivation: data.motivation,
        social: data.social,
        message: data.message,
        joy_score,
      });
      Alert.alert('Merci 💛', 'Ton ressenti a été enregistré !');
    } catch (error) {
      console.error('Lycée check-in error:', error);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#E8EDF5' }} showsVerticalScrollIndicator={false}>
      {/* Header with gradient */}
      <LinearGradient
        colors={['#0B1628', theme.accent + 'DD']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          paddingTop: 20,
          paddingBottom: 30,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <Box className="items-center">
          <Text className="text-[48px] mb-2">💛</Text>
          <Text className="text-[28px] font-black text-white mb-1">Mon Ressenti</Text>
          <Text className="text-[15px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Prends un moment pour toi
          </Text>
        </Box>
      </LinearGradient>

      <Box className="px-5" style={{ position: 'relative' }}>
        {/* Decorative blobs */}
        <DecorativeBlobs accent={theme.accent} />

        {/* Mode selector */}
        <HStack className="gap-2 mb-5" style={{ marginTop: 16 }}>
          {MODES.map((m) => (
            <Pressable
              key={m.key}
              className="flex-1 items-center py-3 rounded-2xl"
              style={[
                {
                  backgroundColor: Colors.card,
                  borderWidth: 1.5,
                  borderColor: `rgba(${hexToRgb(theme.accent)},0.15)`,
                  ...CARD_SHADOW,
                },
                mode === m.key && { borderColor: theme.accent, backgroundColor: `rgba(${hexToRgb(theme.accent)},0.06)` },
              ]}
              onPress={() => setMode(m.key)}
            >
              <Text className="text-2xl mb-1">{m.icon}</Text>
              <Text
                className="text-xs font-bold"
                style={{ color: mode === m.key ? theme.accent : Colors.textPrimary }}
              >
                {m.label}
              </Text>
              <Text className="text-[10px] mt-0.5" style={{ color: Colors.textMuted }}>
                {m.ages}
              </Text>
            </Pressable>
          ))}
        </HStack>

        {/* Divider */}
        <Box className="h-px mb-5" style={{ backgroundColor: Colors.cardBorder }} />

        {/* Mode content */}
        {mode === 'maternelle' && (
          <MaternelleMode onSubmit={handleMaternelleSubmit} />
        )}
        {mode === 'primaire' && (
          <PrimaireMode onSubmit={handlePrimaireSubmit} currentXP={230} />
        )}
        {mode === 'lycee' && <LyceeMode onSubmit={handleLyceeSubmit} />}
      </Box>

      <Box className="h-10" />
    </ScrollView>
  );
}
