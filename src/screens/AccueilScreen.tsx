/**
 * AccueilScreen — « maintenant », pour l'enfant sélectionné (lot 6 ; CLAUDE.md § Accueil, COMPONENTS §6 et §18.3).
 *
 * En-tête : fondu pleine largeur de la couleur de l'enfant (plus court : la 1re carte commence avant 30 % de l'écran),
 * rond 52 (photo ou initiale), prénom, « classe · enseignant · école ». Plus de « Bonjour », de pilule d'année, de fond
 * d'écran.
 * Corps (CorpsCarnet), le même pour tous les niveaux : À faire · Aujourd'hui et demain · Nouveau dans le carnet ·
 * suggestion de l'assistant sur une ligne. UNE seule source de vérité : mots (useMotsEnfant, comme Messages), Agenda
 * (useAgendaSemaine + useRendezVousJours, comme l'Agenda), absences, carnet et Scolarité ; l'Accueil ne possède aucune
 * donnée propre. Démo et compte réel passent par les mêmes fonctions (src/utils/accueil.ts, testé par node).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { getBottomBarScrollPadding } from '../components/navigation/BottomBar';
import { useActiveChild, DEFAULT_CHILD_COLOR } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemoData } from '../contexts/DemoContext';
import { useTopbarScrollHandler } from '../contexts/TopbarScrollContext';
import { getSuiviDemo } from '../data/demo/suivi';
import { heureFr } from '../data/demo/accueil';
import { jourMois } from '../utils/competences';
import { aDesNotes, libelleClasse } from '../utils/niveau';
import { getChildInitials } from '../utils/childInitials';
import { aJustifier, periodeAbsence } from '../utils/absences';
import { aujourdhuiParis, decalerJour, demainParis, heureParis } from '../utils/jourParis';
import { FONDU_ACCUEIL } from '../utils/fondu';
import { aujourdhuiEtDemain, lignesAFaire, suggestionAccueil, type LigneAFaire } from '../utils/accueil';
import AucunEnfant from '../components/AucunEnfant';
import HeaderFondu from '../components/HeaderFondu';
import EnteteCarnet from '../components/accueil/EnteteCarnet';
import CorpsCarnet from '../components/accueil/CorpsCarnet';
import FeuillePhotoEnfant from '../components/FeuillePhotoEnfant';
import EtatErreur from '../components/EtatErreur';
import { jourCourt } from '../components/messages/CarteATraiter';
import { useAnneesEnfant } from '../hooks/useAnneesEnfant';
import { useAgendaSemaine } from '../hooks/useAgendaSemaine';
import { useRendezVousJours } from '../hooks/useRendezVousJours';
import { useCoches } from '../hooks/useCoches';
import { usePhotoUrl } from '../hooks/usePhotoUrl';
import { useAbsences } from '../hooks/useAbsences';
import { useMotsEnfant } from '../hooks/useMotsEnfant';
import { useCarnetReel } from '../hooks/useCarnetReel';
import { useAccueilReel, type NoteAccueil } from '../hooks/useAccueilReel';
import { useNomEnseignant } from '../hooks/useNomEnseignant';
import { useOuvrirFichierCarnet } from '../hooks/useOuvrirFichierCarnet';
import { PHOTO_ENFANT_ACTIVE } from '../constants/photoEnfant';
import { aTraiter, attendReponse } from '../services/motsService';
import { carnetDemo, surChangementCarnet, type ElementCarnet } from '../services/carnetService';
import { demanderAjoutCarnet } from '../services/ouvertureAjout';
import { lirePreferencesAria, surChangementAria } from '../services/ariaPreferences';
import { NOM_APP } from '../constants/marque';
import { ENV } from '../services/getEnv';
import { C, RADIUS, SHADOW } from '../constants/design';
import { Text } from '../components/ui';

/** Hauteur réservée à la top bar au-dessus de la ligne d'identité de l'en-tête (insets.top + 64). */
const HERO_TOPBAR_RESERVE = 64;

export default function AccueilScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { selectedChild, children: enfants } = useActiveChild();
  const { isDemo } = useAuth();
  const scrollHandler = useTopbarScrollHandler();
  const { getGrades, getSubjects } = useDemoData();
  const childId = selectedChild?.id;
  const prenom = selectedChild?.name?.split(' ')[0] ?? '';

  // Sources (les mêmes que les autres onglets).
  const { mots, erreur: erreurMots, recharger: rechargerMots } = useMotsEnfant(childId);
  const agenda = useAgendaSemaine(childId, isDemo, true);
  const rendezVous = useRendezVousJours(childId, isDemo);
  const absencesEnfant = useAbsences(childId, isDemo);
  const reel = useAccueilReel(childId, isDemo, selectedChild?.cycle);
  const anneesEnfant = useAnneesEnfant(childId, isDemo);
  const enseignant = useNomEnseignant(childId, isDemo);
  const { coches, basculer: basculerCoche } = useCoches(childId);
  const [versionCarnet, setVersionCarnet] = useState(0);
  useEffect(() => surChangementCarnet(() => setVersionCarnet((v) => v + 1)), []);
  const { items: carnetReel, erreur: erreurCarnet, recharger: rechargerCarnet } = useCarnetReel(childId, isDemo, versionCarnet);

  const erreurAccueil =
    erreurMots ?? erreurCarnet ?? reel.erreur ?? agenda.erreur ?? anneesEnfant.erreur ?? absencesEnfant.erreur ?? rendezVous.erreur;
  const reessayer = () => {
    reel.recharger();
    agenda.recharger();
    absencesEnfant.recharger();
    rendezVous.recharger();
    rechargerMots();
    rechargerCarnet();
  };

  const aujourdhui = aujourdhuiParis();
  const demain = demainParis();

  // 1. À faire
  const aFaire = useMemo(() => {
    const absences = aJustifier(absencesEnfant.absences, decalerJour(aujourdhui, -30)).map((a) => ({
      id: a.id,
      periode: periodeAbsence(a, aujourdhui, demain),
    }));
    return lignesAFaire({ mots, absencesAJustifier: absences, aTraiter, attendReponse, jourCourt });
  }, [mots, absencesEnfant.absences, aujourdhui, demain]);

  // 2. Aujourd'hui et demain
  const elements = useMemo(
    () =>
      aujourdhuiEtDemain({
        evenements: agenda.evenements,
        mots,
        rendezVous: rendezVous.occurrences,
        coches,
        aujourdhui,
        demain,
        quand: (d) => (d === aujourdhui ? 'Aujourd’hui' : 'Demain'),
        heure: heureFr,
      }),
    [agenda.evenements, mots, rendezVous.occurrences, coches, aujourdhui, demain],
  );

  // 3. Nouveau dans le carnet : ajouts de la famille (toutes catégories), observations / compétences, notes.
  const imports: ElementCarnet[] = useMemo(
    () => (isDemo ? carnetDemo(childId) : carnetReel),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carnetDemo relu à chaque changement du carnet
    [isDemo, childId, carnetReel, versionCarnet],
  );
  const apprentissages = useMemo(
    () => (!childId ? [] : isDemo ? getSuiviDemo(childId).slice(0, 3) : reel.apprentissages),
    [isDemo, childId, reel.apprentissages],
  );
  const notes: NoteAccueil[] = useMemo(() => {
    if (!selectedChild || !aDesNotes(selectedChild.cycle)) return [];
    if (!isDemo) return reel.notes;
    const matieres = getSubjects(selectedChild.id);
    return [...getGrades(selectedChild.id)]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 2)
      .map((g) => ({
        id: g.id,
        subject: matieres.find((m) => m.id === g.subjectId)?.name ?? '',
        grade: String(g.value),
        scale: String(g.outOf),
        date: jourMois(g.date),
        iso: g.date.slice(0, 10),
      }));
  }, [isDemo, selectedChild, getGrades, getSubjects, reel.notes]);

  // 4. Suggestion de l'assistant : jamais si l'assistant est désactivé (Famille et paramètres › Assistant).
  const [assistantActif, setAssistantActif] = useState(true);
  useEffect(() => {
    lirePreferencesAria().then((p) => setAssistantActif(p.ariaActive));
    return surChangementAria((p) => setAssistantActif(p.ariaActive));
  }, []);
  const suggestion = useMemo(
    () =>
      selectedChild && assistantActif
        ? suggestionAccueil({ prenom, elements, aFaire, aujourdhui, demain, heureActuelle: heureParis() })
        : null,
    [selectedChild, assistantActif, prenom, elements, aFaire, aujourdhui, demain],
  );

  const ouvrirFichierCarnet = useOuvrirFichierCarnet();
  const ouvrirImport = async (e: ElementCarnet) => {
    if (e.deMoi) {
      nav.navigate('AjouterAuCarnet', { element: e });
      return;
    }
    await ouvrirFichierCarnet(e);
  };
  const ouvrirAFaire = (l: LigneAFaire) => {
    if (l.absenceId) nav.navigate('SignalerAbsenceScreen', { absenceId: l.absenceId });
    else if (l.motId && childId) nav.navigate('MotDetailScreen', { motId: l.motId, childId });
  };

  // Photo de l'enfant : comptes réels seulement (démo : initiale).
  const [photoVisible, setPhotoVisible] = useState(false);
  const photoUri = usePhotoUrl(selectedChild);
  const heroColor = selectedChild?.color ?? DEFAULT_CHILD_COLOR;
  const hauteurFondu = insets.top + FONDU_ACCUEIL;

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: getBottomBarScrollPadding(insets.bottom) }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
      >
        {/* Fondu pleine largeur de la couleur de l'enfant, derrière la barre d'état, la top bar et les premières cartes. */}
        <HeaderFondu couleur={heroColor} hauteur={hauteurFondu} />
        {selectedChild ? (
          <EnteteCarnet
            paddingTop={insets.top + HERO_TOPBAR_RESERVE}
            prenom={prenom}
            initiale={getChildInitials(selectedChild.name, enfants.map((c) => c.name))}
            classe={libelleClasse(selectedChild.niveau)}
            enseignant={enseignant}
            ecole={anneesEnfant.enCours?.etablissement || selectedChild.ecole}
            photoUri={photoUri}
            anneePhoto={selectedChild.photoAnterieure}
            onPhoto={isDemo || !PHOTO_ENFANT_ACTIVE ? undefined : () => setPhotoVisible(true)}
          />
        ) : (
          <View style={[styles.hero, { paddingTop: insets.top + HERO_TOPBAR_RESERVE }]}>
            <Text style={styles.heroHello}>Bienvenue</Text>
            <Text style={styles.heroPrenom} numberOfLines={1}>{`dans ${NOM_APP}`}</Text>
          </View>
        )}

        {/* Compte réel sans enfant : état vide, rien d'autre (aucune donnée de démo). */}
        {!selectedChild && (
          <View style={styles.carte}>
            <AucunEnfant compact />
          </View>
        )}

        {selectedChild && (
          <>
            {erreurAccueil && (
              <View style={styles.carte}>
                <EtatErreur type={erreurAccueil} onReessayer={reessayer} compact />
              </View>
            )}
            <CorpsCarnet
              hauteurFondu={hauteurFondu}
              primaire={selectedChild.cycle === 'primaire'}
              aFaire={aFaire}
              onOuvrirAFaire={ouvrirAFaire}
              elements={elements}
              onBasculerDevoir={agenda.basculer}
              onBasculerPrevoir={(e) => {
                if ('motId' in e.prevoir) basculerCoche(`${e.prevoir.motId}|${e.prevoir.item}`);
                else rendezVous.basculer(e.prevoir.rdvId, e.prevoir.semaine, e.prevoir.item, !e.fait);
              }}
              onOuvrirAgenda={() => nav.getParent()?.navigate('Agenda')}
              apprentissages={apprentissages}
              imports={imports}
              notes={notes}
              onOuvrirScolarite={() => nav.getParent()?.navigate('Notes')}
              onOuvrirImport={ouvrirImport}
              onAjouter={() => demanderAjoutCarnet({ onglet: 'Accueil' })}
              suggestion={erreurAccueil ? null : suggestion}
              onOuvrirAssistant={() => nav.navigate('AriaHome')}
            />
          </>
        )}

        {/* APK de démonstration (APP_VARIANT=demo) : dit que tout est fictif, discrètement, tout en bas du défilement. */}
        {ENV.VARIANTE_DEMO ? (
          <Text style={styles.mentionDemo}>Démonstration : famille et données fictives.</Text>
        ) : null}
      </Animated.ScrollView>

      {selectedChild && !isDemo && PHOTO_ENFANT_ACTIVE ? (
        <FeuillePhotoEnfant child={selectedChild} visible={photoVisible} onClose={() => setPhotoVisible(false)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  // Compte sans enfant : texte posé sur la partie pleine du fondu (indigo).
  hero: { paddingHorizontal: 20, paddingBottom: 16 },
  heroHello: { fontFamily: 'Figtree_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.95)', marginBottom: 1 },
  heroPrenom: { fontFamily: 'Figtree_900Black', fontSize: 32, color: '#FFFFFF', letterSpacing: -1.2, lineHeight: 36 },
  carte: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: RADIUS.card,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  mentionDemo: {
    fontFamily: 'Figtree_300Light',
    fontSize: 11,
    color: 'rgba(15,23,42,0.35)',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 24,
  },
});
