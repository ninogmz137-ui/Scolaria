/**
 * Segmented — contrôle segmenté (COMPONENTS §17) : Suivi (Apprentissages · Souvenirs · Livrets)
 * et Messages (Général · [prénom]).
 */

import { View, StyleSheet } from 'react-native';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text, Pressable } from './ui';

export default function Segmented<T extends string>({
  options,
  valeur,
  onChange,
}: {
  options: { id: T; libelle: string }[];
  valeur: T;
  onChange: (id: T) => void;
}) {
  return (
    <View style={st.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const actif = o.id === valeur;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: actif }}
            hitSlop={{ top: 6, bottom: 6 }}
            style={[st.segment, actif && st.segmentActif]}
          >
            <Text style={[st.segmentTexte, actif && st.segmentTexteActif]} numberOfLines={1}>
              {o.libelle}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  segmented: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  segment: {
    flex: 1,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActif: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentTexte: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(15,23,42,0.62)',
  },
  segmentTexteActif: { fontFamily: FontFamily.sansBold, color: '#0F172A' },
});
