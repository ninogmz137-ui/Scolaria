import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import AccueilScreen from '../screens/AccueilScreen';
import NotesScreen from '../screens/NotesScreen';
import AriaScreen from '../screens/AriaScreen';
import AgendaScreen from '../screens/AgendaScreen';
import ReglagesScreen from '../screens/ReglagesScreen';
import MonRessentiScreen from '../screens/MonRessentiScreen';
import ProfilEnfantScreen from '../screens/ProfilEnfantScreen';

// About screen
import AProposScreen from '../screens/AProposScreen';

// RGPD screens
import PermissionsScreen from '../screens/rgpd/PermissionsScreen';
import JournalAccesScreen from '../screens/rgpd/JournalAccesScreen';
import TransfertCodeScreen from '../screens/rgpd/TransfertCodeScreen';
import EffacementScreen from '../screens/rgpd/EffacementScreen';
import ExportDonneesScreen from '../screens/rgpd/ExportDonneesScreen';

// ─── Stack navigators ────────────────────────────────────

const ProfilStack = createNativeStackNavigator();
function ProfilStackScreen() {
  const { theme } = useSchoolMode();
  const stackOpts = {
    headerStyle: { backgroundColor: theme.bg },
    headerTintColor: theme.textPrimary,
    headerTitleStyle: { fontWeight: 'bold' as const },
    animation: 'slide_from_right' as const,
    animationDuration: 250,
  };

  return (
    <ProfilStack.Navigator screenOptions={stackOpts}>
      <ProfilStack.Screen
        name="MonProfilHome"
        component={ProfilEnfantScreen}
        options={{ title: 'Mon profil' }}
      />
    </ProfilStack.Navigator>
  );
}

const NotesEleveStack = createNativeStackNavigator();
function NotesEleveStackScreen() {
  const { theme } = useSchoolMode();
  const stackOpts = {
    headerStyle: { backgroundColor: theme.bg },
    headerTintColor: theme.textPrimary,
    headerTitleStyle: { fontWeight: 'bold' as const },
    animation: 'slide_from_right' as const,
    animationDuration: 250,
  };

  return (
    <NotesEleveStack.Navigator screenOptions={stackOpts}>
      <NotesEleveStack.Screen
        name="MesNotesHome"
        component={NotesScreen}
        options={{ title: 'Mes notes' }}
      />
    </NotesEleveStack.Navigator>
  );
}

const RessentiStack = createNativeStackNavigator();
function RessentiStackScreen() {
  const { theme } = useSchoolMode();
  const stackOpts = {
    headerStyle: { backgroundColor: theme.bg },
    headerTintColor: theme.textPrimary,
    headerTitleStyle: { fontWeight: 'bold' as const },
    animation: 'slide_from_right' as const,
    animationDuration: 250,
  };

  return (
    <RessentiStack.Navigator screenOptions={stackOpts}>
      <RessentiStack.Screen
        name="MonRessentiHome"
        component={MonRessentiScreen}
        options={{ title: 'Mon ressenti' }}
      />
    </RessentiStack.Navigator>
  );
}

const ReglagesEleveStack = createNativeStackNavigator();
function ReglagesEleveStackScreen() {
  const { theme } = useSchoolMode();
  const stackOpts = {
    headerStyle: { backgroundColor: theme.bg },
    headerTintColor: theme.textPrimary,
    headerTitleStyle: { fontWeight: 'bold' as const },
    animation: 'slide_from_right' as const,
    animationDuration: 250,
  };

  return (
    <ReglagesEleveStack.Navigator screenOptions={stackOpts}>
      <ReglagesEleveStack.Screen
        name="ReglagesHome"
        component={ReglagesScreen}
        options={{ title: 'Réglages' }}
      />
      <ReglagesEleveStack.Screen
        name="PermissionsRGPD"
        component={PermissionsScreen}
        options={{ title: "Permissions d'accès" }}
      />
      <ReglagesEleveStack.Screen
        name="JournalAcces"
        component={JournalAccesScreen}
        options={{ title: "Journal d'accès" }}
      />
      <ReglagesEleveStack.Screen
        name="TransfertCode"
        component={TransfertCodeScreen}
        options={{ title: 'Code de transfert' }}
      />
      <ReglagesEleveStack.Screen
        name="Effacement"
        component={EffacementScreen}
        options={{ title: "Droit à l'effacement" }}
      />
      <ReglagesEleveStack.Screen
        name="ExportDonnees"
        component={ExportDonneesScreen}
        options={{ title: 'Export des données' }}
      />
      <ReglagesEleveStack.Screen
        name="APropos"
        component={AProposScreen}
        options={{ title: 'À propos' }}
      />
    </ReglagesEleveStack.Navigator>
  );
}

// ─── Tab navigator ───────────────────────────────────────

const Tab = createBottomTabNavigator();

const tabIcons: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }
> = {
  Profil: { icon: 'person-outline', iconActive: 'person' },
  Notes: { icon: 'school-outline', iconActive: 'school' },
  Ressenti: { icon: 'heart-outline', iconActive: 'heart' },
  Aria: { icon: 'sparkles-outline', iconActive: 'sparkles' },
  Réglages: { icon: 'settings-outline', iconActive: 'settings' },
};

export default function EleveTabNavigator() {
  const { theme } = useSchoolMode();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? tabIcons[route.name].iconActive : tabIcons[route.name].icon}
            size={focused ? size + 2 : size}
            color={color}
          />
        ),
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.tabBg,
          borderTopColor: theme.tabBorder,
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, 5),
          paddingTop: 5,
          height: 62 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Profil" component={ProfilStackScreen} options={{ tabBarLabel: 'Mon profil' }} />
      <Tab.Screen name="Notes" component={NotesEleveStackScreen} options={{ tabBarLabel: 'Mes notes' }} />
      <Tab.Screen name="Ressenti" component={RessentiStackScreen} options={{ tabBarLabel: 'Ressenti' }} />
      <Tab.Screen
        name="Aria"
        component={AriaScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.textPrimary,
          headerTitleStyle: { fontWeight: 'bold' },
          headerTitle: theme.ariaLabel,
        }}
      />
      <Tab.Screen name="Réglages" component={ReglagesEleveStackScreen} />
    </Tab.Navigator>
  );
}
