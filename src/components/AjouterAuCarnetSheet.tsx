/**
 * AjouterAuCarnetSheet — « Ajouter au carnet » (CLAUDE.md, section dédiée ; lot B5).
 * Ouvert par le « + » de l'Accueil et le ⊞ de Suivi. 4 actions : Photographier · Importer une
 * capture · Ajouter un document (PDF) · Noter une première fois (jalon, sans fichier).
 * Rangé dans le carnet de l'enfant SÉLECTIONNÉ ; le formulaire (AjouterAuCarnetScreen) fait choisir
 * la catégorie, la date, l'année et la visibilité.
 */

import { Alert, Modal, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Camera, FileText, Flag, Image as ImageIcone } from 'lucide-react-native';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text, Pressable } from './ui';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { choisirFichier, mettreEnAttente, type SourceAjout } from '../services/carnetImport';
import { ErreurCarnet } from '../services/carnetService';
import { de } from '../utils/francais';

const ACTIONS: { id: SourceAjout; libelle: string; detail: string; Icone: typeof Camera }[] = [
  { id: 'photo', libelle: 'Photographier', detail: 'Dessin, cahier, livret papier', Icone: Camera },
  { id: 'capture', libelle: 'Importer une capture', detail: 'Un mot reçu dans une autre appli', Icone: ImageIcone },
  { id: 'document', libelle: 'Ajouter un document', detail: 'PDF', Icone: FileText },
  { id: 'jalon', libelle: 'Noter une première fois', detail: '« Premier exposé », « écrit son prénom »…', Icone: Flag },
];

export default function AjouterAuCarnetSheet({
  visible,
  onClose,
  onglet,
}: {
  visible: boolean;
  onClose: () => void;
  /** Onglet d'où l'on vient : le formulaire s'empile dans sa pile (retour au même endroit). */
  onglet: 'Accueil' | 'Notes';
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { selectedChild } = useActiveChild();

  const choisir = async (source: SourceAjout) => {
    onClose();
    try {
      if (source !== 'jalon') {
        const fichier = await choisirFichier(source);
        if (!fichier) return; // annulé
        mettreEnAttente(fichier);
      } else {
        mettreEnAttente(null);
      }
      navigation.navigate('MainPager', {
        screen: onglet,
        params: { screen: 'AjouterAuCarnet', params: { source }, initial: false },
      });
    } catch (e) {
      Alert.alert('Ajouter au carnet', e instanceof ErreurCarnet ? e.message : 'Action impossible. Réessayez.');
    }
  };

  if (!selectedChild) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent={Platform.OS === 'android'}>
      <View style={st.fond}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[st.feuille, { paddingBottom: insets.bottom + 16 }]}>
          <View style={st.poignee} />
          <Text style={st.titre}>{`Ajouter au carnet ${de(selectedChild.name.split(' ')[0])}`}</Text>
          {ACTIONS.map(({ id, libelle, detail, Icone }) => (
            <Pressable key={id} onPress={() => choisir(id)} style={st.ligne} accessibilityRole="button">
              <View style={st.icone}>
                <Icone size={22} color="#0F172A" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.libelle}>{libelle}</Text>
                <Text style={st.detail}>{detail}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  fond: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.35)' },
  feuille: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 8 },
  poignee: { alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.15)', marginBottom: 12 },
  titre: { fontFamily: FontFamily.sansBold, fontSize: 16, lineHeight: 21, color: '#0F172A', marginBottom: 8 },
  ligne: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, minHeight: 56 },
  icone: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  libelle: { fontFamily: FontFamily.sansSemiBold, fontSize: 15, lineHeight: 20, color: '#0F172A' },
  detail: { fontFamily: FontFamily.sansRegular, fontSize: 12, lineHeight: 16, color: 'rgba(15,23,42,0.55)', marginTop: 1 },
});
