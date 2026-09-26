/**
 * SuiviEntete — haut de l'onglet Suivi (COMPONENTS §6 et §17) : bouton année, puis segmented control
 * Apprentissages · Souvenirs · Livrets.
 *
 * Le segmented n'apparaît que si les 3 onglets ont un contenu réel ou un état vide utile (jamais de
 * module grisé) : c'est l'écran appelant qui le décide (`afficherBarre`).
 */

import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../../components/ui';

export type OngletSuivi = 'apprentissages' | 'souvenirs' | 'livrets';

const ONGLETS: { id: OngletSuivi; libelle: string }[] = [
  { id: 'apprentissages', libelle: 'Apprentissages' },
  { id: 'souvenirs', libelle: 'Souvenirs' },
  { id: 'livrets', libelle: 'Livrets' },
];

export default function SuiviEntete({
  onglet,
  onChange,
  afficherBarre,
  boutonAnnee,
}: {
  onglet: OngletSuivi;
  onChange: (o: OngletSuivi) => void;
  afficherBarre: boolean;
  boutonAnnee?: ReactNode;
}) {
  if (!afficherBarre && !boutonAnnee) return null;
  return (
    <View style={st.entete}>
      {boutonAnnee}
      {afficherBarre && (
        <View style={st.segmented} accessibilityRole="tablist">
          {ONGLETS.map((o) => {
            const actif = o.id === onglet;
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
      )}
    </View>
  );
}

const st = StyleSheet.create({
  entete: { paddingHorizontal: 14, paddingBottom: 8 },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
    marginTop: 10,
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
