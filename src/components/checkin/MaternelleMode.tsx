import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';

const NAVY = '#1A2340';
const AMBER = '#F59E0B';

const EMOTIONS = [
  { emoji: '😄', label: 'Super !', value: 'super' },
  { emoji: '🙂', label: 'Bien', value: 'bien' },
  { emoji: '😢', label: 'Triste', value: 'triste' },
  { emoji: '😤', label: 'En colère', value: 'colere' },
];

interface Props {
  selected: string | null;
  onSelect: (value: string) => void;
}

export default function MaternelleMode({ selected, onSelect }: Props) {
  const [scales] = useState(() => EMOTIONS.map(() => new Animated.Value(1)));

  const handlePress = (value: string, index: number) => {
    onSelect(value);
    Animated.sequence([
      Animated.spring(scales[index], { toValue: 1.08, useNativeDriver: true }),
      Animated.spring(scales[index], { toValue: 1, useNativeDriver: true }),
    ]).start();
    scales.forEach((scale, i) => {
      if (i !== index) Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    });
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Comment tu te sens ?</Text>
      <View style={styles.grid}>
        {EMOTIONS.map((emotion, index) => (
          <Pressable
            key={emotion.value}
            onPress={() => handlePress(emotion.value, index)}
            style={styles.cellOuter}
          >
            <Animated.View
              style={[
                styles.cell,
                selected === emotion.value && styles.cellSelected,
                { transform: [{ scale: scales[index] }] },
              ]}
            >
              <Text style={styles.emoji}>{emotion.emoji}</Text>
              <Text style={[styles.label, selected === emotion.value && styles.labelSelected]}>
                {emotion.label}
              </Text>
            </Animated.View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 4 },
  title: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: NAVY,
    marginBottom: 16,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  cellOuter: {
    width: '47%',
    minWidth: 140,
  },
  cell: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(248,249,252,0.9)',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  cellSelected: {
    borderColor: AMBER,
    backgroundColor: 'rgba(245,158,11,0.06)',
  },
  emoji: { fontSize: 38, marginBottom: 6 },
  label: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: NAVY,
    textAlign: 'center',
  },
  labelSelected: { color: NAVY },
});
