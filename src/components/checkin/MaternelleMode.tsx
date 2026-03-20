import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Colors } from '../../constants/colors';

const EMOTIONS = [
  { emoji: '😄', label: 'Super !', value: 'super' },
  { emoji: '🙂', label: 'Bien', value: 'bien' },
  { emoji: '😢', label: 'Triste', value: 'triste' },
  { emoji: '😠', label: 'En colère', value: 'colere' },
];

interface Props {
  onSubmit: (value: string) => void;
}

export default function MaternelleMode({ onSubmit }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [scales] = useState(() => EMOTIONS.map(() => new Animated.Value(1)));

  const handlePress = (value: string, index: number) => {
    setSelected(value);
    Animated.sequence([
      Animated.spring(scales[index], {
        toValue: 1.25,
        useNativeDriver: true,
      }),
      Animated.spring(scales[index], {
        toValue: 1.1,
        useNativeDriver: true,
      }),
    ]).start();

    // Reset others
    scales.forEach((scale, i) => {
      if (i !== index) {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
      }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comment tu te sens ?</Text>
      <Text style={styles.subtitle}>Touche le visage qui te ressemble</Text>

      <View style={styles.grid}>
        {EMOTIONS.map((emotion, index) => (
          <TouchableOpacity
            key={emotion.value}
            onPress={() => handlePress(emotion.value, index)}
            activeOpacity={0.7}
          >
            <Animated.View
              style={[
                styles.emojiCard,
                selected === emotion.value && styles.emojiCardSelected,
                { transform: [{ scale: scales[index] }] },
              ]}
            >
              <Text style={styles.emoji}>{emotion.emoji}</Text>
              <Text
                style={[
                  styles.emojiLabel,
                  selected === emotion.value && styles.emojiLabelSelected,
                ]}
              >
                {emotion.label}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>

      {selected && (
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => onSubmit(selected)}
          activeOpacity={0.8}
        >
          <Text style={styles.submitText}>C'est parti ! 🎉</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.warmOrange,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.warmCreamDark,
    marginBottom: 30,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  emojiCard: {
    width: 140,
    height: 140,
    borderRadius: 24,
    backgroundColor: Colors.warmCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  emojiCardSelected: {
    borderColor: Colors.warmOrange,
    backgroundColor: Colors.warmCardLight,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  emojiLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warmCreamDark,
  },
  emojiLabelSelected: {
    color: Colors.warmOrange,
  },
  submitButton: {
    marginTop: 36,
    backgroundColor: Colors.warmOrange,
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 30,
  },
  submitText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
  },
});
