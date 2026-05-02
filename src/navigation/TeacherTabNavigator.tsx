import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Grid, TextBubble, Sun, Heart } from '@getpapillon/papicons';
import { SCREEN_BACKGROUND } from '../constants/colors';
import SimpleFloatingTabBar from '../components/SimpleFloatingTabBar';

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

// ─── Page background (COMPONENTS.md §47: #F2F1EE) ────────

const TEACHER_BG = SCREEN_BACKGROUND;

const STACK_OPTS = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  animationDuration: 250,
};

// ─── Stack navigators ────────────────────────────────────

const DashboardStack = createNativeStackNavigator();
function DashboardStackScreen() {
  return (
    <DashboardStack.Navigator screenOptions={STACK_OPTS}>
      <DashboardStack.Screen name="TeacherDashboardHome" component={TeacherDashboardScreen} />
      <DashboardStack.Screen name="AbsencesEnseignant" component={AbsencesEnseignantScreen} />
    </DashboardStack.Navigator>
  );
}

const AppreciationsStack = createNativeStackNavigator();
function AppreciationsStackScreen() {
  return (
    <AppreciationsStack.Navigator screenOptions={STACK_OPTS}>
      <AppreciationsStack.Screen name="AppreciationsHome" component={AppreciationsScreen} />
    </AppreciationsStack.Navigator>
  );
}

const ClasseStack = createNativeStackNavigator();
function ClasseStackScreen() {
  return (
    <ClasseStack.Navigator screenOptions={STACK_OPTS}>
      <ClasseStack.Screen name="MeteoHome" component={MeteoClasseScreen} />
      <ClasseStack.Screen name="VieDeClasse" component={VieDeClasseScreen} />
    </ClasseStack.Navigator>
  );
}

const MessagesStack = createNativeStackNavigator();
function MessagesStackScreen() {
  return (
    <MessagesStack.Navigator screenOptions={STACK_OPTS}>
      <MessagesStack.Screen name="MessagerieHome" component={MessagerieParentsScreen} />
      <MessagesStack.Screen name="CahierLiaison" component={CahierLiaisonScreen} />
    </MessagesStack.Navigator>
  );
}

const ReglagesTeacherStack = createNativeStackNavigator();
function ReglagesTeacherStackScreen() {
  return (
    <ReglagesTeacherStack.Navigator screenOptions={STACK_OPTS}>
      <ReglagesTeacherStack.Screen name="ReglagesHome" component={ReglagesScreen} />
      <ReglagesTeacherStack.Screen name="PermissionsRGPD" component={PermissionsScreen} options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent', flex: 1 } }} />
      <ReglagesTeacherStack.Screen name="JournalAcces" component={JournalAccesScreen} options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent', flex: 1 } }} />
      <ReglagesTeacherStack.Screen name="TransfertCode" component={TransfertCodeScreen} options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent', flex: 1 } }} />
      <ReglagesTeacherStack.Screen name="Effacement" component={EffacementScreen} options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent', flex: 1 } }} />
      <ReglagesTeacherStack.Screen name="ExportDonnees" component={ExportDonneesScreen} options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent', flex: 1 } }} />
      <ReglagesTeacherStack.Screen name="APropos" component={AProposScreen} />
    </ReglagesTeacherStack.Navigator>
  );
}

// ─── Tab icon map (Papicons) ────────────────────────────

const tabIcons = {
  Dashboard: Grid,
  Liaison: TextBubble,
  Classe: Sun,
  Messages: TextBubble,
  Réglages: Heart,
};

// ─── Tab navigator ───────────────────────────────────────

const Tab = createBottomTabNavigator();

export default function TeacherTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => (
        <SimpleFloatingTabBar {...props} icons={tabIcons} />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardStackScreen} options={{ tabBarLabel: 'Ma classe' }} />
      <Tab.Screen name="Liaison" component={ClasseStackScreen} options={{ tabBarLabel: 'Liaison' }} />
      <Tab.Screen name="Messages" component={MessagesStackScreen} options={{ tabBarLabel: 'Messages' }} />
      <Tab.Screen name="Réglages" component={ReglagesTeacherStackScreen} />
    </Tab.Navigator>
  );
}
