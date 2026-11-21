/**
 * AjouterAuCarnetSheet — feuille « Ajouter » du « + » unique de la barre du bas (lot 5 ; CLAUDE.md § Ajouter,
 * COMPONENTS §11 bis). Ouverte depuis TOUS les onglets (seul bouton d'ajout de l'app), toujours pour l'enfant
 * SÉLECTIONNÉ. Sept actions (décision du 21 nov. 2026 : « Ajouter à l'agenda » s'ajoute aux six) :
 *   Photographier · Importer une capture · Ajouter un document · Noter une première fois · Ajouter à l'agenda
 *   · Signaler une absence · Écrire à l'enseignant.
 * « Signaler une absence » et « Écrire à l'enseignant » sont MASQUÉES (jamais grisées) si l'enfant n'a pas de classe
 * sur l'app (`useEnseignantRattache`, règle du 21 nov. ; la base refuse aussi l'absence, M44).
 * Ordre selon l'onglet (décision du 17 nov.) : Agenda = absence puis agenda en tête ; Messages = écrire en tête.
 * Module d'ordre pur : `src/utils/actionsAjout.ts` (testé par node).
 */

import { Alert, Modal, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Camera, CalendarPlus, CalendarX, FileText, Image as ImageIcone, Pencil, Star } from 'lucide-react-native';
import { useEnseignantRattache } from '../hooks/useEnseignantRattache';
import { useOuvrirFilEnseignant } from '../hooks/useOuvrirFilEnseignant';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text, Pressable } from './ui';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { choisirFichier, mettreEnAttente, type SourceAjout } from '../services/carnetImport';
import { ErreurCarnet, type CategorieCarnet } from '../services/carnetService';
import type { OngletAjout } from '../services/ouvertureAjout';
import { actionsAjout, type ActionAjout } from '../utils/actionsAjout';
import { de } from '../utils/francais';

const ACTIONS: Record<ActionAjout, { libelle: string; detail: string; Icone: typeof Camera }> = {
  photo: { libelle: 'Photographier', detail: 'Dessin, cahier, livret papier', Icone: Camera },
  capture: { libelle: 'Importer une capture', detail: 'Un mot reçu dans une autre appli', Icone: ImageIcone },
  document: { libelle: 'Ajouter un document', detail: 'PDF', Icone: FileText },
  jalon: { libelle: 'Noter une première fois', detail: '« Premier exposé », « écrit son prénom »…', Icone: Star },
  agenda: { libelle: 'Ajouter à l’agenda', detail: 'Événement ou rendez-vous de la semaine', Icone: CalendarPlus },
  absence: { libelle: 'Signaler une absence', detail: 'Visible de l’enseignant avant l’appel', Icone: CalendarX },
  message: { libelle: 'Écrire à l’enseignant', detail: 'Ouvre votre fil avec l’enseignant', Icone: Pencil },
};

/** Page du formulaire d'absence dans la pile de l'onglet (l'Accueil garde son nom historique). */
const ROUTE_ABSENCE: Record<OngletAjout, string> = {
  Accueil: 'SignalerAbsenceScreen',
  Notes: 'SignalerAbsence',
  Agenda: 'SignalerAbsence',
  MessagerieTab: 'SignalerAbsence',
};

export default function AjouterAuCarnetSheet({
  visible,
  onClose,
  onglet,
  categorie,
}: {
  visible: boolean;
  onClose: () => void;
  /** Onglet d'où l'on vient : ordre des actions, et le formulaire s'empile dans sa pile (retour au même endroit). */
  onglet: OngletAjout;
  /** Catégorie pré-remplie (ex. « mot » depuis Messages). */
  categorie?: CategorieCarnet;
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { selectedChild } = useActiveChild();
  const enseignantRattache = useEnseignantRattache();
  const ouvrirFilEnseignant = useOuvrirFilEnseignant();

  const importer = async (source: SourceAjout) => {
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
        params: { screen: 'AjouterAuCarnet', params: { source, categorie }, initial: false },
      });
    } catch (e) {
      Alert.alert('Ajouter au carnet', e instanceof ErreurCarnet ? e.message : 'Action impossible. Réessayez.');
    }
  };

  const choisir = (id: ActionAjout) => {
    onClose();
    if (id === 'agenda') {
      setTimeout(() => navigation.navigate('MainPager', {
        screen: 'Agenda',
        params: { screen: 'AgendaHome', params: { openAddModal: true } },
      }), 150);
      return;
    }
    if (id === 'absence') {
      setTimeout(() => navigation.navigate('MainPager', {
        screen: onglet,
        params: { screen: ROUTE_ABSENCE[onglet], initial: false },
      }), 150);
      return;
    }
    if (id === 'message') {
      if (selectedChild) setTimeout(() => ouvrirFilEnseignant(selectedChild.id), 150);
      return;
    }
    void importer(id);
  };

  if (!selectedChild) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent={Platform.OS === 'android'}>
      <View style={st.fond}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[st.feuille, { paddingBottom: insets.bottom + 16 }]}>
          <View style={st.poignee} />
          <Text style={st.titre}>{`Ajouter au carnet ${de(selectedChild.name.split(' ')[0])}`}</Text>
          {actionsAjout(onglet, enseignantRattache).map((id) => {
            const { libelle, detail, Icone } = ACTIONS[id];
            return (
              <Pressable key={id} onPress={() => choisir(id)} style={st.ligne} accessibilityRole="button">
                <View style={st.icone}>
                  <Icone size={22} color="#0F172A" strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.libelle}>{libelle}</Text>
                  <Text style={st.detail}>{detail}</Text>
                </View>
              </Pressable>
            );
          })}
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
  ligne: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, minHeight: 54 },
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
