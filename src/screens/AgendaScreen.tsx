/**
 * AgendaScreen — Complete redesign v2.
 *
 * - Month title (tappable) → collapsible calendar panel
 * - Calendar panel: horizontal month scroll + full monthly grid
 * - Week day strip (always visible, 7 days, first-letter labels)
 * - Day title + event count
 * - Swipeable day pages (horizontal FlatList, pagingEnabled)
 * - Event card: left accent bar + text only (jamais d'emoji dans une card Agenda)
 * - Ajout d'événement : bouton + de la bottom bar (pas de FAB, voir tasks/todo.md Phase B)
 */

import { dateAujourdhuiParis, jourParis, heureParis, bornesParis, jourDeDate, aujourdhuiParis, demainParis, decalerJour, jourParisIso, heureParisIso, jourSemaine, minuitParis } from '../utils/jourParis';
import { grouperDevoirs, libelleCoche, resteAFaire, type Devoir } from '../utils/devoirs';
import { chargerDevoirs, chargerAuteursCoche, cocherDevoir, auteurCoche, chargerLignesSource, type AuteursCoche } from '../services/devoirsService';
import PastilleCategorie from '../components/PastilleCategorie';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions,
  LayoutAnimation,
  UIManager,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, ChevronDown, CalendarCheck, CalendarDays } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { C, RADIUS, SHADOW } from '../constants/design';
import { useTopbarScrollHandler } from '../contexts/TopbarScrollContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemoData } from '../contexts/DemoContext';
import { getAgendaEvents, createAgendaEvent } from '../services/database';
import { signalerDevoirs } from '../stores/devoirsStore';
import { useVersionDevoirs } from '../hooks/useVersionDevoirs';
import { useVersionAbsences } from '../hooks/useVersionAbsences';
import { useVersionRendezVous } from '../hooks/useVersionRendezVous';
import {
  chargerRendezVous, creerRendezVous, modifierRendezVous, supprimerRendezVous, cocherAPrevoir, ErreurRendezVous,
  type DonneesRendezVous,
} from '../services/rendezVousService';
import {
  occurrencesSemaine, recurrence, ajoutePar, etatAPrevoir, listeAPrevoir, libelleRendezVous, JOURS_SEMAINE, type RendezVous,
} from '../utils/rendezVous';
import { enVacances } from '../utils/vacances';
import { modifiableParMonFoyer, type ResponsableFoyer } from '../utils/foyer';
import { chargerResponsablesFoyer, modifierEvenement, supprimerEvenement, ErreurEvenement } from '../services/evenementsService';
import { jourCourt as jourCourtAbsence } from '../utils/absences';
import { ChevronLeft as ChevronLeftIcone, ChevronRight as ChevronRightIcone } from 'lucide-react-native';
import { chargerAbsences, type AbsenceLue } from '../services/absenceService';
import { couvreJour, peutJustifier, texteCarteAbsence } from '../utils/absences';
import { TEINTES, categorieDiscipline } from '../theme/categories';
import { de } from '../utils/francais';
import { getBottomBarScrollPadding } from '../components/navigation/BottomBar';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text, TextInput, Pressable } from '../components/ui';
import { AucunEnfantOnglet } from '../components/AucunEnfant';
import EtatErreur from '../components/EtatErreur';
import { classerErreur, type TypeErreur } from '../services/erreurs';
import { aDesDevoirs, aDesNotes, aUnEmploiDuTemps } from '../utils/niveau';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Constants ────────────────────────────────────────────

const FRENCH_MONTH_NAMES_FULL = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const SHORT_MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const FRENCH_MONTH_NAMES = [
  'janv', 'févr', 'mars', 'avr', 'mai', 'juin',
  'juil', 'août', 'sept', 'oct', 'nov', 'déc',
];
const FRENCH_DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const WEEK_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// ─── Types ────────────────────────────────────────────────

interface DayInfo {
  date: number;
  day: string;
  month: string;
  isToday: boolean;
}

interface AgendaEvent {
  id: string;
  title: string;
  time: string;
  endTime?: string;
  type: 'cours' | 'devoir' | 'examen' | 'activite' | 'reunion' | 'sortie' | 'absence' | 'rendezvous';
  /** Carte « Rendez-vous fixe » (lot 4c) : le rendez-vous, sa semaine (lundi) et l'état de « À prévoir ». */
  rendezVous?: { rdv: RendezVous; semaine: string; aPrevoir: { item: string; coche: boolean; source: string | null }[]; ajoutePar: string | null };
  /** Créé par un parent de MON foyer (ou auteur parti) : modifiable et supprimable (règle du 21 nov., M41). */
  modifiable?: boolean;
  /** Jour de Paris 'AAAA-MM-JJ' de l'événement (modification). */
  jourIso?: string;
  /** Carte « Absence » (lot 4b) : l'absence et si je peux encore la justifier. */
  absence?: { id: string; aJustifier: boolean };
  subject?: string;
  location?: string;
  description?: string;
  color: string;
  done?: boolean;
  /** Devoir coché : ligne source « Coché par [prénom] · [heure] » ou « Fait » (même fonction que l’Accueil). */
  coche?: string | null;
}

/**
 * Ordre d'une journée : l'absence d'abord, puis les devoirs (sans horaire, « pour aujourd'hui »), puis tout le
 * reste par heure, tous types confondus.
 */
function trierJournee(events: AgendaEvent[]): AgendaEvent[] {
  const rang = (e: AgendaEvent) => (e.type === 'absence' ? 0 : e.type === 'devoir' ? 1 : 2);
  return [...events].sort((a, b) => {
    const da = rang(a);
    const db = rang(b);
    if (da !== db) return da - db;
    return a.time.localeCompare(b.time);
  });
}

type NewEventType = 'devoir' | 'controle' | 'sortie' | 'autre';
type FilterTab = 'Tout' | 'Devoirs' | 'Événements' | 'Rappels';
const FILTER_TABS: FilterTab[] = ['Tout', 'Devoirs', 'Événements', 'Rappels'];

/** Démo : la coche est celle du parent qui consulte (« Coché par vous »). */
const MOI_DEMO = 'demo-moi';
const AUTEURS_DEMO: AuteursCoche = { [MOI_DEMO]: 'vous' };

const NEW_EVENT_TYPE_LABELS: Record<NewEventType, string> = {
  devoir: 'Devoir', controle: 'Contrôle', sortie: 'Sortie', autre: 'Autre',
};

// ─── Helpers ──────────────────────────────────────────────

/** '#RRGGBB' / '#RGB' → rgba(r,g,b,alpha). Évite les hex à 8 chiffres concaténés (color + '12'). */
function withAlpha(color: string, alpha: number): string {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(15,23,42,${alpha})`;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function buildWeekDays(referenceDate: Date): (DayInfo & { fullDate: Date })[] {
  const monday = getMondayOfWeek(referenceDate);
  const today = dateAujourdhuiParis();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: d.getDate(),
      day: FRENCH_DAY_NAMES[d.getDay()],
      month: FRENCH_MONTH_NAMES[d.getMonth()],
      isToday: d.getTime() === today.getTime(),
      fullDate: d,
    };
  });
}

function formatDateFR(date: Date): string {
  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const months = [
    'jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin',
    'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
  ];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

/** Échéance d'un devoir (jamais de plage horaire) : « Pour aujourd'hui », « Pour demain », « Pour lundi 28 sept. ». */
function echeanceDevoir(jour: Date): string {
  const t = dateAujourdhuiParis();
  const aujourdHui = new Date(t.getFullYear(), t.getMonth(), t.getDate()).toDateString();
  const demain = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1).toDateString();
  if (jour.toDateString() === aujourdHui) return 'Pour aujourd’hui';
  if (jour.toDateString() === demain) return 'Pour demain';
  return `Pour ${formatDateFR(jour)}`;
}

function buildCalendarGrid(
  year: number,
  month: number,
): { day: number; isCurrentMonth: boolean; fullDate: Date }[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();

  const grid: { day: number; isCurrentMonth: boolean; fullDate: Date }[][] = [];
  let currentDay = 1 - startDayOfWeek;

  for (let week = 0; week < 6; week++) {
    const row: { day: number; isCurrentMonth: boolean; fullDate: Date }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(year, month, currentDay);
      row.push({
        day: date.getDate(),
        isCurrentMonth: currentDay >= 1 && currentDay <= daysInMonth,
        fullDate: date,
      });
      currentDay++;
    }
    grid.push(row);
    if (currentDay > daysInMonth) break;
  }
  return grid;
}

const DEFAULT_COLOR: Record<AgendaEvent['type'], string> = {
  cours: Colors.violet, devoir: Colors.orange, examen: Colors.red,
  activite: Colors.cyan, reunion: Colors.violet, sortie: Colors.cyan,
  // Absence : teinte « ardoise » des types de contenu (src/theme/categories.ts).
  absence: TEINTES.ardoise.icone,
  rendezvous: TEINTES.ardoise.icone,
};
const TYPE_LABELS: Record<AgendaEvent['type'], string> = {
  cours: 'Cours', devoir: 'Devoir', examen: 'Examen',
  activite: 'Activité', reunion: 'Réunion', sortie: 'Sortie', absence: 'Absence', rendezvous: 'Rendez-vous fixe',
};

// ─── Animated checkbox ────────────────────────────────────

function AnimatedCheckbox({ done, onPress }: { done: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (done) {
      scale.value = withSequence(
        withSpring(0.85, { damping: 15, stiffness: 300 }),
        withSpring(1.1, { damping: 10, stiffness: 300 }),
        withSpring(1.0, { damping: 15, stiffness: 300 }),
      );
    }
  }, [done]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Animated.View style={[st.checkboxWrap, animatedStyle]}>
        {done ? (
          <View style={[st.checkboxGradient, { backgroundColor: '#0F172A' }]}>
            <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        ) : (
          <View style={st.checkboxEmpty} />
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Homework checkbox (22px, COMPONENTS §18.6) ─────────────────────────────

function HomeworkCheckbox({ done, onPress, label }: { done: boolean; onPress: () => void; label: string }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (done) {
      scale.value = withSequence(
        withSpring(0.75, { damping: 15, stiffness: 350 }),
        withSpring(1.15, { damping: 10, stiffness: 300 }),
        withSpring(1.0, { damping: 15, stiffness: 300 }),
      );
    }
  }, [done]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={11}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
    >
      <Animated.View style={animStyle}>
        {done ? (
          <View style={st.hwCheckFilled}>
            <Check size={12} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : (
          <View style={st.hwCheckEmpty} />
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Component ────────────────────────────────────────────

function AgendaScreenContent() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { selectedChildId, selectedChild, loading: childLoading } = useActiveChild();
  const { user } = useAuth();
  const { isDemoMode, getAgenda: getDemoAgenda, toggleAgendaDone: demoToggleDone } = useDemoData();
  const getDemoAgendaRef = useRef(getDemoAgenda);
  getDemoAgendaRef.current = getDemoAgenda;
  const insets = useSafeAreaInsets();
  const scrollHandler = useTopbarScrollHandler();
  const today = useMemo(() => {
    return dateAujourdhuiParis();
  }, []);

  // ─── Calendar panel state ──────────────────────────────
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // ─── Week / day state ──────────────────────────────────
  const flatListRef = useRef<FlatList>(null);
  const isProgrammaticScroll = useRef(false);

  const [weekOffset, setWeekOffset] = useState(0);
  const referenceDate = useMemo(() => {
    const d = dateAujourdhuiParis();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const [weekDays, setWeekDays] = useState(() => buildWeekDays(dateAujourdhuiParis()));
  // Jamais d'événements fictifs : démo = agenda de l'enfant actif, compte réel = la base.
  const [eventsByDay, setEventsByDay] = useState<Record<number, AgendaEvent[]>>({});
  const [erreurAgenda, setErreurAgenda] = useState<TypeErreur | null>(null);
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedFullDate, setSelectedFullDate] = useState(today);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Tout');
  // Devoirs dès le CP ; jamais en maternelle (pas de filtre « Devoirs »).
  const avecDevoirs = aDesDevoirs(selectedChild?.cycle);
  // Créneaux de cours dans l'Agenda : collège / lycée seulement.
  const avecCours = aDesNotes(selectedChild?.cycle);
  const filtres = FILTER_TABS.filter((f) => f !== 'Devoirs' || avecDevoirs);
  // Changement d'enfant vers la maternelle : pas de filtre « Devoirs ».
  useEffect(() => {
    if (!avecDevoirs && activeFilter === 'Devoirs') setActiveFilter('Tout');
  }, [avecDevoirs, activeFilter]);
  // ─── Vue « Devoirs » (lot 4a) : devoirs réels de l'enfant, par jour d'échéance ───
  const [devoirsReels, setDevoirsReels] = useState<Devoir[]>([]);
  const [auteursCoche, setAuteursCoche] = useState<AuteursCoche>({});
  const [erreurDevoirs, setErreurDevoirs] = useState<TypeErreur | null>(null);
  const [devoirsCharges, setDevoirsCharges] = useState(false);
  const [versionDevoirs, setVersionDevoirs] = useState(0);
  // Coches faites n'importe où (Accueil compris) : la semaine et la vue « Devoirs » se rechargent.
  const versionDevoirsPartagee = useVersionDevoirs(selectedChildId);
  // Absence signalée ou justifiée n'importe où : la semaine se recharge.
  const versionAbsencesPartagee = useVersionAbsences(selectedChildId);
  // Rendez-vous fixes (lot 4c) : rechargés à chaque création, modification ou coche.
  const versionRendezVousPartagee = useVersionRendezVous(selectedChildId);
  const [donneesRendezVous, setDonneesRendezVous] = useState<DonneesRendezVous | null>(null);
  const [rdvEnEdition, setRdvEnEdition] = useState<RendezVous | null>(null);
  const [rdvTitre, setRdvTitre] = useState('');
  const [rdvJour, setRdvJour] = useState(1);
  const [rdvAPrevoir, setRdvAPrevoir] = useState('');
  const [toutesLesSemaines, setToutesLesSemaines] = useState(false);
  const [aPrevoirNouveau, setAPrevoirNouveau] = useState('');
  const prenomEnfant = (selectedChild?.name ?? '').split(' ')[0];

  const isSelectedToday = useMemo(
    () => weekDays.find((d) => d.date === selectedDay)?.isToday ?? false,
    [weekDays, selectedDay],
  );

  // Calendar grid derived from currentMonth/currentYear
  const calendarGrid = useMemo(
    () => buildCalendarGrid(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  // All event dates for the current month (to show dots)
  const eventDatesSet = useMemo(() => {
    const set = new Set<string>();
    for (const [, events] of Object.entries(eventsByDay)) {
      if (events.length > 0) {
        // We derive which dates have events from weekDays
        weekDays.forEach((wd) => {
          if ((eventsByDay[wd.date]?.length ?? 0) > 0) {
            const key = `${wd.fullDate.getFullYear()}-${wd.fullDate.getMonth()}-${wd.date}`;
            set.add(key);
          }
        });
      }
    }
    return set;
  }, [eventsByDay, weekDays]);

  // Sync FlatList when selectedDay changes
  useEffect(() => {
    const idx = weekDays.findIndex((d) => d.date === selectedDay);
    if (idx >= 0) {
      isProgrammaticScroll.current = true;
      flatListRef.current?.scrollToIndex({ index: idx, animated: true });
    }
  }, [selectedDay, weekDays]);

  const selectDay = useCallback((dayInfo: (typeof weekDays)[0]) => {
    setSelectedDay(dayInfo.date);
    setSelectedFullDate(dayInfo.fullDate);
    setExpandedEvent(null);
    setCurrentMonth(dayInfo.fullDate.getMonth());
    setCurrentYear(dayInfo.fullDate.getFullYear());
  }, []);

  const goToToday = useCallback(() => {
    setWeekOffset(0);
    setSelectedDay(today.getDate());
    setSelectedFullDate(today);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setExpandedEvent(null);
  }, [today]);

  const toggleDone = useCallback((eventId: string) => {
    setEventsByDay((prev) => {
      const updated: Record<number, AgendaEvent[]> = {};
      for (const [day, events] of Object.entries(prev)) {
        updated[Number(day)] = events.map((e) =>
          e.id === eventId ? { ...e, done: !e.done } : e,
        );
      }
      if (isDemoMode) {
        demoToggleDone(eventId);
        signalerDevoirs(selectedChildId);
      } else if (!eventId.startsWith('local-') && selectedChildId) {
        const newDone = !Object.values(prev).flat().find((e) => e.id === eventId)?.done;
        // Échec (réseau coupé…) : la coche est annulée à l'écran et on le dit, jamais d'état faux silencieux.
        const annuler = () => {
          setEventsByDay((cur) => {
            const rev: Record<number, AgendaEvent[]> = {};
            for (const [d, evs] of Object.entries(cur)) rev[Number(d)] = evs.map((e) => (e.id === eventId ? { ...e, done: !newDone } : e));
            return rev;
          });
          Alert.alert('Non enregistré', 'La modification n’a pas pu être enregistrée (pas de connexion ?). Réessayez.');
        };
        cocherDevoir(eventId, newDone, selectedChildId).catch(annuler);
      }
      return updated;
    });
  }, [isDemoMode, demoToggleDone, selectedChildId]);

  // ─── Devoirs (lot 4a) ──────────────────────────────────
  // Démo : devoirs de l'Agenda de démo (dates relatives à aujourd'hui), coche en mémoire, « Coché par vous ».
  // Compte réel : devoirs « devoir » de l'enfant (devoirsService), coche enregistrée ; auteur et heure de la
  // coche posés par le serveur (M41). Jamais de tableau en dur.
  const devoirsDemo = useMemo((): Devoir[] => {
    if (!isDemoMode || !selectedChildId || !avecDevoirs) return [];
    return getDemoAgenda(selectedChildId)
      .filter((e) => e.type === 'devoir')
      .map((e) => {
        const coche = e.is_completed && e.coche_le ? new Date(e.coche_le) : null;
        return {
          id: e.id,
          titre: e.title,
          matiere: e.subject || undefined,
          jour: e.date,
          fait: !!e.is_completed,
          faitPar: coche ? MOI_DEMO : null,
          faitJour: coche ? jourParis(coche) : null,
          faitHeure: coche ? heureParis(coche) : null,
        };
      });
  }, [isDemoMode, selectedChildId, avecDevoirs, getDemoAgenda]);

  // Un enfant = un carnet : changer d'enfant vide la liste AVANT le chargement.
  const dernierEnfantDevoirs = useRef<string | null>(null);
  useEffect(() => {
    if (dernierEnfantDevoirs.current !== selectedChildId) {
      dernierEnfantDevoirs.current = selectedChildId ?? null;
      setDevoirsReels([]);
      setAuteursCoche({});
      setErreurDevoirs(null);
      setDevoirsCharges(false);
    }
    if (isDemoMode || !selectedChildId || !avecDevoirs || activeFilter !== 'Devoirs') return;
    let annule = false;
    (async () => {
      const [liste, auteurs] = await Promise.all([chargerDevoirs(selectedChildId), chargerAuteursCoche(selectedChildId)]);
      if (annule) return;
      setDevoirsReels(liste);
      setAuteursCoche(auteurs);
      setErreurDevoirs(null);
      setDevoirsCharges(true);
    })().catch((e) => {
      if (!annule) setErreurDevoirs(classerErreur(e));
    });
    return () => {
      annule = true;
    };
  }, [isDemoMode, selectedChildId, avecDevoirs, activeFilter, versionDevoirs, versionDevoirsPartagee]);

  const devoirs = isDemoMode ? devoirsDemo : devoirsReels;
  const auteursDevoirs = isDemoMode ? AUTEURS_DEMO : auteursCoche;
  const groupesDevoirs = useMemo(() => grouperDevoirs(devoirs, aujourdhuiParis(), demainParis()), [devoirs]);

  const basculerDevoir = useCallback((id: string) => {
    if (isDemoMode) {
      demoToggleDone(id);
      signalerDevoirs(selectedChildId);
      return;
    }
    const avant = devoirsReels.find((d) => d.id === id);
    if (!selectedChildId) return;
    if (!avant) return;
    const fait = !avant.fait;
    // Affiché tout de suite ; une fois enregistrée, la coche prévient le magasin partagé et la liste est relue
    // (devoirs ET coches : « Coché par vous · [heure] » vient de la base).
    setDevoirsReels((cur) => cur.map((d) => (d.id === id ? { ...d, fait, faitPar: null, faitJour: null, faitHeure: null } : d)));
    cocherDevoir(id, fait, selectedChildId)
      .catch(() => {
        setDevoirsReels((cur) => cur.map((d) => (d.id === id ? avant : d)));
        Alert.alert('Non enregistré', 'La modification n’a pas pu être enregistrée (pas de connexion ?). Réessayez.');
      });
  }, [isDemoMode, demoToggleDone, devoirsReels, selectedChildId]);

  // ─── Add event modal ───────────────────────────────────
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<NewEventType>('devoir');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (route.params?.openAddModal) {
      setAddModalVisible(true);
      navigation.setParams({ openAddModal: false } as any);
    }
  }, [route.params?.openAddModal]);

  const selectedDayLabel = weekDays.find((d) => d.date === selectedDay);

  // ─── Data loading ──────────────────────────────────────
  const loadEvents = useCallback(async () => {
    if (!selectedChildId) return;
    const computed = buildWeekDays(referenceDate);
    setWeekDays(computed);
    // Absences signalées (lot 4b) : une carte « Absence » chaque jour couvert.
    let absences: AbsenceLue[] = [];
    try {
      absences = await chargerAbsences(selectedChildId, isDemoMode);
    } catch (e) {
      setErreurAgenda(classerErreur(e));
      return;
    }
    // Rendez-vous fixes (lot 4c) : une carte au jour de la semaine, jamais pendant les vacances scolaires.
    let donneesRdv: DonneesRendezVous | null = null;
    try {
      donneesRdv = await chargerRendezVous(selectedChildId, isDemoMode);
    } catch (e) {
      setErreurAgenda(classerErreur(e));
      return;
    }
    setDonneesRendezVous(donneesRdv);
    const lundiSemaine = jourDeDate(computed[0].fullDate);
    const ajouterRendezVous = (grouped: Record<number, AgendaEvent[]>) => {
      if (!donneesRdv) return grouped;
      const d = donneesRdv;
      const auj = aujourdhuiParis();
      for (const o of occurrencesSemaine(d.rdvs, lundiSemaine, (j) => enVacances(j, d.zone), decalerJour)) {
        const jour = computed.find((c) => jourDeDate(c.fullDate) === o.jour);
        if (!jour) continue;
        const carte: AgendaEvent = {
          id: `rdv-${o.rdv.id}-${o.jour}`,
          title: o.rdv.titre,
          time: o.rdv.heure ? String(o.rdv.heure).slice(0, 5) : '',
          type: 'rendezvous',
          color: DEFAULT_COLOR.rendezvous,
          coche: recurrence(o.rdv.jour_semaine),
          rendezVous: {
            rdv: o.rdv,
            semaine: lundiSemaine,
            ajoutePar: ajoutePar(o.rdv.cree_par, d.noms),
            aPrevoir: etatAPrevoir(o.rdv, lundiSemaine, d.coches, d.auteursCoches, (id) => auteurCoche(id, d.noms), jourParisIso, heureParisIso,
              (x, a) => libelleCoche(x, a, auj, decalerJour(auj, -1))),
          },
        };
        grouped[jour.date] = trierJournee([...(grouped[jour.date] ?? []), carte]);
      }
      return grouped;
    };
    const ajouterAbsences = (grouped: Record<number, AgendaEvent[]>) => {
      ajouterRendezVous(grouped);
      for (const jour of computed) {
        const iso = jourDeDate(jour.fullDate);
        for (const a of absences.filter((x) => couvreJour(x, iso))) {
          const carte: AgendaEvent = {
            id: `absence-${a.id}-${iso}`,
            title: `Absence ${de(prenomEnfant)}`,
            time: '',
            type: 'absence',
            description: a.commentaire ?? undefined,
            color: DEFAULT_COLOR.absence,
            absence: { id: a.id, aJustifier: peutJustifier(a) },
            coche: texteCarteAbsence(a),
          };
          grouped[jour.date] = trierJournee([...(grouped[jour.date] ?? []), carte]);
        }
      }
      return grouped;
    };

    setSelectedDay((prev) => {
      const isCurrentWeek = computed.some((d) => d.isToday);
      if (isCurrentWeek) {
        const todayInWeek = computed.find((d) => d.isToday);
        return todayInWeek ? todayInWeek.date : computed[0].date;
      }
      const stillValid = computed.find((d) => d.date === prev);
      return stillValid ? prev : computed[0].date;
    });

    // Sync selectedFullDate too
    setSelectedFullDate((prev) => {
      const isCurrentWeek = computed.some((d) => d.isToday);
      if (isCurrentWeek) {
        return computed.find((d) => d.isToday)?.fullDate ?? prev;
      }
      return computed.find((d) => d.fullDate.getTime() === prev.getTime())?.fullDate ?? computed[0].fullDate;
    });

    if (isDemoMode) {
      const grouped: Record<number, AgendaEvent[]> = {};
      for (let i = 0; i < 7; i++) {
        const dayDate = computed[i].fullDate;
        const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
        // Devoirs : dès le CP, jamais en maternelle. Créneaux de cours : collège / lycée seulement
        // (en primaire, la journée type est dans « Emploi du temps »).
        const demoEvents = getDemoAgendaRef.current(selectedChildId, dateStr).filter(
          (ev) => (avecDevoirs || ev.type !== 'devoir') && (avecCours || ev.type !== 'cours'),
        );
        if (demoEvents.length > 0) {
          grouped[computed[i].date] = trierJournee(demoEvents.map((e) => ({
            id: e.id,
            title: e.title,
            time: e.startTime,
            endTime: e.endTime || undefined,
            type: (e.type || 'cours') as AgendaEvent['type'],
            subject: e.subject || undefined,
            location: e.room || undefined,
            description: e.description || undefined,
            color: e.color || Colors.violet,
            done: e.is_completed ?? false,
            coche: e.type === 'devoir'
              ? libelleCoche(
                { fait: !!e.is_completed, faitJour: e.coche_le ? jourParisIso(e.coche_le) : null, faitHeure: e.coche_le ? heureParisIso(e.coche_le) : null },
                e.coche_le ? 'vous' : null, aujourdhuiParis(), decalerJour(aujourdhuiParis(), -1),
              )
              : null,
          })));
        }
      }
      ajouterAbsences(grouped);
      setEventsByDay(Object.keys(grouped).length === 0 ? {} : grouped);
      return;
    }

    const monday = computed[0].fullDate;
    const sunday = computed[6].fullDate;

    let result: Awaited<ReturnType<typeof getAgendaEvents>> | null = null;
    try {
      result = await getAgendaEvents(selectedChildId, {
        startDate: bornesParis(jourDeDate(monday), jourDeDate(sunday)).debut,
        endDate: bornesParis(jourDeDate(monday), jourDeDate(sunday)).fin,
      });
    } catch (e) {
      setErreurAgenda(classerErreur(e));
      return;
    }
    // Échec de chargement ≠ « journée libre » : message + « Réessayer » (les événements déjà affichés restent).
    if (result?.error) {
      setErreurAgenda(classerErreur(result.error));
      return;
    }
    setErreurAgenda(null);
    const rows = result?.data ?? [];
    if (rows.length === 0) { setEventsByDay(ajouterAbsences({})); return; }
    // Règle du 21 nov. : un événement se modifie dans le foyer de son auteur (la base l'impose, M41).
    const responsablesFoyer = await chargerResponsablesFoyer(selectedChildId).catch(() => [] as ResponsableFoyer[]);
    let lignesSource = new Map<string, string | null>();
    try {
      lignesSource = await chargerLignesSource(selectedChildId, rows as any[]);
    } catch (e) {
      setErreurAgenda(classerErreur(e));
      return;
    }

    const grouped: Record<number, AgendaEvent[]> = {};
    for (const row of rows) {
      // Jour et heure de l'événement en heure de Paris (lot 4 A4), quel que soit le fuseau du téléphone.
      const d = new Date(row.start_time);
      const dayNum = Number(jourParis(d).slice(8, 10));
      const [hh, mm] = heureParis(d).split(':');
      const finParis = row.end_time ? heureParis(new Date(row.end_time)).split(':') : null;
      const endHH = finParis ? finParis[0] : undefined;
      const endMM = finParis ? finParis[1] : undefined;
      const type = (row.event_type ?? 'cours') as AgendaEvent['type'];
      if ((type === 'cours' && !avecCours) || (type === 'devoir' && !avecDevoirs)) continue;
      const mapped: AgendaEvent = {
        id: row.id, title: row.title,
        time: `${hh}:${mm}`,
        endTime: endHH ? `${endHH}:${endMM}` : undefined,
        type, subject: row.subject,
        location: row.location, description: row.description,
        color: row.color ?? DEFAULT_COLOR[type] ?? Colors.violet,
        done: row.is_done ?? false,
        coche: type === 'devoir' ? lignesSource.get(String(row.id)) ?? null : null,
        modifiable: modifiableParMonFoyer(row.parent_id, user?.id, responsablesFoyer),
        jourIso: jourParis(d),
      };
      if (!grouped[dayNum]) grouped[dayNum] = [];
      grouped[dayNum].push(mapped);
    }
    for (const jour of Object.keys(grouped)) grouped[Number(jour)] = trierJournee(grouped[Number(jour)]);
    setEventsByDay(ajouterAbsences(grouped));
  }, [selectedChildId, referenceDate, isDemoMode, avecDevoirs, avecCours, versionDevoirsPartagee, versionAbsencesPartagee, versionRendezVousPartagee, user?.id, prenomEnfant]);

  const filtrePrecedent = useRef(activeFilter);
  useEffect(() => {
    if (filtrePrecedent.current === 'Devoirs' && activeFilter !== 'Devoirs') loadEvents();
    filtrePrecedent.current = activeFilter;
  }, [activeFilter, loadEvents]);

  // Un enfant = un carnet : changer d'enfant vide l'agenda AVANT le chargement (un échec ne montre jamais les
  // événements d'un autre enfant). Même enfant, autre semaine ou nouvel essai : les événements affichés restent.
  const dernierEnfantAgenda = useRef<string | null>(null);
  useEffect(() => {
    if (dernierEnfantAgenda.current !== selectedChildId) {
      dernierEnfantAgenda.current = selectedChildId ?? null;
      setEventsByDay({});
      setErreurAgenda(null);
    }
    loadEvents();
  }, [loadEvents, selectedChildId]);

  const openAddModal = useCallback(() => {
    if (childLoading) {
      Alert.alert('Chargement', 'Les données sont en cours de chargement, veuillez patienter.');
      return;
    }
    setNewEventTitle('');
    setNewEventType('devoir');
    setToutesLesSemaines(false);
    setAPrevoirNouveau('');
    setAddModalVisible(true);
  }, [selectedChild, selectedChildId, childLoading]);

  const handleCreateEvent = useCallback(async () => {
    if (!newEventTitle.trim()) {
      Alert.alert('Titre requis', 'Veuillez saisir un titre pour l\'événement.');
      return;
    }
    const currentChildId = selectedChild?.id ?? null;
    // « Toutes les semaines » (lot 4c) : un rendez-vous fixe, le jour de la semaine du jour choisi.
    if (toutesLesSemaines && currentChildId) {
      const jourChoisi = weekDays.find((d) => d.date === selectedDay)?.fullDate ?? dateAujourdhuiParis();
      setIsSaving(true);
      try {
        await creerRendezVous(currentChildId, {
          titre: newEventTitle.trim().slice(0, 80),
          jourSemaine: jourSemaine(jourDeDate(jourChoisi)),
          aPrevoir: listeAPrevoir(aPrevoirNouveau),
        }, isDemoMode);
        setAddModalVisible(false);
      } catch (e) {
        Alert.alert('Rendez-vous non créé', e instanceof ErreurRendezVous ? e.message : 'Le rendez-vous n’a pas pu être enregistré. Réessayez.');
      } finally {
        setIsSaving(false);
      }
      return;
    }
    // Compte réel (jamais la démo) avec un enfant actif.
    const isReal = !!currentChildId && !isDemoMode;

    const selectedDayInfo = weekDays.find((d) => d.date === selectedDay);
    const dayDate = selectedDayInfo?.fullDate ?? dateAujourdhuiParis();
    dayDate.setHours(8, 0, 0, 0);

    const typeMap: Record<NewEventType, AgendaEvent['type']> = {
      devoir: 'devoir', controle: 'examen', sortie: 'sortie', autre: 'activite',
    };

    setIsSaving(true);
    try {
      if (isReal && currentChildId && user?.id) {
        const result = await createAgendaEvent({
          child_id: currentChildId,
          parent_id: user.id,
          title: newEventTitle.trim(),
          event_type: typeMap[newEventType],
          start_time: dayDate.toISOString(),
        });
        if (result?.error) {
          Alert.alert(
            'Événement non créé',
            classerErreur(result.error) === 'reseau'
              ? 'Pas de connexion : l’événement n’a pas été enregistré. Réessayez quand le réseau est revenu.'
              : 'L’événement n’a pas pu être enregistré. Réessayez dans un instant.',
          );
          return;
        }
        await loadEvents();
      } else {
        const hh = dayDate.getHours().toString().padStart(2, '0');
        const localEvent: AgendaEvent = {
          modifiable: true,
          jourIso: jourDeDate(dayDate),
          id: `local-${Date.now()}`,
          title: newEventTitle.trim(),
          time: `${hh}h00`,
          type: typeMap[newEventType],
          color: DEFAULT_COLOR[typeMap[newEventType]] ?? '#4338CA',
        };
        setEventsByDay((prev) => ({
          ...prev,
          [selectedDay]: trierJournee([...(prev[selectedDay] ?? []), localEvent]),
        }));
      }
      setAddModalVisible(false);
    } finally {
      setIsSaving(false);
    }
  }, [newEventTitle, newEventType, selectedChild, selectedChildId, user, selectedDay, weekDays, loadEvents, toutesLesSemaines, aPrevoirNouveau, isDemoMode]);

  // ─── Calendar panel: toggle with LayoutAnimation ───────
  const toggleCalendar = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCalendarOpen((v) => !v);
  }, []);

  // ─── Calendar grid: tap a day ──────────────────────────
  const selectCalendarDay = useCallback((fullDate: Date) => {
    const dayOfWeek = fullDate.getDay(); // 0=Sun
    const weekContainingDay = buildWeekDays(fullDate);
    setWeekDays(weekContainingDay);
    // Semaine de référence = celle du jour choisi : sinon les événements restent ceux de la semaine en cours.
    const semaines = Math.round(
      (getMondayOfWeek(fullDate).getTime() - getMondayOfWeek(dateAujourdhuiParis()).getTime()) / (7 * 86400000),
    );
    setWeekOffset(semaines);

    const dayNum = fullDate.getDate();
    setSelectedDay(dayNum);
    setSelectedFullDate(fullDate);
    setCurrentMonth(fullDate.getMonth());
    setCurrentYear(fullDate.getFullYear());
    setExpandedEvent(null);

    // Scroll FlatList to correct index
    const idx = weekContainingDay.findIndex((d) => d.date === dayNum);
    if (idx >= 0) {
      isProgrammaticScroll.current = true;
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: idx, animated: false });
      }, 50);
    }

    // Close calendar
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCalendarOpen(false);
  }, []);

  // ─── Vue « Devoirs » (lot 4a, COMPONENTS §18.6) ─────────
  // Par jour d'échéance, « Pour demain » en premier ; ligne = case ronde 22 + pastille de discipline 34 +
  // intitulé ; sous un devoir coché, sa ligne source « Coché par [prénom] · [heure] ».
  const renderHomeworkView = () => {
    const aujourdhui = aujourdhuiParis();
    const hier = decalerJour(aujourdhui, -1);
    const reste = resteAFaire(groupesDevoirs);
    const chargement = !isDemoMode && !devoirsCharges && !erreurDevoirs;
    return (
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: getBottomBarScrollPadding(insets.bottom),
        }}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
      >
        {erreurDevoirs ? (
          <EtatErreur type={erreurDevoirs} onReessayer={() => setVersionDevoirs((v) => v + 1)} />
        ) : chargement ? null : groupesDevoirs.length === 0 ? (
          <View style={st.emptyState}>
            <Text style={st.hwVide}>Aucun devoir à venir.</Text>
          </View>
        ) : (
          <>
            <Text style={st.hwStats}>{reste === 0 ? 'Tout est fait.' : `${reste} à faire`}</Text>
            {groupesDevoirs.map((g) => (
              <View key={g.jour}>
                <Text style={st.hwSectionLabel}>{g.titre}</Text>
                {g.devoirs.map((d) => {
                  const source = libelleCoche(d, auteurCoche(d.faitPar, auteursDevoirs), aujourdhui, hier);
                  return (
                    <View key={d.id} style={st.hwRow}>
                      <HomeworkCheckbox done={d.fait} onPress={() => basculerDevoir(d.id)} label={d.titre} />
                      <View style={st.hwPastille}>
                        <PastilleCategorie categorie={categorieDiscipline(d.matiere ?? d.titre)} taille={34} rayon={11} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[st.hwTitle, d.fait && st.hwTitleFait]}>{d.titre}</Text>
                        {d.matiere ? <Text style={st.hwMeta}>{d.matiere}</Text> : null}
                        {source ? <Text style={st.hwSource}>{source}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </>
        )}
      </Animated.ScrollView>
    );
  };

  // ─── Render event card ─────────────────────────────────
  // ─── Modifier / supprimer un événement créé par mon foyer (règle du 21 nov.) ───
  const [evtEdition, setEvtEdition] = useState<{ id: string; titre: string; type: NewEventType; jour: string; heure: string } | null>(null);
  const ouvrirEdition = (event: AgendaEvent) => {
    const type: NewEventType = event.type === 'devoir' ? 'devoir' : event.type === 'examen' ? 'controle' : event.type === 'sortie' ? 'sortie' : 'autre';
    setEvtEdition({ id: event.id, titre: event.title, type, jour: event.jourIso ?? aujourdhuiParis(), heure: /^\d{2}:\d{2}$/.test(event.time) ? event.time : '08:00' });
  };
  const typeBase: Record<NewEventType, AgendaEvent['type']> = { devoir: 'devoir', controle: 'examen', sortie: 'sortie', autre: 'activite' };
  const enregistrerEdition = async () => {
    if (!evtEdition || !evtEdition.titre.trim() || !selectedChildId) return;
    const [h, m] = evtEdition.heure.split(':').map(Number);
    const debut = new Date(minuitParis(evtEdition.jour).getTime() + (h * 60 + m) * 60000).toISOString();
    try {
      if (evtEdition.id.startsWith('local-')) {
        // Démo : événement de la session, en mémoire seulement.
        setEventsByDay((prev) => {
          const sans: Record<number, AgendaEvent[]> = {};
          let ancien: AgendaEvent | undefined;
          for (const [j, evs] of Object.entries(prev)) {
            ancien = ancien ?? evs.find((x) => x.id === evtEdition.id);
            sans[Number(j)] = evs.filter((x) => x.id !== evtEdition.id);
          }
          const jourNum = Number(evtEdition.jour.slice(8, 10));
          const maj: AgendaEvent = { ...(ancien as AgendaEvent), title: evtEdition.titre.trim(), type: typeBase[evtEdition.type], jourIso: evtEdition.jour };
          return { ...sans, [jourNum]: trierJournee([...(sans[jourNum] ?? []), maj]) };
        });
      } else {
        await modifierEvenement(evtEdition.id, selectedChildId, { title: evtEdition.titre.trim(), event_type: typeBase[evtEdition.type], start_time: debut });
        loadEvents();
      }
      setEvtEdition(null);
    } catch (e) {
      Alert.alert('Non enregistré', e instanceof ErreurEvenement ? e.message : 'Modification impossible. Réessayez.');
    }
  };
  const supprimerEdition = () => {
    const ev = evtEdition;
    if (!ev || !selectedChildId) return;
    Alert.alert('Supprimer cet événement ?', `« ${ev.titre} » sera retiré de l’Agenda.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            if (ev.id.startsWith('local-')) {
              setEventsByDay((prev) => Object.fromEntries(Object.entries(prev).map(([j, evs]) => [j, evs.filter((x) => x.id !== ev.id)])));
            } else {
              await supprimerEvenement(ev.id, selectedChildId);
              loadEvents();
            }
            setEvtEdition(null);
          } catch (e) {
            Alert.alert('Non supprimé', e instanceof ErreurEvenement ? e.message : 'Suppression impossible. Réessayez.');
          }
        },
      },
    ]);
  };

  const ouvrirRendezVous = (rdv: RendezVous) => {
    setRdvEnEdition(rdv);
    setRdvTitre(rdv.titre);
    setRdvJour(rdv.jour_semaine);
    setRdvAPrevoir(rdv.a_prevoir.join(', '));
  };
  const enregistrerRendezVous = async () => {
    if (!rdvEnEdition || !rdvTitre.trim()) return;
    try {
      await modifierRendezVous(rdvEnEdition, { titre: rdvTitre.trim().slice(0, 80), jourSemaine: rdvJour, aPrevoir: listeAPrevoir(rdvAPrevoir) }, isDemoMode);
      setRdvEnEdition(null);
    } catch (e) {
      Alert.alert('Non enregistré', e instanceof ErreurRendezVous ? e.message : 'Modification impossible. Réessayez.');
    }
  };
  const supprimerRdv = () => {
    const rdv = rdvEnEdition;
    if (!rdv) return;
    Alert.alert('Supprimer ce rendez-vous ?', `« ${libelleRendezVous(rdv)} » sera retiré de l’Agenda pour toutes les semaines.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await supprimerRendezVous(rdv, isDemoMode);
            setRdvEnEdition(null);
          } catch (e) {
            Alert.alert('Non supprimé', e instanceof ErreurRendezVous ? e.message : 'Suppression impossible. Réessayez.');
          }
        },
      },
    ]);
  };

  const renderEventCard = (event: AgendaEvent, jour: Date) => {
    if (event.type === 'rendezvous' && event.rendezVous) {
      const r = event.rendezVous;
      return (
        <View key={event.id} style={[st.eventCard, { borderLeftColor: event.color, backgroundColor: withAlpha(event.color, 0.08) }]}>
          {/* Modifier / supprimer : foyer de l'auteur seulement (règle du 21 nov.) ; un parent séparé ne voit pas l'action. */}
          <Pressable
            onPress={() => ouvrirRendezVous(r.rdv)}
            disabled={!r.rdv.peut_modifier}
            accessibilityRole={r.rdv.peut_modifier ? 'button' : undefined}
            accessibilityLabel={r.rdv.peut_modifier ? `Modifier ${libelleRendezVous(r.rdv)}` : libelleRendezVous(r.rdv)}
          >
            <Text style={st.eventCategorie}>Rendez-vous fixe</Text>
            <Text style={st.eventTitle}>{event.title}</Text>
            <Text style={st.eventMeta}>{[event.time, event.coche].filter(Boolean).join(' · ')}</Text>
            {r.ajoutePar ? <Text style={st.eventSource}>{r.ajoutePar}</Text> : null}
            {r.rdv.peut_modifier ? <Text style={st.rdvModifier}>Modifier</Text> : null}
          </Pressable>
          {r.aPrevoir.length > 0 ? (
            <View style={st.rdvListe}>
              <Text style={st.eventCategorie}>À prévoir</Text>
              {r.aPrevoir.map((p) => (
                <Pressable
                  key={p.item}
                  onPress={() => cocherAPrevoir(r.rdv, r.semaine, p.item, !p.coche, isDemoMode)
                    .catch((e) => Alert.alert('Non enregistré', e instanceof ErreurRendezVous ? e.message : 'La coche n’a pas pu être enregistrée. Réessayez.'))}
                  style={st.rdvItem}
                  hitSlop={6}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: p.coche }}
                  accessibilityLabel={p.item}
                >
                  <View style={p.coche ? st.hwCheckFilled : st.hwCheckEmpty}>
                    {p.coche ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[st.rdvItemTexte, p.coche && { color: 'rgba(15,23,42,0.45)' }]}>{p.item}</Text>
                    {p.source ? <Text style={st.eventSource}>{p.source}</Text> : null}
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      );
    }
    if (event.type === 'absence') {
      const justifier = event.absence?.aJustifier;
      return (
        <TouchableOpacity
          key={event.id}
          disabled={!justifier}
          onPress={() => navigation.navigate('MainPager', { screen: 'MessagerieTab', params: { screen: 'SignalerAbsence', params: { absenceId: event.absence?.id }, initial: false } })}
          activeOpacity={0.8}
          accessibilityRole={justifier ? 'button' : undefined}
          style={[st.eventCard, { borderLeftColor: event.color, backgroundColor: withAlpha(event.color, 0.08) }]}
        >
          <View style={st.eventInner}>
            <View style={{ flex: 1 }}>
              <Text style={st.eventCategorie}>Absence</Text>
              <Text style={st.eventTitle}>{event.title}</Text>
              <Text style={st.eventMeta}>{event.coche}</Text>
              {justifier ? <Text style={st.eventSource}>À justifier · ajouter un justificatif</Text> : null}
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    const isExam = event.type === 'examen';
    const isDevoir = event.type === 'devoir';
    // Maternelle / primaire : « Évaluation », tag neutre (jamais « Examen », jamais rouge).
    // Collège / lycée : inchangé.
    const evaluationPremierDegre = isExam && !avecCours;
    // Devoir : une échéance, jamais « 08:30 — 08:30 ». Autres : horaire (et lieu).
    const quand = isDevoir
      ? echeanceDevoir(jour)
      : event.endTime && event.endTime !== event.time ? `${event.time} — ${event.endTime}` : event.time;

    return (
      <TouchableOpacity
        key={event.id}
        onPress={() =>
          event.modifiable && !['cours', 'absence', 'rendezvous'].includes(event.type) ? ouvrirEdition(event) :
          navigation.navigate('EventDetail', {
            eventId: event.id,
            eventTitle: event.title,
            eventCategory: evaluationPremierDegre ? 'Évaluation' : TYPE_LABELS[event.type] ?? event.type,
            eventTime: quand,
            eventLocation: event.location,
            eventDescription: event.description,
          })
        }
        activeOpacity={0.8}
        style={[
          st.eventCard,
          { borderLeftColor: event.color, backgroundColor: withAlpha(event.color, 0.08) },
          isDevoir && event.done && { opacity: 0.55 },
        ]}
      >
        <View style={st.eventInner}>
          {/* Title + time */}
          <View style={{ flex: 1 }}>
            <Text
              style={[
                st.eventTitle,
                isDevoir && event.done && { textDecorationLine: 'line-through', color: '#94A3B8' },
              ]}
            >
              {event.title}
            </Text>
            <Text style={st.eventMeta}>
              {quand}{event.location ? ` · ${event.location}` : ''}
            </Text>
            {event.modifiable && !['cours', 'absence', 'rendezvous'].includes(event.type) ? <Text style={st.rdvModifier}>Modifier</Text> : null}
            {isDevoir && event.done && event.coche ? <Text style={st.eventSource}>{event.coche}</Text> : null}
          </View>

          {/* Right: exam badge or devoir checkbox */}
          {isExam && (
            <View style={evaluationPremierDegre ? st.evalBadge : st.examBadge}>
              <Text style={evaluationPremierDegre ? st.evalBadgeText : st.examBadgeText}>
                {evaluationPremierDegre ? 'Évaluation' : 'Examen'}
              </Text>
            </View>
          )}
          {isDevoir && (
            <AnimatedCheckbox
              done={event.done ?? false}
              onPress={() => toggleDone(event.id)}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Render day page ───────────────────────────────────
  const renderDayPage = ({ item }: { item: (typeof weekDays)[0] }) => {
    const dayEvents = eventsByDay[item.date] ?? [];
    const dayEventCount = dayEvents.length;

    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
        {/* Day title row */}
        <View style={st.dayTitleRow}>
          <Text style={st.dayTitleText}>
            {formatDateFR(item.fullDate).replace(/^./, (c) => c.toUpperCase())}
          </Text>
          <Text style={st.dayEventCount}>
            {dayEventCount > 0 ? `${dayEventCount} événement${dayEventCount > 1 ? 's' : ''}` : erreurAgenda ? '' : 'Libre'}
          </Text>
        </View>

        <Animated.ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: getBottomBarScrollPadding(insets.bottom),
          }}
          nestedScrollEnabled
        >
          {erreurAgenda && <EtatErreur type={erreurAgenda} onReessayer={loadEvents} compact />}
          {dayEvents.length === 0 && erreurAgenda ? null : dayEvents.length === 0 ? (
            <View style={st.emptyState}>
              <View style={st.emptyIconWrap}>
                <CalendarCheck size={32} color="rgba(15,23,42,0.35)" strokeWidth={1.8} />
              </View>
              <Text style={st.emptyTitle}>Journée libre</Text>
              <Text style={st.emptySubtitle}>Rien de prévu ce jour</Text>
            </View>
          ) : (
            dayEvents.map((event) => renderEventCard(event, item.fullDate))
          )}
        </Animated.ScrollView>
      </View>
    );
  };

  // ─── Derived: selected day event count ────────────────
  const dayEventCount = (eventsByDay[selectedDay] ?? []).length;

  // ─── Week strip swipe handler ──────────────────────────
  const stripSwipeStartX = useRef(0);
  const stripSwipeDayStart = useRef(0);

  const stripPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onMoveShouldSetPanResponderCapture: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderGrant: (_, g) => {
        stripSwipeStartX.current = g.x0;
      },
      onPanResponderRelease: (_, g) => {
        const threshold = 30;
        if (g.dx < -threshold) {
          setSelectedDay((prev) => {
            const idx = weekDays.findIndex((d) => d.date === prev);
            if (idx < weekDays.length - 1) {
              const next = weekDays[idx + 1];
              setSelectedFullDate(next.fullDate);
              setCurrentMonth(next.fullDate.getMonth());
              setCurrentYear(next.fullDate.getFullYear());
              return next.date;
            }
            return prev;
          });
        } else if (g.dx > threshold) {
          setSelectedDay((prev) => {
            const idx = weekDays.findIndex((d) => d.date === prev);
            if (idx > 0) {
              const prev2 = weekDays[idx - 1];
              setSelectedFullDate(prev2.fullDate);
              setCurrentMonth(prev2.fullDate.getMonth());
              setCurrentYear(prev2.fullDate.getFullYear());
              return prev2.date;
            }
            return prev;
          });
        }
      },
    })
  ).current;

  // ─── Render ────────────────────────────────────────────
  return (
    <View style={st.root}>
      {/* Content starts at safe area top */}
      <View style={{ paddingTop: insets.top + 64 + 12 }}>

        {/* 1. Month title (tappable) + bouton Emploi du temps */}
        <View style={st.monthTitleWrapper}>
          <Pressable
            onPress={toggleCalendar}
            style={st.monthTitleRow}
          >
            <Text style={st.monthName}>{FRENCH_MONTH_NAMES_FULL[currentMonth]}</Text>
            <Text style={st.yearText}>{currentYear}</Text>
            <ChevronDown
              size={18}
              color="#94A3B8"
              style={{ transform: [{ rotate: calendarOpen ? '180deg' : '0deg' }] }}
            />
          </Pressable>
        </View>
        {/* Ligne dédiée : « Septembre 2026 ⌄ » + le bouton ne tiennent pas sur 393 dp (Redmi).
            Zone tactile 44 px (pill visible de 30 px centrée dedans). */}
        {aUnEmploiDuTemps(selectedChild?.cycle) && (
          <View style={st.timetableRow}>
            <Pressable
              onPress={() => navigation.navigate('Timetable')}
              accessibilityRole="button"
              style={({ pressed }) => [st.timetableHit, pressed && { opacity: 0.6 }]}
            >
              <View style={st.timetableBtn}>
                <Text style={st.timetableBtnText}>Emploi du temps</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* 2. Collapsible calendar panel */}
        {calendarOpen && (
          <View style={st.calendarPanel}>
            {/* Horizontal month scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={st.monthScrollContent}
            >
              {FRENCH_MONTH_NAMES_FULL.map((name, idx) => {
                const isActive = idx === currentMonth;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setCurrentMonth(idx);
                    }}
                    style={[
                      st.monthPill,
                      isActive && { backgroundColor: '#0F172A' },
                    ]}
                  >
                    <Text style={[
                      st.monthPillText,
                      isActive ? st.monthPillTextActive : st.monthPillTextInactive,
                    ]}>
                      {SHORT_MONTHS[idx]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Calendar grid */}
            <View style={st.calendarGridCard}>
              {/* Header: L M M J V S D */}
              <View style={st.calendarHeaderRow}>
                {WEEK_LETTERS.map((letter, i) => (
                  <View key={i} style={st.calendarHeaderCell}>
                    <Text style={st.calendarHeaderText}>{letter}</Text>
                  </View>
                ))}
              </View>

              {/* Day rows */}
              {calendarGrid.map((row, rowIdx) => (
                <View key={rowIdx} style={st.calendarRow}>
                  {row.map((cell, colIdx) => {
                    const isToday =
                      cell.isCurrentMonth &&
                      cell.fullDate.getDate() === today.getDate() &&
                      cell.fullDate.getMonth() === today.getMonth() &&
                      cell.fullDate.getFullYear() === today.getFullYear();
                    const isSelected =
                      cell.isCurrentMonth &&
                      cell.fullDate.getDate() === selectedDay &&
                      cell.fullDate.getMonth() === selectedFullDate.getMonth() &&
                      cell.fullDate.getFullYear() === selectedFullDate.getFullYear();
                    const hasEvents =
                      cell.isCurrentMonth &&
                      eventDatesSet.has(`${cell.fullDate.getFullYear()}-${cell.fullDate.getMonth()}-${cell.day}`);

                    return (
                      <Pressable
                        key={colIdx}
                        style={st.calendarCell}
                        onPress={() => cell.isCurrentMonth && selectCalendarDay(cell.fullDate)}
                      >
                        <View style={[
                          st.calendarDayCircle,
                          isSelected && { backgroundColor: '#0F172A' },
                        ]}>
                          <Text style={[
                            st.calendarDayText,
                            !cell.isCurrentMonth && st.calendarDayOtherMonth,
                            isToday && !isSelected && { color: '#4338CA', fontFamily: FontFamily.displayBold },
                            isSelected && { color: '#FFFFFF', fontFamily: FontFamily.displayBold },
                          ]}>
                            {cell.day}
                          </Text>
                        </View>
                        {hasEvents && !isSelected && (
                          <View style={st.calendarDot} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 3. Week day strip */}
        <View style={st.weekStrip} {...stripPan.panHandlers}>
          {weekDays.map((day) => {
            const isSelected = day.date === selectedDay &&
              day.fullDate.getMonth() === selectedFullDate.getMonth();
            const isToday = day.isToday && !isSelected;
            const hasEvents = (eventsByDay[day.date]?.length ?? 0) > 0;

            return (
              <Pressable
                key={`${day.date}-${day.fullDate.getMonth()}`}
                onPress={() => selectDay(day)}
                hitSlop={{ left: 4, right: 4 }} // 36 → 44 dp de large (≈ 15 dp d'écart entre deux jours : aucun chevauchement)
                style={st.weekStripDay}
              >
                <Text style={st.weekStripLetter}>{day.day[0]}</Text>
                <View style={[
                  st.weekStripCircle,
                  isSelected && { backgroundColor: '#0F172A' },
                ]}>
                  <Text style={[
                    st.weekStripNumber,
                    isSelected && { color: '#FFFFFF', fontFamily: FontFamily.displayBold },
                    isToday && { color: '#4338CA' },
                    !isSelected && !isToday && { color: '#0F172A' },
                  ]}>
                    {day.date}
                  </Text>
                </View>
                {hasEvents && !isSelected && <View style={st.weekStripDot} />}
                {!hasEvents && <View style={{ width: 4, height: 4 }} />}
              </Pressable>
            );
          })}
        </View>

        {/* Today button (when not on today) */}
        {!isSelectedToday && (
          <TouchableOpacity onPress={goToToday} style={st.todayBtn}>
            <Text style={st.todayBtnText}>Aujourd'hui</Text>
          </TouchableOpacity>
        )}

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.filterPillsContent}
          style={st.filterPillsRow}
        >
          {filtres.map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveFilter(tab)}
                hitSlop={{ top: 7, bottom: 7 }}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Filtre ${tab}`}
                style={[st.filterPill, isActive && st.filterPillActive]}
              >
                <Text style={[st.filterPillText, isActive && st.filterPillTextActive]}>
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. Devoirs view OR swipeable day pages */}
      {activeFilter === 'Devoirs' && avecDevoirs ? renderHomeworkView() : (
      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={weekDays}
        keyExtractor={(d) => `${d.date}-${d.fullDate.getMonth()}`}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onMomentumScrollEnd={(e) => {
          if (isProgrammaticScroll.current) {
            isProgrammaticScroll.current = false;
            return;
          }
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          const day = weekDays[idx];
          if (!day) return;
          setExpandedEvent(null);
          setSelectedDay(day.date);
          setSelectedFullDate(day.fullDate);
          setCurrentMonth(day.fullDate.getMonth());
          setCurrentYear(day.fullDate.getFullYear());
        }}
        onScrollBeginDrag={() => {
          isProgrammaticScroll.current = false;
        }}
        renderItem={renderDayPage}
        style={[
          { flex: 1 },
          Platform.OS === 'android' && { zIndex: 0, elevation: 0 },
        ]}
      />
      )}

      {/* ─── Add Event Modal ─────────────────────────────── */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={st.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => { Keyboard.dismiss(); setAddModalVisible(false); }}
          />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={st.modalContent}>
              <View style={st.modalHandle} />
              <Text style={st.modalTitle}>Nouvel événement</Text>

              {/* Date indicator */}
              <View style={st.modalDateRow}>
                <CalendarDays size={20} color="rgba(15,23,42,0.55)" strokeWidth={2} />
                <Text style={st.modalDateText}>
                  {selectedDayLabel?.day} {selectedDay} {selectedDayLabel?.month}
                </Text>
              </View>

              {/* Title input */}
              <TextInput
                value={newEventTitle}
                onChangeText={setNewEventTitle}
                placeholder="Ex: Contrôle de maths, Sortie scolaire…"
                placeholderTextColor="#94A3B8"
                autoFocus
                style={st.modalInput}
              />

              {/* « Toutes les semaines » (lot 4c) : rendez-vous fixe, le même jour chaque semaine */}
              <Pressable
                onPress={() => setToutesLesSemaines((v) => !v)}
                style={st.rdvOption}
                accessibilityRole="switch"
                accessibilityState={{ checked: toutesLesSemaines }}
              >
                <Text style={st.rdvOptionTexte}>
                  {toutesLesSemaines ? recurrence(jourSemaine(jourDeDate(weekDays.find((d) => d.date === selectedDay)?.fullDate ?? dateAujourdhuiParis()))) : 'Toutes les semaines'}
                </Text>
                <View style={[st.interrupteur, toutesLesSemaines && st.interrupteurActif]}>
                  <View style={[st.pastille, toutesLesSemaines && { alignSelf: 'flex-end' }]} />
                </View>
              </Pressable>
              {toutesLesSemaines ? (
                <TextInput
                  value={aPrevoirNouveau}
                  onChangeText={setAPrevoirNouveau}
                  placeholder="À prévoir (facultatif) : maillot, bonnet…"
                  placeholderTextColor="#94A3B8"
                  style={st.modalInput}
                />
              ) : null}

              {/* Type selector */}
              {toutesLesSemaines ? null : (
              <View style={st.modalTypeRow}>
                {(Object.keys(NEW_EVENT_TYPE_LABELS) as NewEventType[]).map((type) => {
                  const isActive = newEventType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setNewEventType(type)}
                      style={[
                        st.modalTypePill,
                        isActive && st.modalTypePillActive,
                      ]}
                    >
                      <Text style={[st.modalTypeText, isActive && st.modalTypeTextActive]}>
                        {NEW_EVENT_TYPE_LABELS[type]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              )}

              {/* Actions */}
              <View style={st.modalActions}>
                <Pressable onPress={() => setAddModalVisible(false)} style={st.cancelBtn}>
                  <Text style={st.cancelText}>Annuler</Text>
                </Pressable>
                <Pressable
                  onPress={handleCreateEvent}
                  disabled={isSaving}
                  style={[st.createBtn, isSaving && { opacity: 0.6 }]}
                >
                  <Text style={st.createText}>{isSaving ? 'Création…' : 'Créer'}</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Événement créé par mon foyer : modifier ou supprimer (règle du 21 nov.) */}
      <Modal visible={!!evtEdition} transparent animationType="fade" onRequestClose={() => setEvtEdition(null)}>
        <View style={st.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); setEvtEdition(null); }} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={st.modalContent}>
              <View style={st.modalHandle} />
              <Text style={st.modalTitle}>Modifier l’événement</Text>
              <TextInput
                value={evtEdition?.titre ?? ''}
                onChangeText={(v) => setEvtEdition((e) => (e ? { ...e, titre: v } : e))}
                placeholder="Titre"
                placeholderTextColor="#94A3B8"
                style={st.modalInput}
                maxLength={120}
              />
              <View style={st.modalTypeRow}>
                {(Object.keys(NEW_EVENT_TYPE_LABELS) as NewEventType[]).map((type) => {
                  const actif = evtEdition?.type === type;
                  return (
                    <Pressable key={type} onPress={() => setEvtEdition((e) => (e ? { ...e, type } : e))} style={[st.modalTypePill, actif && st.modalTypePillActive]}
                      accessibilityRole="radio" accessibilityState={{ selected: actif }}>
                      <Text style={[st.modalTypeText, actif && st.modalTypeTextActive]}>{NEW_EVENT_TYPE_LABELS[type]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={st.editionDate}>
                <Pressable onPress={() => setEvtEdition((e) => (e ? { ...e, jour: decalerJour(e.jour, -1) } : e))} style={st.editionFleche} accessibilityLabel="Jour précédent">
                  <ChevronLeftIcone size={20} color="#0F172A" strokeWidth={2} />
                </Pressable>
                <Text style={st.editionDateTexte}>{evtEdition ? jourCourtAbsence(evtEdition.jour) : ''}</Text>
                <Pressable onPress={() => setEvtEdition((e) => (e ? { ...e, jour: decalerJour(e.jour, 1) } : e))} style={st.editionFleche} accessibilityLabel="Jour suivant">
                  <ChevronRightIcone size={20} color="#0F172A" strokeWidth={2} />
                </Pressable>
              </View>
              <View style={st.modalActions}>
                <Pressable onPress={supprimerEdition} style={st.cancelBtn} accessibilityRole="button">
                  <Text style={[st.cancelText, { color: '#EF4444' }]}>Supprimer</Text>
                </Pressable>
                <Pressable onPress={enregistrerEdition} disabled={!evtEdition?.titre.trim()} style={[st.createBtn, !evtEdition?.titre.trim() && { opacity: 0.6 }]} accessibilityRole="button">
                  <Text style={st.createText}>Enregistrer</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Rendez-vous fixe : modifier ou supprimer (tout responsable de l'enfant, lot 4c) */}
      <Modal visible={!!rdvEnEdition} transparent animationType="fade" onRequestClose={() => setRdvEnEdition(null)}>
        <View style={st.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); setRdvEnEdition(null); }} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={st.modalContent}>
              <View style={st.modalHandle} />
              <Text style={st.modalTitle}>Rendez-vous fixe</Text>
              <TextInput value={rdvTitre} onChangeText={setRdvTitre} placeholder="Piscine, bibliothèque…" placeholderTextColor="#94A3B8" style={st.modalInput} maxLength={80} />
              <View style={st.modalTypeRow}>
                {JOURS_SEMAINE.map((j, i) => {
                  const actif = rdvJour === i + 1;
                  return (
                    <Pressable key={j} onPress={() => setRdvJour(i + 1)} style={[st.modalTypePill, actif && st.modalTypePillActive]}
                      accessibilityRole="radio" accessibilityState={{ selected: actif }} accessibilityLabel={j}>
                      <Text style={[st.modalTypeText, actif && st.modalTypeTextActive]}>{j.slice(0, 3)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput value={rdvAPrevoir} onChangeText={setRdvAPrevoir} placeholder="À prévoir : maillot, bonnet…" placeholderTextColor="#94A3B8" style={st.modalInput} />
              <View style={st.modalActions}>
                <Pressable onPress={supprimerRdv} style={st.cancelBtn} accessibilityRole="button">
                  <Text style={[st.cancelText, { color: '#EF4444' }]}>Supprimer</Text>
                </Pressable>
                <Pressable onPress={enregistrerRendezVous} disabled={!rdvTitre.trim()} style={[st.createBtn, !rdvTitre.trim() && { opacity: 0.6 }]} accessibilityRole="button">
                  <Text style={st.createText}>Enregistrer</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    position: 'relative',
  },

  // Month title wrapper (titre + bouton EDT)
  monthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 20,
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flex: 1,
  },
  timetableRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -8,
    marginBottom: 4,
  },
  timetableHit: {
    minHeight: 44,
    justifyContent: 'center',
  },
  timetableBtn: {
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(67,56,202,0.08)',
  },
  timetableBtnText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: '#4338CA',
    letterSpacing: -0.1,
  },
  monthName: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 32,
    color: '#0F172A',
  },
  yearText: {
    fontFamily: FontFamily.displayBold,
    fontSize: 20,
    color: '#94A3B8',
  },

  // Calendar panel
  calendarPanel: {
    paddingBottom: 8,
  },
  monthScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 12,
  },
  monthPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  monthPillText: {
    fontSize: 13,
  },
  monthPillTextActive: {
    fontFamily: FontFamily.sansBold,
    color: '#FFFFFF',
  },
  monthPillTextInactive: {
    fontFamily: FontFamily.sansMedium,
    color: '#94A3B8',
  },
  calendarGridCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    ...SHADOW.card,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calendarHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calendarHeaderText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: '#94A3B8',
  },
  calendarRow: {
    flexDirection: 'row',
  },
  calendarCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  calendarDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  calendarDayText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: '#0F172A',
  },
  calendarDayOtherMonth: {
    color: '#D1D5DB',
  },
  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4338CA',
    marginTop: 1,
  },

  // Week strip
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  weekStripDay: {
    alignItems: 'center',
    gap: 4,
  },
  weekStripLetter: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  weekStripCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  weekStripNumber: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    color: '#0F172A',
  },
  weekStripDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4338CA',
  },

  // Today button
  todayBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 4,
  },
  todayBtnText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
  },

  // Day title row (inside each page)
  dayTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 8,
  },
  dayTitleText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#64748B',
  },
  dayEventCount: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: '#94A3B8',
  },

  // Event card
  // COMPONENTS.md §7 — Card événement Agenda
  eventCard: {
    borderRadius: 14,
    borderLeftWidth: 3,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  eventInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: '#0F172A',
  },
  eventMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  examBadge: {
    backgroundColor: '#EF444418',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  examBadgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: '#EF4444',
  },
  // Maternelle / primaire : tag neutre
  evalBadge: {
    backgroundColor: 'rgba(15,23,42,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  evalBadgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: 'rgba(15,23,42,0.62)',
  },
  checkboxWrap: {
    width: 24,
    height: 24,
  },
  checkboxGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#94A3B8',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    color: '#0F172A',
  },
  emptySubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    ...SHADOW.flottant,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 20,
    color: '#0F172A',
    marginBottom: 20,
  },
  modalDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  modalDateText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  modalInput: {
    backgroundColor: C.bg,
    borderWidth: 0,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 20,
    fontFamily: FontFamily.sansRegular,
  },
  modalTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  modalTypePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: C.bg,
  },
  modalTypePillActive: {
    backgroundColor: '#0F172A',
  },
  modalTypeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#6B7280',
  },
  modalTypeTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  cancelBtn: {
    padding: 8,
  },
  cancelText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 16,
    color: '#9CA3AF',
  },
  createBtn: {
    padding: 8,
  },
  createText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    color: '#0F172A',
  },

  // Filter pills
  // Zone tactile 44 dp (pastille de 30 + hitSlop 7 + 7), à l'intérieur des bornes du ScrollView : 7 dp de marge verticale au
  // lieu de 4 ; marginTop 3 / marginBottom -1 retirent les 6 dp ajoutés (visuel inchangé). zIndex : la bande reste au-dessus du
  // calendrier qui la touche d'1 dp.
  filterPillsRow: {
    marginTop: 3,
    marginBottom: -1,
    zIndex: 1,
  },
  filterPillsContent: {
    paddingHorizontal: 16,
    gap: 6,
    paddingVertical: 7,
  },
  filterPill: {
    height: 30,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
  },
  filterPillText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: 'rgba(15,23,42,0.45)',
  },
  filterPillTextActive: {
    fontFamily: FontFamily.sansSemiBold,
    color: '#FFFFFF',
  },

  // Rendez-vous fixe (lot 4c) : liste « À prévoir » et option « Toutes les semaines ».
  editionDate: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', marginBottom: 12 },
  editionFleche: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  editionDateTexte: { flex: 1, textAlign: 'center', fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: '#0F172A' },
  rdvModifier: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, color: '#4338CA', marginTop: 4 },
  rdvListe: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(15,23,42,0.07)' },
  rdvItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, minHeight: 34 },
  rdvItemTexte: { fontFamily: FontFamily.sansMedium, fontSize: 13, lineHeight: 18, color: '#0F172A' },
  rdvOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: 10 },
  rdvOptionTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: '#0F172A' },
  interrupteur: { width: 44, height: 26, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.15)', padding: 3, justifyContent: 'center' },
  interrupteurActif: { backgroundColor: '#4338CA' },
  pastille: { width: 20, height: 20, borderRadius: 999, backgroundColor: '#FFFFFF' },
  // Libellé de catégorie écrit dans la carte (COMPONENTS « Card événement Agenda ») : Figtree 600 · 11 px.
  eventCategorie: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: 'rgba(15,23,42,0.55)',
    marginBottom: 2,
  },
  // Ligne source d'un devoir coché dans la vue par jour (sur sa propre ligne, sous l'échéance).
  eventSource: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: 'rgba(15,23,42,0.55)',
    marginTop: 3,
  },
  // Vue « Devoirs » (lot 4a, COMPONENTS §18.6)
  hwStats: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: 'rgba(15,23,42,0.55)',
    paddingTop: 12,
    paddingHorizontal: 6,
  },
  hwSectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: 'rgba(15,23,42,0.55)',
    paddingTop: 18,
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  hwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: RADIUS.card,
    marginBottom: 6,
    ...SHADOW.card,
  },
  hwPastille: {
    marginLeft: 12,
    marginRight: 10,
  },
  hwTitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 19,
  },
  hwTitleFait: {
    color: 'rgba(15,23,42,0.45)',
  },
  hwMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: 'rgba(15,23,42,0.55)',
    marginTop: 1,
  },
  hwSource: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: 'rgba(15,23,42,0.55)',
    marginTop: 3,
  },
  hwVide: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: 'rgba(15,23,42,0.55)',
    textAlign: 'center',
  },
  hwCheckEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.25)',
  },
  hwCheckFilled: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** Garde : compte réel sans enfant → état vide (jamais de données d'un autre carnet). */
export default function AgendaScreen() {
  const { selectedChild } = useActiveChild();
  if (!selectedChild) return <AucunEnfantOnglet />;
  return <AgendaScreenContent />;
}
