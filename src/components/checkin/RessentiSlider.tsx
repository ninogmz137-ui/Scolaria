import type { ComponentType } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { FontFamily } from '../../hooks/useSolariaFonts';

const NAVY = '#1A2340';
const VIOLET = '#7C3AED';
/** Track — no gradient: Android does not render gradient fills on slider tracks reliably */
const TRACK_BG = 'rgba(0,0,0,0.08)';

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
      <View style={styles.trackOuter}>
        <View style={styles.trackBg} />
        <View style={[styles.fill, { width: `${value * 10}%` }]} />
        <Slider
          style={styles.sliderOverlay}
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor="rgba(0,0,0,0)"
          maximumTrackTintColor="rgba(0,0,0,0)"
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
  labelLeft: { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
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
  trackOuter: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
    maxWidth: '100%',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 5,
    top: '50%',
    marginTop: -2.5,
    borderRadius: 3,
    backgroundColor: TRACK_BG,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 5,
    top: '50%',
    marginTop: -2.5,
    borderRadius: 3,
    backgroundColor: VIOLET,
  },
  sliderOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: 40,
    zIndex: 2,
  },
});
