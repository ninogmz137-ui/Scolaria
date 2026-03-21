import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

// Screens
import AccueilScreen from '../screens/AccueilScreen';
import NotesScreen from '../screens/NotesScreen';
import AriaScreen from '../screens/AriaScreen';
import AgendaScreen from '../screens/AgendaScreen';
import ReglagesScreen from '../screens/ReglagesScreen';
import MonRessentiScreen from '../screens/MonRessentiScreen';
import ScannerBulletinScreen from '../screens/ScannerBulletinScreen';
import ProfilEnfantScreen from '../screens/ProfilEnfantScreen';

// ─── Shared stack options with slide animation ──────────

const stackScreenOptions = {
  headerStyle: { backgroundColor: Colors.blueNight },
  headerTintColor: Colors.white,
  headerTitleStyle: { fontWeight: 'bold' as const },
  animation: 'slide_from_right' as const,
  animationDuration: 250,
};

// ─── Stack navigators for sub-screens ────────────────────

const AccueilStack = createNativeStackNavigator();
function AccueilStackScreen() {
  return (
    <AccueilStack.Navigator screenOptions={stackScreenOptions}>
      <AccueilStack.Screen
        name="AccueilHome"
        component={AccueilScreen}
        options={{ title: 'Accueil' }}
      />
      <AccueilStack.Screen
        name="MonRessenti"
        component={MonRessentiScreen}
        options={{
          title: 'Mon Ressenti',
          animation: 'slide_from_bottom',
        }}
      />
      <AccueilStack.Screen
        name="ProfilEnfant"
        component={ProfilEnfantScreen}
        options={{ title: 'Profil Enfant' }}
      />
    </AccueilStack.Navigator>
  );
}

const NotesStack = createNativeStackNavigator();
function NotesStackScreen() {
  return (
    <NotesStack.Navigator screenOptions={stackScreenOptions}>
      <NotesStack.Screen
        name="NotesHome"
        component={NotesScreen}
        options={{ title: 'Notes' }}
      />
      <NotesStack.Screen
        name="ScannerBulletin"
        component={ScannerBulletinScreen}
        options={{
          title: 'Scanner un bulletin',
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
    </NotesStack.Navigator>
  );
}

// ─── Tab navigator (5 onglets) ───────────────────────────

const Tab = createBottomTabNavigator();

const tabConfig: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap; label: string }
> = {
  Accueil: { icon: 'home-outline', iconActive: 'home', label: 'Accueil' },
  Notes: { icon: 'school-outline', iconActive: 'school', label: 'Notes' },
  Aria: { icon: 'sparkles-outline', iconActive: 'sparkles', label: 'Aria' },
  Agenda: { icon: 'calendar-outline', iconActive: 'calendar', label: 'Agenda' },
  Réglages: { icon: 'settings-outline', iconActive: 'settings', label: 'Réglages' },
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? tabConfig[route.name].iconActive : tabConfig[route.name].icon}
            size={focused ? size + 2 : size}
            color={color}
          />
        ),
        tabBarLabel: tabConfig[route.name].label,
        tabBarActiveTintColor: Colors.cyan,
        tabBarInactiveTintColor: Colors.gray,
        tabBarStyle: {
          backgroundColor: Colors.blueNight,
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
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
      <Tab.Screen
        name="Aria"
        component={AriaScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.blueNight },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: 'bold' },
          headerTitle: 'Aria ✦',
        }}
      />
      <Tab.Screen
        name="Agenda"
        component={AgendaScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.blueNight },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Tab.Screen
        name="Réglages"
        component={ReglagesScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.blueNight },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Tab.Navigator>
  );
}
