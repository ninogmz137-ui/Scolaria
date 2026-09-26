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
import { jourMois, libelleNiveau, ligneSource, type Echelle, type ElementSuivi } from '../utils/competences';
import { aDesNotes } from '../utils/niveau';
import AucunEnfant from '../components/AucunEnfant';
import HeaderFondu, { tonSurFondu } from '../components/HeaderFondu';
import type { LayoutChangeEvent, StyleProp, TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTopbarScrollHandler } from '../contexts/TopbarScrollContext';
import ScolariaSymbol from '../components/ScolariaSymbol';
import SectionLabel from '../components/SectionLabel';
import JustifierAbsenceSheet from '../components/JustifierAbsenceSheet';
import { C } from '../constants/design';
import { Text } from '../components/ui';
import { de } from '../utils/francais';
import { useDemoData } from '../contexts/DemoContext';
import { getConversations } from '../stores/messagerieStore';
import { construireAccueilDemo, isoJour } from '../data/demo/accueil';
import { carnetDemo, getCarnetItems, lienFichier, surChangementCarnet, type ElementCarnet } from '../services/carnetService';
import { LIBELLES_TYPE, ligneSourceCarnet } from './suivi/CarnetVue';

// ─── Data démo ────────────────────────────────────────────

const ACTION_PILLS: Record<string, { label: string; bg: string; color: string }> = {
  signer:    { label: 'SIGNER',    bg: '#FEE2E2', color: '#B91C1C' },
  lire:      { label: 'LIRE',      bg: '#E0E7FF', color: '#4338CA' },
  justifier: { label: 'JUSTIFIER', bg: '#FEF3C7', color: '#B45309' },
};

/** Hauteur réservée à la top bar au-dessus du contenu du header (TOPBAR_PADDING_TOP + rangée + marge). */
const HERO_TOPBAR_RESERVE = 60;
/** Longueur du fondu sous la barre d'état (~300 px) : les premières cartes flottent sur sa fin. */
const HERO_FONDU = 300;

// ─── Sous-composants ──────────────────────────────────────

const TON_STYLE: Record<'clair' | 'fonce', TextStyle> = {
  clair: { color: '#FFFFFF' },
  fonce: { color: 'rgba(15,23,42,0.55)' },
};

/**
 * Enveloppe un texte posé en haut de l'Accueil : il mesure sa position et prend le ton lisible
 * sur la partie du fondu qui est derrière lui (la position dépend du contenu et de la barre d'état).
 */
function SurFondu({
  hauteur,
  children,
}: {
  hauteur: number;
  children: (ton: StyleProp<TextStyle>) => React.ReactNode;
}) {
  const [ton, setTon] = useState<'clair' | 'fonce' | null>(null);
  const onLayout = (ev: LayoutChangeEvent) => {
    const { y, height } = ev.nativeEvent.layout;
    setTon(tonSurFondu(y + height / 2, hauteur));
  };
  return <View onLayout={onLayout}>{children(ton ? TON_STYLE[ton] : null)}</View>;
}

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

/** 3 ou 4 segments selon l'échelle de la ligne : remplis #0F172A, vides rgba(15,23,42,0.12). */
function NiveauSegments({ niveau, echelle }: { niveau: number; echelle: Echelle }) {
  return (
    <View style={styles.segments} accessibilityLabel={libelleNiveau(niveau, echelle)}>
      {Array.from({ length: echelle }, (_, i) => (
        <View
          key={i}
          style={[styles.segment, i + 1 <= niveau && styles.segmentOn, i < echelle - 1 && { marginRight: 3 }]}
        />
      ))}
    </View>
  );
}

/** Même élément, même libellé et même ligne source que dans le Suivi (src/data/demo/suivi.ts). */
function ApprentissageRow({ element, last, onPress }: { element: ElementSuivi; last?: boolean; onPress?: () => void }) {
  const { domaine, texte, niveau, echelle } = element;
  return (
    <TouchableOpacity
      style={[styles.apprRow, !last && styles.rowBorder]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <Text style={styles.apprDomaine}>{domaine}</Text>
      <Text style={styles.apprTexte}>{texte}</Text>
      {niveau && echelle ? (
        <View style={styles.apprMetaLine}>
          <NiveauSegments niveau={niveau} echelle={echelle} />
          <Text style={styles.apprNiveau}>{libelleNiveau(niveau, echelle)}</Text>
        </View>
      ) : null}
      <Text style={styles.apprSource}>{ligneSource(element)}</Text>
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
  const { selectedChild } = useActiveChild();
  const { isDemo } = useAuth();
  const scrollHandler = useTopbarScrollHandler();

  // Un enfant = un carnet : uniquement les données de l'enfant actif. Compte réel : vide tant que
  // ces données ne sont pas branchées sur la base (jamais la démo).
  // UNE seule source de vérité : l'Accueil ne possède aucune donnée propre.
  //  - « Dernières notes » : les notes de l'enfant (mêmes données que le Suivi collège) ;
  //  - « Derniers apprentissages » : src/data/demo/suivi.ts (même source que le Suivi) ;
  //  - « À faire », « Aujourd'hui », Aria : Agenda, mots et Messages de l'enfant.
  const { getAgenda, getMots, getGrades, getSubjects } = useDemoData();
  const dernieresNotes = useMemo(() => {
    if (!isDemo || !selectedChild) return [];
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
  }, [isDemo, selectedChild, getGrades, getSubjects]);
  const derniersApprentissages = useMemo(
    () => (isDemo && selectedChild ? getSuiviDemo(selectedChild.id).slice(0, 2) : []),
    [isDemo, selectedChild],
  );

  // « Nouveau dans le carnet » : mots importés par la famille (lot B5). Démo : ajouts de la session ;
  // compte réel : carnet_items. Livrets → Suivi › Livrets ; souvenirs et jalons → Suivi › Souvenirs.
  const [versionCarnet, setVersionCarnet] = useState(0);
  useEffect(() => surChangementCarnet(() => setVersionCarnet((v) => v + 1)), []);
  const [motsReels, setMotsReels] = useState<ElementCarnet[]>([]);
  useEffect(() => {
    let annule = false;
    if (isDemo || !selectedChild) {
      setMotsReels([]);
      return;
    }
    getCarnetItems(selectedChild.id).then((items) => {
      if (!annule) setMotsReels(items.filter((e) => e.categorie === 'mot'));
    });
    return () => {
      annule = true;
    };
  }, [isDemo, selectedChild?.id, versionCarnet]);
  const nouveauxMots = (isDemo ? carnetDemo(selectedChild?.id).filter((e) => e.categorie === 'mot') : motsReels).slice(0, 3);
  const ouvrirAjout = async (e: ElementCarnet) => {
    if (e.deMoi) {
      nav.navigate('AjouterAuCarnet', { element: e });
      return;
    }
    const url = await lienFichier(e, isDemo);
    if (url) Linking.openURL(url);
  };
  const accueil = useMemo(() => {
    if (!isDemo || !selectedChild) return { todo: [], aujourdhui: [], aria: '' };
    const auj = new Date();
    const demain = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() + 1);
    return construireAccueilDemo({
      prenom: selectedChild.name.split(' ')[0],
      cycle: selectedChild.cycle,
      aujourdHui: auj,
      evenementsDuJour: getAgenda(selectedChild.id, isoJour(auj)),
      evenementsDeDemain: getAgenda(selectedChild.id, isoJour(demain)),
      mots: getMots(selectedChild.id),
      conversations: getConversations(selectedChild.id),
    });
  }, [isDemo, selectedChild, getAgenda, getMots]);
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
        <View style={[styles.hero, { paddingTop: insets.top + HERO_TOPBAR_RESERVE }]}>
          <Text style={styles.heroHello}>{selectedChild ? 'Bonjour' : 'Bienvenue'}</Text>
          <Text style={styles.heroPrenom} numberOfLines={1}>{selectedChild ? prenom : 'dans Scolaria'}</Text>
        </View>

        {/* Compte réel sans enfant : état vide, rien d'autre (aucune donnée de démo). */}
        {!selectedChild && (
          <View style={styles.cardOuter}>
            <View style={styles.cardInner}>
              <AucunEnfant compact />
            </View>
          </View>
        )}

        {selectedChild && (<>

        {/* À faire */}
        {accueil.todo.length > 0 && (
          <>
            <SurFondu hauteur={hauteurFondu}>
              {(ton) => <SectionLabel text="À faire" style={[styles.sectionLabel, ton]} />}
            </SurFondu>
            <View style={styles.cardOuter}>
              <View style={styles.cardInner}>
                {accueil.todo.map((it, i) => (
                  <ActionRow
                    key={i}
                    {...it}
                    last={i === accueil.todo.length - 1}
                    onPress={
                      it.kind === 'justifier' ? () => setJustifierVisible(true) :
                      it.kind === 'signer' ? () => nav.navigate('SignDoc', { doc: it.doc ?? { title: it.title } }) :
                      undefined
                    }
                  />
                ))}
              </View>
            </View>
          </>
        )}

        {/* Aujourd'hui */}
        <SurFondu hauteur={hauteurFondu}>
          {(ton) => <SectionLabel text="Aujourd'hui" style={[styles.sectionLabel, ton]} />}
        </SurFondu>
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
            {(ton) => <Text style={[styles.emptyState, ton]}>Rien de prévu aujourd’hui.</Text>}
          </SurFondu>
        )}

        {avecNotes ? (
          <>
            {/* Dernières notes : collège / lycée uniquement */}
            <SurFondu hauteur={hauteurFondu}>
              {(ton) => <SectionLabel text="Dernières notes" style={[styles.sectionLabel, ton]} />}
            </SurFondu>
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
                {(ton) => <Text style={[styles.emptyState, ton]}>Aucune note pour l’instant.</Text>}
              </SurFondu>
            )}
            <TouchableOpacity style={styles.ghostLink} activeOpacity={0.7} onPress={ouvrirSuivi}>
              <Text style={styles.ghostLinkText}>Voir le suivi →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Maternelle / primaire : derniers apprentissages, jamais de notes /20 */}
            <SurFondu hauteur={hauteurFondu}>
              {(ton) => <SectionLabel text="Derniers apprentissages" style={[styles.sectionLabel, ton]} />}
            </SurFondu>
            {derniersApprentissages.length > 0 ? (
              <View style={styles.cardOuter}>
                <View style={styles.cardInner}>
                  {derniersApprentissages.map((it, i) => (
                    <ApprentissageRow
                      key={it.id}
                      element={it}
                      last={i === derniersApprentissages.length - 1}
                      onPress={ouvrirSuivi}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <SurFondu hauteur={hauteurFondu}>
                {(ton) => <Text style={[styles.emptyState, ton]}>Aucun apprentissage noté pour l’instant.</Text>}
              </SurFondu>
            )}
            <TouchableOpacity style={styles.ghostLink} activeOpacity={0.7} onPress={ouvrirSuivi}>
              <Text style={styles.ghostLinkText}>Voir le suivi →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Nouveau dans le carnet : mots importés (section absente tant qu'il n'y en a pas) */}
        {nouveauxMots.length > 0 ? (
          <>
            <SurFondu hauteur={hauteurFondu}>
              {(ton) => <SectionLabel text="Nouveau dans le carnet" style={[styles.sectionLabel, ton]} />}
            </SurFondu>
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

  // ── Section label override ───────────────────────────
  sectionLabel: {
    paddingTop: 8,
    paddingBottom: 2,
    color: 'rgba(15,23,42,0.38)',
    opacity: 1,
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
  apprMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  segments: { flexDirection: 'row', marginRight: 6 },
  segment: {
    width: 22,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.12)',
  },
  segmentOn: { backgroundColor: '#0F172A' },
  apprNiveau: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    color: '#0F172A',
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
