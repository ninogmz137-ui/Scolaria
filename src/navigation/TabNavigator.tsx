/**
 * TabNavigator — Parent navigation with 4 bottom tabs + burger menu.
 *
 * Bottom tabs: Accueil, Notes, Aria, Agenda
 * Burger menu: Cahier liaison, Bien-être, Profil & Badges, Archives, RGPD, etc.
 * Topbar: burger button, child pill selector, notification bell
 */

import { useState, useCallback } from 'react';
import { View, Modal, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useAuth } from '../contexts/AuthContext';

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
const activeTabRef: { current: { setActiveTab: (v: string) => void } | null } = { current: null };

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
      <AccueilStack.Screen name="MonParcours" component={MonParcoursScreen} />
      {/* RGPD & settings screens */}
      <AccueilStack.Screen name="ReglagesScreen" component={SettingsScreen} />
      <AccueilStack.Screen name="NotificationsScreen" component={NotificationsScreen} />
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
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenListeners={{
        tabPress: (e) => {
          // Reset back arrow when switching tabs
          backArrowRef.current?.setShowBack(false);
          // Track active tab for transparent topbar on Accueil
          const tabName = e.target?.split('-')[0] ?? '';
          activeTabRef.current?.setActiveTab(tabName);
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
          paddingBottom: Math.max(insets.bottom, 5),
          paddingTop: 8,
          height: 62 + insets.bottom,
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

// Ref so burger nav handler can open the child selector
const childSelectorRef: { current: (() => void) | null } = { current: null };

export default function TabNavigator() {
  const { theme } = useChildTheme();
  const { signOut } = useAuth();
  const { selectedChild, children: childList, selectChild } = useActiveChild();
  const [burgerVisible, setBurgerVisible] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [activeTab, setActiveTab] = useState('Accueil');
  const [childSelectorVisible, setChildSelectorVisible] = useState(false);

  // Register the back-arrow state setter
  backArrowRef.current = { setShowBack };
  // Register the active tab setter for child components
  activeTabRef.current = { setActiveTab };
  // Register child selector opener for burger menu
  childSelectorRef.current = () => setChildSelectorVisible(true);

  const handleBurgerNavigate = useCallback((screen: string) => {
    // This is handled via the ref approach below
    burgerNavRef.current?.(screen);
  }, []);

  // Topbar is transparent (overlaid) when on AccueilHome — dark header shows through
  const isAccueilHome = activeTab === 'Accueil' && !showBack;

  return (
    <View style={{ flex: 1, backgroundColor: '#E8EDF5' }}>
      {/* Fixed Topbar — transparent on Accueil home so dark header shows through */}
      <AppTopbar
        onBurgerPress={() => setBurgerVisible(true)}
        showBack={showBack}
        onBackPress={() => { goBackRef.current?.(); setShowBack(false); }}
        notificationCount={0}
        onNotificationPress={() => notifNavRef.current?.()}
        onLogoPress={() => logoNavRef.current?.()}
        transparent={isAccueilHome}
        childName={selectedChild.name}
        childAvatar={selectedChild.avatar}
        onChildPress={() => setChildSelectorVisible(true)}
      />

      {/* Tab content */}
      <TabContentWithBurger
        burgerVisible={burgerVisible}
        onCloseBurger={() => setBurgerVisible(false)}
      />

      {/* Child selector modal (triggered by topbar pill or burger "Changer d'enfant") */}
      <Modal
        visible={childSelectorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChildSelectorVisible(false)}
        statusBarTranslucent
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: Platform.OS === 'ios' ? 34 : 20,
              maxHeight: Dimensions.get('window').height * 0.5,
            }}
          >
            {/* Handle */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' }} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 14 }}>
              Changer d'enfant
            </Text>
            {childList.map((child) => {
              const isSelected = child.id === selectedChild.id;
              return (
                <View
                  key={child.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    marginBottom: 6,
                    backgroundColor: isSelected ? '#EEF2FF' : '#F8FAFC',
                    borderWidth: 1.5,
                    borderColor: isSelected ? '#6366F1' : '#EEF0F5',
                  }}
                >
                  <View
                    onTouchEnd={() => {
                      selectChild(child.id);
                      setChildSelectorVisible(false);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                  >
                    <Text style={{ fontSize: 28, marginRight: 12 }}>{child.avatar}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>{child.name}</Text>
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{child.classe}</Text>
                    </View>
                    {isSelected && (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>✓</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Nav ref for burger menu navigation
const burgerNavRef: { current: ((screen: string) => void) | null } = { current: null };
// Nav ref for back button
const goBackRef: { current: (() => void) | null } = { current: null };
// Nav ref for notification bell
const notifNavRef: { current: (() => void) | null } = { current: null };
// Nav ref for logo → home
const logoNavRef: { current: (() => void) | null } = { current: null };

function TabContentWithBurger({
  burgerVisible,
  onCloseBurger,
}: {
  burgerVisible: boolean;
  onCloseBurger: () => void;
}) {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();

  // Register the go-back function for topbar back arrow
  goBackRef.current = () => {
    // Navigate to Accueil tab first, then pop the stack to root
    navigation.navigate('Accueil');
    // Dispatch a pop action within the Accueil stack
    navigation.dispatch(CommonActions.goBack());
  };

  // Register the notification nav function
  notifNavRef.current = () => {
    navigation.navigate('Accueil', { screen: 'NotificationsScreen' });
  };

  // Register logo → home nav function
  logoNavRef.current = () => {
    navigation.navigate('Accueil', { screen: 'AccueilHome' });
  };

  // Register the nav function for burger
  burgerNavRef.current = (screen: string) => {
    const routeMap: Record<string, string> = {
      NotesResults: 'Notes',
      CahierLiaison: 'CahierLiaisonScreen',
      Absences: 'SignalerAbsenceScreen',
      BienEtre: 'BienEtreScreen',
      ProfilBadges: 'ProfilEnfant',
      MonParcours: 'MonParcours',
      ChangerEnfant: '__CHILD_SELECTOR__', // Opens child selector modal
      Permissions: 'PermissionsRGPD',
      Reglages: 'ReglagesScreen',
      Notifications: 'NotificationsScreen',
      RGPD: 'PermissionsRGPD',
      APropos: 'APropos',
    };

    const target = routeMap[screen];
    if (!target) return;

    // Special: open child selector modal instead of navigating
    if (target === '__CHILD_SELECTOR__') {
      childSelectorRef.current?.();
      return;
    }

    // Navigate to tab or stack screen
    if (target === 'Notes') {
      navigation.navigate('Notes');
    } else {
      // Navigate within the Accueil stack
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
