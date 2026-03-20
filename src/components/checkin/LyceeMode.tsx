import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface SliderData {
  key: string;
  label: string;
  icon: string;
  color: string;
  emoji: (v: number) => string;
}

const SLIDERS: SliderData[] = [
  {
    key: 'energy',
    label: 'Énergie',
    icon: '⚡',
    color: Colors.warmOrange,
    emoji: (v) => (v >= 7 ? '🔋' : v >= 4 ? '🔌' : '🪫'),
  },
  {
    key: 'stress',
    label: 'Stress',
    icon: '😰',
    color: Colors.red,
    emoji: (v) => (v >= 7 ? '🔥' : v >= 4 ? '😐' : '😌'),
  },
  {
    key: 'motivation',
    label: 'Motivation',
    icon: '🎯',
    color: Colors.cyan,
    emoji: (v) => (v >= 7 ? '🚀' : v >= 4 ? '👍' : '😴'),
  },
  {
    key: 'social',
    label: 'Social',
    icon: '👥',
    color: Colors.violet,
    emoji: (v) => (v >= 7 ? '🤝' : v >= 4 ? '🙂' : '😶'),
  },
];

interface Props {
  onSubmit: (data: {
    energy: number;
    stress: number;
    motivation: number;
    social: number;
    message?: string;
  }) => void;
}

export default function LyceeMode({ onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, number>>({
    energy: 5,
    stress: 3,
    motivation: 5,
    social: 5,
  });
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const updateValue = (key: string, val: number) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    onSubmit({
      energy: values.energy,
      stress: values.stress,
      motivation: values.motivation,
      social: values.social,
      message: message || undefined,
    });
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successTitle}>Ressenti enregistré</Text>
        <Text style={styles.successSubtitle}>
          Tes données restent confidentielles
        </Text>
        <View style={styles.lockRow}>
          <Ionicons
            name="lock-closed"
            size={16}
            color={Colors.warmOrangeLight}
          />
          <Text style={styles.lockText}>Chiffré · Visible uniquement par toi</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Confidentiality badge */}
      <View style={styles.confidentialBadge}>
        <Ionicons name="lock-closed" size={14} color={Colors.warmOrangeLight} />
        <Text style={styles.confidentialText}>Confidentiel</Text>
      </View>

      <Text style={styles.title}>Mon ressenti du jour</Text>

      {/* Sliders */}
      {SLIDERS.map((s) => (
        <View key={s.key} style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>
              {s.icon} {s.label}
            </Text>
            <Text style={styles.sliderFeedback}>
              {s.emoji(values[s.key])} {values[s.key]}/10
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={10}
            step={1}
            value={values[s.key]}
            onValueChange={(v) => updateValue(s.key, v)}
            minimumTrackTintColor={s.color}
            maximumTrackTintColor={Colors.warmCardLight}
            thumbTintColor={s.color}
          />
        </View>
      ))}

      {/* Confidential message */}
      <View style={styles.messageSection}>
        <View style={styles.messageHeader}>
          <Ionicons
            name="chatbubble-ellipses"
            size={18}
            color={Colors.warmOrangeLight}
          />
          <Text style={styles.messageLabel}>Message confidentiel</Text>
        </View>
        <TextInput
          style={styles.textInput}
          placeholder="Ce que tu ressens est important..."
          placeholderTextColor={Colors.warmCreamDark}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
        />
        <Text style={styles.charCount}>{message.length}/500</Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        activeOpacity={0.8}
      >
        <Ionicons name="shield-checkmark" size={22} color={Colors.white} />
        <Text style={styles.submitText}>Enregistrer mon ressenti</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        🔒 Tes réponses sont chiffrées et ne sont partagées avec personne.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
  },
  confidentialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: Colors.warmCardLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  confidentialText: {
    color: Colors.warmOrangeLight,
    fontWeight: '600',
    fontSize: 13,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.warmCream,
    marginBottom: 20,
  },
  sliderSection: {
    marginBottom: 18,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warmCream,
  },
  sliderFeedback: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.warmOrangeLight,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  messageSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.warmCream,
  },
  textInput: {
    backgroundColor: Colors.warmCard,
    borderRadius: 16,
    padding: 16,
    color: Colors.warmCream,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.warmCardLight,
  },
  charCount: {
    textAlign: 'right',
    color: Colors.warmCreamDark,
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: Colors.warmOrange,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  submitText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  disclaimer: {
    textAlign: 'center',
    color: Colors.warmCreamDark,
    fontSize: 12,
    marginTop: 14,
    lineHeight: 18,
  },
  // Success state
  successContainer: {
    alignItems: 'center',
    paddingTop: 50,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.warmOrange,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: Colors.warmCreamDark,
    marginBottom: 16,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockText: {
    color: Colors.warmOrangeLight,
    fontSize: 13,
    fontWeight: '600',
  },
});
