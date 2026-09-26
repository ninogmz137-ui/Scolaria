/**
 * TabNavigator — Parent navigation with 4 top tabs.
 *
 * Tabs: Accueil | Suivi (route 'Notes') | Agenda | Messagerie
 *
 * Top bar + bottom bar :
 *   affichées ou masquées selon `ROUTE_CHROME` (./chrome.ts), lu depuis la route focalisée la
 *   plus profonde de tout l'état de navigation (toutes les piles). Un écran profond qui dessine
 *   son propre en-tête est en mode 'none' : les deux barres disparaissent.
 *
 * ☰ (TopBar) ouvre directement l'écran « Famille & paramètres ». Aucun menu ne s'ouvre par
 * swipe : le seul geste horizontal géré ici est le retour arrière depuis une page profonde.
 */

import { useState, useMemo, useRef } from 'react';
import { View, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import ScrollVeil from '../components/navigation/ScrollVeil';
import { TOPBAR_PADDING_TOP, TOPBAR_ROW_HEIGHT } from '../components/navigation/TopBar';
import { getBottomBarOffset, BOTTOM_BAR_ROW_HEIGHT } from '../components/navigation/BottomBar';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { canSwipeBack, getChromeMode, getFocusedLeafRouteName, type StackParams } from './chrome';
import { navigationRef } from './navigationRef';

// Navigation chrome
import TopBar, { type ActiveTab } from '../components/navigation/TopBar';
import BottomBar from '../components/navigation/BottomBar';

// Topbar scroll context (conservé pour AccueilScreen — no-op scroll-to-hide)
import { TopbarScrollContext } from '../contexts/TopbarScrollContext';

// Main tab screens
import AccueilScreen from '../screens/AccueilScreen';
import NotesScreen from '../screens/NotesScreen';
import AgendaScreen from '../screens/AgendaScreen';
import MessagerieScreen from '../screens/MessagerieScreen';

// Stacked screens
import SignalerAbsenceScreen from '../screens/SignalerAbsenceScreen';
import MonRessentiScreen from '../screens/MonRessentiScreen';
import ProfilEnfantScreen from '../screens/ProfilEnfantScreen';
import AjouterEnfantScreen from '../screens/AjouterEnfantScreen';
import AjouterAnneScreen from '../screens/AjouterAnneScreen';
import MonParcoursScreen from '../screens/MonParcoursScreen';
import FamilleParametresScreen from '../screens/FamilleParametresScreen';
// Legacy AriaScreen has been superseded by AriaHome/AriaConversation.
import WallpaperPickerScreen from '../screens/WallpaperPickerScreen';
import AriaHomeScreen from '../screens/aria/AriaHomeScreen';
import AriaConversationScreen from '../screens/aria/AriaConversationScreen';

// Messagerie sub-screens
import MessagesListScreen from '../screens/messagerie/MessagesListScreen';
import AbsencesListScreen from '../screens/messagerie/AbsencesListScreen';
import EcoleListScreen from '../screens/messagerie/EcoleListScreen';
import ConversationDetailScreen from '../screens/messagerie/ConversationDetailScreen';
import MotDetailScreen from '../screens/messagerie/MotDetailScreen';

// Detail screens
import ArchivedYearDetailScreen from '../screens/ArchivedYearDetailScreen';
import SubjectDetailScreen from '../screens/SubjectDetailScreen';

// About
import AProposScreen from '../screens/AProposScreen';

// Quick overlays (BottomBar)
import QuickSearchScreen from '../screens/QuickSearchScreen';
import AjouterAuCarnetSheet from '../components/AjouterAuCarnetSheet';
import AjouterAuCarnetScreen from '../screens/AjouterAuCarnetScreen';

// RGPD hub
import RGPDScreen from '../screens/RGPDScreen';

// RGPD screens
import PermissionsScreen from '../screens/rgpd/PermissionsScreen';
import JournalAccesScreen from '../screens/rgpd/JournalAccesScreen';
import TransfertCodeScreen from '../screens/rgpd/TransfertCodeScreen';
import EffacementScreen from '../screens/rgpd/EffacementScreen';
import ExportDonneesScreen from '../screens/rgpd/ExportDonneesScreen';

// v3.0 — nouveaux écrans
import HomeworkScreen from '../screens/HomeworkScreen';
import TimetableScreen from '../screens/TimetableScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import GradeDetailScreen from '../screens/GradeDetailScreen';
import BulletinScreen from '../screens/BulletinScreen';
import SignDocScreen from '../screens/SignDocScreen';
import SignSuccessScreen from '../screens/SignSuccessScreen';

// ─── Shared refs for topbar state ────────────────────────

const backArrowRef: { current: { setShowBack: (v: boolean) => void } | null } = { current: null };
const activeTabRef: { current: { setActiveTab: (v: string) => void } | null } = { current: null };
const stackTitleRef: { current: { setTitle: (v: string) => void } | null } = { current: null };
const currentAccueilRouteRef: { current: { setRouteName: (v: string) => void } | null } = { current: null };

// Screen title mapping for stacked screens
const SCREEN_TITLES: Record<string, string> = {
  SignalerAbsenceScreen: 'Signaler une absence',
  BienEtreScreen: 'Bien-être',
  ProfilEnfant: 'Profil',
  AjouterEnfant: 'Ajouter un enfant',
  AjouterAnne: 'Ajouter une année',
  MonParcours: 'Mon parcours',
  FamilleParametres: 'Famille & paramètres',
  RGPDScreen: 'RGPD & Confidentialité',
  PermissionsRGPD: 'Permissions',
  JournalAcces: "Journal d'accès",
  TransfertCode: 'Code de transfert',
  Effacement: 'Effacement',
  ExportDonnees: 'Export de données',
  APropos: 'À propos',
  AriaScreen: 'Aria',
  AriaHome: 'Aria',
  AriaConversation: 'Aria',
  MessagerieAriaScreen: 'Aria',
  WallpaperPicker: 'Fond de l’Accueil',
  MessagesListScreen: 'Messages',
  AbsencesListScreen: 'Absences',
  EcoleListScreen: 'École',
  ConversationDetailScreen: 'Conversation',
  MotDetailScreen: 'Mot à signer',
  ArchivedYearDetail: 'Année archivée',
  SubjectDetail: 'Détail matière',
  BulletinScreen: 'Bulletin trimestriel',
};

// ─── Stack navigators ────────────────────────────────────

const AccueilStack = createNativeStackNavigator<StackParams>();
function AccueilStackScreen() {
  return (
    <AccueilStack.Navigator
      screenOptions={{ headerShown: false, gestureEnabled: true }}
      screenListeners={{
        state: (e) => {
          const data = e.data as any;
          const routes = data?.state?.routes;
          const index = data?.state?.index ?? 0;
          const routeName = routes?.[index]?.name as string | undefined;
          const isReglagesModal =
            routeName === 'FamilleParametres' ||
            routeName === 'PermissionsRGPD' ||
            routeName === 'JournalAcces' ||
            routeName === 'TransfertCode' ||
            routeName === 'ExportDonnees' ||
            routeName === 'Effacement';
          const hasScreenHeaderBack =
            routeName === 'ProfilEnfant' || routeName === 'BienEtreScreen';
          // IMPORTANT: never show the "stacked" topbar on AccueilHome.
          // Some Android nav transitions can skip `focus` for the root route, so we
          // hard-force the root state here (index=0) to avoid phantom back arrows/titles.
          if (index === 0) {
            backArrowRef.current?.setShowBack(false);
            stackTitleRef.current?.setTitle('');
            currentAccueilRouteRef.current?.setRouteName('AccueilHome');
          } else {
            backArrowRef.current?.setShowBack(
              index > 0 && !isReglagesModal && !hasScreenHeaderBack,
            );
          }
          if (routeName) {
            currentAccueilRouteRef.current?.setRouteName(routeName);
          }
          if (index > 0 && routes?.[index] && !isReglagesModal) {
            const screenName = routes[index].name as string;
            const params = routes[index].params as any;
            if (screenName === 'ArchivedYearDetail' && params?.year && params?.niveau) {
              stackTitleRef.current?.setTitle(`${params.year} · ${params.niveau}`);
            } else {
              stackTitleRef.current?.setTitle(SCREEN_TITLES[screenName] || screenName);
            }
          }
        },
        focus: (e) => {
          if (e.target?.includes('AccueilHome')) {
            backArrowRef.current?.setShowBack(false);
          }
        },
      }}
    >
      <AccueilStack.Screen
        name="AccueilHome"
        component={AccueilScreen}
        options={{ headerShown: false }}
      />
      <AccueilStack.Screen
        name="SignalerAbsenceScreen"
        component={SignalerAbsenceScreen}
        options={{ title: 'Signaler une absence' }}
      />
      <AccueilStack.Screen
        name="BienEtreScreen"
        component={MonRessentiScreen}
        options={{ title: 'Bien-être', headerShown: false }}
      />
      <AccueilStack.Screen
        name="ProfilEnfant"
        component={ProfilEnfantScreen}
        options={{ title: 'Profil', headerShown: false }}
      />
      <AccueilStack.Screen
        name="AjouterEnfant"
        component={AjouterEnfantScreen}
        options={{ title: 'Ajouter un enfant', headerShown: false }}
      />
      <AccueilStack.Screen
        name="AjouterAnne"
        component={AjouterAnneScreen}
        options={{ title: 'Ajouter une année' }}
      />
      <AccueilStack.Screen
        name="AjouterAuCarnet"
        component={AjouterAuCarnetScreen}
        options={{ headerShown: false }}
      />
      <AccueilStack.Screen
        name="MonParcours"
        component={MonParcoursScreen}
        options={{ title: 'Mon parcours' }}
      />
      <AccueilStack.Screen
        name="FamilleParametres"
        component={FamilleParametresScreen}
        options={{ title: 'Famille & paramètres', headerShown: false }}
      />
      <AccueilStack.Screen
        name="RGPDScreen"
        component={RGPDScreen}
        options={{ title: 'RGPD & Confidentialité' }}
      />
      <AccueilStack.Screen
        name="PermissionsRGPD"
        component={PermissionsScreen}
        options={{
          title: 'Permissions',
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: 'transparent', flex: 1 },
        }}
      />
      <AccueilStack.Screen
        name="JournalAcces"
        component={JournalAccesScreen}
        options={{
          title: "Journal d'accès",
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: 'transparent', flex: 1 },
        }}
      />
      <AccueilStack.Screen
        name="TransfertCode"
        component={TransfertCodeScreen}
        options={{
          title: 'Code de transfert',
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: 'transparent', flex: 1 },
        }}
      />
      <AccueilStack.Screen
        name="Effacement"
        component={EffacementScreen}
        options={{
          title: 'Effacement',
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: 'transparent', flex: 1 },
        }}
      />
      <AccueilStack.Screen
        name="ExportDonnees"
        component={ExportDonneesScreen}
        options={{
          title: 'Export de données',
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: 'transparent', flex: 1 },
        }}
      />
      <AccueilStack.Screen
        name="APropos"
        component={AProposScreen}
        options={{ title: 'À propos', headerShown: false }}
      />
      {/* Backward-compat route: keep name but render new Aria home */}
      <AccueilStack.Screen
        name="AriaScreen"
        component={AriaHomeScreen}
        options={{ headerShown: false }}
      />
      <AccueilStack.Screen
        name="AriaHome"
        component={AriaHomeScreen}
        options={{ headerShown: false }}
      />
      <AccueilStack.Screen
        name="AriaConversation"
        component={AriaConversationScreen}
        options={{ headerShown: false }}
      />
      <AccueilStack.Screen
        name="WallpaperPicker"
        component={WallpaperPickerScreen}
        options={{ headerShown: false, title: 'Fond de l’Accueil' }}
      />
      <AccueilStack.Screen
        name="ArchivedYearDetail"
        component={ArchivedYearDetailScreen}
        options={{ headerShown: false }}
      />
      {/* v3.0 */}
      <AccueilStack.Screen
        name="Homework"
        component={HomeworkScreen}
        options={{ headerShown: false }}
      />
      <AccueilStack.Screen
        name="Timetable"
        component={TimetableScreen}
        options={{ headerShown: false }}
      />
      {/* « À faire → Signer » part d'Accueil : l'écran reste dans l'onglet Accueil
          (enregistré aussi dans la pile Messagerie pour les mots du cahier de liaison). */}
      <AccueilStack.Screen
        name="SignDoc"
        component={SignDocScreen}
        options={{ headerShown: false }}
      />
      <AccueilStack.Screen
        name="SignSuccess"
        component={SignSuccessScreen}
        options={{ headerShown: false }}
      />
    </AccueilStack.Navigator>
  );
}

const NotesStack = createNativeStackNavigator<StackParams>();
function NotesStackScreen() {
  return (
    <NotesStack.Navigator
      screenOptions={{ headerShown: false, gestureEnabled: true }}
      screenListeners={{
        state: (e) => {
          const data = e.data as any;
          const routes = data?.state?.routes;
          const index = data?.state?.index ?? 0;
          backArrowRef.current?.setShowBack(index > 0);
          if (index > 0 && routes?.[index]) {
            const screenName = routes[index].name as string;
            const params = routes[index].params as any;
            if (screenName === 'SubjectDetail' && params?.subjectName) {
              stackTitleRef.current?.setTitle(params.subjectName);
            } else if (screenName === 'ArchivedYearDetail' && params?.year && params?.niveau) {
              stackTitleRef.current?.setTitle(`${params.year} · ${params.niveau}`);
            } else {
              stackTitleRef.current?.setTitle(SCREEN_TITLES[screenName] || screenName);
            }
          }
        },
        focus: (e) => {
          if (e.target?.includes('NotesHome')) {
            backArrowRef.current?.setShowBack(false);
          }
        },
      }}
    >
      <NotesStack.Screen
        name="NotesHome"
        component={NotesScreen}
        options={{ headerShown: false }}
      />
      <NotesStack.Screen
        name="SubjectDetail"
        component={SubjectDetailScreen}
        options={{ headerShown: false }}
      />
      {/* v3.0 */}
      <NotesStack.Screen
        name="GradeDetail"
        component={GradeDetailScreen}
        options={{ headerShown: false }}
      />
      <NotesStack.Screen
        name="BulletinScreen"
        component={BulletinScreen}
        options={{ headerShown: false }}
      />
      {/* Bouton année et lien « Livrets des années précédentes » : retour vers Suivi. */}
      <NotesStack.Screen
        name="MonParcours"
        component={MonParcoursScreen}
        options={{ title: 'Mon parcours' }}
      />
      <NotesStack.Screen
        name="ArchivedYearDetail"
        component={ArchivedYearDetailScreen}
        options={{ headerShown: false }}
      />
      <NotesStack.Screen
        name="AjouterAnne"
        component={AjouterAnneScreen}
        options={{ title: 'Ajouter une année' }}
      />
      <NotesStack.Screen
        name="AjouterAuCarnet"
        component={AjouterAuCarnetScreen}
        options={{ headerShown: false }}
      />
    </NotesStack.Navigator>
  );
}

const AgendaStack = createNativeStackNavigator<StackParams>();
function AgendaStackScreen() {
  return (
    <AgendaStack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true }}>
      <AgendaStack.Screen
        name="AgendaHome"
        component={AgendaScreen}
        options={{ headerShown: false }}
      />
      {/* v3.0 */}
      <AgendaStack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ headerShown: false }}
      />
      <AgendaStack.Screen
        name="Timetable"
        component={TimetableScreen}
        options={{ headerShown: false }}
      />
    </AgendaStack.Navigator>
  );
}

const MessagerieStack = createNativeStackNavigator<StackParams>();
function MessagerieStackScreen() {
  return (
    <MessagerieStack.Navigator
      screenOptions={{ headerShown: false, gestureEnabled: true }}
      screenListeners={{
        state: (e) => {
          const data = e.data as any;
          const routes = data?.state?.routes;
          const index = data?.state?.index ?? 0;
          backArrowRef.current?.setShowBack(index > 0);
          if (index > 0 && routes?.[index]) {
            const screenName = routes[index].name as string;
            stackTitleRef.current?.setTitle(SCREEN_TITLES[screenName] || screenName);
          }
        },
        focus: (e) => {
          if (e.target?.includes('MessagerieHome')) {
            backArrowRef.current?.setShowBack(false);
          }
        },
      }}
    >
      <MessagerieStack.Screen
        name="MessagerieHome"
        component={MessagerieScreen}
        options={{ headerShown: false }}
      />
      <MessagerieStack.Screen
        name="SignalerAbsence"
        component={SignalerAbsenceScreen}
        options={{ title: 'Signaler une absence' }}
      />
      <MessagerieStack.Screen
        name="MessagesListScreen"
        component={MessagesListScreen}
        options={{ headerShown: false }}
      />
      <MessagerieStack.Screen
        name="AbsencesListScreen"
        component={AbsencesListScreen}
        options={{ headerShown: false }}
      />
      <MessagerieStack.Screen
        name="EcoleListScreen"
        component={EcoleListScreen}
        options={{ headerShown: false }}
      />
      <MessagerieStack.Screen
        name="MessagerieAriaScreen"
        component={AriaHomeScreen}
        options={{ headerShown: false }}
      />
      <MessagerieStack.Screen
        name="AriaConversation"
        component={AriaConversationScreen}
        options={{ headerShown: false }}
      />
      <MessagerieStack.Screen
        name="ConversationDetailScreen"
        component={ConversationDetailScreen}
        options={{ headerShown: false }}
      />
      <MessagerieStack.Screen
        name="MotDetailScreen"
        component={MotDetailScreen}
        options={{ headerShown: false }}
      />
      {/* v3.0 */}
      <MessagerieStack.Screen
        name="SignDoc"
        component={SignDocScreen}
        options={{ headerShown: false }}
      />
      <MessagerieStack.Screen
        name="SignSuccess"
        component={SignSuccessScreen}
        options={{ headerShown: false }}
      />
    </MessagerieStack.Navigator>
  );
}

// ─── Tab navigator (4 tabs) ──────────────────────────────

const Tab = createMaterialTopTabNavigator();

function TabContent() {
  return (
    <Tab.Navigator
      screenListeners={{
        tabPress: (e) => {
          backArrowRef.current?.setShowBack(false);
          stackTitleRef.current?.setTitle('');
          const tabName = e.target?.split('-')[0] ?? '';
          activeTabRef.current?.setActiveTab(tabName);
        },
        state: (e) => {
          // Also track tab changes from programmatic navigation (e.g. avatar → Accueil)
          const data = e.data as any;
          const routes = data?.state?.routes;
          const index = data?.state?.index ?? 0;
          if (routes?.[index]) {
            // When switching tabs programmatically, we may not receive `tabPress`.
            // If we were previously on a stacked screen, the back arrow can "stick"
            // and incorrectly force AppTopbar into stacked mode on AccueilHome.
            backArrowRef.current?.setShowBack(false);
            stackTitleRef.current?.setTitle('');
            activeTabRef.current?.setActiveTab(routes[index].name);
          }
        },
      }}
      screenOptions={{
        swipeEnabled: true,
        tabBarStyle: { display: 'none' },
        // Fix Android: MaterialTopTabViewPager intercepte tous les taps
        tabBarPressColor: 'transparent',
      }}
    >
      <Tab.Screen
        name="Accueil"
        component={AccueilStackScreen}
        options={{ tabBarLabel: 'Accueil' }}
      />
      <Tab.Screen
        name="Notes"
        component={NotesStackScreen}
        options={{ tabBarLabel: 'Suivi' }}
      />
      <Tab.Screen
        name="Agenda"
        component={AgendaStackScreen}
        options={{ tabBarLabel: 'Agenda' }}
      />
      <Tab.Screen
        name="MessagerieTab"
        component={MessagerieStackScreen}
        options={{ tabBarLabel: 'Messagerie' }}
      />
    </Tab.Navigator>
  );
}

// ─── Retour par glissement ───────────────────────────────

/** Le geste doit partir à moins de SWIPE_EDGE px du bord gauche. */
const SWIPE_EDGE = 40;
/** Distance horizontale qui déclenche le retour (ou un geste plus court mais rapide). */
const SWIPE_DISTANCE = 70;

// ─── Nav refs ────────────────────────────────────────────

const ariaNavRef: { current: (() => void) | null } = { current: null };
const searchNavRef: { current: (() => void) | null } = { current: null };
const actionNavRef: { current: (() => void) | null } = { current: null };
const agendaActionRef: { current: (() => void) | null } = { current: null };
const navActiveTabRef: { current: ActiveTab } = { current: 'accueil' };

// ─── TabContentWithNav ───────────────────────────────────

function TabContentWithNav() {
  const navigation = useNavigation<any>();

  // useNavigation() ici = RootStack (TabNavigator est le screen 'MainPager').
  // Pour atteindre un onglet ou un écran imbriqué, passer par 'MainPager'.
  ariaNavRef.current = () => {
    navigation.navigate('MainPager', {
      screen: 'Accueil',
      params: { screen: 'AriaHome' },
    } as any);
  };

  searchNavRef.current = () => {
    navigation.navigate('MainPager', {
      screen: 'Accueil',
      params: { screen: 'AriaHome' },
    } as any);
  };

  actionNavRef.current = () => {
    navigation.navigate('MainPager', {
      screen: 'MessagerieTab',
      params: { screen: 'MessagerieAriaScreen' },
    } as any);
  };

  agendaActionRef.current = () => {
    navigation.navigate('MainPager', {
      screen: 'Agenda',
      params: { screen: 'AgendaHome', params: { openAddModal: true } },
    } as any);
  };

  return <TabContent />;
}

// ─── Main navigator with topbar ──────────────────────────

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const [showBack, setShowBack] = useState(false);
  const [activeTab, setActiveTab] = useState('Accueil');
  const [stackTitle, setStackTitle] = useState('');
  const [currentAccueilRoute, setCurrentAccueilRoute] = useState('AccueilHome');
  const [searchVisible, setSearchVisible] = useState(false);
  // Onglet d'où « Ajouter au carnet » a été ouvert (null = feuille fermée).
  const [carnetDepuis, setCarnetDepuis] = useState<'Accueil' | 'Notes' | null>(null);

  // ── Défilement de l'écran visible → voiles haut/bas (ScrollVeil) ────
  const scrollY = useSharedValue(0);

  // Register refs
  backArrowRef.current = { setShowBack };
  activeTabRef.current = { setActiveTab };
  stackTitleRef.current = { setTitle: setStackTitle };
  currentAccueilRouteRef.current = { setRouteName: setCurrentAccueilRoute };

  // ── Onglet actif → type ActiveTab ────────────────────
  function toActiveTab(routeName: string, accueilRoute: string): ActiveTab {
    if (routeName === 'Accueil' && accueilRoute.startsWith('Aria')) return 'aria';
    switch (routeName) {
      case 'Notes':        return 'notes';
      case 'Agenda':       return 'agenda';
      case 'MessagerieTab': return 'messages';
      default:             return 'accueil';
    }
  }
  const navActiveTab = toActiveTab(activeTab, currentAccueilRoute);
  navActiveTabRef.current = navActiveTab;

  // ── Chrome : top bar + bottom bar selon ROUTE_CHROME (./chrome.ts) ──
  // Route focalisée la plus profonde de TOUTES les piles (pas seulement Accueil). Une page
  // profonde qui dessine son propre en-tête est en mode 'none' : il remplace la top bar.
  const focusedLeafRoute = useNavigationState((state) => getFocusedLeafRouteName(state as any));
  const showNavChrome = getChromeMode(focusedLeafRoute) === 'full';


  const topbarScrollContextValue = useMemo(() => ({ scrollY }), [scrollY]);

  // Voiles : opaques du bord d'écran jusqu'au milieu de la barre, puis fondu de 24 px au-delà.
  const VEIL_FADE_PAST_BAR = 24;
  const topVeilSolid = insets.top + TOPBAR_PADDING_TOP + TOPBAR_ROW_HEIGHT / 2;
  const topVeilFade = TOPBAR_ROW_HEIGHT / 2 + VEIL_FADE_PAST_BAR;
  const bottomVeilSolid = getBottomBarOffset(insets.bottom) + BOTTOM_BAR_ROW_HEIGHT / 2;
  const bottomVeilFade = BOTTOM_BAR_ROW_HEIGHT / 2 + VEIL_FADE_PAST_BAR;

  // ── Glissement depuis le bord gauche = retour arrière (jamais d'ouverture de menu) ────────
  // Le Redmi est en navigation 3 boutons : c'est l'app qui gère ce geste, sur TOUTE page profonde.
  // Capté en phase « capture » (avant les ScrollView / Pressable enfants), seulement s'il part du bord.
  const leafRouteRef = useRef(focusedLeafRoute);
  leafRouteRef.current = focusedLeafRoute;
  // gestureState.x0 n'est renseigné qu'après l'attribution du geste : on mémorise nous-mêmes
  // l'abscisse du doigt au départ (appelé pour chaque début de toucher, sans rien capturer).
  const touchStartXRef = useRef(Number.POSITIVE_INFINITY);

  const swipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: (evt) => {
        touchStartXRef.current = evt.nativeEvent.pageX;
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_, g) =>
        touchStartXRef.current <= SWIPE_EDGE &&
        g.dx > 12 &&
        Math.abs(g.dy) < g.dx &&
        canSwipeBack(leafRouteRef.current) &&
        navigationRef.isReady() &&
        navigationRef.canGoBack(),
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_DISTANCE || (g.dx > 30 && g.vx > 0.3)) {
          if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
        }
      },
    })
  ).current;

  return (
    <TopbarScrollContext.Provider value={topbarScrollContextValue}>
      <View style={{ flex: 1, backgroundColor: '#F2F1EE' }} {...swipePan.panHandlers}>
            {/* Voile haut : apparaît au défilement, jamais de bandeau opaque au repos */}
            {showNavChrome && (
              <ScrollVeil edge="top" solid={topVeilSolid} fade={topVeilFade} scrollY={scrollY} />
            )}
            {/* TopBar — toujours en haut sauf écrans plein-écran */}
            {showNavChrome && (
              <TopBar activeTab={navActiveTab} hasUnreadMessages={false} />
            )}

            {/* Tab content */}
            <TabContentWithNav />

            {/* Voile bas : même composant, miroir */}
            {showNavChrome && (
              <ScrollVeil edge="bottom" solid={bottomVeilSolid} fade={bottomVeilFade} scrollY={scrollY} />
            )}

            {/* BottomBar — ancrée en bas sauf écrans plein-écran */}
            {showNavChrome && (
              <BottomBar
                activeTab={navActiveTab}
                onSearchPress={() => setSearchVisible(true)}
                onActionPress={() => {
                  if (navActiveTab === 'messages') {
                    actionNavRef.current?.();
                  } else if (navActiveTab === 'agenda') {
                    agendaActionRef.current?.();
                  } else if (navActiveTab === 'accueil' || navActiveTab === 'notes') {
                    // « + » (Accueil) et ⊞ (Suivi) : Ajouter au carnet (lot B5).
                    setCarnetDepuis(navActiveTab === 'notes' ? 'Notes' : 'Accueil');
                  }
                }}
              />
            )}

            <QuickSearchScreen
              visible={searchVisible}
              onClose={() => setSearchVisible(false)}
            />
            <AjouterAuCarnetSheet
              visible={carnetDepuis !== null}
              onglet={carnetDepuis ?? 'Accueil'}
              onClose={() => setCarnetDepuis(null)}
            />

      </View>
    </TopbarScrollContext.Provider>
  );
}
