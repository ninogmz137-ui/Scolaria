import { View, Text, StyleSheet } from 'react-native';
import { Zap, AlertCircle, Clock, Users } from 'lucide-react-native';
import RessentiSlider from './RessentiSlider';
import { FontFamily } from '../../hooks/useSolariaFonts';

interface Props {
  energy: number;
  stress: number;
  motivation: number;
  social: number;
  onEnergy: (v: number) => void;
  onStress: (v: number) => void;
  onMotivation: (v: number) => void;
  onSocial: (v: number) => void;
}

export default function LyceeMode({
  energy,
  stress,
  motivation,
  social,
  onEnergy,
  onStress,
  onMotivation,
  onSocial,
}: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.section}>Mon ressenti du jour</Text>

      <RessentiSlider label="Énergie" Icon={Zap} value={energy} onChange={onEnergy} />
      <RessentiSlider label="Stress" Icon={AlertCircle} value={stress} onChange={onStress} />
      <RessentiSlider label="Motivation" Icon={Clock} value={motivation} onChange={onMotivation} />
      <RessentiSlider label="Social" Icon={Users} value={social} onChange={onSocial} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 4 },
  section: {
    fontFamily: FontFamily.displayBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    marginBottom: 14,
  },
});
