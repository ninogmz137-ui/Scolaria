/**
 * SuiviEntete — haut de l'onglet Suivi (COMPONENTS §6 et §17) : bouton année, puis segmented control
 * Apprentissages · Souvenirs · Livrets.
 *
 * Le segmented n'apparaît que si les 3 onglets ont un contenu réel ou un état vide utile (jamais de
 * module grisé) : c'est l'écran appelant qui le décide (`afficherBarre`).
 */

import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Segmented from '../../components/Segmented';

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
    <View style={[st.entete, afficherBarre ? st.enteteAvecBarre : st.enteteSansBarre]}>
      {boutonAnnee}
      {afficherBarre && (
        <View style={st.barre}>
          <Segmented options={ONGLETS} valeur={onglet} onChange={onChange} />
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  // Zones tactiles de 44 dp (bouton année : 34 + 5 + 5 ; segmented : 40 + 2 + 2), à l'intérieur des bornes de leurs parents.
  // Le visuel ne bouge pas : -5 en haut (le bouton garde sa place), et les marges du bas retirent les dp ajoutés.
  entete: { paddingHorizontal: 14, marginTop: -5 },
  enteteAvecBarre: { paddingBottom: 6 },
  enteteSansBarre: { paddingBottom: 3 },
  barre: { marginTop: 3 },
});
