import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontFamily } from '../hooks/useSolariaFonts';
import { SCREEN_BACKGROUND } from '../constants/colors';

const TEXT_SIZES = [
  { key: 'small', label: 'Petit', preview: 12, bodySize: 13 },
  { key: 'standard', label: 'Standard', preview: 16, bodySize: 15 },
  { key: 'large', label: 'Grand', preview: 20, bodySize: 17 },
] as const;

type TextSizeKey = typeof TEXT_SIZES[number]['key'];

export default function TextSizeScreen() {
  const [selected, setSelected] = useState<TextSizeKey>('standard');

  useEffect(() => {
    AsyncStorage.getItem('textSizePreference').then((v) => {
      if (v === 'small' || v === 'standard' || v === 'large') setSelected(v);
    });
  }, []);

  const handleSelect = (key: TextSizeKey) => {
    setSelected(key);
    AsyncStorage.setItem('textSizePreference', key);
  };

  return (
    <View style={styles.root}>
      {TEXT_SIZES.map((size) => {
        const isActive = selected === size.key;
        return (
          <Pressable
            key={size.key}
            onPress={() => handleSelect(size.key)}
            style={({ pressed }) => [
              styles.card,
              isActive && styles.cardActive,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.preview, { fontSize: size.preview }]}>Aa</Text>
            <View style={styles.textCol}>
              <Text style={styles.label}>{size.label}</Text>
              <Text style={styles.sublabel}>Corps de texte : {size.bodySize}px</Text>
            </View>
            <View style={[styles.radio, isActive && styles.radioActive]}>
              {isActive && <View style={styles.radioDot} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SCREEN_BACKGROUND,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    gap: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 0 },
    }),
  },
  cardActive: {
    borderColor: '#7C3AED',
    borderWidth: 1.5,
  },
  preview: {
    fontFamily: FontFamily.displayBold,
    color: '#1A2340',
    width: 40,
    textAlign: 'center',
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: '#1A2340',
  },
  sublabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: '#7C3AED',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7C3AED',
  },
});
