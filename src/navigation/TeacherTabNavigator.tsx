import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Teacher screens
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import AppreciationsScreen from '../screens/teacher/AppreciationsScreen';
import MeteoClasseScreen from '../screens/teacher/MeteoClasseScreen';
import VieDeClasseScreen from '../screens/teacher/VieDeClasseScreen';
import MessagerieParentsScreen from '../screens/teacher/MessagerieParentsScreen';
import CahierLiaisonScreen from '../screens/teacher/CahierLiaisonScreen';
import AbsencesEnseignantScreen from '../screens/teacher/AbsencesEnseignantScreen';
import ReglagesScreen from '../screens/ReglagesScreen';

// About screen
import AProposScreen from '../screens/AProposScreen';

// RGPD screens
import PermissionsScreen from '../screens/rgpd/PermissionsScreen';
import JournalAccesScreen from '../screens/rgpd/JournalAccesScreen';
import TransfertCodeScreen from '../screens/rgpd/TransfertCodeScreen';
import EffacementScreen from '../screens/rgpd/EffacementScreen';
import ExportDonneesScreen from '../screens/rgpd/ExportDonneesScreen';

// ─── Color constants ─────────────────────────────────────

const TEACHER_ORANGE = '#FF8C42';
const TEACHER_BG = '#F7F8FC';
const TEACHER_CARD = '#FFFFFF';

const STACK_OPTS = {
  headerStyle: { backgroundColor: TEACHER_BG },
  headerTintColor: '#0F172A',
  headerTitleStyle: { fontWeight: 'bold' as const },
  animation: 'slide_from_right' as const,
  animationDuration: 250,
};

// ─── Stack navigators ────────────────────────────────────

const DashboardStack = createNativeStackNavigator();
function DashboardStackScreen() {
  return (
    <DashboardStack.Navigator screenOptions={STACK_OPTS}>
      <DashboardStack.Screen name="TeacherDashboardHome" component={TeacherDashboardScreen} options={{ title: 'Ma classe' }} />
      <DashboardStack.Screen name="AbsencesEnseignant" component={AbsencesEnseignantScreen} options={{ title: 'Absences' }} />
    </DashboardStack.Navigator>
  );
}

const AppreciationsStack = createNativeStackNavigator();
function AppreciationsStackScreen() {
  return (
    <AppreciationsStack.Navigator screenOptions={STACK_OPTS}>
      <AppreciationsStack.Screen name="AppreciationsHome" component={AppreciationsScreen} options={{ title: 'Appréciations' }} />
    </AppreciationsStack.Navigator>
  );
}

const ClasseStack = createNativeStackNavigator();
function ClasseStackScreen() {
  return (
    <ClasseStack.Navigator screenOptions={STACK_OPTS}>
      <ClasseStack.Screen name="MeteoHome" component={MeteoClasseScreen} options={{ title: 'Météo de classe' }} />
      <ClasseStack.Screen name="VieDeClasse" component={VieDeClasseScreen} options={{ title: 'Vie de classe' }} />
    </ClasseStack.Navigator>
  );
}

const MessagesStack = createNativeStackNavigator();
function MessagesStackScreen() {
  return (
    <MessagesStack.Navigator screenOptions={STACK_OPTS}>
      <MessagesStack.Screen name="MessagerieHome" component={MessagerieParentsScreen} options={{ title: 'Messagerie' }} />
      <MessagesStack.Screen name="CahierLiaison" component={CahierLiaisonScreen} options={{ title: 'Cahier de Liaison' }} />
    </MessagesStack.Navigator>
  );
}

const LiaisonStack = createNativeStackNavigator();
function LiaisonStackScreen() {
  return (
    <LiaisonStack.Navigator screenOptions={STACK_OPTS}>
      <LiaisonStack.Screen name="CahierLiaisonHome" component={CahierLiaisonScreen} options={{ title: 'Cahier de Liaison' }} />
    </LiaisonStack.Navigator>
  );
}

const ReglagesTeacherStack = createNativeStackNavigator();
function ReglagesTeacherStackScreen() {
  return (
    <ReglagesTeacherStack.Navigator screenOptions={STACK_OPTS}>
      <ReglagesTeacherStack.Screen name="ReglagesHome" component={ReglagesScreen} options={{ title: 'Réglages' }} />
      <ReglagesTeacherStack.Screen name="PermissionsRGPD" component={PermissionsScreen} options={{ title: "Permissions d'accès" }} />
      <ReglagesTeacherStack.Screen name="JournalAcces" component={JournalAccesScreen} options={{ title: "Journal d'accès" }} />
      <ReglagesTeacherStack.Screen name="TransfertCode" component={TransfertCodeScreen} options={{ title: 'Code de transfert' }} />
      <ReglagesTeacherStack.Screen name="Effacement" component={EffacementScreen} options={{ title: "Droit à l'effacement" }} />
      <ReglagesTeacherStack.Screen name="ExportDonnees" component={ExportDonneesScreen} options={{ title: 'Export des données' }} />
      <ReglagesTeacherStack.Screen name="APropos" component={AProposScreen} options={{ title: 'À propos' }} />
    </ReglagesTeacherStack.Navigator>
  );
}

// ─── Tab navigator ───────────────────────────────────────

const Tab = createBottomTabNavigator();

const tabIcons: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }
> = {
  Dashboard: { icon: 'grid-outline', iconActive: 'grid' },
  Liaison: { icon: 'book-outline', iconActive: 'book' },
  Classe: { icon: 'partly-sunny-outline', iconActive: 'partly-sunny' },
  Messages: { icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  Réglages: { icon: 'settings-outline', iconActive: 'settings' },
};

export default function TeacherTabNavigator() {
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
        tabBarActiveTintColor: TEACHER_ORANGE,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: TEACHER_CARD,
          borderTopColor: '#EEF0F5',
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, 5),
          paddingTop: 5,
          height: 62 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStackScreen} options={{ tabBarLabel: 'Ma classe' }} />
      <Tab.Screen name="Liaison" component={LiaisonStackScreen} options={{ tabBarLabel: 'Liaison' }} />
      <Tab.Screen name="Classe" component={ClasseStackScreen} options={{ tabBarLabel: 'Suivi' }} />
      <Tab.Screen name="Messages" component={MessagesStackScreen} options={{ tabBarLabel: 'Messages' }} />
      <Tab.Screen name="Réglages" component={ReglagesTeacherStackScreen} />
    </Tab.Navigator>
  );
}
