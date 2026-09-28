/**
 * ExportDonneesScreen — export RÉEL du carnet de l'enfant affiché (L7b, droit à la portabilité).
 * Archive .zip (donnees.json + fichiers du carnet + LISEZMOI), puis feuille de partage du système.
 * Remplace l'écran factice (fausse progression, « 47 notes », aucun fichier produit).
 */

import { useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Download } from 'lucide-react-native';
import RgpdBottomSheet from '../../components/rgpd/RgpdBottomSheet';
import { DeepGroup, DeepRow, DEEP } from '../../components/DeepList';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { useAuth } from '../../contexts/AuthContext';
import { exporterCarnet } from '../../services/exportCarnet';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text } from '../../components/ui';
import { de } from '../../utils/francais';

export default function ExportDonneesScreen() {
  const insets = useSafeAreaInsets();
  const { isDemo } = useAuth();
  const { selectedChild } = useActiveChild();
  const prenom = selectedChild?.name?.split(' ')[0] ?? '';
  const [etape, setEtape] = useState<string | null>(null);

  const exporter = async () => {
    if (isDemo) return Alert.alert('Mode démo', 'Les données de la démo sont fictives : il n’y a rien à exporter.');
    if (!selectedChild || etape) return;
    setEtape('Préparation…');
    try {
      const r = await exporterCarnet(selectedChild.id, prenom, setEtape);
      if (!r.ok) Alert.alert('Export', r.message);
      else if (r.incomplet)
        Alert.alert('Export incomplet', 'Une partie du carnet n’a pas pu être lue (détail dans LISEZMOI.txt). Relancez l’export avec une bonne connexion.');
    } catch {
      Alert.alert('Export', 'L’archive n’a pas pu être créée. Réessayez.');
    } finally {
      setEtape(null);
    }
  };

  return (
    <RgpdBottomSheet>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 56, paddingBottom: insets.bottom + 24 }}
      >
        <Text style={st.title}>Télécharger le carnet</Text>
        <Text style={st.subtitle}>
          Une archive (.zip) avec toutes les données du carnet {de(prenom)} que vous pouvez voir, et ses photos et
          documents. Vous choisissez ensuite où l’enregistrer.
        </Text>

        <DeepGroup title={`Carnet ${de(prenom)}`} first>
          <DeepRow
            icon={<Download size={20} color={DEEP.indigo} strokeWidth={2} />}
            label={etape ?? `Télécharger le carnet ${de(prenom)}`}
            description={etape ? 'Gardez l’app ouverte' : 'donnees.json + photos et documents'}
            accent
            last
            onPress={etape ? undefined : exporter}
          />
        </DeepGroup>
      </ScrollView>
    </RgpdBottomSheet>
  );
}

const st = StyleSheet.create({
  title: { fontFamily: FontFamily.sansBold, fontSize: 20, lineHeight: 26, color: DEEP.navy, paddingHorizontal: 16 },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 18,
    color: DEEP.text55,
    paddingHorizontal: 16,
    marginTop: 6,
  },
});
