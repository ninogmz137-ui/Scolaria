/**
 * TabNavigator — Parent navigation with 4 bottom tabs + burger menu.
 *
 * Tabs: Accueil | Notes | Agenda | Messagerie
 * Topbar: avatar-based, greeting on all tabs, back arrow on stacked screens.
 * Burger menu: light panel with 6 items.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';

// Components
import AppTopbar, { type TopbarMode } from '../components/AppTopbar';
import BurgerMenu from '../components/BurgerMenu';
import FloatingTabBar from '../components/FloatingTabBar';

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
import SettingsScreen from '../screens/SettingsScreen';
import ScannerBulletinScreen from '../screens/ScannerBulletinScreen';
import AriaScreen from '../screens/AriaScreen';
import WallpaperPickerScreen from '../screens/WallpaperPickerScreen';

// Messagerie sub-screens
import MessagesListScreen from '../screens/messagerie/MessagesListScreen';
import AbsencesListScreen from '../screens/messagerie/AbsencesListScreen';
import EcoleListScreen from '../screens/messagerie/EcoleListScreen';

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

// ─── Back arrow + active tab refs ───────────────────────

const backArrowRef: { current: { setShowBack: (v: boolean) => void } | null } = { current: null };
const activeTabRef: { current: { setActiveTab: (v: string) => void } | null } = { current: null };
const stackTitleRef: { current: { setTitle: (v: string) => void } | null } = { current: null };

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
  MessagerieAriaScreen: 'Aria',
  WallpaperPicker: "Fond d'écran",
  MessagesListScreen: 'Messages',
  AbsencesListScreen: 'Absences',
  EcoleListScreen: 'École',
};

// ─── Stack navigators ────────────────────────────────────

const AccueilStack = createNativeStackNavigator();
function AccueilStackScreen() {
  return (
    <AccueilStack.Navigator
      screenOptions={{ headerShown: false }}
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
        options={{ title: 'Bien-être' }}
      />
      <AccueilStack.Screen
        name="ProfilEnfant"
        component={ProfilEnfantScreen}
        options={{ title: 'Profil' }}
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
        component={SettingsScreen}
        options={{ title: 'Réglages' }}
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
        name="AriaScreen"
        component={AriaScreen}
        options={{ headerShown: false }}
      />
      <AccueilStack.Screen
        name="WallpaperPicker"
        component={WallpaperPickerScreen}
        options={{ title: "Fond d'écran" }}
      />
    </AccueilStack.Navigator>
  );
}

const NotesStack = createNativeStackNavigator();
function NotesStackScreen() {
  return (
    <NotesStack.Navigator screenOptions={{ headerShown: false }}>
      <NotesStack.Screen
        name="NotesHome"
        component={NotesScreen}
        options={{ headerShown: false }}
      />
      <NotesStack.Screen
        name="ScannerBulletin"
        component={ScannerBulletinScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
    </NotesStack.Navigator>
  );
}

const AgendaStack = createNativeStackNavigator();
function AgendaStackScreen() {
  return (
    <AgendaStack.Navigator screenOptions={{ headerShown: false }}>
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
      screenOptions={{ headerShown: false }}
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
        component={AriaScreen}
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

// ─── Main navigator with topbar + burger ─────────────────

export default function TabNavigator() {
  const { selectedChild } = useActiveChild();
  const [burgerVisible, setBurgerVisible] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [activeTab, setActiveTab] = useState('Accueil');
  const [stackTitle, setStackTitle] = useState('');

  // Register refs
  backArrowRef.current = { setShowBack };
  activeTabRef.current = { setActiveTab };
  stackTitleRef.current = { setTitle: setStackTitle };

  // Determine topbar mode
  const isStackedScreen = showBack;
  const isHome = activeTab === 'Accueil' && !isStackedScreen;
  const topbarMode: TopbarMode = isStackedScreen ? 'stacked' : isHome ? 'home' : 'main';

  return (
    <View style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      {/* Fixed Topbar — always on top, zIndex 10 */}
      <AppTopbar
        mode={topbarMode}
        onBurgerPress={() => setBurgerVisible(true)}
        onBackPress={() => {
          goBackRef.current?.();
          setShowBack(false);
        }}
        title={stackTitle}
        childName={selectedChild.name}
        childPhotoUrl={selectedChild.avatarPhotoUri ?? null}
        isHomeTab={isHome}
        onAriaPress={() => ariaNavRef.current?.()}
      />

      {/* Tab content */}
      <TabContentWithBurger
        burgerVisible={burgerVisible}
        onCloseBurger={() => setBurgerVisible(false)}
      />
    </View>
  );
}

function TabContentWithBurger({
  burgerVisible,
  onCloseBurger,
}: {
  burgerVisible: boolean;
  onCloseBurger: () => void;
}) {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();

  goBackRef.current = () => {
    navigation.dispatch(CommonActions.goBack());
  };

  ariaNavRef.current = () => {
    navigation.navigate('Accueil', { screen: 'AriaScreen' });
  };

  burgerNavRef.current = (screen: string) => {
    const routeMap: Record<string, { tab?: string; screen?: string }> = {
      ProfilEnfant: { tab: 'Accueil', screen: 'ProfilEnfant' },
      MonParcours: { tab: 'Accueil', screen: 'MonParcours' },
      BienEtre: { tab: 'Accueil', screen: 'BienEtreScreen' },
      WallpaperPicker: { tab: 'Accueil', screen: 'WallpaperPicker' },
      ReglagesScreen: { tab: 'Accueil', screen: 'ReglagesScreen' },
      RGPDScreen:     { tab: 'Accueil', screen: 'RGPDScreen' },
    };

    const target = routeMap[screen];
    if (!target) return;

    if (target.screen) {
      navigation.navigate(target.tab ?? 'Accueil', { screen: target.screen });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <TabContent />
      <BurgerMenu
        visible={burgerVisible}
        onClose={onCloseBurger}
        onNavigate={(screen) => {
          onCloseBurger();
          setTimeout(() => burgerNavRef.current?.(screen), 200);
        }}
        onLogout={() => {
          onCloseBurger();
          signOut();
        }}
      />
    </View>
  );
}
