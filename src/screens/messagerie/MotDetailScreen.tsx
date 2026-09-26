/**
 * MotDetailScreen — un mot du carnet, ouvert EXACTEMENT depuis la liste Général, la carte « À traiter »,
 * l'Accueil (« À faire ») ou une notification (B4a). Page profonde (‹ Retour + titre centré).
 *
 * Params : { motId, childId, expediteur? }. Le mot est lu dans le carnet de childId (motsService) ;
 * s'il n'existe plus : « [Expéditeur] a retiré ce mot », jamais d'erreur.
 */

import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { DeepScreenHeader } from '../../components/DeepScreenHeader';
import { Text } from '../../components/ui';
import { useMotsEnfant } from '../../hooks/useMotsEnfant';
import { marquerMotLu, monNomComplet } from '../../services/motsService';
import ActionsMot from '../../components/messages/ActionsMot';
import { PastillesAPrevoir, jourCourt, heureCourte } from '../../components/messages/CarteATraiter';
import { C } from '../../constants/design';

const NAVY = '#0F172A';
const TEXT55 = 'rgba(15,23,42,0.55)';

export default function MotDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { motId, childId, expediteur } = (route.params ?? {}) as { motId?: string; childId?: string; expediteur?: string };
  const { mots, charge, isDemo } = useMotsEnfant(childId);
  const mot = mots.find((m) => m.id === motId);
  const [monNom, setMonNom] = useState('vous');

  useEffect(() => {
    if (childId) monNomComplet(childId, isDemo).then(setMonNom);
  }, [childId, isDemo]);
  useEffect(() => {
    if (mot && !mot.lu) marquerMotLu(mot, isDemo);
  }, [mot?.id, mot?.lu, isDemo]);

  return (
    <View style={[st.racine, { paddingBottom: insets.bottom }]}>
      <DeepScreenHeader title="Mot" onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} withTopInset />
      {!charge ? null : !mot ? (
        <View style={st.retire}>
          <Text style={st.retireTitre}>{`${expediteur ?? 'L’école'} a retiré ce mot`}</Text>
          <Text style={st.retireTexte}>Il n’apparaît plus dans le carnet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={st.contenu} showsVerticalScrollIndicator={false}>
          <Text style={st.titre}>{mot.titre}</Text>
          <Text style={st.meta}>{`${mot.expediteur} · ${jourCourt(mot.date)}`}</Text>
          {mot.evenement && (
            <Text style={st.ligne}>
              {`${mot.evenement.titre} · ${jourCourt(mot.evenement.date)}${mot.evenement.heure ? ` ${heureCourte(mot.evenement.heure)}` : ''}`}
            </Text>
          )}
          {mot.echeance && <Text style={st.ligne}>{`Avant le ${jourCourt(mot.echeance)}`}</Text>}
          <Text style={st.corps}>{mot.contenu}</Text>
          <PastillesAPrevoir items={mot.aPrevoir} />
          <ActionsMot mot={mot} monNom={monNom} demo={isDemo} />
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  racine: { flex: 1, backgroundColor: C.bg },
  contenu: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  titre: { fontFamily: FontFamily.displayBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.5, color: NAVY },
  meta: { fontFamily: FontFamily.sansRegular, fontSize: 13, lineHeight: 18, color: TEXT55, marginTop: 4 },
  ligne: { fontFamily: FontFamily.sansMedium, fontSize: 13, lineHeight: 18, color: NAVY, marginTop: 4 },
  corps: { fontFamily: FontFamily.sansRegular, fontSize: 15, lineHeight: 22, color: NAVY, marginTop: 16 },
  retire: { paddingHorizontal: 24, paddingTop: 48, alignItems: 'center' },
  retireTitre: { fontFamily: FontFamily.sansBold, fontSize: 16, lineHeight: 22, color: NAVY, textAlign: 'center' },
  retireTexte: { fontFamily: FontFamily.sansRegular, fontSize: 14, lineHeight: 20, color: TEXT55, textAlign: 'center', marginTop: 6 },
});
