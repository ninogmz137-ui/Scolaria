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

// ─── Stack navigators for sub-screens ────────────────────

const AccueilStack = createNativeStackNavigator();
function AccueilStackScreen() {
  return (
    <AccueilStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.blueNight },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <AccueilStack.Screen
        name="AccueilHome"
        component={AccueilScreen}
        options={{ title: 'Accueil' }}
      />
      <AccueilStack.Screen
        name="MonRessenti"
        component={MonRessentiScreen}
        options={{ title: 'Mon Ressenti' }}
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
    <NotesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.blueNight },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <NotesStack.Screen
        name="NotesHome"
        component={NotesScreen}
        options={{ title: 'Notes' }}
      />
      <NotesStack.Screen
        name="ScannerBulletin"
        component={ScannerBulletinScreen}
        options={{ title: 'Scanner un bulletin' }}
      />
    </NotesStack.Navigator>
  );
}

// ─── Tab navigator (5 onglets) ───────────────────────────

const Tab = createBottomTabNavigator();

const tabConfig: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  Accueil: { icon: 'home', label: 'Accueil' },
  Notes: { icon: 'school', label: 'Notes' },
  Aria: { icon: 'sparkles', label: 'Aria' },
  Agenda: { icon: 'calendar', label: 'Agenda' },
  Réglages: { icon: 'settings', label: 'Réglages' },
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={tabConfig[route.name].icon}
            size={size}
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
