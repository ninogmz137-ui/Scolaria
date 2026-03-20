import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import AccueilScreen from '../screens/AccueilScreen';
import NotesScreen from '../screens/NotesScreen';
import AriaScreen from '../screens/AriaScreen';
import AgendaScreen from '../screens/AgendaScreen';
import ReglagesScreen from '../screens/ReglagesScreen';

const Tab = createBottomTabNavigator();

const tabConfig: Record<string, keyof typeof Ionicons.glyphMap> = {
  Accueil: 'home',
  Notes: 'school',
  Aria: 'sparkles',
  Agenda: 'calendar',
  Réglages: 'settings',
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={tabConfig[route.name]} size={size} color={color} />
        ),
        tabBarActiveTintColor: Colors.cyan,
        tabBarInactiveTintColor: Colors.gray,
        tabBarStyle: {
          backgroundColor: Colors.blueNight,
          borderTopColor: Colors.darkGray,
          borderTopWidth: 1,
          paddingBottom: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: Colors.blueNight,
        },
        headerTintColor: Colors.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Accueil" component={AccueilScreen} />
      <Tab.Screen name="Notes" component={NotesScreen} />
      <Tab.Screen name="Aria" component={AriaScreen} />
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Réglages" component={ReglagesScreen} />
    </Tab.Navigator>
  );
}
