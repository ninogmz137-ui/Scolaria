import React from 'react';
import {
  View,
  Image,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Settings2, LogOut } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { getChildInitials } from '../utils/childInitials';
import { useAuth } from '../contexts/AuthContext';
import { Text, Pressable } from './ui';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ChildSelectorSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { children, selectedChild, selectChild } = useActiveChild();
  const siblingNames = children.map((c) => c.name);
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Déconnexion ?',
      "Vous serez redirigé vers l'écran de connexion.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            onClose();
            await signOut();
          },
        },
      ],
    );
  };

  const handleSettings = () => {
    onClose();
    setTimeout(() => {
      navigation.navigate('MainPager', {
        screen: 'Accueil',
        params: { screen: 'ReglagesScreen' },
      });
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Email compte parent */}
          <Text style={styles.email}>{user?.email ?? ''}</Text>

          {/* Liste enfants */}
          {children.map((child) => {
            const isActive = child.id === selectedChild.id;
            const isEmoji = child.avatarType === 'emoji';
            const hasPhoto = child.avatarType === 'photo' && child.avatarPhotoUri;
            const firstName = child.name.split(' ')[0];

            return (
              <TouchableOpacity
                key={child.id}
                activeOpacity={0.75}
                style={styles.childRow}
                onPress={() => {
                  selectChild(child.id);
                  onClose();
                }}
              >
                <View style={styles.childAvatar}>
                  {hasPhoto ? (
                    <Image
                      source={{ uri: child.avatarPhotoUri! }}
                      style={styles.childAvatarImage}
                    />
                  ) : isEmoji && child.avatarEmoji ? (
                    <Text style={styles.childAvatarEmoji}>{child.avatarEmoji}</Text>
                  ) : (
                    <Text style={styles.childAvatarInitials}>
                      {getChildInitials(child.name, siblingNames)}
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.childName}>{firstName}</Text>
                  <Text style={styles.childNiveau} numberOfLines={1}>
                    {child.classe}
                  </Text>
                </View>

                {isActive && (
                  <Check size={18} color="#4338CA" strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Gérer les enfants */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.settingsRow}
            onPress={handleSettings}
          >
            <Text style={styles.settingsLabel}>Gérer les enfants</Text>
            <Settings2 size={16} color="#4338CA" strokeWidth={2} />
          </TouchableOpacity>

          {/* Se déconnecter */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.signOutRow}
            onPress={handleSignOut}
          >
            <LogOut size={16} color="#EF4444" strokeWidth={2} style={{ marginRight: 8 }} />
            <Text style={styles.signOutLabel}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.16)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.10,
        shadowRadius: 32,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 16 },
    }),
  },
  handle: {
    width: 34,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.14)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  email: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 11,
    color: 'rgba(15,23,42,0.45)',
    paddingTop: 4,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  childRowPressed: {
    backgroundColor: 'rgba(15,23,42,0.03)',
  },
  childAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4338CA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  childAvatarImage: {
    width: 36,
    height: 36,
  },
  childAvatarEmoji: {
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
  },
  childAvatarInitials: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  childName: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 13,
    color: '#0F172A',
  },
  childNiveau: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 11,
    color: 'rgba(15,23,42,0.55)',
    marginTop: 1,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,23,42,0.06)',
  },
  settingsLabel: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: '#4338CA',
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  signOutLabel: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: '#EF4444',
  },
});
