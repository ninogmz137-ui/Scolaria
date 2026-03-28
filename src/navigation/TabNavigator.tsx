/**
 * TabNavigator — Parent navigation with 4 bottom tabs + burger menu.
 *
 * Bottom tabs: Accueil, Notes, Aria, Agenda
 * Burger menu: Cahier liaison, Bien-être, Profil & Badges, Archives, RGPD, etc.
 * Topbar: burger button, child pill selector, notification bell
 */

import { useState, useCallback } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';

// Components
import AppTopbar from '../components/AppTopbar';
import BurgerMenu from '../components/BurgerMenu';

// Main tab screens
import AccueilScreen from '../screens/AccueilScreen';
import NotesScreen from '../screens/NotesScreen';
import AriaScreen from '../screens/AriaScreen';
import AgendaScreen from '../screens/AgendaScreen';

// Absence screen
import SignalerAbsenceScreen from '../screens/SignalerAbsenceScreen';

// Burger menu screens
import ReglagesScreen from '../screens/ReglagesScreen';
import MonRessentiScreen from '../screens/MonRessentiScreen';
import ScannerBulletinScreen from '../screens/ScannerBulletinScreen';
import ProfilEnfantScreen from '../screens/ProfilEnfantScreen';
import AjouterEnfantScreen from '../screens/AjouterEnfantScreen';
import AjouterAnneScreen from '../screens/AjouterAnneScreen';

// About screen
import AProposScreen from '../screens/AProposScreen';

// RGPD screens
import PermissionsScreen from '../screens/rgpd/PermissionsScreen';
import JournalAccesScreen from '../screens/rgpd/JournalAccesScreen';
import TransfertCodeScreen from '../screens/rgpd/TransfertCodeScreen';
import EffacementScreen from '../screens/rgpd/EffacementScreen';
import ExportDonneesScreen from '../screens/rgpd/ExportDonneesScreen';

// ─── Active indicator bar style ──────────────────────────

function TabBarIcon({ name, color, size, focused }: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  focused: boolean;
}) {
  return (
    <View style={{ alignItems: 'center' }}>
      {focused && (
        <View style={{
          width: 24,
          height: 3,
          borderRadius: 1.5,
          backgroundColor: color,
          marginBottom: 4,
          position: 'absolute',
          top: -8,
        }} />
      )}
      <Ionicons name={name} size={focused ? size + 2 : size} color={color} />
    </View>
  );
}

// ─── Back arrow state ref (shared between topbar and stack) ──

const backArrowRef: { current: { setShowBack: (v: boolean) => void } | null } = { current: null };

// ─── Stack navigators ────────────────────────────────────

const AccueilStack = createNativeStackNavigator();
function AccueilStackScreen() {
  return (
    <AccueilStack.Navigator
      screenOptions={{ headerShown: false }}
      screenListeners={{
        state: (e) => {
          const data = e.data as any;
          const index = data?.state?.index ?? 0;
          backArrowRef.current?.setShowBack(index > 0);
        },
        focus: (e) => {
          // When AccueilHome is focused directly (e.g. tab press), reset back
          if (e.target?.includes('AccueilHome')) {
            backArrowRef.current?.setShowBack(false);
          }
        },
      }}
    >
      <AccueilStack.Screen name="AccueilHome" component={AccueilScreen} />
      {/* Screens accessible from Accueil tiles or burger */}
      <AccueilStack.Screen name="CahierLiaisonScreen" component={CahierLiaisonPlaceholder} />
      <AccueilStack.Screen name="SignalerAbsenceScreen" component={SignalerAbsenceScreen} />
      <AccueilStack.Screen name="BienEtreScreen" component={MonRessentiScreen} />
      <AccueilStack.Screen name="ProfilEnfant" component={ProfilEnfantScreen} />
      <AccueilStack.Screen name="AjouterEnfant" component={AjouterEnfantScreen} />
      <AccueilStack.Screen name="AjouterAnne" component={AjouterAnneScreen} />
      {/* RGPD & settings screens */}
      <AccueilStack.Screen name="NotificationsScreen" component={ReglagesScreen} />
      <AccueilStack.Screen name="PermissionsRGPD" component={PermissionsScreen} />
      <AccueilStack.Screen name="JournalAcces" component={JournalAccesScreen} />
      <AccueilStack.Screen name="TransfertCode" component={TransfertCodeScreen} />
      <AccueilStack.Screen name="Effacement" component={EffacementScreen} />
      <AccueilStack.Screen name="ExportDonnees" component={ExportDonneesScreen} />
      <AccueilStack.Screen name="APropos" component={AProposScreen} />
    </AccueilStack.Navigator>
  );
}

// Placeholder for Cahier Liaison parent view (standalone screen)
import CahierLiaisonParent from '../components/profile/CahierLiaisonParent';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Colors } from '../constants/colors';

function CahierLiaisonPlaceholder() {
  const { selectedChild, selectedChildId } = useActiveChild();
  const { theme } = useChildTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <CahierLiaisonParent
          childId={selectedChildId}
          childName={selectedChild.name}
          accentColor={theme.accent}
        />
      </ScrollView>
    </View>
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

const TAB_ICONS: Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}> = {
  Accueil: { icon: 'home-outline', iconActive: 'home' },
  Notes: { icon: 'bar-chart-outline', iconActive: 'bar-chart' },
  Aria: { icon: 'sparkles-outline', iconActive: 'sparkles' },
  Agenda: { icon: 'calendar-outline', iconActive: 'calendar' },
};

function TabContent() {
  const { theme } = useChildTheme();

  return (
    <Tab.Navigator
      screenListeners={{
        tabPress: () => {
          // Reset back arrow when switching tabs
          backArrowRef.current?.setShowBack(false);
        },
      }}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => (
          <TabBarIcon
            name={focused ? TAB_ICONS[route.name].iconActive : TAB_ICONS[route.name].icon}
            color={color}
            size={size}
            focused={focused}
          />
        ),
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.tabBg,
          borderTopColor: theme.tabBorder,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 8,
          height: 62,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Accueil" component={AccueilStackScreen} />
      <Tab.Screen name="Notes" component={NotesStackScreen} />
      <Tab.Screen name="Aria" component={AriaScreen} />
      <Tab.Screen name="Agenda" component={AgendaScreen} />
    </Tab.Navigator>
  );
}

// ─── Main navigator with topbar + burger ─────────────────

export default function TabNavigator() {
  const { theme } = useChildTheme();
  const [burgerVisible, setBurgerVisible] = useState(false);
  const [showBack, setShowBack] = useState(false);

  // Register the back-arrow state setter
  backArrowRef.current = { setShowBack };

  const handleBurgerNavigate = useCallback((screen: string) => {
    // This is handled via the ref approach below
    burgerNavRef.current?.(screen);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F8FC' }}>
      {/* Fixed Topbar */}
      <AppTopbar
        onBurgerPress={() => setBurgerVisible(true)}
        showBack={showBack}
        onBackPress={() => { goBackRef.current?.(); setShowBack(false); }}
        notificationCount={3}
      />

      {/* Tab content */}
      <TabContentWithBurger
        burgerVisible={burgerVisible}
        onCloseBurger={() => setBurgerVisible(false)}
      />
    </View>
  );
}

// Nav ref for burger menu navigation
const burgerNavRef: { current: ((screen: string) => void) | null } = { current: null };
// Nav ref for back button
const goBackRef: { current: (() => void) | null } = { current: null };

function TabContentWithBurger({
  burgerVisible,
  onCloseBurger,
}: {
  burgerVisible: boolean;
  onCloseBurger: () => void;
}) {
  const navigation = useNavigation<any>();

  // Register the go-back function for topbar back arrow
  goBackRef.current = () => {
    // Navigate to Accueil tab first, then pop the stack to root
    navigation.navigate('Accueil');
    // Dispatch a pop action within the Accueil stack
    navigation.dispatch(CommonActions.goBack());
  };

  // Register the nav function for burger
  burgerNavRef.current = (screen: string) => {
    const routeMap: Record<string, string> = {
      NotesResults: 'Notes',
      CahierLiaison: 'CahierLiaisonScreen',
      Absences: 'SignalerAbsenceScreen',
      BienEtre: 'BienEtreScreen',
      ProfilBadges: 'ProfilEnfant',
      Archives: 'ProfilEnfant', // Archives are in ProfilEnfant via year selector
      ChangerEnfant: '', // Handled by topbar pill
      Permissions: 'PermissionsRGPD',
      Notifications: 'NotificationsScreen',
      RGPD: 'PermissionsRGPD',
      APropos: 'APropos',
    };

    const target = routeMap[screen];
    if (!target) return;

    // Navigate to tab or stack screen
    if (target === 'Notes') {
      navigation.navigate('Notes');
    } else {
      // Navigate within the Accueil stack
      navigation.navigate('Accueil', { screen: target });
    }
  };

  return (
    <>
      <TabContent />
      <BurgerMenu
        visible={burgerVisible}
        onClose={onCloseBurger}
        onNavigate={(screen) => {
          onCloseBurger();
          setTimeout(() => burgerNavRef.current?.(screen), 200);
        }}
      />
    </>
  );
}
