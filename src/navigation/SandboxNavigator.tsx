/**
 * SandboxNavigator — Restricted navigation for child PIN access.
 *
 * This is a SEPARATE navigation tree (not just hidden routes).
 * The child can only see:
 *   - Accueil (adapted tiles: no cahier de liaison)
 *   - Devoirs / Agenda
 *   - Mon Ressenti (bien-être)
 *   - Profil & Badges
 *   - Aria (limited)
 *
 * The child CANNOT access:
 *   - Cahier de liaison / signature
 *   - Notes complètes (unless parent enabled)
 *   - Réglages famille / Permissions
 *   - Parent space (requires MDP to exit)
 */

import { useState } from 'react';
import {
  Modal,
  TextInput,
  Pressable as RNPressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Box, Text, HStack, VStack } from '../components/ui';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useAuth } from '../contexts/AuthContext';
import { FontFamily } from '../hooks/useSolariaFonts';

// Screens available in sandbox
import AccueilScreen from '../screens/AccueilScreen';
import AgendaScreen from '../screens/AgendaScreen';
import MonRessentiScreen from '../screens/MonRessentiScreen';
import ProfilEnfantScreen from '../screens/ProfilEnfantScreen';
import AriaScreen from '../screens/AriaScreen';

// ─── Constants ──────────────────────────────────────────

const PAGE_BG = '#F7F8FC';
const CARD_BORDER = '#E2E8F0';

// ─── Stack navigators ──────────────────────────────────

const AccueilStack = createNativeStackNavigator();
function AccueilStackScreen() {
  return (
    <AccueilStack.Navigator screenOptions={{ headerShown: false }}>
      <AccueilStack.Screen name="AccueilHome" component={AccueilScreen} />
    </AccueilStack.Navigator>
  );
}

const AgendaStack = createNativeStackNavigator();
function AgendaStackScreen() {
  return (
    <AgendaStack.Navigator screenOptions={{ headerShown: false }}>
      <AgendaStack.Screen name="AgendaHome" component={AgendaScreen} />
    </AgendaStack.Navigator>
  );
}

const RessentiStack = createNativeStackNavigator();
function RessentiStackScreen() {
  return (
    <RessentiStack.Navigator screenOptions={{ headerShown: false }}>
      <RessentiStack.Screen
        name="RessentiHome"
        component={MonRessentiScreen}
        options={{ headerShown: false }}
      />
    </RessentiStack.Navigator>
  );
}

const ProfilStack = createNativeStackNavigator();
function ProfilStackScreen() {
  return (
    <ProfilStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfilStack.Screen
        name="ProfilHome"
        component={ProfilEnfantScreen}
        options={{ headerShown: false }}
      />
    </ProfilStack.Navigator>
  );
}

// ─── Settings screen for sandbox (with parent escape) ──

function SandboxSettingsScreen() {
  const { exitChildMode, verifyParentPassword } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [parentPassword, setParentPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleExitRequest = () => {
    setModalVisible(true);
    setParentPassword('');
    setPasswordError('');
  };

  const handleVerify = async () => {
    if (!parentPassword.trim()) {
      setPasswordError('Veuillez entrer le mot de passe.');
      return;
    }

    setVerifying(true);
    try {
      const valid = await verifyParentPassword(parentPassword);
      if (valid) {
        setModalVisible(false);
        exitChildMode();
      } else {
        setPasswordError('Mot de passe incorrect.');
      }
    } catch {
      setPasswordError('Erreur de vérification.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Box className="flex-1 justify-center items-center px-8" style={{ backgroundColor: PAGE_BG }}>
      {/* Child-friendly settings content */}
      <Box
        className="w-full rounded-2xl p-6 items-center"
        style={{
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: CARD_BORDER,
        }}
      >
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🎒</Text>
        <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 18, color: '#0F172A', marginBottom: 4 }}>
          Espace enfant
        </Text>
        <Text style={{ fontFamily: FontFamily.sansRegular, fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 24 }}>
          Tu es connecté en mode enfant.{'\n'}Demande à un parent pour changer.
        </Text>

        {/* Exit button (discreet) */}
        <RNPressable
          onPress={handleExitRequest}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: CARD_BORDER,
            backgroundColor: '#F8FAFC',
          }}
        >
          <Ionicons name="lock-closed-outline" size={16} color="#94A3B8" />
          <Text style={{ fontFamily: FontFamily.sansSemiBold, fontSize: 13, color: '#94A3B8' }}>
            Espace parent
          </Text>
        </RNPressable>
      </Box>

      {/* ── Password verification modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Box className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <Box
            className="rounded-2xl p-6"
            style={{
              width: '85%',
              maxWidth: 360,
              backgroundColor: '#FFFFFF',
            }}
          >
            <VStack style={{ gap: 16 }}>
              <HStack className="items-center" style={{ gap: 10 }}>
                <Box
                  className="justify-center items-center"
                  style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#6366F1' + '12' }}
                >
                  <Ionicons name="shield-checkmark" size={20} color="#6366F1" />
                </Box>
                <VStack style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 16, color: '#0F172A' }}>
                    Vérification parent
                  </Text>
                  <Text style={{ fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#64748B' }}>
                    Entrez le mot de passe du compte famille
                  </Text>
                </VStack>
              </HStack>

              <HStack
                className="items-center rounded-xl px-3.5"
                style={{
                  backgroundColor: '#F1F5F9',
                  borderWidth: 1,
                  borderColor: passwordError ? '#EF4444' + '40' : '#E2E8F0',
                  gap: 8,
                }}
              >
                <Ionicons name="lock-closed" size={16} color="#94A3B8" />
                <TextInput
                  style={{
                    flex: 1,
                    fontFamily: FontFamily.sansRegular,
                    fontSize: 14,
                    color: '#0F172A',
                    paddingVertical: 14,
                  }}
                  placeholder="Mot de passe"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  value={parentPassword}
                  onChangeText={(t) => { setParentPassword(t); setPasswordError(''); }}
                  autoFocus
                />
              </HStack>

              {passwordError ? (
                <Text style={{ fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#EF4444' }}>
                  {passwordError}
                </Text>
              ) : null}

              <HStack style={{ gap: 10 }}>
                <RNPressable
                  onPress={() => setModalVisible(false)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: '#F1F5F9',
                  }}
                >
                  <Text style={{ fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: '#64748B' }}>
                    Annuler
                  </Text>
                </RNPressable>
                <RNPressable
                  onPress={handleVerify}
                  disabled={verifying}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: '#6366F1',
                  }}
                >
                  {verifying ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 14, color: '#FFFFFF' }}>
                      Confirmer
                    </Text>
                  )}
                </RNPressable>
              </HStack>
            </VStack>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}

const SettingsStack = createNativeStackNavigator();
function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SandboxSettingsHome" component={SandboxSettingsScreen} />
    </SettingsStack.Navigator>
  );
}

// ─── Tab navigator ──────────────────────────────────────

const Tab = createBottomTabNavigator();

const tabIcons: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }
> = {
  Accueil: { icon: 'home-outline', iconActive: 'home' },
  Agenda: { icon: 'calendar-outline', iconActive: 'calendar' },
  Ressenti: { icon: 'heart-outline', iconActive: 'heart' },
  Profil: { icon: 'person-outline', iconActive: 'person' },
  Plus: { icon: 'ellipsis-horizontal', iconActive: 'ellipsis-horizontal' },
};

export default function SandboxNavigator() {
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
          fontFamily: 'DMSans_600SemiBold',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Accueil" component={AccueilStackScreen} />
      <Tab.Screen name="Agenda" component={AgendaStackScreen} />
      <Tab.Screen name="Ressenti" component={RessentiStackScreen} options={{ tabBarLabel: 'Ressenti' }} />
      <Tab.Screen name="Profil" component={ProfilStackScreen} options={{ tabBarLabel: 'Mon profil' }} />
      <Tab.Screen name="Plus" component={SettingsStackScreen} options={{ tabBarLabel: 'Plus' }} />
    </Tab.Navigator>
  );
}
