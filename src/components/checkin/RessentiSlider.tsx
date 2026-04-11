import type { ComponentType } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '../../hooks/useSolariaFonts';

const NAVY = '#1A2340';
const TRACK = 'rgba(0,0,0,0.07)';

interface Props {
  label: string;
  Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  value: number;
  onChange: (v: number) => void;
}

export default function RessentiSlider({ label, Icon, value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          <Icon size={15} color="#6B7280" strokeWidth={1.8} />
          <Text style={styles.labelText}>{label}</Text>
        </View>
        <Text style={styles.scoreText}>{value}/10</Text>
      </View>
      <View style={styles.trackWrap}>
        <View style={styles.trackBg} />
        <LinearGradient
          colors={['#7C3AED', '#06B6D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${value * 10}%` }]}
        />
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor="#FFFFFF"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
    color: NAVY,
  },
  scoreText: {
    fontFamily: FontFamily.displayBold,
    fontSize: 17,
    color: NAVY,
  },
  trackWrap: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 5,
    top: '50%',
    marginTop: -2.5,
    borderRadius: 3,
    backgroundColor: TRACK,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 5,
    top: '50%',
    marginTop: -2.5,
    borderRadius: 3,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
