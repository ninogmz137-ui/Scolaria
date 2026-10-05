import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MessageCircle, Calendar, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomBarScrollPadding } from '../components/navigation/BottomBar';
import { useActiveChild, DEFAULT_CHILD_COLOR } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';
import { WALLPAPERS } from '../contexts/WallpaperContext';
import { getSuiviDemo } from '../data/demo/suivi';
import { jourMois } from '../utils/competences';
import { aDesNotes, libelleClasse } from '../utils/niveau';
import AucunEnfant from '../components/AucunEnfant';
import HeaderFondu from '../components/HeaderFondu';
import Animated from 'react-native-reanimated';
import { useTopbarScrollHandler } from '../contexts/TopbarScrollContext';
import ScolariaSymbol from '../components/ScolariaSymbol';
import EnteteCarnet from '../components/accueil/EnteteCarnet';
import CorpsCarnet from '../components/accueil/CorpsCarnet';
import SurFondu, { LibelleSurFondu } from '../components/accueil/SurFondu';
import { useAnneesEnfant } from '../hooks/useAnneesEnfant';
import { useAgendaSemaine } from '../hooks/useAgendaSemaine';
import { useCoches } from '../hooks/useCoches';
import { getChildInitials } from '../utils/childInitials';
import { monNomComplet, type MotCarnet } from '../services/motsService';
import JustifierAbsenceSheet from '../components/JustifierAbsenceSheet';
import { C } from '../constants/design';
import { Text } from '../components/ui';
import { de } from '../utils/francais';
import { useDemoData } from '../contexts/DemoContext';
import { getConversations } from '../stores/messagerieStore';
import { construireAccueilDemo, isoJour, todoDepuisMots } from '../data/demo/accueil';
import { useMotsEnfant } from '../hooks/useMotsEnfant';
import EtatErreur from '../components/EtatErreur';
import { useCarnetReel } from '../hooks/useCarnetReel';
import { useAccueilReel } from '../hooks/useAccueilReel';
import { carnetDemo, lienFichier, surChangementCarnet, type ElementCarnet } from '../services/carnetService';
import { LIBELLES_TYPE, ligneSourceCarnet } from './suivi/CarnetVue';
import { NOM_APP } from '../constants/marque';
import { ENV } from '../services/getEnv';
import { useOuvrirFichierCarnet } from '../hooks/useOuvrirFichierCarnet';

// ─── Data démo ────────────────────────────────────────────

const ACTION_PILLS: Record<string, { label: string; bg: string; color: string }> = {
  signer:    { label: 'SIGNER',    bg: 'rgba(67,56,202,0.10)', color: '#4338CA' },
  repondre:  { label: 'RÉPONDRE',  bg: 'rgba(67,56,202,0.10)', color: '#4338CA' },
  lire:      { label: 'LIRE',      bg: '#E0E7FF', color: '#4338CA' },
  justifier: { label: 'JUSTIFIER', bg: '#FEF3C7', color: '#B45309' },
};

/** Hauteur réservée à la top bar au-dessus de la ligne d'identité de l'en-tête du carnet (insets.top + 64). */
const HERO_TOPBAR_RESERVE = 64;
/** Longueur du fondu sous la barre d'état : les premières cartes flottent sur sa fin (COMPONENTS §6). */
const HERO_FONDU = 340;

// ─── Sous-composants (collège / lycée : contenu inchangé) ─────────────

function ActionRow({
  kind, title, deadline, last, onPress,
}: { kind: string; title: string; deadline: string; last?: boolean; onPress?: () => void }) {
  const p = ACTION_PILLS[kind];
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      activeOpacity={0.85}
      accessibilityRole="button"
      onPress={onPress}
    >
      <View style={[styles.actionBadge, { backgroundColor: p.bg }]}>
        <Text style={[styles.actionBadgeText, { color: p.color }]}>{p.label}</Text>
      </View>
      <Text style={styles.actionTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.deadlineText}>{deadline}</Text>
      <ChevronRight size={14} color="rgba(15,23,42,0.35)" strokeWidth={2} />
    </TouchableOpacity>
  );
}

function TodayRow({
  icon, title, meta, time, last, onPress,
}: { icon: React.ReactNode; title: string; meta: string; time?: string; last?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.todayIconTile}>{icon}</View>
      <View style={styles.todayTexts}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.metaText}>{meta}</Text>
      </View>
      {!!time && <Text style={styles.timeText}>{time}</Text>}
    </TouchableOpacity>
  );
}

function GradeRow({
  subject, grade, scale, date, last, onPress,
}: { subject: string; grade: string; scale: string; date: string; last?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.gradeRow, !last && styles.rowBorder]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <Text style={styles.gradeSubject}>{subject}</Text>
      <Text style={styles.gradeNumber}>
        {grade}<Text style={styles.gradeScale}>/{scale}</Text>
      </Text>
      <Text style={styles.gradeDate}>{date}</Text>
    </TouchableOpacity>
  );
}

// ─── Écran principal ──────────────────────────────────────

export default function AccueilScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { selectedChild, children: enfants } = useActiveChild();
  const { isDemo } = useAuth();
  const scrollHandler = useTopbarScrollHandler();

  // Un enfant = un carnet : uniquement les données de l'enfant actif. Compte réel : vide tant que
  // ces données ne sont pas branchées sur la base (jamais la démo).
  // UNE seule source de vérité : l'Accueil ne possède aucune donnée propre.
  //  - « Dernières notes » : les notes de l'enfant (mêmes données que le Suivi collège) ;
  //  - « Derniers apprentissages » : src/data/demo/suivi.ts (même source que le Suivi) ;
  //  - « À faire », « Aujourd'hui », Aria : Agenda, mots et Messages de l'enfant.
  const { getAgenda, getGrades, getSubjects } = useDemoData();
  // Mots du carnet : la MÊME donnée que Messages › Général « À traiter » (démo et compte réel).
  const { mots, erreur: erreurMots, recharger: rechargerMots } = useMotsEnfant(selectedChild?.id);
  // Compte réel : agenda du jour, derniers apprentissages et dernières notes lus dans la base (useAccueilReel).
  const reel = useAccueilReel(selectedChild?.id, isDemo, selectedChild?.cycle);
  const dernieresNotes = useMemo(() => {
    if (!selectedChild) return [];
    if (!isDemo) return reel.notes;
    const matieres = getSubjects(selectedChild.id);
    return [...getGrades(selectedChild.id)]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3)
      .map((g) => ({
        id: g.id,
        subject: matieres.find((m) => m.id === g.subjectId)?.name ?? '',
        grade: String(g.value),
        scale: String(g.outOf),
        date: jourMois(g.date),
      }));
  }, [isDemo, selectedChild, getGrades, getSubjects, reel.notes]);
  const derniersApprentissages = useMemo(
    () => (!selectedChild ? [] : isDemo ? getSuiviDemo(selectedChild.id).slice(0, 2) : reel.apprentissages),
    [isDemo, selectedChild, reel.apprentissages],
  );

  // « Nouveau dans le carnet » : mots importés par la famille (lot B5). Démo : ajouts de la session ;
  // compte réel : carnet_items. Livrets → Suivi › Livrets ; souvenirs et jalons → Suivi › Souvenirs.
  const [versionCarnet, setVersionCarnet] = useState(0);
  useEffect(() => surChangementCarnet(() => setVersionCarnet((v) => v + 1)), []);
  const { items: carnetReel, erreur: erreurCarnet, recharger: rechargerCarnet } = useCarnetReel(selectedChild?.id, isDemo, versionCarnet);
  const motsReels = useMemo(() => carnetReel.filter((e) => e.categorie === 'mot'), [carnetReel]);
  // Chargement en échec (réseau coupé, session expirée…) : message + « Réessayer », jamais « Rien à faire » à tort.
  // Maternelle / primaire : Agenda des 7 jours (devoirs, prochain événement, journée type), années de l'enfant
  // (pilule de l'en-tête), cases « À prévoir » (mémorisées sur l'appareil), nom du responsable (signature).
  const premierDegre = !aDesNotes(selectedChild?.cycle);
  const primaire = selectedChild?.cycle === 'primaire';
  const agenda = useAgendaSemaine(selectedChild?.id, isDemo, premierDegre);
  const anneesEnfant = useAnneesEnfant(selectedChild?.id, isDemo);
  const { coches, basculer: basculerCoche } = useCoches(selectedChild?.id);
  const [monNom, setMonNom] = useState('vous');
  useEffect(() => {
    if (selectedChild?.id) monNomComplet(selectedChild.id, isDemo).then(setMonNom);
  }, [selectedChild?.id, isDemo]);
  const erreurAccueil = erreurMots ?? erreurCarnet ?? reel.erreur ?? agenda.erreur ?? anneesEnfant.erreur;
  const reessayerAccueil = () => {
    reel.recharger();
    agenda.recharger();
    rechargerMots();
    rechargerCarnet();
  };
  const nouveauxMots = (isDemo ? carnetDemo(selectedChild?.id).filter((e) => e.categorie === 'mot') : motsReels).slice(0, 3);
  const ouvrirFichierCarnet = useOuvrirFichierCarnet();
  const ouvrirAjout = async (e: ElementCarnet) => {
    if (e.deMoi) {
      nav.navigate('AjouterAuCarnet', { element: e });
      return;
    }
    await ouvrirFichierCarnet(e);
  };
  const accueil = useMemo(() => {
    if (!selectedChild) return { todo: [], aujourdhui: [], aria: '' };
    // Compte réel : « À faire » = mes mots ; « Aujourd'hui » = les événements de l'Agenda du jour (useAccueilReel).
    if (!isDemo) return { todo: todoDepuisMots(mots), aujourdhui: reel.aujourdhui, aria: '' };
    const auj = new Date();
    const demain = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() + 1);
    return construireAccueilDemo({
      prenom: selectedChild.name.split(' ')[0],
      cycle: selectedChild.cycle,
      aujourdHui: auj,
      evenementsDuJour: getAgenda(selectedChild.id, isoJour(auj)),
      evenementsDeDemain: getAgenda(selectedChild.id, isoJour(demain)),
      mots,
      conversations: getConversations(selectedChild.id),
    });
  }, [isDemo, selectedChild, getAgenda, mots, reel.aujourdhui]);
  const avecNotes = aDesNotes(selectedChild?.cycle);
  const ouvrirSuivi = () => nav.getParent()?.navigate('Notes');

  const [justifierVisible, setJustifierVisible] = useState(false);

  const prenom = selectedChild?.name?.split(' ')[0] ?? '';
  const heroColor = selectedChild?.color ?? DEFAULT_CHILD_COLOR;
  const hauteurFondu = insets.top + HERO_FONDU;
  // Fond choisi pour CET enfant (image intégrée à l'app) ; sinon sa couleur.
  const heroPhoto = selectedChild?.fond ? WALLPAPERS.find((w) => w.id === selectedChild.fond) : undefined;

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: getBottomBarScrollPadding(insets.bottom) }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
      >
        {/* Header pleine largeur en FONDU : couleur de l'enfant (ou sa photo) qui disparaît vers la
            transparence, derrière la barre d'état, la top bar et les premières cartes. Part avec le
            contenu au défilement. Aucun arrondi, aucune coupure. */}
        <HeaderFondu couleur={heroColor} photo={heroPhoto?.source} hauteur={hauteurFondu} />
        {selectedChild ? (
          // En-tête du carnet (COMPONENTS §18.3) : photo ou initiale, prénom, classe, pilule « [École] · année ».
          <EnteteCarnet
            paddingTop={insets.top + HERO_TOPBAR_RESERVE}
            prenom={prenom}
            initiale={getChildInitials(selectedChild.name, enfants.map((c) => c.name))}
            classe={libelleClasse(selectedChild.niveau)}
            ecole={anneesEnfant.enCours?.etablissement || selectedChild.ecole}
            enCours={anneesEnfant.enCours}
            archives={anneesEnfant.archives}
            onParcours={() => nav.navigate('MonParcours')}
          />
        ) : (
          <View style={[styles.hero, { paddingTop: insets.top + HERO_TOPBAR_RESERVE }]}>
            <Text style={styles.heroHello}>Bienvenue</Text>
            <Text style={styles.heroPrenom} numberOfLines={1}>{`dans ${NOM_APP}`}</Text>
          </View>
        )}

        {/* Compte réel sans enfant : état vide, rien d'autre (aucune donnée de démo). */}
        {!selectedChild && (
          <View style={styles.cardOuter}>
            <View style={styles.cardInner}>
              <AucunEnfant compact />
            </View>
          </View>
        )}

        {selectedChild && (<>

        {erreurAccueil && (
          <View style={styles.cardOuter}>
            <View style={styles.cardInner}>
              <EtatErreur type={erreurAccueil} onReessayer={reessayerAccueil} compact />
            </View>
          </View>
        )}

        {premierDegre ? (
          // Maternelle / primaire : À faire · Cette semaine · Nouveau dans le carnet · Aujourd'hui (primaire seulement).
          <CorpsCarnet
            primaire={primaire}
            hauteurFondu={hauteurFondu}
            mots={mots}
            monNom={monNom}
            demo={isDemo}
            evenements={agenda.evenements}
            onBasculerDevoir={agenda.basculer}
            coches={coches}
            onBasculerCoche={basculerCoche}
            apprentissages={derniersApprentissages}
            imports={nouveauxMots}
            onOuvrirMot={(m: MotCarnet) => nav.navigate('MotDetailScreen', { motId: m.id, childId: selectedChild.id })}
            onOuvrirAgenda={() => nav.getParent()?.navigate('Agenda')}
            onOuvrirImport={ouvrirAjout}
            onOuvrirSuivi={ouvrirSuivi}
          />
        ) : (
          <>
        {/* À faire (collège / lycée : contenu inchangé) */}
        {accueil.todo.length > 0 && (
          <>
            <LibelleSurFondu texte="À faire" hauteur={hauteurFondu} />
            <View style={styles.cardOuter}>
              <View style={styles.cardInner}>
                {accueil.todo.map((it, i) => (
                  <ActionRow
                    key={i}
                    {...it}
                    last={i === accueil.todo.length - 1}
                    onPress={
                      it.kind === 'justifier' ? () => setJustifierVisible(true) :
                      it.motId ? () => nav.navigate('MotDetailScreen', { motId: it.motId, childId: selectedChild.id }) :
                      undefined
                    }
                  />
                ))}
              </View>
            </View>
          </>
        )}

        {/* Aujourd'hui */}
        <LibelleSurFondu texte="Aujourd’hui" hauteur={hauteurFondu} />
        {accueil.aujourdhui.length > 0 ? (
          <View style={styles.cardOuter}>
            <View style={styles.cardInner}>
              {accueil.aujourdhui.map((it, i) => (
                <TodayRow
                  key={it.id}
                  icon={
                    it.kind === 'event'
                      ? <Calendar size={14} color="rgba(15,23,42,0.55)" strokeWidth={1.8} />
                      : <MessageCircle size={14} color="rgba(15,23,42,0.55)" strokeWidth={1.8} />
                  }
                  title={it.title}
                  meta={it.meta}
                  time={it.time}
                  last={i === accueil.aujourdhui.length - 1}
                  onPress={
                    it.kind === 'event'
                      ? () => nav.getParent()?.navigate('Agenda')
                      : () => nav.getParent()?.navigate('MessagerieTab')
                  }
                />
              ))}
            </View>
          </View>
        ) : (
          <SurFondu hauteur={hauteurFondu}>
            {(ton) => <Text style={[styles.emptyState, ton]}>{erreurAccueil ? '' : 'Rien de prévu aujourd’hui.'}</Text>}
          </SurFondu>
        )}

        {/* Dernières notes : collège / lycée uniquement */}
        <LibelleSurFondu texte="Dernières notes" hauteur={hauteurFondu} />
        {dernieresNotes.length > 0 ? (
          <View style={styles.cardOuter}>
            <View style={styles.cardInner}>
              {dernieresNotes.map((it, i) => (
                <GradeRow
                  key={it.id}
                  subject={it.subject}
                  grade={it.grade}
                  scale={it.scale}
                  date={it.date}
                  last={i === dernieresNotes.length - 1}
                  onPress={ouvrirSuivi}
                />
              ))}
            </View>
          </View>
        ) : (
          <SurFondu hauteur={hauteurFondu}>
            {(ton) => <Text style={[styles.emptyState, ton]}>{erreurAccueil ? '' : 'Aucune note pour l’instant.'}</Text>}
          </SurFondu>
        )}
        <TouchableOpacity style={styles.ghostLink} activeOpacity={0.7} onPress={ouvrirSuivi}>
          <Text style={styles.ghostLinkText}>Voir le suivi →</Text>
        </TouchableOpacity>

        {/* Nouveau dans le carnet : mots importés (section absente tant qu'il n'y en a pas) */}
        {nouveauxMots.length > 0 ? (
          <>
            <LibelleSurFondu texte="Nouveau dans le carnet" hauteur={hauteurFondu} />
            <View style={styles.cardOuter}>
              <View style={styles.cardInner}>
                {nouveauxMots.map((e, i) => (
                  <TouchableOpacity
                    key={e.id}
                    style={[styles.apprRow, i < nouveauxMots.length - 1 && styles.rowBorder]}
                    activeOpacity={0.75}
                    onPress={() => ouvrirAjout(e)}
                  >
                    <Text style={styles.apprDomaine}>{LIBELLES_TYPE[e.type]}</Text>
                    <Text style={styles.apprTexte}>{e.titre}</Text>
                    <Text style={styles.apprSource}>
                      {`${ligneSourceCarnet(e)}${e.visibilite === 'prive' ? ' · visible par vous seul' : ''}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        ) : null}
          </>
        )}

        <View style={{ height: 14 }} />

        {/* Aria */}
        <View style={{ paddingHorizontal: 14, marginTop: 4 }}>
          <TouchableOpacity
            style={styles.ariaCard}
            activeOpacity={0.9}
            accessibilityRole="button"
            onPress={() => nav.navigate('AriaHome')}
          >
            <LinearGradient
              colors={['#EEF2FF', '#F0FDFA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            <View style={{ marginRight: 10 }}>
              <ScolariaSymbol size={18} color={C.indigo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ariaLabel}>ARIA</Text>
              <Text style={styles.ariaMessage}>
                {accueil.aria || `Posez une question à Aria sur le carnet ${de(prenom)}.`}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        </>)}
        {/* APK de démonstration (APP_VARIANT=demo) : dit que tout est fictif, discrètement, tout en bas du défilement. */}
        {ENV.VARIANTE_DEMO ? (
          <Text style={{ fontFamily: 'Figtree_300Light', fontSize: 11, color: 'rgba(15,23,42,0.35)', textAlign: 'center', marginTop: 20, paddingHorizontal: 24 }}>
            Démonstration : famille et données fictives.
          </Text>
        ) : null}
      </Animated.ScrollView>

      <JustifierAbsenceSheet
        visible={justifierVisible}
        onClose={() => setJustifierVisible(false)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── ScrollView transparent ───────────────────────────
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // ── Contenu hero ─────────────────────────────────────
  // Texte du header, posé sur la partie pleine du fondu (HeaderFondu, couche absolue).
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  heroHello: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 13,
    // 95 % : contraste AA ≥ 5,1 sur les 6 couleurs d'enfant (pire cas : sarcelle)
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 1,
  },
  heroPrenom: {
    fontFamily: 'Figtree_900Black',
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: -1.2,
    lineHeight: 36,
  },

  // ── Card wrapper (outer shadow + inner clip) ─────────
  cardOuter: {
    marginHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
      },
      android: { elevation: 0 },
    }),
  },
  cardInner: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
  },

  // ── Lignes (base partagée) ───────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  rowTitle: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: -0.15,
  },

  // ── ActionRow ────────────────────────────────────────
  actionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  actionBadgeText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 9,
    letterSpacing: 0.7,
  },
  actionTitle: {
    flex: 1,
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: -0.15,
    marginLeft: 10,
  },
  deadlineText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: 'rgba(15,23,42,0.55)',
    flexShrink: 0,
    marginRight: 4,
  },

  // ── TodayRow ─────────────────────────────────────────
  todayIconTile: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(15,23,42,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  todayTexts: { flex: 1 },
  metaText: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 11,
    color: 'rgba(15,23,42,0.55)',
    marginTop: 1,
  },
  timeText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: 'rgba(15,23,42,0.55)',
    flexShrink: 0,
  },

  // ── GradeRow ─────────────────────────────────────────
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  gradeSubject: {
    flex: 1,
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: -0.15,
  },
  gradeNumber: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 20,
    color: '#0F172A',
    letterSpacing: -0.5,
    marginLeft: 10,
  },
  gradeScale: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: 'rgba(15,23,42,0.35)',
  },
  gradeDate: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: 'rgba(15,23,42,0.55)',
    flexShrink: 0,
    minWidth: 52,
    textAlign: 'right',
    marginLeft: 8,
  },

  // ── Ghost link ───────────────────────────────────────
  ghostLink: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
  },
  ghostLinkText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 13,
    color: 'rgba(15,23,42,0.55)',
  },

  // ── Aria card ────────────────────────────────────────
  ariaCard: {
    borderWidth: 1,
    borderColor: 'rgba(67,56,202,0.10)',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  ariaLabel: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 0.3,
    color: C.indigo,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  ariaMessage: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12.5,
    color: '#0F172A',
    lineHeight: 18,
  },

  // ── Apprentissages (maternelle / primaire) ───────────
  apprRow: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  apprDomaine: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(15,23,42,0.55)',
  },
  apprTexte: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    lineHeight: 19,
    color: '#0F172A',
    marginTop: 2,
  },
  apprSource: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(15,23,42,0.55)',
  },

  // ── Empty state ──────────────────────────────────────
  emptyState: {
    marginHorizontal: 14,
    paddingVertical: 14,
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    color: 'rgba(15,23,42,0.55)',
    letterSpacing: -0.1,
  },
});
