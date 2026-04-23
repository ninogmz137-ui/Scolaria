/**
 * TabNavigator — Parent navigation with 4 bottom tabs + burger menu.
 *
 * Tabs: Accueil | Notes | Agenda | Messagerie
 *
 * Topbar visibility:
 *   - Accueil root (home mode): shown — burger left, greeting center, settings right
 *   - Stacked screens (any tab): shown — back arrow left, title center, empty right
 *   - Notes / Agenda / Messagerie roots: HIDDEN
 *
 * Burger menu: slide & scale effect — main content scales to 0.85 and
 * translates right while the dark menu panel is revealed behind it.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, Dimensions, PanResponder } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';

// Components
import AppTopbar, { type TopbarMode } from '../components/AppTopbar';
import { BurgerMenuContent } from '../components/BurgerMenu';
import FloatingTabBar from '../components/FloatingTabBar';

// Topbar scroll context
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

// RGPD hub
import RGPDScreen from '../screens/RGPDScreen';

// RGPD screens
import PermissionsScreen from '../screens/rgpd/PermissionsScreen';
import JournalAccesScreen from '../screens/rgpd/JournalAccesScreen';
import TransfertCodeScreen from '../screens/rgpd/TransfertCodeScreen';
import EffacementScreen from '../screens/rgpd/EffacementScreen';
import ExportDonneesScreen from '../screens/rgpd/ExportDonneesScreen';

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
};

// ─── Stack navigators ────────────────────────────────────

const AccueilStack = createNativeStackNavigator();
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
          const isReglagesModal = routeName === 'ReglagesScreen';
          const hasScreenHeaderBack =
            routeName === 'ProfilEnfant' || routeName === 'BienEtreScreen';
          backArrowRef.current?.setShowBack(
            index > 0 && !isReglagesModal && !hasScreenHeaderBack,
          );
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
        options={{ title: 'Permissions' }}
      />
      <AccueilStack.Screen
        name="JournalAcces"
        component={JournalAccesScreen}
        options={{ title: "Journal d'accès" }}
      />
      <AccueilStack.Screen
        name="TransfertCode"
        component={TransfertCodeScreen}
        options={{ title: 'Code de transfert' }}
      />
      <AccueilStack.Screen
        name="Effacement"
        component={EffacementScreen}
        options={{ title: 'Effacement' }}
      />
      <AccueilStack.Screen
        name="ExportDonnees"
        component={ExportDonneesScreen}
        options={{ title: 'Export de données' }}
      />
      <AccueilStack.Screen
        name="APropos"
        component={AProposScreen}
        options={{ title: 'À propos' }}
      />
      <AccueilStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Mon profil' }}
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
    </AccueilStack.Navigator>
  );
}

const NotesStack = createNativeStackNavigator();
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
    </NotesStack.Navigator>
  );
}

const AgendaStack = createNativeStackNavigator();
function AgendaStackScreen() {
  return (
    <AgendaStack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true }}>
      <AgendaStack.Screen
        name="AgendaHome"
        component={AgendaScreen}
        options={{ headerShown: false }}
      />
    </AgendaStack.Navigator>
  );
}

const MessagerieStack = createNativeStackNavigator();
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
    </MessagerieStack.Navigator>
  );
}

// ─── Tab navigator (4 tabs) ──────────────────────────────

const Tab = createBottomTabNavigator();

function TabContent() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenListeners={{
        tabPress: (e) => {
          backArrowRef.current?.setShowBack(false);
          const tabName = e.target?.split('-')[0] ?? '';
          activeTabRef.current?.setActiveTab(tabName);
        },
        state: (e) => {
          // Also track tab changes from programmatic navigation (e.g. avatar → Accueil)
          const data = e.data as any;
          const routes = data?.state?.routes;
          const index = data?.state?.index ?? 0;
          if (routes?.[index]) {
            activeTabRef.current?.setActiveTab(routes[index].name);
          }
        },
      }}
      screenOptions={{
        headerShown: false,
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

  ariaNavRef.current = () => {
    navigation.navigate('Accueil', { screen: 'AriaHome' });
  };

  burgerNavRef.current = (screen: string) => {
    const routeMap: Record<string, { tab?: string; screen?: string }> = {
      ProfilEnfant: { tab: 'Accueil', screen: 'ProfilEnfant' },
      MonParcours: { tab: 'Accueil', screen: 'MonParcours' },
      BienEtreScreen: { tab: 'Accueil', screen: 'BienEtreScreen' },
      WallpaperPicker: { tab: 'Accueil', screen: 'WallpaperPicker' },
      ReglagesScreen: { tab: 'Accueil', screen: 'ReglagesScreen' },
      RGPDScreen: { tab: 'Accueil', screen: 'RGPDScreen' },
    };

    const target = routeMap[screen];
    if (!target) return;

    if (target.screen) {
      navigation.navigate(target.tab ?? 'Accueil', { screen: target.screen });
    }
  };

  return <TabContent />;
}

// ─── Main navigator with topbar + burger ─────────────────

export default function TabNavigator() {
  const { selectedChild } = useActiveChild();
  const { signOut } = useAuth();
  const [burgerVisible, setBurgerVisible] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [activeTab, setActiveTab] = useState('Accueil');
  const [stackTitle, setStackTitle] = useState('');
  const [currentAccueilRoute, setCurrentAccueilRoute] = useState('AccueilHome');

  // ── Topbar scroll-to-hide ─────────────────────────────
  const topbarTranslateY = useSharedValue(0);
  const lastScrollY = useRef(0);

  // Register refs
  backArrowRef.current = { setShowBack };
  activeTabRef.current = { setActiveTab: (tab: string) => {
    setActiveTab(tab);
    // Reset topbar when returning to Accueil tab
    if (tab === 'Accueil') {
      topbarTranslateY.value = withTiming(0, { duration: 200 });
    }
  }};
  stackTitleRef.current = { setTitle: setStackTitle };
  currentAccueilRouteRef.current = { setRouteName: setCurrentAccueilRoute };

  // Topbar visibility logic:
  //   - Accueil tab root → 'home' mode
  //   - Any stacked screen → 'stacked' mode
  //   - Notes / Agenda / Messagerie roots → hidden
  const isStackedScreen = showBack;
  const isAccueilRoot = activeTab === 'Accueil' && !isStackedScreen;
  /** Accueil stack: own header / no AppTopbar (Aria, profil élève, mon ressenti). */
  const accueilNoAppTopbarRoutes = new Set([
    'AriaHome',
    'AriaConversation',
    'AriaScreen',
    'ProfilEnfant',
    'BienEtreScreen',
  ]);
  const hideTopbarForThisScreen =
    activeTab === 'Accueil' && accueilNoAppTopbarRoutes.has(currentAccueilRoute);
  const showTopbar = (isAccueilRoot || isStackedScreen) && !hideTopbarForThisScreen;
  const topbarMode: TopbarMode = isStackedScreen ? 'stacked' : 'home';

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

  const topbarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: topbarTranslateY.value }],
  }));

  const showBackRef = useRef(showBack);
  showBackRef.current = showBack;
  /** Assez grand pour cacher "Bonjour, Prénom" + insets (voir AppTopbar). */
  const TOPBAR_HIDE_OFFSET = 130;

  // Called by AccueilScreen on scroll — masque la topbar en descendant, réaffiche en remontant
  const handleAccueilScroll = useCallback((y: number) => {
    if (showBackRef.current) return;
    if (y < 6) {
      lastScrollY.current = 0;
      topbarTranslateY.value = withTiming(0, { duration: 200 });
      return;
    }
    const prev = lastScrollY.current;
    lastScrollY.current = y;
    const goingDown = y > prev + 1.5;
    const goingUp = y < prev - 1.5;
    if (goingDown && y > 8) {
      topbarTranslateY.value = withTiming(-TOPBAR_HIDE_OFFSET, { duration: 220 });
    } else if (goingUp) {
      topbarTranslateY.value = withTiming(0, { duration: 220 });
    }
  }, [topbarTranslateY]);

  const topbarScrollContextValue = { onScroll: handleAccueilScroll };

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
      onStartShouldSetPanResponder: (evt) => {
        if (evt.nativeEvent.pageX >= 40) return false;
        // Swipe-back : écran stacké
        if (showBackRef.current) return true;
        // Profil / Mon ressenti : retour (topbar masquée, pas de showBack)
        if (
          activeTabRef2.current === 'Accueil' &&
          (currentRouteRef.current === 'ProfilEnfant' ||
            currentRouteRef.current === 'BienEtreScreen')
        )
          return true;
        // Fermer la feuille Réglages (modal transparent)
        if (currentRouteRef.current === 'ReglagesScreen') return true;
        // Ouvrir burger : accueil racine, burger fermé, pas sur écrans plein
        if (
          activeTabRef2.current === 'Accueil' &&
          !burgerVisibleRef.current &&
          !ACCUEIL_NO_BURGER_EDGE_ROUTES.has(currentRouteRef.current)
        ) return true;
        return false;
      },
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
            {/* Topbar: only on Accueil root and stacked screens */}
            {showTopbar && (
              <Animated.View style={[
                { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
                // Only apply scroll-to-hide on Accueil home (not stacked screens)
                isAccueilRoot ? topbarAnimatedStyle : undefined,
              ]}>
                <AppTopbar
                  mode={topbarMode}
                  onBurgerPress={() => setBurgerVisible(true)}
                  onBackPress={() => {
                    goBackRef.current?.();
                    setShowBack(false);
                  }}
                  title={stackTitle}
                  childName={selectedChild.name}
                  childPhotoUrl={
                    selectedChild.avatarType === 'emoji' && selectedChild.avatarEmoji
                      ? `emoji:${selectedChild.avatarEmoji}`
                      : selectedChild.avatarPhotoUri ?? null
                  }
                  isHomeTab={isAccueilRoot}
                  onSettingsPress={() => {
                    burgerNavRef.current?.('ReglagesScreen');
                  }}
                />
              </Animated.View>
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
