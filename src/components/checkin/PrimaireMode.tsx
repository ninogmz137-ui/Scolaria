import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { detectCriticalKeywords } from '../profile/JoyAlerts';

const EMOTIONS = [
  { emoji: '😄', label: 'Super', value: 4 },
  { emoji: '🙂', label: 'Bien', value: 3 },
  { emoji: '😐', label: 'Bof', value: 2 },
  { emoji: '😢', label: 'Pas bien', value: 1 },
];

interface Props {
  onSubmit: (data: {
    emotion: number;
    energy: number;
    stress: number;
    message?: string;
  }) => void;
  currentXP: number;
}

export default function PrimaireMode({ onSubmit, currentXP }: Props) {
  const [emotion, setEmotion] = useState<number | null>(null);
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(3);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (emotion === null) return;
    setSubmitted(true);
    onSubmit({ emotion, energy, stress, message: message || undefined });
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>🌟</Text>
        <Text style={styles.successTitle}>Bravo !</Text>
        <Text style={styles.successXP}>+50 XP</Text>
        <View style={styles.xpBar}>
          <View
            style={[
              styles.xpFill,
              { width: `${Math.min(((currentXP + 50) / 500) * 100, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.xpTotal}>{currentXP + 50} / 500 XP</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* XP badge */}
      <View style={styles.xpBadge}>
        <Text style={styles.xpBadgeText}>⭐ {currentXP} XP</Text>
      </View>

      {/* Emotion picker */}
      <Text style={styles.sectionTitle}>Comment tu te sens ?</Text>
      <View style={styles.emotionRow}>
        {EMOTIONS.map((e) => (
          <TouchableOpacity
            key={e.value}
            onPress={() => setEmotion(e.value)}
            style={[
              styles.emotionChip,
              emotion === e.value && styles.emotionChipSelected,
            ]}
            activeOpacity={0.7}
          >
            <Text style={styles.emotionEmoji}>{e.emoji}</Text>
            <Text
              style={[
                styles.emotionLabel,
                emotion === e.value && styles.emotionLabelSelected,
              ]}
            >
              {e.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Energy slider */}
      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>⚡ Énergie</Text>
          <Text style={styles.sliderValue}>{energy}/10</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={energy}
          onValueChange={setEnergy}
          minimumTrackTintColor={Colors.warmOrange}
          maximumTrackTintColor={Colors.warmCardLight}
          thumbTintColor={Colors.warmOrange}
        />
      </View>

      {/* Stress slider */}
      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>😰 Stress</Text>
          <Text style={styles.sliderValue}>{stress}/10</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={stress}
          onValueChange={setStress}
          minimumTrackTintColor={Colors.red}
          maximumTrackTintColor={Colors.warmCardLight}
          thumbTintColor={Colors.red}
        />
      </View>

      {/* Optional message */}
      <Text style={styles.sectionTitle}>
        Un mot ? <Text style={styles.optional}>(optionnel)</Text>
      </Text>
      <TextInput
        style={styles.textInput}
        placeholder="Raconte ta journée..."
        placeholderTextColor={Colors.warmCreamDark}
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={200}
      />

      {/* Urgency protocol — appears immediately if critical keywords detected */}
      {detectCriticalKeywords(message) && (
        <View style={styles.urgencyBox}>
          <View style={styles.urgencyHeader}>
            <Ionicons name="heart" size={18} color={Colors.red} />
            <Text style={styles.urgencyTitle}>Tu n'es pas seul(e)</Text>
          </View>
          <Text style={styles.urgencyMessage}>
            Si tu traverses un moment difficile, parle à un adulte de confiance ou appelle :
          </Text>
          <TouchableOpacity
            style={styles.helpLine}
            onPress={() => Linking.openURL('tel:3020')}
          >
            <Text style={styles.helpNumber}>📞 3020</Text>
            <Text style={styles.helpLabel}>Non au Harcèlement</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.helpLine}
            onPress={() => Linking.openURL('tel:3114')}
          >
            <Text style={styles.helpNumber}>🆘 3114</Text>
            <Text style={styles.helpLabel}>Prévention du suicide — 24h/24</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.helpLine}
            onPress={() => Linking.openURL('tel:119')}
          >
            <Text style={styles.helpNumber}>🛡️ 119</Text>
            <Text style={styles.helpLabel}>Allô Enfance en Danger</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, !emotion && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!emotion}
        activeOpacity={0.8}
      >
        <Text style={styles.submitText}>Valider +50 XP ⭐</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
  },
  xpBadge: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.warmCardLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  xpBadgeText: {
    color: Colors.warmYellow,
    fontWeight: '700',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.warmCream,
    marginBottom: 12,
  },
  optional: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.warmCreamDark,
  },
  emotionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  emotionChip: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    flex: 1,
    marginHorizontal: 3,
    backgroundColor: Colors.warmCard,
  },
  emotionChipSelected: {
    borderColor: Colors.warmOrange,
    backgroundColor: Colors.warmCardLight,
  },
  emotionEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  emotionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warmCreamDark,
  },
  emotionLabelSelected: {
    color: Colors.warmOrange,
  },
  sliderSection: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warmCream,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.warmOrangeLight,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  textInput: {
    backgroundColor: Colors.warmCard,
    borderRadius: 16,
    padding: 16,
    color: Colors.warmCream,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.warmCardLight,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: Colors.warmOrange,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  // Urgency protocol
  urgencyBox: {
    backgroundColor: '#3D1010',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F8717140',
  },
  urgencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  urgencyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  urgencyMessage: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
    marginBottom: 12,
  },
  helpLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  helpNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
  },
  helpLabel: {
    fontSize: 12,
    color: Colors.gray,
  },
  // Success state
  successContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  successEmoji: {
    fontSize: 72,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.warmOrange,
    marginBottom: 8,
  },
  successXP: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.warmYellow,
    marginBottom: 20,
  },
  xpBar: {
    width: '80%',
    height: 14,
    backgroundColor: Colors.warmCardLight,
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 8,
  },
  xpFill: {
    height: '100%',
    backgroundColor: Colors.warmYellow,
    borderRadius: 7,
  },
  xpTotal: {
    fontSize: 14,
    color: Colors.warmCreamDark,
    fontWeight: '600',
  },
});
