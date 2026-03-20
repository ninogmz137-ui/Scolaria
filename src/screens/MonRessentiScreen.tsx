import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with gradient */}
      <LinearGradient
        colors={[Colors.warmOrange, Colors.warmBg]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerEmoji}>💛</Text>
          <Text style={styles.headerTitle}>Mon Ressenti</Text>
          <Text style={styles.headerSubtitle}>
            Prends un moment pour toi
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Mode selector */}
        <View style={styles.modeSelector}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[
                styles.modeChip,
                mode === m.key && styles.modeChipActive,
              ]}
              onPress={() => setMode(m.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.modeIcon}>{m.icon}</Text>
              <Text
                style={[
                  styles.modeLabel,
                  mode === m.key && styles.modeLabelActive,
                ]}
              >
                {m.label}
              </Text>
              <Text style={styles.modeAges}>{m.ages}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Mode content */}
        {mode === 'maternelle' && (
          <MaternelleMode onSubmit={handleMaternelleSubmit} />
        )}
        {mode === 'primaire' && (
          <PrimaireMode onSubmit={handlePrimaireSubmit} currentXP={230} />
        )}
        {mode === 'lycee' && <LyceeMode onSubmit={handleLyceeSubmit} />}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmBg,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
  body: {
    paddingHorizontal: 20,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: Colors.warmCard,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeChipActive: {
    borderColor: Colors.warmOrange,
    backgroundColor: Colors.warmCardLight,
  },
  modeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.warmCreamDark,
  },
  modeLabelActive: {
    color: Colors.warmOrange,
  },
  modeAges: {
    fontSize: 10,
    color: Colors.warmCreamDark,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.warmCardLight,
    marginBottom: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
