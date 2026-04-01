/**
 * TabNavigator — Parent navigation with 4 bottom tabs + burger menu.
 *
 * Redesigned topbar: avatar-based, no logo, no notification bell.
 * Burger menu: dark panel with child selector + sections.
 */

import { useState, useCallback } from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useAuth } from '../contexts/AuthContext';

// Components
import AppTopbar, { type TopbarMode } from '../components/AppTopbar';
import BurgerMenu from '../components/BurgerMenu';
import FloatingTabBar from '../components/FloatingTabBar';

// Main tab screens
import AccueilScreen from '../screens/AccueilScreen';
import NotesScreen from '../screens/NotesScreen';
import AriaScreen from '../screens/AriaScreen';
import AgendaScreen from '../screens/AgendaScreen';

// Absence screen
import SignalerAbsenceScreen from '../screens/SignalerAbsenceScreen';

// Burger menu screens
import SettingsScreen from '../screens/SettingsScreen';
import MonRessentiScreen from '../screens/MonRessentiScreen';
import ScannerBulletinScreen from '../screens/ScannerBulletinScreen';
import ProfilEnfantScreen from '../screens/ProfilEnfantScreen';
import AjouterEnfantScreen from '../screens/AjouterEnfantScreen';
import AjouterAnneScreen from '../screens/AjouterAnneScreen';
import MonParcoursScreen from '../screens/MonParcoursScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

// About screen
import AProposScreen from '../screens/AProposScreen';

// RGPD screens
import PermissionsScreen from '../screens/rgpd/PermissionsScreen';
import JournalAccesScreen from '../screens/rgpd/JournalAccesScreen';
import TransfertCodeScreen from '../screens/rgpd/TransfertCodeScreen';
import EffacementScreen from '../screens/rgpd/EffacementScreen';
import ExportDonneesScreen from '../screens/rgpd/ExportDonneesScreen';

// Placeholder for Cahier Liaison parent view
import CahierLiaisonParent from '../components/profile/CahierLiaisonParent';
import { ScrollView } from 'react-native';
import WallpaperBackground from '../components/WallpaperBackground';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';

function CahierLiaisonPlaceholder() {
  const { selectedChild, selectedChildId } = useActiveChild();
  return (
    <View style={{ flex: 1 }}>
      <WallpaperBackground />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 20 }}>
        <CahierLiaisonParent
          childId={selectedChildId}
          childName={selectedChild.name}
        />
      </ScrollView>
    </View>
  );
}

// ─── Back arrow + active tab refs ───────────────────────

const backArrowRef: { current: { setShowBack: (v: boolean) => void } | null } = { current: null };
const activeTabRef: { current: { setActiveTab: (v: string) => void } | null } = { current: null };
// Title ref for stacked screens
const stackTitleRef: { current: { setTitle: (v: string) => void } | null } = { current: null };

// Screen title mapping for stacked screens
const SCREEN_TITLES: Record<string, string> = {
  CahierLiaisonScreen: 'Cahier de liaison',
  SignalerAbsenceScreen: 'Signaler une absence',
  BienEtreScreen: 'Bien-être',
  ProfilEnfant: 'Profil',
  AjouterEnfant: 'Ajouter un enfant',
  AjouterAnne: 'Ajouter une année',
  MonParcours: 'Mon parcours',
  ReglagesScreen: 'Réglages',
  NotificationsScreen: 'Notifications',
  PermissionsRGPD: 'Permissions',
  JournalAcces: 'Journal d\'accès',
  TransfertCode: 'Code de transfert',
  Effacement: 'Effacement',
  ExportDonnees: 'Export de données',
  APropos: 'À propos',
  AriaScreen: 'Aria ✦',
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
          // Update title for stacked screen
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
      <AccueilStack.Screen name="AccueilHome" component={AccueilScreen} />
      <AccueilStack.Screen name="CahierLiaisonScreen" component={CahierLiaisonPlaceholder} />
      <AccueilStack.Screen name="SignalerAbsenceScreen" component={SignalerAbsenceScreen} />
      <AccueilStack.Screen name="BienEtreScreen" component={MonRessentiScreen} />
      <AccueilStack.Screen name="ProfilEnfant" component={ProfilEnfantScreen} />
      <AccueilStack.Screen name="AjouterEnfant" component={AjouterEnfantScreen} />
      <AccueilStack.Screen name="AjouterAnne" component={AjouterAnneScreen} />
      <AccueilStack.Screen name="MonParcours" component={MonParcoursScreen} />
      <AccueilStack.Screen name="ReglagesScreen" component={SettingsScreen} />
      <AccueilStack.Screen name="NotificationsScreen" component={NotificationsScreen} />
      <AccueilStack.Screen name="PermissionsRGPD" component={PermissionsScreen} />
      <AccueilStack.Screen name="JournalAcces" component={JournalAccesScreen} />
      <AccueilStack.Screen name="TransfertCode" component={TransfertCodeScreen} />
      <AccueilStack.Screen name="Effacement" component={EffacementScreen} />
      <AccueilStack.Screen name="ExportDonnees" component={ExportDonneesScreen} />
      <AccueilStack.Screen name="APropos" component={AProposScreen} />
      <AccueilStack.Screen name="AriaScreen" component={AriaScreen} />
    </AccueilStack.Navigator>
  );
}

const NotesStack = createNativeStackNavigator();
function NotesStackScreen() {
  return (
    <NotesStack.Navigator screenOptions={{ headerShown: false }}>
      <NotesStack.Screen name="NotesHome" component={NotesScreen} />
      <NotesStack.Screen
        name="ScannerBulletin"
        component={ScannerBulletinScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
    </NotesStack.Navigator>
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
      <Tab.Screen name="Accueil" component={AccueilStackScreen} />
      <Tab.Screen name="Notes" component={NotesStackScreen} />
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
    </Tab.Navigator>
  );
}

// ─── Main navigator with topbar + burger ─────────────────

// Nav refs
const burgerNavRef: { current: ((screen: string) => void) | null } = { current: null };
const goBackRef: { current: (() => void) | null } = { current: null };
const settingsNavRef: { current: (() => void) | null } = { current: null };
const ariaNavRef: { current: (() => void) | null } = { current: null };

export default function TabNavigator() {
  const { theme } = useChildTheme();
  const { signOut, user } = useAuth();
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

  // Greeting shows child's first name
  const parentName = selectedChild?.name || 'Parent';

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
      {/* Fixed Topbar — always transparent, zIndex 10 */}
      <AppTopbar
        mode={topbarMode}
        onBurgerPress={() => setBurgerVisible(true)}
        onBackPress={() => { goBackRef.current?.(); setShowBack(false); }}
        title={stackTitle}
        parentName={parentName}
        childName={selectedChild.name}
        childEmoji={selectedChild.avatar}
        accentColor={theme.accent}
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

  settingsNavRef.current = () => {
    navigation.navigate('Accueil', { screen: 'ReglagesScreen' });
  };

  ariaNavRef.current = () => {
    navigation.navigate('Accueil', { screen: 'AriaScreen' });
  };

  burgerNavRef.current = (screen: string) => {
    const routeMap: Record<string, string> = {
      NotesResults: 'Notes',
      CahierLiaison: 'CahierLiaisonScreen',
      Absences: 'SignalerAbsenceScreen',
      BienEtre: 'BienEtreScreen',
      ProfilBadges: 'ProfilEnfant',
      MonParcours: 'MonParcours',
      Permissions: 'PermissionsRGPD',
      Reglages: 'ReglagesScreen',
      Notifications: 'NotificationsScreen',
      RGPD: 'PermissionsRGPD',
      APropos: 'APropos',
    };

    const target = routeMap[screen];
    if (!target) return;

    if (target === 'Notes') {
      navigation.navigate('Notes');
    } else {
      navigation.navigate('Accueil', { screen: target });
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
        onChangeRole={() => { onCloseBurger(); signOut(); }}
        onLogout={() => { onCloseBurger(); signOut(); }}
      />
    </View>
  );
}
