import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Box, Text, Pressable, HStack } from '../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import MaternelleMode from '../components/checkin/MaternelleMode';
import PrimaireMode from '../components/checkin/PrimaireMode';
import LyceeMode from '../components/checkin/LyceeMode';

type AgeMode = 'maternelle' | 'primaire' | 'lycee';

const MODES: { key: AgeMode; label: string; ages: string; icon: string }[] = [
  { key: 'maternelle', label: 'Maternelle', ages: '3-5 ans', icon: '🧒' },
  { key: 'primaire', label: 'Primaire', ages: '6-10 ans', icon: '👦' },
  { key: 'lycee', label: 'Collège/Lycée', ages: '11-18 ans', icon: '🧑‍🎓' },
];

export default function MonRessentiScreen() {
  const [mode, setMode] = useState<AgeMode>('primaire');

  const handleMaternelleSubmit = (value: string) => {
    console.log('Maternelle check-in:', value);
  };

  const handlePrimaireSubmit = (data: {
    emotion: number;
    energy: number;
    stress: number;
    message?: string;
  }) => {
    console.log('Primaire check-in:', data);
  };

  const handleLyceeSubmit = (data: {
    energy: number;
    stress: number;
    motivation: number;
    social: number;
    message?: string;
  }) => {
    console.log('Lycée check-in:', data);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.warmBg }} showsVerticalScrollIndicator={false}>
      {/* Header with gradient */}
      <LinearGradient
        colors={[Colors.warmOrange, Colors.warmBg]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ paddingTop: 20, paddingBottom: 30 }}
      >
        <Box className="items-center">
          <Text className="text-[48px] mb-2">💛</Text>
          <Text className="text-[28px] font-black text-white mb-1">Mon Ressenti</Text>
          <Text className="text-[15px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Prends un moment pour toi
          </Text>
        </Box>
      </LinearGradient>

      <Box className="px-5">
        {/* Mode selector */}
        <HStack className="gap-2 mb-5">
          {MODES.map((m) => (
            <Pressable
              key={m.key}
              className="flex-1 items-center py-3 rounded-2xl border-2"
              style={[
                { backgroundColor: Colors.warmCard, borderColor: 'transparent' },
                mode === m.key && { borderColor: Colors.warmOrange, backgroundColor: Colors.warmCardLight },
              ]}
              onPress={() => setMode(m.key)}
            >
              <Text className="text-2xl mb-1">{m.icon}</Text>
              <Text
                className="text-xs font-bold"
                style={{ color: mode === m.key ? Colors.warmOrange : Colors.warmCreamDark }}
              >
                {m.label}
              </Text>
              <Text className="text-[10px] mt-0.5" style={{ color: Colors.warmCreamDark }}>
                {m.ages}
              </Text>
            </Pressable>
          ))}
        </HStack>

        {/* Divider */}
        <Box className="h-px mb-5" style={{ backgroundColor: Colors.warmCardLight }} />

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
