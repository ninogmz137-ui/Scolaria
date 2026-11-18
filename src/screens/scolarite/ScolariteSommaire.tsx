/**
 * ScolariteSommaire — onglet Scolarité, niveau 1 (CLAUDE.md § Scolarité, COMPONENTS §17 bis-A).
 *
 * Bouton année en tête, puis quatre rubriques titrées : Apprentissages · Souvenirs · Documents · Parcours.
 * Chaque rubrique : aperçu du plus récent + « Tout voir » (page profonde, niveau 2).
 * Rubrique vide (décision du 17 nov. 2026) : jamais masquée ; carte d'invitation (phrase + pilule), sans
 * « Tout voir ». Parcours n'est jamais vide (l'année en cours y figure toujours).
 * Données : useScolarite() (chargées une fois, partagées avec les pages profondes).
 */

import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Pressable } from '../../components/ui';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { C, RADIUS, SHADOW } from '../../constants/design';
import { getBottomBarScrollPadding } from '../../components/navigation/BottomBar';
import { useTopbarScrollHandler } from '../../contexts/TopbarScrollContext';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { AucunEnfantOnglet } from '../../components/AucunEnfant';
import EtatErreur from '../../components/EtatErreur';
import BoutonAnnee from '../suivi/BoutonAnnee';
import { libelleType, ligneSourceCarnet } from '../suivi/CarnetVue';
import { useScolarite } from '../../hooks/useScolarite';
import { jourMois, ligneSource, libelleNiveau } from '../../utils/competences';
import type { ElementCarnet } from '../../services/carnetService';
import { millesimeAffiche } from '../../data/demo/parcours';

export default function ScolariteSommaire() {
  const { selectedChild } = useActiveChild();
  if (!selectedChild) return <AucunEnfantOnglet />;
  return <Sommaire />;
}

function Sommaire() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const scrollHandler = useTopbarScrollHandler();
  const s = useScolarite();

  const erreur = s.erreurCarnet ?? s.erreurCompetences ?? s.erreurAnnees ?? s.erreurNote;
  const ouvrirParcours = () => navigation.navigate('MonParcours');
  const ajouter = (source: 'photo' | 'document', categorie: 'livret' | 'souvenir') =>
    navigation.navigate('AjouterAuCarnet', { source, categorie });

  // Plus récent d'abord (le carnet et les compétences ne sont pas tous triés à la source).
  const derniereCompetence = [...s.competences].sort((a, b) => b.date.localeCompare(a.date))[0];
  const dernierSouvenir: ElementCarnet | undefined = s.souvenirs[0];
  const dernierDocument: ElementCarnet | undefined = s.documents[0];
  const college = !s.isMaternelle && !s.isPrimaire;

  // Sous une erreur de chargement, jamais de carte d'invitation à tort (leçon du 4 oct. 2026).
  const apprentissagesVides = college ? !s.derniereNote : !derniereCompetence;

  return (
    <Reanimated.ScrollView
      style={st.root}
      contentContainerStyle={{ paddingTop: insets.top + 64 + 8, paddingBottom: getBottomBarScrollPadding(insets.bottom) }}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={scrollHandler}
    >
      {s.anneeEnCours ? (
        <View style={st.annee}>
          <BoutonAnnee enCours={s.anneeEnCours} archives={s.anneesArchives} onParcours={ouvrirParcours} />
        </View>
      ) : null}
      {erreur ? <EtatErreur type={erreur} compact onReessayer={s.reessayer} /> : null}

      {/* ── Apprentissages ── */}
      <Rubrique
        titre="Apprentissages"
        vide={!erreur && apprentissagesVides}
        invitation={{
          phrase: 'Les compétences saisies par l’enseignant apparaîtront ici.',
          action: 'Photographier un livret',
          onPress: () => ajouter('photo', 'livret'),
        }}
        onToutVoir={() => navigation.navigate('ScolariteApprentissages')}
        masquerApercu={!!erreur && apprentissagesVides}
      >
        {college && s.derniereNote ? (
          <>
            <Text style={st.meta}>{s.derniereNote.matiere}</Text>
            <Text style={st.titre}>
              {`${s.derniereNote.valeur.toLocaleString('fr-FR')}/${s.derniereNote.sur}`}
              {s.derniereNote.intitule ? ` · ${s.derniereNote.intitule}` : ''}
            </Text>
            <Text style={st.source}>{`Dernière note · ${jourMois(s.derniereNote.date)}`}</Text>
          </>
        ) : derniereCompetence ? (
          <>
            <Text style={st.meta}>{derniereCompetence.domaine}</Text>
            <Text style={st.titre}>{derniereCompetence.texte}</Text>
            {derniereCompetence.niveau && derniereCompetence.echelle ? (
              <Text style={st.niveau}>{libelleNiveau(derniereCompetence.niveau, derniereCompetence.echelle)}</Text>
            ) : null}
            <Text style={st.source}>{ligneSource(derniereCompetence)}</Text>
          </>
        ) : null}
      </Rubrique>

      {/* ── Souvenirs ── */}
      <Rubrique
        titre="Souvenirs"
        vide={!erreur && !dernierSouvenir}
        invitation={{ phrase: 'Ajoutez un premier souvenir.', action: 'Ajouter', onPress: () => ajouter('photo', 'souvenir') }}
        onToutVoir={() => navigation.navigate('ScolariteSouvenirs')}
        masquerApercu={!!erreur && !dernierSouvenir}
      >
        {dernierSouvenir ? <ApercuCarnet e={dernierSouvenir} /> : null}
      </Rubrique>

      {/* ── Documents ── */}
      <Rubrique
        titre="Documents"
        vide={!erreur && !dernierDocument}
        invitation={{ phrase: 'Ajoutez un premier document.', action: 'Ajouter', onPress: () => ajouter('document', 'livret') }}
        onToutVoir={() => navigation.navigate('ScolariteDocuments')}
        masquerApercu={!!erreur && !dernierDocument}
      >
        {dernierDocument ? <ApercuCarnet e={dernierDocument} /> : null}
      </Rubrique>

      {/* ── Parcours : jamais vide (l'année en cours y figure toujours) ── */}
      {s.anneeEnCours ? (
        <Rubrique titre="Parcours" vide={false} onToutVoir={ouvrirParcours}>
          <Text style={st.titre}>{`${millesimeAffiche(s.anneeEnCours.annee)} · ${s.anneeEnCours.niveau}`}</Text>
          {s.anneeEnCours.etablissement ? <Text style={st.meta}>{s.anneeEnCours.etablissement}</Text> : null}
          <Text style={st.source}>
            {s.anneesArchives.length === 0
              ? 'Année en cours'
              : `Année en cours · ${s.anneesArchives.length} année${s.anneesArchives.length > 1 ? 's' : ''} archivée${s.anneesArchives.length > 1 ? 's' : ''}`}
          </Text>
        </Rubrique>
      ) : null}
    </Reanimated.ScrollView>
  );
}

function ApercuCarnet({ e }: { e: ElementCarnet }) {
  return (
    <>
      <Text style={st.meta}>{libelleType(e)}</Text>
      <Text style={st.titre} numberOfLines={2}>{e.titre}</Text>
      <Text style={st.source}>{ligneSourceCarnet(e)}</Text>
    </>
  );
}

function Rubrique({
  titre,
  vide,
  invitation,
  onToutVoir,
  masquerApercu,
  children,
}: {
  titre: string;
  vide: boolean;
  invitation?: { phrase: string; action: string; onPress: () => void };
  onToutVoir: () => void;
  /** Erreur de chargement sans donnée : ni aperçu ni invitation (le message d'erreur suffit). */
  masquerApercu?: boolean;
  children?: ReactNode;
}) {
  return (
    <View>
      <Text style={st.label} accessibilityRole="header">{titre}</Text>
      {masquerApercu ? null : vide && invitation ? (
        <View style={st.carte} key="invitation">
          <Text style={st.phrase}>{invitation.phrase}</Text>
          <Pressable
            style={st.pilule}
            onPress={invitation.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${invitation.action} : ${titre}`}
          >
            <Text style={st.piluleTexte}>{invitation.action}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={st.carte} key="apercu">
          {children}
          <Pressable
            style={st.toutVoir}
            onPress={onToutVoir}
            accessibilityRole="link"
            accessibilityLabel={`Tout voir : ${titre}`}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          >
            <Text style={st.toutVoirTexte}>Tout voir</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  annee: { paddingHorizontal: 14, marginBottom: 2 },
  // Label de section (CLAUDE.md : Figtree 600, 13px, casse normale, rgba(15,23,42,0.55), padding 18 6 8).
  label: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: 'rgba(15,23,42,0.55)',
    paddingTop: 18,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  carte: {
    marginHorizontal: 14,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: C.border,
    ...SHADOW.card,
  },
  meta: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: 'rgba(15,23,42,0.55)' },
  titre: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, lineHeight: 20, color: '#0F172A', marginTop: 2 },
  niveau: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: '#0F172A', marginTop: 6 },
  // Ligne source : toujours sur sa propre ligne, sous la donnée (§17).
  source: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: 'rgba(15,23,42,0.6)', marginTop: 6 },
  toutVoir: { alignSelf: 'flex-start', marginTop: 12, minHeight: 24, justifyContent: 'center' },
  toutVoirTexte: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: C.indigo },
  phrase: { fontFamily: FontFamily.sansRegular, fontSize: 13, lineHeight: 19, color: 'rgba(15,23,42,0.55)' },
  // Pilule compacte pleine (COMPONENTS §2) : alignée sur le texte, jamais pleine largeur.
  pilule: {
    alignSelf: 'flex-start',
    marginTop: 12,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
  },
  piluleTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, color: '#FFFFFF' },
});
