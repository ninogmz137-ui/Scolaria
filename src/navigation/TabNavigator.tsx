/**
 * TabNavigator — Parent navigation with 4 bottom tabs + burger menu.
 *
 * Tabs: Accueil | Notes | Agenda | Messagerie
 *
 * Top bar + bottom bar :
 *   affichées ou masquées selon `ROUTE_CHROME` (./chrome.ts), lu depuis la route focalisée la
 *   plus profonde de tout l'état de navigation (toutes les piles). Un écran profond qui dessine
 *   son propre en-tête est en mode 'none' : les deux barres disparaissent.
 *
 * Burger menu: slide & scale effect — main content scales to 0.85 and
 * translates right while the dark menu panel is revealed behind it.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, Dimensions, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { BOTTOM_BAR_HEIGHT } from '../components/navigation/BottomBar';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, useNavigationState, CommonActions } from '@react-navigation/native';
import { getChromeMode, getFocusedLeafRouteName, type StackParams } from './chrome';
import { useAuth } from '../contexts/AuthContext';

// Navigation chrome
import TopBar, { type ActiveTab } from '../components/navigation/TopBar';
import BottomBar from '../components/navigation/BottomBar';
import { ChildSwitcherModal } from '../components/GlobalChildSwitcher';
import { BurgerMenuContent } from '../components/BurgerMenu';

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
import ReglagesScreen from '../screens/ReglagesScreen';
// Legacy AriaScreen has been superseded by AriaHome/AriaConversation.
import WallpaperPickerScreen from '../screens/WallpaperPickerScreen';
import TextSizeScreen from '../screens/TextSizeScreen';
import AriaHomeScreen from '../screens/aria/AriaHomeScreen';
import AriaConversationScreen from '../screens/aria/AriaConversationScreen';
import NotificationsSettingsScreen from '../screens/NotificationsSettingsScreen';

// Messagerie sub-screens
import MessagesListScreen from '../screens/messagerie/MessagesListScreen';
import AbsencesListScreen from '../screens/messagerie/AbsencesListScreen';
import EcoleListScreen from '../screens/messagerie/EcoleListScreen';
import ConversationDetailScreen from '../screens/messagerie/ConversationDetailScreen';
import MotDetailScreen from '../screens/messagerie/MotDetailScreen';

// Detail screens
import ArchivedYearDetailScreen from '../screens/ArchivedYearDetailScreen';
import SubjectDetailScreen from '../screens/SubjectDetailScreen';

// Profile
import EditProfileScreen from '../screens/EditProfileScreen';

// About
import AProposScreen from '../screens/AProposScreen';

// Quick overlays (BottomBar)
import QuickSearchScreen from '../screens/QuickSearchScreen';
import QuickActionsSheet from '../components/QuickActionsSheet';

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

// ─── Screen dimensions ───────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  ReglagesScreen: 'Réglages',
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
  WallpaperPicker: "Fond d'écran",
  TextSize: 'Taille du texte',
  NotificationsSettings: 'Notifications',
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
            routeName === 'ReglagesScreen' ||
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
        options={{ title: 'Ajouter un enfant' }}
      />
      <AccueilStack.Screen
        name="AjouterAnne"
        component={AjouterAnneScreen}
        options={{ title: 'Ajouter une année' }}
      />
      <AccueilStack.Screen
        name="MonParcours"
        component={MonParcoursScreen}
        options={{ title: 'Mon parcours' }}
      />
      <AccueilStack.Screen
        name="ReglagesScreen"
        component={ReglagesScreen}
        options={{
          title: 'Réglages',
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
          // Android: le contenu doit occuper toute la hauteur pour que le bottom sheet se positionne
          // comme sur le web (overlay plein écran + feuille ancrée en bas).
          contentStyle: { backgroundColor: 'transparent', flex: 1 },
        }}
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
        options={{ title: 'À propos' }}
      />
      <AccueilStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: false, presentation: 'modal' }}
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
        options={{ title: "Fond d'écran" }}
      />
      <AccueilStack.Screen
        name="TextSize"
        component={TextSizeScreen}
        options={{ title: 'Taille du texte' }}
      />
      <AccueilStack.Screen
        name="NotificationsSettings"
        component={NotificationsSettingsScreen}
        options={{ headerShown: false }}
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
        options={{ tabBarLabel: 'Notes' }}
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

// ─── Nav refs ────────────────────────────────────────────

const goBackRef: { current: (() => void) | null } = { current: null };
const ariaNavRef: { current: (() => void) | null } = { current: null };
const burgerNavRef: { current: ((screen: string) => void) | null } = { current: null };
const profileNavRef: { current: (() => void) | null } = { current: null };
const searchNavRef: { current: (() => void) | null } = { current: null };
const actionNavRef: { current: (() => void) | null } = { current: null };
const agendaActionRef: { current: (() => void) | null } = { current: null };
const navActiveTabRef: { current: ActiveTab } = { current: 'accueil' };

// ─── TabContentWithNav ───────────────────────────────────

function TabContentWithNav({
  onNavigate,
  onLogout,
}: {
  onNavigate: (screen: string) => void;
  onLogout: () => void;
}) {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();

  goBackRef.current = () => {
    navigation.dispatch(CommonActions.goBack());
  };

  // useNavigation() ici = RootStack (TabNavigator est le screen 'MainPager').
  // Pour atteindre un onglet ou un écran imbriqué, passer par 'MainPager'.
  ariaNavRef.current = () => {
    navigation.navigate('MainPager', {
      screen: 'Accueil',
      params: { screen: 'AriaHome' },
    } as any);
  };

  profileNavRef.current = () => {
    navigation.navigate('MainPager', {
      screen: 'Accueil',
      params: { screen: 'EditProfile' },
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

  burgerNavRef.current = (screen: string) => {
    const routeMap: Record<string, { tab: string; screen: string }> = {
      ProfilEnfant:   { tab: 'Accueil', screen: 'ProfilEnfant' },
      MonParcours:    { tab: 'Accueil', screen: 'MonParcours' },
      BienEtreScreen: { tab: 'Accueil', screen: 'BienEtreScreen' },
      WallpaperPicker:{ tab: 'Accueil', screen: 'WallpaperPicker' },
      ReglagesScreen: { tab: 'Accueil', screen: 'ReglagesScreen' },
      RGPDScreen:     { tab: 'Accueil', screen: 'RGPDScreen' },
    };

    const target = routeMap[screen];
    if (!target) return;

    navigation.navigate('MainPager', {
      screen: target.tab,
      params: { screen: target.screen },
    } as any);
  };

  return <TabContent />;
}

// ─── Main navigator with topbar + burger ─────────────────

export default function TabNavigator() {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [burgerVisible, setBurgerVisible] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [activeTab, setActiveTab] = useState('Accueil');
  const [stackTitle, setStackTitle] = useState('');
  const [currentAccueilRoute, setCurrentAccueilRoute] = useState('AccueilHome');
  const [childSwitcherVisible, setChildSwitcherVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);

  // ── Scroll context → drives TopBar blur ─────────────────────────────
  const lastScrollY = useRef(0);
  const topBlurOpacity = useSharedValue(0);

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

  // ── Burger slide & scale ──────────────────────────────
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(burgerVisible ? 1 : 0, {
      duration: 350,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [burgerVisible]);

  const mainContentStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 1], [0, SCREEN_WIDTH * 0.72]);
    // Claude-style: slide only (no scale)
    const borderRadius = interpolate(progress.value, [0, 1], [0, 24]);
    const shadowOpacity = interpolate(progress.value, [0, 1], [0, 0.18]);
    const shadowRadius = interpolate(progress.value, [0, 1], [0, 28]);
    return {
      transform: [{ translateX }],
      borderRadius,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity,
      shadowRadius,
      elevation: 0,
    };
  });

  const mainDimStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [0, 0.22]);
    return { opacity };
  });

  const showBackRef = useRef(showBack);
  showBackRef.current = showBack;

  // TopBar fixe — pas de scroll-to-hide. Contexte conservé pour AccueilScreen (no-op).
  const handleAccueilScroll = useCallback((y: number) => {
    lastScrollY.current = y;
    // Notion-like: blur appears once content scrolls under the pills
    const next = y > 12 ? 1 : 0;
    topBlurOpacity.value = withTiming(next, { duration: 180 });
  }, [topBlurOpacity]);

  const topbarScrollContextValue = { onScroll: handleAccueilScroll };

  const topBlurStyle = useAnimatedStyle(() => ({
    opacity: topBlurOpacity.value,
  }));
  const bottomBlurStyle = topBlurStyle;

  // ── Swipe gestures (swipe-back + burger open) ────────
  // Refs pour éviter les closures stale dans PanResponder (créé une seule fois)
  const burgerVisibleRef = useRef(burgerVisible);
  burgerVisibleRef.current = burgerVisible;
  const activeTabRef2 = useRef(activeTab);
  activeTabRef2.current = activeTab;
  const currentRouteRef = useRef(currentAccueilRoute);
  currentRouteRef.current = currentAccueilRoute;

  const ARIA_ROUTES = new Set(['AriaHome', 'AriaConversation', 'AriaScreen']);
  /** Swipe depuis le bord gauche : pas d’ouverture burger (écran plein avec header intégré). */
  const ACCUEIL_NO_BURGER_EDGE_ROUTES = new Set([
    ...ARIA_ROUTES,
    'ProfilEnfant',
    'BienEtreScreen',
  ]);

  const swipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        if (g.dx <= 10 || Math.abs(g.dy) >= g.dx) return false;
        if (showBackRef.current) return true;
        if (
          activeTabRef2.current === 'Accueil' &&
          (currentRouteRef.current === 'ProfilEnfant' ||
            currentRouteRef.current === 'BienEtreScreen')
        )
          return true;
        if (currentRouteRef.current === 'ReglagesScreen') return true;
        if (
          activeTabRef2.current === 'Accueil' &&
          !burgerVisibleRef.current &&
          !ACCUEIL_NO_BURGER_EDGE_ROUTES.has(currentRouteRef.current)
        ) return true;
        return false;
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > 80 && g.vx > 0.2) {
          if (showBackRef.current) {
            goBackRef.current?.();
            setShowBack(false);
          } else if (currentRouteRef.current === 'ReglagesScreen') {
            goBackRef.current?.();
          } else if (
            activeTabRef2.current === 'Accueil' &&
            (currentRouteRef.current === 'ProfilEnfant' ||
              currentRouteRef.current === 'BienEtreScreen')
          ) {
            goBackRef.current?.();
          } else if (
            activeTabRef2.current === 'Accueil' &&
            !burgerVisibleRef.current &&
            !ACCUEIL_NO_BURGER_EDGE_ROUTES.has(currentRouteRef.current)
          ) {
            setBurgerVisible(true);
          }
        }
      },
    })
  ).current;

  return (
    <TopbarScrollContext.Provider value={topbarScrollContextValue}>
      <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
        {/* ── Burger menu — rendered behind, always mounted ── */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: SCREEN_WIDTH * 0.72,
            backgroundColor: '#0F172A',
          }}
        >
          <BurgerMenuContent
            onClose={() => setBurgerVisible(false)}
            onNavigate={(screen) => {
              setBurgerVisible(false);
              setTimeout(() => burgerNavRef.current?.(screen), 200);
            }}
            onLogout={() => {
              setBurgerVisible(false);
              signOut();
            }}
          />
        </View>

        {/* ── Main content — animated scale/translate ── */}
        <Animated.View style={[{ flex: 1 }, mainContentStyle]} {...swipePan.panHandlers}>
          <View style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
            {/* Top blur veil (appears on scroll) */}
            {showNavChrome && (
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: insets.top + 86,
                    zIndex: 15,
                  },
                  topBlurStyle,
                ]}
              >
                <BlurView
                  tint="light"
                  intensity={35}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            )}
            {/* TopBar — toujours en haut sauf écrans plein-écran */}
            {showNavChrome && (
              <TopBar
                activeTab={navActiveTab}
                onAvatarPress={() => {
                  profileNavRef.current?.();
                }}
                hasUnreadMessages={false}
              />
            )}

            {/* Tab content */}
            <TabContentWithNav
              onNavigate={(screen) => {
                setBurgerVisible(false);
                setTimeout(() => burgerNavRef.current?.(screen), 200);
              }}
              onLogout={() => {
                setBurgerVisible(false);
                signOut();
              }}
            />

            {/* Bottom blur veil (appears on scroll, behind pills) */}
            {showNavChrome && (
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: (insets.bottom > 0 ? insets.bottom + 8 : 12) + BOTTOM_BAR_HEIGHT + 28,
                    zIndex: 15,
                  },
                  bottomBlurStyle,
                ]}
              >
                <BlurView tint="light" intensity={35} style={{ flex: 1 }} />
              </Animated.View>
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
                  } else if (navActiveTab !== 'notes') {
                    setQuickActionsVisible(true);
                  }
                }}
              />
            )}

            <QuickSearchScreen
              visible={searchVisible}
              onClose={() => setSearchVisible(false)}
            />
            <QuickActionsSheet
              visible={quickActionsVisible}
              onClose={() => setQuickActionsVisible(false)}
            />

            {/* Child switcher modal */}
            <ChildSwitcherModal
              visible={childSwitcherVisible}
              onClose={() => setChildSwitcherVisible(false)}
            />
          </View>

          {/* Subtle dim overlay when burger is open (keeps page visible) */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#000',
              },
              mainDimStyle,
            ]}
          />

          {/* Tap-to-close overlay when burger menu is open */}
          {burgerVisible && (
            <Pressable
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              onPress={() => setBurgerVisible(false)}
            />
          )}
        </Animated.View>
      </View>
    </TopbarScrollContext.Provider>
  );
}
