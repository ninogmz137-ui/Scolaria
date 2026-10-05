/**
 * FeuillePhotoEnfant — feuille de photo d'un enfant (COMPONENTS §11 et §18.5), 3 lignes :
 *   « Prendre une photo » · « Choisir dans la galerie » · « Supprimer la photo » (seulement si elle existe, Alert natif avant).
 * Le texte de consentement est dans la feuille. Jamais obligatoire. Comptes réels seulement (jamais en démo).
 */

import type { ReactNode } from 'react';
import { Modal, View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Image as ImageIcone, Trash2 } from 'lucide-react-native';
import type { Child } from '../contexts/ActiveChildContext';
import { useActionsPhoto } from '../hooks/useActionsPhoto';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text, Pressable } from './ui';
import type { SourcePhoto } from '../services/photoEnfant';

/** Texte de consentement (validé) : ce que la photo sert à faire et qui la voit. */
export const TEXTE_CONSENTEMENT_PHOTO =
  'Sert à reconnaître votre enfant dans son carnet. Visible de ses responsables.';

export default function FeuillePhotoEnfant({
  child,
  visible,
  onClose,
}: {
  child: Child;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { occupe, ajouter, supprimer } = useActionsPhoto();
  const existe = !!child.photoPath;

  const prendre = async (source: SourcePhoto) => {
    // La feuille se ferme à la fin : le sélecteur système s'ouvre par-dessus, l'état « occupé » reste visible.
    const fait = await ajouter(child.id, source);
    if (fait) onClose();
  };
  const retirer = async () => {
    const fait = await supprimer(child.id, child.name);
    if (fait) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={occupe ? undefined : onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={st.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={occupe ? undefined : onClose} accessibilityLabel="Fermer" />
        <View style={[st.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={st.handle} />
          <Text style={st.titre}>{`Photo de ${child.name}`}</Text>

          <Ligne icone={<Camera size={18} color="#0F172A" strokeWidth={2} />} libelle="Prendre une photo" onPress={() => prendre('camera')} desactivee={occupe} />
          <Ligne icone={<ImageIcone size={18} color="#0F172A" strokeWidth={2} />} libelle="Choisir dans la galerie" onPress={() => prendre('galerie')} desactivee={occupe} />
          {existe ? (
            <Ligne icone={<Trash2 size={18} color="#EF4444" strokeWidth={2} />} libelle="Supprimer la photo" onPress={retirer} desactivee={occupe} destructive />
          ) : null}

          {occupe ? (
            <View style={st.occupe} accessibilityLiveRegion="polite">
              <ActivityIndicator size="small" color="#0F172A" />
              <Text style={st.occupeTexte}>Enregistrement…</Text>
            </View>
          ) : null}
          <Text style={st.consentement}>{TEXTE_CONSENTEMENT_PHOTO}</Text>
        </View>
      </View>
    </Modal>
  );
}

function Ligne({
  icone,
  libelle,
  onPress,
  desactivee,
  destructive,
}: {
  icone: ReactNode;
  libelle: string;
  onPress: () => void;
  desactivee: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={desactivee} style={st.ligne} accessibilityRole="button" accessibilityLabel={libelle}>
      <View style={st.icone}>{icone}</View>
      <Text style={[st.ligneTexte, destructive && { color: '#EF4444' }, desactivee && { opacity: 0.4 }]}>{libelle}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.16)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 0,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 32, shadowOffset: { width: 0, height: -4 } },
      android: { elevation: 16 },
    }),
  },
  handle: {
    width: 34,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.14)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  titre: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    lineHeight: 18,
    color: '#0F172A',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  icone: { width: 22, marginRight: 12, alignItems: 'center' },
  ligneTexte: { fontFamily: FontFamily.sansMedium, fontSize: 14, lineHeight: 19, color: '#0F172A' },
  occupe: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  occupeTexte: { marginLeft: 10, fontFamily: FontFamily.sansMedium, fontSize: 13, color: 'rgba(15,23,42,0.6)' },
  consentement: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(15,23,42,0.55)',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
