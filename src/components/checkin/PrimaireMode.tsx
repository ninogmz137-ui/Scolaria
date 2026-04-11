import { View, Text, StyleSheet } from 'react-native';
import { Smile, Zap } from 'lucide-react-native';
import RessentiSlider from './RessentiSlider';
import { FontFamily } from '../../hooks/useSolariaFonts';

const NAVY = '#1A2340';

interface Props {
  energy: number;
  humeur: number;
  onEnergy: (v: number) => void;
  onHumeur: (v: number) => void;
}

export default function PrimaireMode({ energy, humeur, onEnergy, onHumeur }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.section}>Mon ressenti du jour</Text>
      <RessentiSlider label="Énergie" Icon={Zap} value={energy} onChange={onEnergy} />
      <RessentiSlider
        label="Humeur"
        Icon={Smile}
        value={humeur}
        onChange={onHumeur}
      />
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
