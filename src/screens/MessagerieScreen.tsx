/**
 * MessagerieScreen — onglet « Messages » (lot 3a, décisions du 16 et du 17 nov. 2026 ; CLAUDE.md § Messages,
 * COMPONENTS §6 « Messages » et §18.4 « Ligne de fil »).
 *
 * - Bloc « À traiter » en haut, visible SEULEMENT s'il y a quelque chose : les mots qui attendent une action,
 *   avec le bouton d'action dans la carte (CarteATraiter).
 * - Bloc « Conversations » : UN FIL PAR INTERLOCUTEUR (useFilsMessages). Un fil s'ouvre toujours sur sa page
 *   (FilMessages), même s'il ne contient qu'un élément.
 * - Supprimés : bascule « Général / [prénom] », barre de recherche et menu « Tout ⌄ » (la recherche passe par le
 *   champ unique de la barre du bas, lot 5 ; « À traiter » remplace le filtre « À signer »).
 * - Un enfant = un carnet : uniquement les données de l'enfant sélectionné.
 */
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useTopbarScrollHandler } from '../contexts/TopbarScrollContext';
import { getBottomBarScrollPadding } from '../components/navigation/BottomBar';
import { FontFamily } from '../hooks/useSolariaFonts';
import { C } from '../constants/design';
import { Text, Pressable } from '../components/ui';
import { AucunEnfantOnglet } from '../components/AucunEnfant';
import LigneMessage from '../components/messages/LigneMessage';
import LibelleSection from '../components/LibelleSection';
import CarteATraiter from '../components/messages/CarteATraiter';
import EtatErreur from '../components/EtatErreur';
import { demanderAjoutCarnet } from '../services/ouvertureAjout';
import { de } from '../utils/francais';
import { NOM_APP } from '../constants/marque';
import { useFilsMessages, type Fil } from '../hooks/useFilsMessages';

// Compatibilité : d'autres écrans importaient ces aides depuis ce fichier.
export { dateCourte, initialesDe } from '../hooks/useFilsMessages';

const NAVY = '#0F172A';
const TEXT55 = 'rgba(15,23,42,0.55)';

function MessagerieContenu() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const scrollHandler = useTopbarScrollHandler();
  const f = useFilsMessages();

  // Un fil s'ouvre TOUJOURS sur sa page, même avec un seul élément (décision du 18 nov. 2026).
  const ouvrirFil = (fil: Fil) => navigation.navigate('FilMessages', { cle: fil.cle, titre: fil.titre });

  const rien = f.aTraiter.length === 0 && f.fils.length === 0;

  return (
    <View style={st.racine}>
      <Animated.ScrollView
        style={st.defilement}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: getBottomBarScrollPadding(insets.bottom) }}
      >
        {f.erreur && <EtatErreur type={f.erreur} onReessayer={f.reessayer} compact />}

        {f.aTraiter.length > 0 && <LibelleSection texte="À traiter" premier />}
        {f.aTraiter.length > 0 && (
          <CarteATraiter mots={f.aTraiter} monNom={f.monNom} demo={f.isDemo} onOuvrir={f.ouvrirMot} />
        )}

        {f.fils.length > 0 && <LibelleSection texte="Conversations" premier={f.aTraiter.length === 0} />}
        {f.fils.map((fil, i) => {
          const dernier = fil.elements[0].props;
          return (
            <LigneMessage
              key={fil.cle}
              {...dernier}
              nom={fil.titre}
              nonLu={fil.elements.some((e) => e.props.nonLu)}
              // Le fil n'est « privé » que si TOUT ce qu'il contient l'est (garde partagée).
              prive={fil.elements.every((e) => e.props.prive)}
              onPress={() => ouvrirFil(fil)}
              separateur={i < f.fils.length - 1}
            />
          );
        })}

        {f.erreur && rien ? null : rien && f.ecoleAbsente ? (
          <View style={st.vide}>
            <Text style={st.videTexte}>{`Les mots de l’école ${de(f.prenom)} arriveront ici quand elle utilisera ${NOM_APP}.`}</Text>
            <Pressable
              onPress={() => demanderAjoutCarnet({ onglet: 'MessagerieTab', categorie: 'mot' })}
              style={({ pressed }) => [st.pill, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
            >
              <Text style={st.pillTexte}>Ajouter un mot reçu ailleurs</Text>
            </Pressable>
          </View>
        ) : rien && f.charge ? (
          <View style={st.vide}>
            <Text style={st.videTitre}>Rien pour l’instant</Text>
            <Text style={st.videTexte}>{`Les messages de l’école ${de(f.prenom)} arriveront ici.`}</Text>
          </View>
        ) : null}
      </Animated.ScrollView>
    </View>
  );
}

/** Garde : compte réel sans enfant → état vide (jamais de données d'un autre carnet). */
export default function MessagerieScreen() {
  const { selectedChild } = useActiveChild();
  if (!selectedChild) return <AucunEnfantOnglet />;
  return <MessagerieContenu />;
}

const st = StyleSheet.create({
  racine: { flex: 1, backgroundColor: C.bg },
  defilement: { flex: 1 },
  pill: {
    marginTop: 18,
    height: 52,
    maxWidth: 280,
    alignSelf: 'center',
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTexte: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#FFFFFF' },
  vide: { paddingHorizontal: 24, paddingTop: 40, alignItems: 'center' },
  videTitre: { fontFamily: FontFamily.sansBold, fontSize: 16, color: NAVY, textAlign: 'center' },
  videTexte: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    lineHeight: 20,
    color: TEXT55,
    textAlign: 'center',
    marginTop: 6,
  },
});
