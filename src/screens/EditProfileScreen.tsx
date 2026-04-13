/**
 * EditProfileScreen — Parent profile editing.
 * Avatar, family name, email (read-only), and logout button.
 */

import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, LogOut } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import { TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';
import { SCREEN_BACKGROUND } from '../constants/colors';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const parentName =
    user?.user_metadata?.family_name
      ? `Famille ${user.user_metadata.family_name}`
      : 'Parent Scolaria';
  const parentEmail = user?.email ?? 'parent@scolaria.fr';
  const parentInitials = getInitials(parentName);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60, paddingBottom: TAB_BAR_SCROLL_PADDING },
        ]}
      >
        {/* ── Avatar ── */}
        <View style={styles.avatarSection}>
          {Platform.OS === 'web' ? (
            <View
              style={[
                styles.avatar,
                { backgroundImage: 'linear-gradient(135deg, #7C3AED, #06B6D4)' } as any,
              ]}
            >
              <Text style={styles.avatarInitials}>{parentInitials}</Text>
            </View>
          ) : (
            <LinearGradient
              colors={['#7C3AED', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarInitials}>{parentInitials}</Text>
            </LinearGradient>
          )}
          <Pressable style={styles.cameraBtn}>
            <Camera size={16} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        </View>

        {/* ── Fields ── */}
        <Text style={styles.label}>NOM DE FAMILLE</Text>
        <View style={styles.inputContainer}>
          <TextInput
            value={parentName}
            editable={false}
            style={styles.input}
            placeholderTextColor="#94A3B8"
          />
        </View>

        <Text style={styles.label}>EMAIL</Text>
        <View style={[styles.inputContainer, styles.inputDisabled]}>
          <TextInput
            value={parentEmail}
            editable={false}
            style={[styles.input, styles.inputTextDisabled]}
            placeholderTextColor="#94A3B8"
          />
        </View>
        <Text style={styles.helperText}>L'email ne peut pas être modifié</Text>

        {/* ── Logout ── */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}
        >
          <LogOut size={20} color="#EF4444" strokeWidth={2} />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: FontFamily.sansBold,
    fontSize: 28,
    color: '#FFFFFF',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: '50%',
    marginRight: -52,
    backgroundColor: '#7C3AED',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  // Fields
  label: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: '#94A3B8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 20,
  },
  inputContainer: {
    backgroundColor: SCREEN_BACKGROUND,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 16,
    color: '#1A2340',
  },
  inputDisabled: {
    backgroundColor: '#F8F9FA',
  },
  inputTextDisabled: {
    color: '#94A3B8',
  },
  helperText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 48,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    color: '#EF4444',
  },
});
