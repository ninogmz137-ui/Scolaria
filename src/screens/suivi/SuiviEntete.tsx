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
    <View style={st.entete}>
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
  entete: { paddingHorizontal: 14, paddingBottom: 8 },
  barre: { marginTop: 10 },
});
