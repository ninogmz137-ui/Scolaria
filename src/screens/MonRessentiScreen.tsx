import { ScrollView, Alert, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { createCheckin } from '../services/database';
import MaternelleMode from '../components/checkin/MaternelleMode';
import PrimaireMode from '../components/checkin/PrimaireMode';
import LyceeMode from '../components/checkin/LyceeMode';
import WallpaperBackground from '../components/WallpaperBackground';
import GlassCard from '../components/GlassCard';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';
import { FontFamily } from '../hooks/useSolariaFonts';

type AgeMode = 'maternelle' | 'primaire' | 'lycee';

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

export default function MonRessentiScreen() {
  const { mode: schoolMode } = useSchoolMode();
  const mode: AgeMode = mapSchoolModeToAgeMode(schoolMode);
  const { theme } = useChildTheme();
  const { selectedChildId } = useActiveChild();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;

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
    <View style={{ flex: 1 }}>
      <WallpaperBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: TOPBAR_H + 12,
          paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10,
          paddingHorizontal: 18,
        }}
      >
        {/* Page title */}
        <View style={styles.titleRow}>
          <Text style={styles.titleEmoji}>💛</Text>
          <View>
            <Text style={styles.title}>Mon Ressenti</Text>
            <Text style={styles.subtitle}>Prends un moment pour toi</Text>
          </View>
        </View>

        {/* Mode content wrapped in glass */}
        <GlassCard style={{ marginTop: 8 }}>
          {mode === 'maternelle' && (
            <MaternelleMode onSubmit={handleMaternelleSubmit} />
          )}
          {mode === 'primaire' && (
            <PrimaireMode onSubmit={handlePrimaireSubmit} currentXP={230} />
          )}
          {mode === 'lycee' && <LyceeMode onSubmit={handleLyceeSubmit} />}
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  titleEmoji: {
    fontSize: 40,
  },
  title: {
    fontFamily: FontFamily.sansBold,
    fontSize: 26,
    color: '#0F172A',
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
});
